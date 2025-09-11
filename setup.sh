#!/bin/bash

# Setup script for Church Treasury Management System
# Installs dependencies and sets up the development environment

set -e

echo "🏗️  Setting up Church Treasury Management System..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Backend setup
echo "📦 Installing backend dependencies..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
echo "Installing Python packages..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Backend dependencies installed!"

# Frontend setup
cd ../frontend
echo "📦 Installing frontend dependencies..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Install npm dependencies
npm install

echo "✅ Frontend dependencies installed!"

# Environment setup
cd ..
echo "⚙️  Setting up environment files..."

# Copy environment files if they don't exist
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo "📝 Created backend/.env from example"
    else
        echo "Creating basic backend/.env file..."
        cat > backend/.env << EOF
# Database Configuration
DATABASE_URL=postgresql://treasury_user:treasury_pass@localhost:5432/church_treasury

# Security Configuration
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Storage Configuration
STORAGE_TYPE=local
UPLOAD_DIR=./uploads

# Optional: AWS S3 Configuration (if using S3)
# AWS_ACCESS_KEY_ID=your-aws-key
# AWS_SECRET_ACCESS_KEY=your-aws-secret
# S3_BUCKET=church-treasury-receipts

# OCR Configuration
OCR_ENABLED=true

# Debug Mode
DEBUG=true
EOF
    fi
fi

if [ ! -f "frontend/.env" ]; then
    echo "Creating frontend/.env file..."
    cat > frontend/.env << EOF
VITE_API_URL=http://localhost:8000/api/v1
EOF
fi

echo "✅ Environment files created!"

# Database setup instructions
echo ""
echo "🗄️  Database Setup Instructions:"
echo "1. Start the database with Docker Compose:"
echo "   docker-compose up -d postgres"
echo ""
echo "2. Run database migrations:"
echo "   cd backend && source venv/bin/activate && alembic upgrade head"
echo ""
echo "3. Create an admin user (optional):"
echo "   cd backend && python -c \"
from app.core.database import get_session
from app.core.security import get_password_hash
from app.models import User, UserRole
from sqlmodel import Session

# This will be available after running migrations
# with Session(engine) as session:
#     admin = User(
#         username='admin',
#         email='admin@church.org',
#         hashed_password=get_password_hash('AdminPass123'),
#         role=UserRole.ADMIN,
#         is_active=True
#     )
#     session.add(admin)
#     session.commit()
#     print('Admin user created: admin@church.org / AdminPass123')
\""

echo ""
echo "🚀 Quick Start Options:"
echo ""
echo "Option 1 - Full Docker Setup (Recommended):"
echo "   docker-compose up -d"
echo ""
echo "Option 2 - Local Development:"
echo "   # Terminal 1 - Database"
echo "   docker-compose up -d postgres"
echo ""
echo "   # Terminal 2 - Backend"
echo "   cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo ""
echo "   # Terminal 3 - Frontend"
echo "   cd frontend && npm run dev"
echo ""
echo "📊 Access Points:"
echo "   Frontend:     http://localhost:3000"
echo "   Backend API:  http://localhost:8000"
echo "   API Docs:     http://localhost:8000/docs"
echo "   pgAdmin:      http://localhost:5050"
echo ""
echo "✅ Setup complete! Choose your preferred startup method above."
