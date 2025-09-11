#!/usr/bin/env python3
"""
Emergency fix for all receipts - reprocess with enhanced OCR
"""

import sys
import os
from pathlib import Path

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import get_session
from app.models import Receipt
from app.services.ocr_service import OCRService
from sqlmodel import select

def fix_all_receipts():
    """Reprocess all receipts with the enhanced OCR system"""
    
    print("🔧 Starting emergency receipt fix...")
    
    # Initialize OCR service
    ocr_service = OCRService()
    
    with next(get_session()) as session:
        # Get all receipts
        receipts = session.exec(select(Receipt)).all()
        
        print(f"📋 Found {len(receipts)} receipts to process")
        
        for i, receipt in enumerate(receipts, 1):
            print(f"\n🔄 Processing receipt {i}/{len(receipts)}: {receipt.filename}")
            
            try:
                # Check if file exists
                file_path = Path(receipt.storage_path)
                if not file_path.exists():
                    print(f"   ❌ File not found: {file_path}")
                    continue
                
                # Process with OCR
                with open(file_path, 'rb') as file:
                    file_content = file.read()
                
                # Extract OCR data
                ocr_result = ocr_service.extract_text_and_data(
                    file_content, 
                    receipt.filename
                )
                
                # Update receipt with extracted data
                receipt.ocr_raw_text = ocr_result.raw_text
                receipt.ocr_confidence = ocr_result.confidence
                receipt.extracted_vendor = ocr_result.vendor
                receipt.extracted_total = ocr_result.amount
                receipt.extracted_date = ocr_result.date
                receipt.status = "COMPLETED"
                
                print(f"   ✅ Updated: vendor='{ocr_result.vendor}', total={ocr_result.amount}")
                
            except Exception as e:
                print(f"   ❌ Error processing receipt: {str(e)}")
                continue
        
        # Commit all changes
        session.commit()
        print(f"\n🎉 Successfully processed {len(receipts)} receipts!")
        
        # Show sample results
        print("\n📊 Sample results:")
        sample_receipts = session.exec(select(Receipt).limit(3)).all()
        for receipt in sample_receipts:
            print(f"   • {receipt.filename}: vendor='{receipt.extracted_vendor}', total={receipt.extracted_total}")

if __name__ == "__main__":
    fix_all_receipts()
