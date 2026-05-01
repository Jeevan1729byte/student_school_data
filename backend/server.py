from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
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

# Supabase connection
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_KEY']
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

class CreateCheckoutRequest(BaseModel):
    student_id: str
    origin_url: str

class AdminStats(BaseModel):
    total_students: int
    completed_registrations: int
    pending_registrations: int
    total_revenue: float

# ============ UTILITY FUNCTIONS ============

def load_csv_to_supabase():
    """Load CSV data into Supabase on startup"""
    csv_path = ROOT_DIR / 'students.csv'
    if not csv_path.exists():
        logger.warning("students.csv not found, skipping data load")
        return
    
    try:
        df = pd.read_csv(csv_path)
        
        for _, row in df.iterrows():
            student_id = str(row['StudentID'])
            
            # Check if student already exists
            existing = supabase.table('students').select('student_id').eq('student_id', student_id).execute()
            
            if not existing.data:
                student_data = {
                    "student_id": student_id,
                    "name": row['Name'],
                    "age": int(row['Age']),
                    "email": row['Email'],
                    "department": row['Department'],
                    "gpa": float(row['GPA']),
                    "graduation_year": int(row['GraduationYear']),
                    "extra_tshirts": 0
                }
                supabase.table('students').insert(student_data).execute()
        
        logger.info(f"Loaded {len(df)} students from CSV")
    except Exception as e:
        logger.error(f"Error loading CSV: {e}")

# ============ AUTH ENDPOINTS ============

@api_router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Validate student credentials"""
    result = supabase.table('students').select('*').eq('student_id', request.student_id).eq('email', request.email).execute()
    
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid Student ID or Email")
    
    student = result.data[0]
    token = f"{student['student_id']}:{datetime.now(timezone.utc).isoformat()}"
    
    return LoginResponse(
        success=True,
        message="Login successful",
        student_id=student['student_id'],
        token=token
    )

# ============ STUDENT ENDPOINTS ============

@api_router.get("/student/{student_id}")
async def get_student(student_id: str):
    """Get student details by ID"""
    result = supabase.table('students').select('*').eq('student_id', student_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return result.data[0]

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
    
    result = supabase.table('students').update(update_data).eq('student_id', request.student_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return {"success": True, "message": "T-shirt preferences updated"}

# ============ PAYMENT ENDPOINTS ============

@api_router.post("/payment/create-checkout")
async def create_checkout_session(request: CreateCheckoutRequest, http_request: Request):
    """Create Stripe checkout session"""
    result = supabase.table('students').select('*').eq('student_id', request.student_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student = result.data[0]
    
    if not student.get('tshirt_size'):
        raise HTTPException(status_code=400, detail="Please select T-shirt size first")
    
    if student.get('payment_status') == 'paid':
        raise HTTPException(status_code=400, detail="Registration already completed")
    
    # Calculate total
    extra_tshirts = student.get('extra_tshirts', 0) or 0
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
    transaction_data = {
        "transaction_id": str(uuid.uuid4()),
        "student_id": request.student_id,
        "email": student['email'],
        "amount": total_amount,
        "extra_tshirts": extra_tshirts,
        "extra_tshirt_amount": extra_tshirt_amount,
        "currency": "usd",
        "session_id": session.session_id,
        "payment_status": "pending"
    }
    
    supabase.table('payment_transactions').insert(transaction_data).execute()
    
    return {
        "checkout_url": session.url,
        "session_id": session.session_id,
        "total_amount": total_amount
    }

@api_router.get("/payment/status/{session_id}")
async def get_payment_status(session_id: str, http_request: Request):
    """Get payment status"""
    result = supabase.table('payment_transactions').select('*').eq('session_id', session_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaction = result.data[0]
    
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
        
        # Update transaction
        supabase.table('payment_transactions').update({
            "payment_status": "paid",
            "payment_id": payment_id,
            "updated_at": now
        }).eq('session_id', session_id).execute()
        
        # Update student
        supabase.table('students').update({
            "payment_status": "paid",
            "payment_id": payment_id,
            "registered_at": now
        }).eq('student_id', transaction['student_id']).execute()
        
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
            
            # Get transaction
            result = supabase.table('payment_transactions').select('*').eq('session_id', session_id).execute()
            
            if result.data and result.data[0].get('payment_status') != 'paid':
                transaction = result.data[0]
                
                supabase.table('payment_transactions').update({
                    "payment_status": "paid",
                    "payment_id": payment_id,
                    "updated_at": now
                }).eq('session_id', session_id).execute()
                
                supabase.table('students').update({
                    "payment_status": "paid",
                    "payment_id": payment_id,
                    "registered_at": now
                }).eq('student_id', transaction['student_id']).execute()
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ============ ADMIN ENDPOINTS ============

@api_router.get("/admin/stats", response_model=AdminStats)
async def get_admin_stats():
    """Get registration statistics"""
    all_students = supabase.table('students').select('student_id').execute()
    total = len(all_students.data) if all_students.data else 0
    
    paid_students = supabase.table('students').select('student_id').eq('payment_status', 'paid').execute()
    completed = len(paid_students.data) if paid_students.data else 0
    
    pending = total - completed
    
    paid_transactions = supabase.table('payment_transactions').select('amount').eq('payment_status', 'paid').execute()
    total_revenue = sum(t.get('amount', 0) for t in paid_transactions.data) if paid_transactions.data else 0
    
    return AdminStats(
        total_students=total,
        completed_registrations=completed,
        pending_registrations=pending,
        total_revenue=total_revenue
    )

@api_router.get("/admin/students")
async def get_all_students():
    """Get all students"""
    result = supabase.table('students').select('*').execute()
    return result.data if result.data else []

@api_router.get("/admin/export")
async def export_csv():
    """Export student data as CSV"""
    result = supabase.table('students').select('*').execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="No data found")
    
    df = pd.DataFrame(result.data)
    
    # Remove internal columns
    columns_to_keep = ['student_id', 'name', 'age', 'email', 'department', 'gpa', 
                       'graduation_year', 'tshirt_size', 'extra_tshirts', 'extra_tshirt_size',
                       'payment_id', 'payment_status', 'registered_at']
    df = df[[c for c in columns_to_keep if c in df.columns]]
    
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
    return {"message": "TAISM Student Registration API", "status": "healthy", "database": "Supabase"}

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
    load_csv_to_supabase()
