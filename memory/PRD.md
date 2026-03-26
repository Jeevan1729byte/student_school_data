# Student Registration & Payment Automation System

## Original Problem Statement
Build a full-stack web application that automates student data collection and replaces manual Excel-based workflows for registrations and payments. The system allows students to log in using pre-uploaded data, complete missing fields (like T-shirt size), make payments, and automatically update the backend CSV with all new data.

## User Personas
1. **Student**: Pre-registered student who logs in to complete registration and make payment
2. **Admin**: Institution staff who manages registrations, views analytics, and exports data

## Core Requirements
- Login via Student ID + Email (CSV-based validation)
- Auto-filled student dashboard with editable T-shirt size
- Stripe payment integration ($50 registration fee)
- Email confirmation on successful payment
- Admin dashboard with analytics and CSV export

## What's Been Implemented (March 26, 2026)

### Backend (FastAPI + MongoDB)
- [x] CSV data import on startup (200 students loaded)
- [x] Login endpoint with Student ID + Email validation
- [x] Student profile retrieval and update
- [x] T-shirt size update endpoint
- [x] Stripe checkout session creation
- [x] Payment status polling and verification
- [x] Payment transactions collection
- [x] Email confirmation (Resend integration - **MOCKED** - no API key provided)
- [x] Admin statistics endpoint
- [x] Admin students list endpoint
- [x] CSV export endpoint
- [x] Stripe webhook handler

### Frontend (React + Tailwind + Framer Motion)
- [x] Login page with abstract architectural background
- [x] Student dashboard with auto-filled information cards
- [x] T-shirt size dropdown (Shadcn Select component)
- [x] Payment button with loading states
- [x] Payment success page with polling
- [x] Admin dashboard with statistics cards
- [x] Admin student table with search functionality
- [x] CSV export button
- [x] Responsive design
- [x] Toast notifications

### Design System Applied
- Fonts: Barlow Condensed (headings), IBM Plex Sans (body), JetBrains Mono (data)
- Colors: White background, blue/slate accents, green for success states
- Clean, minimal, form-focused UI

## Tech Stack
- **Frontend**: React, Tailwind CSS, Framer Motion, Shadcn UI, Axios
- **Backend**: FastAPI, Pandas, Motor (async MongoDB driver)
- **Database**: MongoDB
- **Payments**: Stripe (test mode - sk_test_emergent)
- **Email**: Resend (MOCKED)

## P0/P1/P2 Features

### P0 (Implemented)
- ✅ Student login/auth
- ✅ Student data display
- ✅ T-shirt size selection
- ✅ Stripe payment integration
- ✅ Admin dashboard
- ✅ CSV export

### P1 (Ready for Future)
- Email confirmation (requires RESEND_API_KEY)
- Bulk CSV upload for new students
- Status tracking improvements

### P2 (Enhancement Ideas)
- QR code for registration
- Analytics charts
- Payment receipts PDF
- Student profile editing

## Environment Variables
```
# Backend (.env)
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
STRIPE_API_KEY=sk_test_emergent
RESEND_API_KEY=<add_key_for_emails>
SENDER_EMAIL=onboarding@resend.dev
```

## Test Credentials
- Student ID: `3336`
- Email: `sean43@hotmail.com`

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/login | Student authentication |
| GET | /api/student/{id} | Get student details |
| POST | /api/student/update-tshirt | Update T-shirt size |
| POST | /api/payment/create-checkout | Create Stripe session |
| GET | /api/payment/status/{session_id} | Check payment status |
| GET | /api/admin/stats | Get registration statistics |
| GET | /api/admin/students | Get all students |
| GET | /api/admin/export | Download CSV |

## Next Tasks
1. Add RESEND_API_KEY to enable email confirmations
2. Implement bulk CSV upload for admin
3. Add payment receipts
