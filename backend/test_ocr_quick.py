#!/usr/bin/env python3

import asyncio
import sys
import tempfile
from PIL import Image

sys.path.append('.')

async def test_upload():
    print("🔍 Testing OCR service integration...")
    
    try:
        from app.services.ocr_service import get_ocr_service
        print("✅ OCR service import successful")
        
        # Create a test image
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
            img = Image.new('RGB', (600, 800), color='white')
            img.save(tmp_file.name)
            
            print(f'📷 Created test image: {tmp_file.name}')
            
            # Test OCR
            ocr_service = get_ocr_service()
            print("✅ OCR service initialized")
            
            extracted_text = await ocr_service.extract_text(tmp_file.name)
            structured_data = await ocr_service.extract_structured_data(tmp_file.name)
            
            print(f'✅ OCR processing complete!')
            print(f'📝 Raw text: {extracted_text[:100]}...')
            print(f'🏪 Vendor: {structured_data.get("vendor_name", "N/A")}')
            print(f'💰 Total: {structured_data.get("total_amount", 0)} TL')
            print(f'📊 Confidence: {structured_data.get("confidence", 0)}%')
            
            return True
            
    except Exception as e:
        print(f"❌ Error testing OCR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(test_upload())
