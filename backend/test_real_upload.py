#!/usr/bin/env python3

from PIL import Image, ImageDraw, ImageFont
import tempfile
import requests
import os

# Create a test receipt image
with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
    img = Image.new('RGB', (400, 600), color='white')
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.load_default()
    except:
        font = None
    
    # Draw receipt content
    draw.text((20, 20), 'MIGROS MARKET', fill='black', font=font)
    draw.text((20, 50), 'Izmir Alsancak Subesi', fill='black', font=font)
    draw.text((20, 80), '========================', fill='black', font=font)
    draw.text((20, 110), 'Ekmek                 8.50 TL', fill='black', font=font)
    draw.text((20, 140), 'Sut                  12.75 TL', fill='black', font=font)
    draw.text((20, 170), 'Peynir               28.90 TL', fill='black', font=font)
    draw.text((20, 200), '========================', fill='black', font=font)
    draw.text((20, 230), 'TOPLAM:              47.15 TL', fill='black', font=font)
    draw.text((20, 260), 'KDV DAHIL', fill='black', font=font)
    
    img.save(tmp_file.name)
    print(f'📷 Created test receipt: {tmp_file.name}')
    
    # Test upload to our new test endpoint
    url = 'http://localhost:8000/api/v1/receipts/test-upload'
    
    with open(tmp_file.name, 'rb') as f:
        files = {'file': ('test_receipt.png', f, 'image/png')}
        
        print("📤 Testing upload to test endpoint...")
        response = requests.post(url, files=files)
        
        print(f"📊 Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Test upload successful!")
            print(f"🏪 Vendor: {result.get('extracted_vendor', 'N/A')}")
            print(f"💰 Total: {result.get('extracted_total', 0)} TL")
            print(f"📝 OCR Text Preview: {result.get('ocr_text', 'N/A')}")
            print(f"📊 Confidence: {result.get('confidence', 0)}%")
            print(f"📄 Status: {result.get('status')}")
            print(f"💬 Message: {result.get('message')}")
            print("🎉 REAL-TIME OCR WORKING!")
        else:
            print(f"❌ Test upload failed: {response.text}")
    
    # Clean up
    os.unlink(tmp_file.name)
    print("🧹 Cleaned up test file")
