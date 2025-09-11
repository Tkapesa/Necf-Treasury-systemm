#!/usr/bin/env python3
"""
Simple test to view actual receipt data in the database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, create_engine, select
from app.models import Receipt
from app.core.config import get_settings

def view_receipts():
    """Display actual receipt data from database"""
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    
    with Session(engine) as session:
        print("🧪 Checking actual receipt data in database...")
        
        # Get total count
        total_count = session.exec(select(Receipt).where(Receipt.status == "COMPLETED")).fetchall()
        print(f"\n📊 Total receipts with COMPLETED status: {len(total_count)}")
        
        # Get first 10 receipts
        receipts = session.exec(
            select(Receipt)
            .where(Receipt.status == "COMPLETED")
            .order_by(Receipt.created_at.desc())
            .limit(10)
        ).fetchall()
        
        print(f"\n📄 Sample receipts (first 10):")
        for i, receipt in enumerate(receipts, 1):
            print(f"   {i}. {receipt.filename}")
            print(f"      💰 Amount: ${receipt.extracted_total}")
            print(f"      🏪 Vendor: {receipt.extracted_vendor}")
            print(f"      📅 Date: {receipt.extracted_date}")
            print(f"      📂 Category: {receipt.category}")
            print(f"      📊 Status: {receipt.status}")
            print(f"      👤 Uploader: {receipt.uploader_id}")
            print("")

if __name__ == "__main__":
    view_receipts()
