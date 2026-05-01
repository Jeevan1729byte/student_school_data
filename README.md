# TAISM Student Registration System

A full-stack web application for student registration and payment processing.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Framer Motion
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe

---

## 🚀 How to Run Locally (VS Code)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Supabase account
- Stripe account

---

### Step 1: Clone & Open in VS Code
```bash
git clone <your-repo-url>
cd <project-folder>
code .
```

---

### Step 2: Setup Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or select existing
3. Go to **SQL Editor** and run this SQL:

```sql
-- Students table
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  email VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  gpa DECIMAL(3,2),
  graduation_year INTEGER,
  tshirt_size VARCHAR(10),
  extra_tshirts INTEGER DEFAULT 0,
  extra_tshirt_size VARCHAR(10),
  payment_id VARCHAR(100),
  payment_status VARCHAR(50),
  registered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payment transactions table
CREATE TABLE payment_transactions (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  amount DECIMAL(10,2),
  extra_tshirts INTEGER DEFAULT 0,
  extra_tshirt_amount DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'usd',
  session_id VARCHAR(255),
  payment_id VARCHAR(100),
  payment_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Allow public access
CREATE POLICY "Allow all access to students" ON students FOR ALL USING (true);
CREATE POLICY "Allow all access to payment_transactions" ON payment_transactions FOR ALL USING (true);
```

4. Get your credentials from **Project Settings → API**:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - anon public key (starts with `eyJ...`)

---

### Step 3: Setup Backend

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
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key_here
CORS_ORIGINS=*
STRIPE_API_KEY=sk_test_your_stripe_secret_key
```

7. **Place your `students.csv`** file in `/backend/` folder

8. **Run the backend**:
```bash
uvicorn server:app --reload --port 8001
```

✅ Backend runs at: `http://localhost:8001`

---

### Step 4: Verify Supabase Connection

After starting backend, check the terminal. You should see:
```
INFO - Loaded 200 students from CSV
INFO - Application startup complete.
```

**To verify in Supabase Dashboard**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project → **Table Editor**
3. Click on `students` table
4. You should see 200 rows of student data

**Test API in browser**:
- Open: `http://localhost:8001/api/health`
- Should return: `{"status": "healthy", "timestamp": "..."}`

**Test admin stats**:
- Open: `http://localhost:8001/api/admin/stats`
- Should return: `{"total_students": 200, ...}`

---

### Step 5: Setup Frontend

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

### Supabase Connection Issues
1. Verify SUPABASE_URL and SUPABASE_KEY in .env
2. Check if tables were created in Supabase
3. Ensure RLS policies allow access

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
