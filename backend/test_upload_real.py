#!/usr/bin/env python3

import asyncio
import requests
import tempfile
from PIL import Image, ImageDraw, ImageFont
import sys
import os

# Add the backend directory to Python path
sys.path.append('.')

from app.core.security import create_access_token

async def test_real_upload():
    print("🚀 Testing real receipt upload with immediate OCR...")
    
    try:
        # Create a test token for admin user
        test_token_data = {
            "sub": "1",  # user_id
            "username": "admin",
            "email": "admin@necf.org"
        }
        test_token = create_access_token(test_token_data)
        print("✅ Generated test token")
        
        # Create a test receipt image with some text
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
            # Create a more realistic receipt-like image
            img = Image.new('RGB', (400, 600), color='white')
            draw = ImageDraw.Draw(img)
            
            # Add some receipt-like text
            try:
                # Try to use a default font
                font = ImageFont.load_default()
            except:
                font = None
            
            # Draw receipt content
            draw.text((20, 20), "MIGROS MARKET", fill='black', font=font)
            draw.text((20, 50), "Izmir Alsancak Subesi", fill='black', font=font)
            draw.text((20, 80), "========================", fill='black', font=font)
            draw.text((20, 110), "Ekmek                 5.50 TL", fill='black', font=font)
            draw.text((20, 140), "Sut                  12.75 TL", fill='black', font=font)
            draw.text((20, 170), "Peynir               28.90 TL", fill='black', font=font)
            draw.text((20, 200), "========================", fill='black', font=font)
            draw.text((20, 230), "TOPLAM:              47.15 TL", fill='black', font=font)
            draw.text((20, 260), "KDV DAHIL", fill='black', font=font)
            
            img.save(tmp_file.name)
            
            print(f'📷 Created test receipt with Turkish content: {tmp_file.name}')
            
            # Test upload to actual API
            url = 'http://localhost:8000/api/v1/receipts/upload'
            
            with open(tmp_file.name, 'rb') as f:
                files = {'file': ('test_receipt.png', f, 'image/png')}
                data = {
                    'category': 'groceries',
                    'notes': 'Test Turkish receipt upload'
                }
                
                # Use generated auth token
                headers = {
                    'Authorization': f'Bearer {test_token}'
                }
                
                print("📤 Uploading receipt to API...")
                response = requests.post(url, files=files, data=data, headers=headers)
                
                print(f"📊 Response status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    print("✅ Upload successful!")
                    print(f"🆔 Receipt ID: {result.get('id')}")
                    print(f"📄 Status: {result.get('status')}")
                    print(f"🏪 Vendor: {result.get('extracted_vendor', 'N/A')}")
                    print(f"💰 Total: {result.get('extracted_total', 0)} TL")
                    print(f"📝 OCR Text: {result.get('ocr_raw_text', 'N/A')[:100]}...")
                    
                    if result.get('status') == 'COMPLETED':
                        print("🎉 IMMEDIATE PROCESSING WORKING!")
                        print("🔥 User will see OCR results immediately!")
                    else:
                        print("⚠️ Still shows processing status - needs investigation")
                        
                else:
                    print(f"❌ Upload failed: {response.text}")
                    if response.status_code == 401:
                        print("🔑 Authentication issue - token might be invalid")
                    elif response.status_code == 422:
                        print("📋 Validation error - check request format")
                    
            # Clean up
            os.unlink(tmp_file.name)
                    
    except Exception as e:
        print(f"❌ Error testing upload: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_real_upload())
