# NECF Treasury Management System

A comprehensive church treasury management system built with modern web technologies, featuring receipt OCR processing, financial analytics, and user management.

## 🚀 Quick Start

```bash
# 1. Setup environment
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials

# 2. Start development environment
docker-compose up -d

# 3. Access application
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
# pgAdmin: http://localhost:5050 (admin@example.com / admin)
```

## 🔧 Environment Variables

### Backend (.env)
```bash
DATABASE_URL=postgresql://treasury_user:treasury_pass@localhost:5432/church_treasury
SECRET_KEY=your-256-bit-secret-key-here  # Generate with: openssl rand -hex 32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
STORAGE_TYPE=local                        # 'local' or 's3'
UPLOAD_DIR=./uploads                      # Local storage directory
AWS_ACCESS_KEY_ID=your-aws-key           # Required if STORAGE_TYPE=s3
AWS_SECRET_ACCESS_KEY=your-aws-secret    # Required if STORAGE_TYPE=s3
S3_BUCKET=church-treasury-receipts       # Required if STORAGE_TYPE=s3
OCR_ENABLED=true                         # Enable receipt text extraction
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:8000/api/v1  # Backend API endpoint
```

## 🏗️ Tech Stack

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + React Query  
**Backend:** FastAPI + Python 3.11 + SQLModel + PostgreSQL  
**Storage:** Local filesystem or AWS S3 with OCR processing  
**Auth:** JWT tokens with bcrypt password hashing  
**Deploy:** Docker + Docker Compose + Nginx

## 🏛️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │    │   FastAPI        │    │  PostgreSQL     │
│                 │    │                  │    │                 │
│ • Auth Context  │◄──►│ • JWT Auth       │◄──►│ • Users         │
│ • File Upload   │    │ • Receipt CRUD   │    │ • Receipts      │
│ • Reports UI    │    │ • OCR Service    │    │ • Transactions  │
│ • Role-based    │    │ • File Storage   │    │ • Categories    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │
        │              ┌─────────────────┐
        │              │  File Storage   │
        └──────────────┤                 │
                       │ • Local/S3      │
                       │ • OCR Pipeline  │
                       └─────────────────┘
```

**Data Flow:** User uploads receipt → OCR extracts text → Categorized transaction → Financial reports

## 🔄 Development Workflow

```bash
# Start development
docker-compose up -d

# View logs
docker-compose logs -f [backend|frontend|postgres]

# Backend development (optional local setup)
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && uvicorn main:app --reload

# Frontend development (optional local setup)
cd frontend && npm install && npm run dev

# Database migrations
docker-compose exec backend alembic upgrade head
```

## 🧪 Testing

```bash
# Backend tests
docker-compose exec backend pytest tests/ -v --cov=app

# Frontend tests  
docker-compose exec frontend npm run test

# Integration tests
docker-compose exec backend pytest tests/integration/ -v

# Test coverage reports
docker-compose exec backend pytest --cov-report=html
docker-compose exec frontend npm run test:coverage
```

## 🔒 Privacy & Security

**Receipt Data:** All uploaded receipts are encrypted at rest and contain sensitive financial information. Implement regular backups with encryption and ensure compliance with data protection regulations.

**Access Control:** Role-based permissions (Admin/Treasurer/Member/Viewer) restrict financial data access. JWT tokens expire automatically and passwords are hashed with bcrypt.

**Backup Strategy:** Database backups should be encrypted and stored securely offsite. Consider GDPR compliance for EU members and implement data retention policies.

## � Future Development

See [MVP Development Checklist](./docs/mvp-checklist.md) for day-by-day implementation tasks, feature roadmap, and deployment milestones.

---

**Version:** 1.0.0 | **License:** MIT | **Maintained by:** Church Treasury Team
