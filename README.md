# TAISM Student Registration System

A full-stack web application for student registration and payment processing.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Framer Motion
- **Backend**: FastAPI (Python)
- **Database**: MongoDB Atlas
- **Payments**: Stripe

---

## 🚀 How to Run Locally (VS Code)

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Stripe account

---

### Step 1: Clone & Open in VS Code
```bash
git clone <your-repo-url>
cd <project-folder>
code .
```

---

### Step 2: Setup Backend

1. **Open terminal in VS Code** (Ctrl + `)

2. **Navigate to backend folder**:
```bash
cd backend
```

3. **Create virtual environment**:
```bash
python -m venv venv
```

4. **Activate virtual environment**:
- Windows: `venv\Scripts\activate`
- Mac/Linux: `source venv/bin/activate`

5. **Install dependencies**:
```bash
pip install -r requirements.txt
```

6. **Create `.env` file** in `/backend/` folder:
```env
MONGO_URL="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority"
DB_NAME="taism_registration"
CORS_ORIGINS="*"
STRIPE_API_KEY=sk_test_your_stripe_secret_key
```

7. **Place your `students.csv`** file in `/backend/` folder

8. **Run the backend**:
```bash
uvicorn server:app --reload --port 8001
```

✅ Backend runs at: `http://localhost:8001`

---

### Step 3: Verify MongoDB Connection

After starting backend, check the terminal. You should see:
```
INFO - Loaded 200 students from CSV
INFO - Application startup complete.
```

**To verify MongoDB Atlas**:
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click your cluster → **Browse Collections**
3. Select database `taism_registration`
4. You should see `students` and `payment_transactions` collections

**Test API in browser**:
- Open: `http://localhost:8001/api/health`
- Should return: `{"status": "healthy", "timestamp": "..."}`

**Test admin stats**:
- Open: `http://localhost:8001/api/admin/stats`
- Should return student count

---

### Step 4: Setup Frontend

1. **Open new terminal** in VS Code

2. **Navigate to frontend**:
```bash
cd frontend
```

3. **Install dependencies**:
```bash
npm install
# or
yarn install
```

4. **Create `.env` file** in `/frontend/` folder:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

5. **Run frontend**:
```bash
npm start
# or
yarn start
```

✅ Frontend runs at: `http://localhost:3000`

---

## 📁 Project Structure

```
project/
├── backend/
│   ├── server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   ├── students.csv       # Student data file
│   └── .env               # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── PaymentSuccessPage.js
│   │   │   └── AdminDashboard.js
│   │   ├── lib/
│   │   │   └── api.js
│   │   └── context/
│   │       └── AuthContext.js
│   ├── package.json
│   └── .env
```

---

## 🔑 Test Credentials

| Student ID | Email |
|------------|-------|
| 3336 | sean43@hotmail.com |
| 8774 | vbecker@harvey.com |

---

## 📌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| POST | /api/login | Student login |
| GET | /api/student/{id} | Get student details |
| POST | /api/student/update-tshirt | Update t-shirt preferences |
| POST | /api/payment/create-checkout | Create Stripe session |
| GET | /api/payment/status/{session_id} | Check payment status |
| GET | /api/admin/stats | Get statistics |
| GET | /api/admin/students | Get all students |
| GET | /api/admin/export | Download CSV |

---

## 💰 Pricing

- Registration Fee: $50.00
- Extra T-Shirts: $15.00 each

---

## 🔧 Troubleshooting

### MongoDB Connection Issues
1. Check if IP is whitelisted in MongoDB Atlas (Network Access → Add IP → Allow from Anywhere)
2. Verify username/password in connection string
3. Password special characters must be URL-encoded (@ = %40)

### Backend Not Starting
```bash
# Check if port 8001 is in use
lsof -i :8001

# Kill process if needed
kill -9 <PID>
```

### Frontend API Errors
- Ensure REACT_APP_BACKEND_URL matches backend URL
- Check CORS_ORIGINS in backend .env

---

## 📧 Support

For issues, check:
1. Terminal logs for errors
2. Browser console (F12 → Console)
3. MongoDB Atlas logs
