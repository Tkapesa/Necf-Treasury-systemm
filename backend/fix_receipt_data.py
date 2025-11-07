#!/usr/bin/env python3
"""
Quick fix script to populate receipt data for dashboard testing.
This will add mock OCR data to existing receipts so they display properly.
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlmodel import Session, select
from app.core.database import engine
from app.models import Receipt, ReceiptStatus

async def fix_receipt_data():
    """Fix receipt data by populating missing extracted fields."""
    
    print("🔧 Starting receipt data fix...")
    
    with Session(engine) as session:
        # Get all receipts with empty extracted data
        statement = select(Receipt).where(
            (Receipt.extracted_vendor == "") | 
            (Receipt.extracted_vendor.is_(None)) |
            (Receipt.extracted_total.is_(None))
        )
        receipts = session.exec(statement).all()
        
        print(f"📋 Found {len(receipts)} receipts needing data fix")
        
        # Sample vendor names for realistic data
        sample_vendors = [
            "BERKAY MARKET",
            "TESCO EXTRA", 
            "LIDL STORE",
            "CARREFOUR SA",
            "MIGROS M",
            "BIM MARKET",
            "A101 MARKET",
            "ŞEKERCIOĞLU PHARMACY",
            "MEDIA MARKT",
            "KOTON STORE"
        ]
        
        # Sample amounts
        sample_amounts = [25.50, 48.75, 156.30, 89.99, 34.50, 67.25, 123.80, 45.60, 78.90, 92.15]
        
        updated_count = 0
        
        for i, receipt in enumerate(receipts):
            try:
                # Use modulo to cycle through sample data
                vendor_index = i % len(sample_vendors)
                amount_index = i % len(sample_amounts)
                
                # Update the receipt with sample data
                receipt.extracted_vendor = sample_vendors[vendor_index]
                receipt.extracted_total = sample_amounts[amount_index]
                receipt.status = ReceiptStatus.COMPLETED
                receipt.ocr_confidence = 0.85
                
                session.add(receipt)
                updated_count += 1
                
                print(f"✅ Updated {receipt.filename}: {receipt.extracted_vendor} - {receipt.extracted_total} TL")
                
            except Exception as e:
                print(f"❌ Error updating {receipt.filename}: {e}")
        
        # Commit all changes
        session.commit()
        
        print(f"🎉 Successfully updated {updated_count} receipts!")
        
        # Verify the changes
        statement = select(Receipt).where(Receipt.extracted_vendor.isnot(None))
        updated_receipts = session.exec(statement).all()
        print(f"📊 Total receipts with extracted data: {len(updated_receipts)}")

if __name__ == "__main__":
    asyncio.run(fix_receipt_data())
