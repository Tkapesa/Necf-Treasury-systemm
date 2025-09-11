#!/usr/bin/env python3

import asyncio
import sys
import os
import tempfile
import requests
from PIL import Image, ImageDraw, ImageFont

# Add backend to path
sys.path.append('/Users/user/Documents/HEALTHY DDS/NECF TREASURY /backend')

async def test_full_upload_flow():
    """Test the complete upload and OCR flow"""
    print("🚀 TESTING COMPLETE UPLOAD FLOW...")
    
    # Create a realistic test receipt
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
        # Create a detailed receipt image
        img = Image.new('RGB', (400, 600), color='white')
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.load_default()
        except:
            font = None
        
        # Draw realistic receipt content
        draw.text((20, 20), 'MIGROS MARKET', fill='black', font=font)
        draw.text((20, 50), 'Izmir Alsancak Subesi', fill='black', font=font)
        draw.text((20, 80), 'Tel: +90 232 123 4567', fill='black', font=font)
        draw.text((20, 120), '========================', fill='black', font=font)
        draw.text((20, 150), '2 ADET Ekmek          17.00 TL', fill='black', font=font)
        draw.text((20, 180), '1 ADET Sut 1L         12.75 TL', fill='black', font=font)
        draw.text((20, 210), '3 ADET Yoğurt         21.90 TL', fill='black', font=font)
        draw.text((20, 240), '1 ADET Peynir 500g    45.50 TL', fill='black', font=font)
        draw.text((20, 280), '========================', fill='black', font=font)
        draw.text((20, 310), 'TOPLAM:               97.15 TL', fill='black', font=font)
        draw.text((20, 340), 'NAKİT:               100.00 TL', fill='black', font=font)
        draw.text((20, 370), 'PARA ÜSTÜ:             2.85 TL', fill='black', font=font)
        draw.text((20, 410), '05.09.2025    14:35', fill='black', font=font)
        draw.text((20, 440), 'FİŞ NO: R4587', fill='black', font=font)
        draw.text((20, 480), 'Teşekkür ederiz!', fill='black', font=font)
        
        img.save(tmp_file.name)
        print(f"📷 Created realistic receipt: {tmp_file.name}")
        
        # Test 1: Direct OCR processing
        print("\n🔍 TESTING DIRECT OCR...")
        try:
            from app.services.ocr_service import get_ocr_service
            
            ocr_service = get_ocr_service()
            
            # Test OCR extraction
            raw_text = await ocr_service.extract_text(tmp_file.name)
            structured_data = await ocr_service.extract_structured_data(tmp_file.name)
            
            print("✅ OCR PROCESSING SUCCESSFUL!")
            print(f"🏪 Vendor: {structured_data.get('vendor_name', 'N/A')}")
            print(f"💰 Total: {structured_data.get('total_amount', 0)} TL")
            print(f"📊 Confidence: {structured_data.get('confidence', 0)}%")
            print(f"📝 Raw text preview: {raw_text[:100]}...")
            
        except Exception as e:
            print(f"❌ OCR processing failed: {e}")
            import traceback
            traceback.print_exc()
            return False
        
        # Test 2: API Upload with authentication
        print("\n📤 TESTING API UPLOAD...")
        try:
            # Get the actual admin user ID from database
            from app.core.database import get_session
            from app.models import User
            from sqlmodel import select
            
            session_gen = get_session()
            session = next(session_gen)
            
            try:
                statement = select(User).where(User.username == "admin")
                admin_user = session.exec(statement).first()
                
                if not admin_user:
                    print("❌ No admin user found")
                    return False
                
                print(f"👤 Found admin user: {admin_user.id}")
                
                # Create admin user token with real ID
                from app.core.security import create_access_token
                
                test_token_data = {
                    "sub": str(admin_user.id),
                    "username": admin_user.username, 
                    "email": admin_user.email
                }
                test_token = create_access_token(test_token_data)
                print("🔑 Generated authentication token")
                
            finally:
                session.close()
            
            # Test upload to API
            url = 'http://localhost:8000/api/v1/receipts/upload'
            
            with open(tmp_file.name, 'rb') as f:
                files = {'file': ('test_receipt.png', f, 'image/png')}
                data = {
                    'category': 'groceries',
                    'vendor_name': 'MIGROS MARKET'
                }
                headers = {
                    'Authorization': f'Bearer {test_token}'
                }
                
                print("📤 Uploading to API...")
                response = requests.post(url, files=files, data=data, headers=headers, timeout=30)
                
                print(f"📊 Response Status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    print("✅ API UPLOAD SUCCESSFUL!")
                    print(f"🆔 Receipt ID: {result.get('id')}")
                    print(f"📄 Status: {result.get('status')}")
                    print(f"🏪 Extracted Vendor: {result.get('extracted_vendor', 'N/A')}")
                    print(f"💰 Extracted Total: {result.get('extracted_total', 0)} TL")
                    print(f"📝 OCR Text: {result.get('ocr_raw_text', 'N/A')[:100]}...")
                    
                    if result.get('status') in ['COMPLETED', 'completed']:
                        print("🎉 REAL-TIME PROCESSING WORKING!")
                        return True
                    else:
                        print("⚠️ Receipt still processing - not real-time")
                        print(f"Status received: '{result.get('status')}'")
                        return False
                else:
                    print(f"❌ API upload failed: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ API upload error: {e}")
            import traceback
            traceback.print_exc()
            return False
        
        finally:
            # Clean up
            try:
                os.unlink(tmp_file.name)
            except:
                pass

if __name__ == "__main__":
    success = asyncio.run(test_full_upload_flow())
    
    if success:
        print("\n🎯 SUCCESS: Real-time OCR is working!")
        print("✅ Upload functionality confirmed")
        print("✅ OCR extraction confirmed") 
        print("✅ Data showing immediately")
    else:
        print("\n❌ FAILED: Issues found that need fixing")
        print("🔧 Debugging required for real-time processing")
