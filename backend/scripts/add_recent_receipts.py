#!/usr/bin/env python3
"""
Add Recent Dummy Receipt Data for Frontend Testing

This script adds recent receipts to make them visible in the dashboard
"""

import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal
import random
from typing import List

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, create_engine, select
from app.models import Receipt, User, ReceiptStatus
from app.core.config import get_settings

# Categories and vendors
CATEGORIES = [
    "Utilities", "Office Supplies", "Maintenance", "Events", "Ministry",
    "Food & Catering", "Transportation", "Technology", "Donations",
    "Education", "Music & Worship", "Cleaning", "Insurance", "Communications"
]

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

def get_admin_user(session: Session) -> str:
    """Get the admin user ID"""
    admin_user = session.exec(select(User).where(User.role == "admin")).first()
    if not admin_user:
        raise Exception("No admin user found. Please run the main seeding script first.")
    return admin_user.id

def generate_recent_receipts(admin_user_id: str, num_receipts: int = 50) -> List[Receipt]:
    """Generate recent receipt data for better visibility"""
    receipts = []
    
    for i in range(num_receipts):
        # Generate recent dates (last 30 days with heavy bias towards recent)
        if i < 15:  # 15 very recent (last 7 days)
            days_back = random.randint(0, 7)
        elif i < 35:  # 20 recent (last 2 weeks)
            days_back = random.randint(7, 14)
        else:  # 15 older (last month)
            days_back = random.randint(14, 30)
            
        receipt_date = datetime.now() - timedelta(days=days_back)
        
        # Choose category and amount
        category = random.choice(CATEGORIES)
        min_amount, max_amount = CATEGORY_RANGES[category]
        amount = round(random.uniform(min_amount, max_amount), 2)
        
        # Choose vendor
        vendor = random.choice(VENDORS[category])
        
        # Generate more realistic descriptions
        descriptions = [
            f"Monthly {category.lower()} payment to {vendor}",
            f"Purchase of {category.lower()} supplies from {vendor}",
            f"Service invoice from {vendor}",
            f"{category} expense - {vendor}",
            f"Equipment and supplies from {vendor}",
            f"Professional services - {vendor}",
            f"Contracted work from {vendor}"
        ]
        
        # Create recent receipt data
        receipt = Receipt(
            filename=f"recent_receipt_{i+1:03d}.pdf",
            storage_path=f"/uploads/receipts/recent/receipt_{i+1:03d}.pdf",
            file_size=random.randint(75000, 750000),
            mime_type="application/pdf",
            extracted_date=receipt_date,
            extracted_total=Decimal(str(amount)),
            extracted_vendor=vendor,
            extracted_currency="USD",
            category=category,
            description=random.choice(descriptions),
            uploader_id=admin_user_id,
            confidence_score=random.uniform(0.88, 0.99),
            status=ReceiptStatus.COMPLETED,
            ocr_raw_text=f"""RECEIPT
{vendor}
Date: {receipt_date.strftime('%B %d, %Y')}
Time: {receipt_date.strftime('%I:%M %p')}

{random.choice(descriptions)}

Subtotal: ${amount * 0.92:.2f}
Tax: ${amount * 0.08:.2f}
TOTAL: ${amount}

Payment Method: Credit Card
Card ending in: {random.randint(1000, 9999)}

Thank you for your business!""",
            created_at=receipt_date,
            updated_at=receipt_date
        )
        
        receipts.append(receipt)
    
    return receipts

def add_recent_data():
    """Add recent receipt data"""
    print("📝 Adding recent dummy receipt data for dashboard visibility...")
    
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    
    with Session(engine) as session:
        # Get admin user
        admin_user_id = get_admin_user(session)
        print(f"✅ Found admin user: {admin_user_id}")
        
        # Check existing recent receipts
        existing_recent = session.exec(
            select(Receipt).where(Receipt.filename.like("recent_receipt_%"))
        ).fetchall()
        
        if existing_recent:
            print(f"Found {len(existing_recent)} existing recent receipts.")
            response = input("Do you want to add more recent receipts? (y/N): ")
            if response.lower() != 'y':
                print("❌ Adding recent receipts cancelled.")
                return
        
        # Generate recent receipts
        print("📊 Generating recent receipt data...")
        recent_receipts = generate_recent_receipts(admin_user_id, 50)
        
        # Add to database
        print("💾 Adding recent receipts to database...")
        for receipt in recent_receipts:
            session.add(receipt)
        
        try:
            session.commit()
            print(f"✅ Successfully added {len(recent_receipts)} recent receipts!")
            
            # Print summary
            total_amount = sum(float(r.extracted_total) for r in recent_receipts)
            categories_used = set(r.category for r in recent_receipts)
            
            print(f"\n📈 Recent Data Summary:")
            print(f"   💰 Total Amount: ${total_amount:,.2f}")
            print(f"   📁 Categories: {len(categories_used)}")
            print(f"   📄 Receipts: {len(recent_receipts)}")
            print(f"   📅 Date Range: Last 30 days")
            
            print(f"\n🎨 Recent receipts should now be visible in your dashboard!")
            print(f"   🌐 Frontend: http://localhost:3001")
            print(f"   👑 Go to Admin Dashboard to see recent receipts")
            
        except Exception as e:
            session.rollback()
            print(f"❌ Error adding recent data: {e}")
            raise

if __name__ == "__main__":
    add_recent_data()
