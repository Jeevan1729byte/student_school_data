from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import certifi
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import pandas as pd

# Stripe Integration
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with SSL certificate
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ['DB_NAME']]

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
REGISTRATION_FEE = 50.00
EXTRA_TSHIRT_PRICE = 15.00

# Create the main app
app = FastAPI(title="TAISM Student Registration")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ MODELS ============

class LoginRequest(BaseModel):
    student_id: str
    email: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    student_id: Optional[str] = None
    token: Optional[str] = None

class Student(BaseModel):
    model_config = ConfigDict(extra="ignore")
    student_id: str
    name: str
    age: int
    email: str
    department: str
    gpa: float
    graduation_year: int
    tshirt_size: Optional[str] = None
    extra_tshirts: Optional[int] = 0
    extra_tshirt_size: Optional[str] = None
    payment_id: Optional[str] = None
    payment_status: Optional[str] = None
    registered_at: Optional[str] = None

class UpdateTshirtRequest(BaseModel):
    student_id: str
    tshirt_size: str
    extra_tshirts: Optional[int] = 0
    extra_tshirt_size: Optional[str] = None

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transaction_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    email: str
    amount: float
    extra_tshirts: int = 0
    extra_tshirt_amount: float = 0.0
    currency: str = "usd"
    session_id: str
    payment_id: Optional[str] = None
    payment_status: str = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

class CreateCheckoutRequest(BaseModel):
    student_id: str
    origin_url: str

class AdminStats(BaseModel):
    total_students: int
    completed_registrations: int
    pending_registrations: int
    total_revenue: float

# ============ UTILITY FUNCTIONS ============

async def load_csv_to_mongodb():
    """Load CSV data into MongoDB on startup"""
    csv_path = ROOT_DIR / 'students.csv'
    if not csv_path.exists():
        logger.warning("students.csv not found, skipping data load")
        return
    
    try:
        df = pd.read_csv(csv_path)
        
        for _, row in df.iterrows():
            student_data = {
                "student_id": str(row['StudentID']),
                "name": row['Name'],
                "age": int(row['Age']),
                "email": row['Email'],
                "department": row['Department'],
                "gpa": float(row['GPA']),
                "graduation_year": int(row['GraduationYear']),
                "tshirt_size": None,
                "extra_tshirts": 0,
                "extra_tshirt_size": None,
                "payment_id": None,
                "payment_status": None,
                "registered_at": None
            }
            
            await db.students.update_one(
                {"student_id": student_data["student_id"]},
                {"$setOnInsert": student_data},
                upsert=True
            )
        
        logger.info(f"Loaded {len(df)} students from CSV")
    except Exception as e:
        logger.error(f"Error loading CSV: {e}")

# ============ AUTH ENDPOINTS ============

@api_router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Validate student credentials"""
    student = await db.students.find_one(
        {"student_id": request.student_id, "email": request.email},
        {"_id": 0}
    )
    
    if not student:
        raise HTTPException(status_code=401, detail="Invalid Student ID or Email")
    
    token = f"{student['student_id']}:{datetime.now(timezone.utc).isoformat()}"
    
    return LoginResponse(
        success=True,
        message="Login successful",
        student_id=student['student_id'],
        token=token
    )

# ============ STUDENT ENDPOINTS ============

@api_router.get("/student/{student_id}", response_model=Student)
async def get_student(student_id: str):
    """Get student details by ID"""
    student = await db.students.find_one(
        {"student_id": student_id},
        {"_id": 0}
    )
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return Student(**student)

@api_router.get("/pricing")
async def get_pricing():
    """Get current pricing"""
    return {
        "registration_fee": REGISTRATION_FEE,
        "extra_tshirt_price": EXTRA_TSHIRT_PRICE,
        "currency": "usd"
    }

@api_router.post("/student/update-tshirt")
async def update_tshirt_size(request: UpdateTshirtRequest):
    """Update student's T-shirt preferences"""
    valid_sizes = ["S", "M", "L", "XL", "XXL"]
    if request.tshirt_size not in valid_sizes:
        raise HTTPException(status_code=400, detail=f"Invalid size. Choose from: {valid_sizes}")
    
    if request.extra_tshirt_size and request.extra_tshirt_size not in valid_sizes:
        raise HTTPException(status_code=400, detail=f"Invalid extra t-shirt size")
    
    if request.extra_tshirts and request.extra_tshirts < 0:
        raise HTTPException(status_code=400, detail="Extra t-shirts cannot be negative")
    
    update_data = {
        "tshirt_size": request.tshirt_size,
        "extra_tshirts": request.extra_tshirts or 0,
        "extra_tshirt_size": request.extra_tshirt_size if request.extra_tshirts else None
    }
    
    result = await db.students.update_one(
        {"student_id": request.student_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return {"success": True, "message": "T-shirt preferences updated"}

# ============ PAYMENT ENDPOINTS ============

@api_router.post("/payment/create-checkout")
async def create_checkout_session(request: CreateCheckoutRequest, http_request: Request):
    """Create Stripe checkout session"""
    student = await db.students.find_one(
        {"student_id": request.student_id},
        {"_id": 0}
    )
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if not student.get('tshirt_size'):
        raise HTTPException(status_code=400, detail="Please select T-shirt size first")
    
    if student.get('payment_status') == 'paid':
        raise HTTPException(status_code=400, detail="Registration already completed")
    
    # Calculate total
    extra_tshirts = student.get('extra_tshirts', 0)
    extra_tshirt_amount = extra_tshirts * EXTRA_TSHIRT_PRICE
    total_amount = REGISTRATION_FEE + extra_tshirt_amount
    
    # Build URLs
    origin_url = request.origin_url.rstrip('/')
    success_url = f"{origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/dashboard"
    
    # Setup Stripe
    host_url = str(http_request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        amount=total_amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "student_id": request.student_id,
            "email": student['email'],
            "name": student['name'],
            "extra_tshirts": str(extra_tshirts)
        }
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create transaction record
    transaction = PaymentTransaction(
        student_id=request.student_id,
        email=student['email'],
        amount=total_amount,
        extra_tshirts=extra_tshirts,
        extra_tshirt_amount=extra_tshirt_amount,
        session_id=session.session_id,
        payment_status="pending"
    )
    
    await db.payment_transactions.insert_one(transaction.model_dump())
    
    return {
        "checkout_url": session.url,
        "session_id": session.session_id,
        "total_amount": total_amount
    }

@api_router.get("/payment/status/{session_id}")
async def get_payment_status(session_id: str, http_request: Request):
    """Get payment status"""
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction.get('payment_status') == 'paid':
        return {
            "status": "complete",
            "payment_status": "paid",
            "payment_id": transaction.get('payment_id')
        }
    
    # Check with Stripe
    host_url = str(http_request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    
    if checkout_status.payment_status == 'paid':
        payment_id = f"PAY-{uuid.uuid4().hex[:12].upper()}"
        now = datetime.now(timezone.utc).isoformat()
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "payment_id": payment_id, "updated_at": now}}
        )
        
        await db.students.update_one(
            {"student_id": transaction['student_id']},
            {"$set": {"payment_status": "paid", "payment_id": payment_id, "registered_at": now}}
        )
        
        return {"status": "complete", "payment_status": "paid", "payment_id": payment_id}
    elif checkout_status.status == 'expired':
        return {"status": "expired", "payment_status": "expired"}
    else:
        return {"status": checkout_status.status, "payment_status": checkout_status.payment_status}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        host_url = str(request.base_url)
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == 'paid':
            session_id = webhook_response.session_id
            payment_id = f"PAY-{uuid.uuid4().hex[:12].upper()}"
            now = datetime.now(timezone.utc).isoformat()
            
            transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            
            if transaction and transaction.get('payment_status') != 'paid':
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "paid", "payment_id": payment_id, "updated_at": now}}
                )
                await db.students.update_one(
                    {"student_id": transaction['student_id']},
                    {"$set": {"payment_status": "paid", "payment_id": payment_id, "registered_at": now}}
                )
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ============ ADMIN ENDPOINTS ============

@api_router.get("/admin/stats", response_model=AdminStats)
async def get_admin_stats():
    """Get registration statistics"""
    total = await db.students.count_documents({})
    completed = await db.students.count_documents({"payment_status": "paid"})
    pending = total - completed
    
    paid_transactions = await db.payment_transactions.find(
        {"payment_status": "paid"}, {"_id": 0, "amount": 1}
    ).to_list(1000)
    
    total_revenue = sum(t.get('amount', 0) for t in paid_transactions)
    
    return AdminStats(
        total_students=total,
        completed_registrations=completed,
        pending_registrations=pending,
        total_revenue=total_revenue
    )

@api_router.get("/admin/students")
async def get_all_students():
    """Get all students"""
    students = await db.students.find({}, {"_id": 0}).to_list(1000)
    return students

@api_router.get("/admin/export")
async def export_csv():
    """Export student data as CSV"""
    students = await db.students.find({}, {"_id": 0}).to_list(1000)
    
    if not students:
        raise HTTPException(status_code=404, detail="No data found")
    
    df = pd.DataFrame(students)
    
    column_mapping = {
        'student_id': 'StudentID',
        'name': 'Name',
        'age': 'Age',
        'email': 'Email',
        'department': 'Department',
        'gpa': 'GPA',
        'graduation_year': 'GraduationYear',
        'tshirt_size': 'TShirtSize',
        'extra_tshirts': 'ExtraTShirts',
        'extra_tshirt_size': 'ExtraTShirtSize',
        'payment_id': 'PaymentID',
        'payment_status': 'PaymentStatus',
        'registered_at': 'RegisteredAt'
    }
    
    df = df.rename(columns=column_mapping)
    csv_content = df.to_csv(index=False)
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=students_export.csv"}
    )

# ============ HEALTH CHECK ============

@api_router.get("/")
async def root():
    return {"message": "TAISM Student Registration API", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ============ APP CONFIGURATION ============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await load_csv_to_mongodb()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
