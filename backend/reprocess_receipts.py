#!/usr/bin/env python3
"""
Script to reprocess existing receipts that have empty OCR data.
This will fix receipts that were processed before the OCR service was working properly.
"""

import asyncio
import os
from app.core.database import get_session
from app.models import Receipt, ReceiptStatus
from app.services.ocr_service import OCRService
from sqlmodel import select

async def reprocess_empty_receipts():
    """Reprocess receipts that have empty vendor or total data."""
    session_gen = get_session()
    session = next(session_gen)
    
    try:
        # Find receipts with missing data
        statement = select(Receipt).where(
            (Receipt.extracted_vendor == None) | 
            (Receipt.extracted_vendor == '') |
            (Receipt.extracted_total == None) |
            (Receipt.extracted_total == 0)
        )
        receipts = session.exec(statement).all()
        
        print(f"📋 Found {len(receipts)} receipts to reprocess")
        
        ocr_service = OCRService()
        processed = 0
        
        for receipt in receipts:
            try:
                print(f"\n🔄 Processing receipt: {receipt.filename}")
                
                # Check if file exists
                if not os.path.exists(receipt.storage_path):
                    print(f"❌ File not found: {receipt.storage_path}")
                    continue
                
                # Extract OCR data
                structured_data = await ocr_service.extract_structured_data(receipt.storage_path)
                
                # Update receipt with new data
                receipt.ocr_raw_text = structured_data.get('raw_text', '')
                receipt.extracted_vendor = structured_data.get('vendor_name', '')
                receipt.extracted_total = structured_data.get('total_amount', 0)
                receipt.ocr_confidence = structured_data.get('confidence', 0.95)
                receipt.processing_time = structured_data.get('processing_time', 1.2)
                receipt.status = ReceiptStatus.COMPLETED
                
                # Update extracted items if available
                items = structured_data.get('items', [])
                if items:
                    receipt.extracted_items = str(items)
                
                session.add(receipt)
                processed += 1
                
                print(f"✅ Updated: {structured_data.get('vendor_name', 'Unknown')} - {structured_data.get('total_amount', 0)} TL")
                
            except Exception as e:
                print(f"❌ Failed to process {receipt.filename}: {e}")
                continue
        
        # Commit all changes
        session.commit()
        print(f"\n🎉 Successfully reprocessed {processed} receipts!")
        
    except Exception as e:
        print(f"❌ Reprocessing failed: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    asyncio.run(reprocess_empty_receipts())
