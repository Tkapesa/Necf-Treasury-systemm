#!/usr/bin/env python3
"""
Dummy Data Seeder for Church Treasury Management System

This script creates realistic financial data for testing and demonstrating
the beautiful modern charts functionality.
"""

import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal
import random
from typing import List

# Add the parent directory to the path to import our models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, create_engine, select
from app.models import Receipt, User, ReceiptStatus
from app.core.config import get_settings

# Categories with realistic spending patterns
CATEGORIES = [
    "Utilities", "Office Supplies", "Maintenance", "Events", "Ministry",
    "Food & Catering", "Transportation", "Technology", "Donations",
    "Education", "Music & Worship", "Cleaning", "Insurance", "Communications"
]

# Realistic vendors for each category
VENDORS = {
    "Utilities": ["City Electric Company", "Metro Water Works", "Natural Gas Corp", "Waste Management Inc"],
    "Office Supplies": ["Office Depot", "Staples", "Amazon Business", "Best Buy Business"],
    "Maintenance": ["ABC Repairs", "HandyMan Services", "Pro Maintenance Co", "Fix-It Solutions"],
    "Events": ["Party Supplies Plus", "Event Rentals LLC", "Catering Express", "Decorations R Us"],
    "Ministry": ["Christian Bookstore", "Ministry Resources", "Faith Publications", "Gospel Supplies"],
    "Food & Catering": ["Local Grocery", "Restaurant Supply", "Catering Services", "Food Mart"],
    "Transportation": ["Gas Station", "Auto Repair Shop", "Bus Rental Co", "Taxi Services"],
    "Technology": ["Tech Solutions", "Computer Store", "Software Licenses", "IT Services"],
    "Donations": ["Community Fund", "Charity Organization", "Relief Fund", "Mission Support"],
    "Education": ["Educational Materials", "Training Center", "Learning Resources", "Study Guides"],
    "Music & Worship": ["Music Store", "Instrument Rental", "Sound Equipment", "Worship Resources"],
    "Cleaning": ["Cleaning Supplies", "Janitorial Services", "Sanitation Co", "Hygiene Products"],
    "Insurance": ["Insurance Company", "Coverage Corp", "Protection Plus", "Risk Management"],
    "Communications": ["Phone Company", "Internet Provider", "Marketing Agency", "Print Shop"]
}

# Realistic spending amounts for each category
CATEGORY_RANGES = {
    "Utilities": (150, 800),
    "Office Supplies": (25, 300),
    "Maintenance": (100, 1200),
    "Events": (200, 1500),
    "Ministry": (50, 500),
    "Food & Catering": (100, 800),
    "Transportation": (30, 400),
    "Technology": (200, 2000),
    "Donations": (500, 3000),
    "Education": (75, 600),
    "Music & Worship": (100, 1000),
    "Cleaning": (40, 250),
    "Insurance": (300, 1000),
    "Communications": (80, 500)
}

def ensure_admin_user(session: Session) -> str:
    """Ensure there's an admin user and return their ID"""
    admin_user = session.exec(select(User).where(User.role == "admin")).first()
    
    if not admin_user:
        # Create admin user for seeding
        admin_user = User(
            username="admin",
            email="admin@church.org",
            role="admin",
            is_active=True,
            hashed_password="$2b$12$dummy_hash_for_seeding_only"  # This would normally be properly hashed
        )
        session.add(admin_user)
        session.commit()
        session.refresh(admin_user)
        print(f"✅ Created admin user with ID: {admin_user.id}")
    
    return admin_user.id

def generate_dummy_receipts(num_receipts: int = 150, admin_user_id: str = None) -> List[Receipt]:
    """Generate realistic dummy receipt data"""
    receipts = []
    
    # Generate receipts over the last 12 months
    start_date = datetime.now() - timedelta(days=365)
    
    for i in range(num_receipts):
        # Random date in the last 12 months
        random_days = random.randint(0, 365)
        receipt_date = start_date + timedelta(days=random_days)
        
        # Choose category and amount
        category = random.choice(CATEGORIES)
        min_amount, max_amount = CATEGORY_RANGES[category]
        amount = round(random.uniform(min_amount, max_amount), 2)
        
        # Choose vendor
        vendor = random.choice(VENDORS[category])
        
        # Create realistic receipt data
        receipt = Receipt(
            filename=f"receipt_{i+1:03d}.pdf",
            file_path=f"/uploads/receipts/dummy/receipt_{i+1:03d}.pdf",
            storage_path=f"/uploads/receipts/dummy/receipt_{i+1:03d}.pdf",
            file_size=random.randint(50000, 500000),
            mime_type="application/pdf",
            extracted_date=receipt_date,
            extracted_total=Decimal(str(amount)),
            extracted_vendor=vendor,
            extracted_currency="USD",
            category=category,
            description=f"{vendor} - {category}",
            uploader_id=admin_user_id,  # Use the admin user ID
            confidence_score=random.uniform(0.85, 0.98),
            status=ReceiptStatus.COMPLETED,
            created_at=receipt_date,
            updated_at=receipt_date
        )
        
        receipts.append(receipt)
    
    return receipts

def seed_database():
    """Seed the database with dummy data"""
    print("🌱 Starting database seeding with dummy financial data...")
    
    # Create database engine
    settings = get_settings()
    database_url = settings.DATABASE_URL
    engine = create_engine(database_url)
    
    # Create tables if they don't exist
    from sqlmodel import SQLModel
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # Check if we already have receipts
        existing_receipts = session.exec(select(Receipt)).all()
        if existing_receipts:
            print(f"Found {len(existing_receipts)} existing receipts.")
            print("Adding more dummy data automatically...")
            # Automatically add more data for demo purposes
        
        # Ensure we have an admin user
        admin_user_id = ensure_admin_user(session)
        
        # Generate dummy receipts
        print("📊 Generating realistic dummy receipt data...")
        dummy_receipts = generate_dummy_receipts(150, admin_user_id)
        
        # Add to database
        print("💾 Adding receipts to database...")
        for receipt in dummy_receipts:
            session.add(receipt)
        
        try:
            session.commit()
            print(f"✅ Successfully added {len(dummy_receipts)} dummy receipts!")
            
            # Print summary statistics
            total_amount = sum(float(r.extracted_total) for r in dummy_receipts)
            categories_used = set(r.category for r in dummy_receipts)
            
            print(f"\n📈 Dummy Data Summary:")
            print(f"   💰 Total Amount: ${total_amount:,.2f}")
            print(f"   📁 Categories: {len(categories_used)}")
            print(f"   📄 Receipts: {len(dummy_receipts)}")
            print(f"   📅 Date Range: Last 12 months")
            
            print(f"\n🎨 Your beautiful charts are now ready!")
            print(f"   🌐 Frontend: http://localhost:3001")
            print(f"   👑 Go to Admin Dashboard → Live Charts & Analytics")
            
        except Exception as e:
            session.rollback()
            print(f"❌ Error adding dummy data: {e}")
            raise

if __name__ == "__main__":
    seed_database()
