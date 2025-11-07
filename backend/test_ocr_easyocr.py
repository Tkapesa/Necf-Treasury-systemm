#!/usr/bin/env python3
"""
Test script to verify OCR functionality with EasyOCR
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.services.ocr_service import OCRService

async def test_ocr():
    """Test OCR service with EasyOCR"""
    
    print("🧪 Testing OCR Service with EasyOCR...")
    
    ocr_service = OCRService()
    
    # Look for test images in uploads directory
    uploads_dir = Path("uploads/receipts")
    
    if not uploads_dir.exists():
        print("❌ No uploads directory found")
        return
    
    # Find some image files to test
    image_files = []
    for ext in ['*.jpg', '*.jpeg', '*.png']:
        image_files.extend(uploads_dir.glob(f"**/{ext}"))
    
    if not image_files:
        print("❌ No image files found in uploads directory")
        return
    
    # Test the first few images
    test_files = image_files[:3]
    
    for i, image_file in enumerate(test_files):
        print(f"\n📸 Testing image {i+1}: {image_file.name}")
        
        try:
            # Test text extraction
            extracted_text = await ocr_service.extract_text(str(image_file))
            
            print(f"📄 Extracted text length: {len(extracted_text)}")
            if extracted_text:
                print(f"📝 First 200 chars: {extracted_text[:200]}")
            else:
                print("❌ No text extracted")
            
            # Test structured data extraction
            structured_data = await ocr_service.extract_structured_data(str(image_file))
            
            print(f"🏪 Vendor: {structured_data.get('vendor_name', 'N/A')}")
            print(f"💰 Total: {structured_data.get('total_amount', 0)}")
            print(f"📅 Date: {structured_data.get('date', 'N/A')}")
            print(f"🎯 Confidence: {structured_data.get('confidence', 0)}")
            
        except Exception as e:
            print(f"❌ Error processing {image_file.name}: {e}")

if __name__ == "__main__":
    asyncio.run(test_ocr())
