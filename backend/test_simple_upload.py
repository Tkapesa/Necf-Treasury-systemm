#!/usr/bin/env python3

import sys
import os
import tempfile
import requests
from PIL import Image, ImageDraw, ImageFont

# Add backend to path
sys.path.append('/Users/user/Documents/HEALTHY DDS/NECF TREASURY /backend')

#!/usr/bin/env python3
"""
Simple upload test to debug the issue
"""
import requests
import os

# Test image path
test_image_path = "/Users/user/Documents/HEALTHY DDS/NECF TREASURY /backend/test_receipt.png"

def test_simple_upload():
    print("🧪 Testing simple upload endpoint...")
    
    url = "http://localhost:8000/api/v1/receipts/test-upload"
    
    try:
        with open(test_image_path, 'rb') as f:
            files = {'file': ('test_receipt.png', f, 'image/png')}
            
            print(f"📤 Uploading to {url}")
            response = requests.post(url, files=files, timeout=30)
            
            print(f"📊 Response Status: {response.status_code}")
            print(f"📄 Response Text: {response.text[:500]}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ TEST UPLOAD SUCCESS!")
                print(f"🏪 Vendor: {data.get('extracted_vendor', 'N/A')}")
                print(f"💰 Total: {data.get('extracted_total', 'N/A')} TL")
                print(f"📄 OCR Text Preview: {data.get('ocr_text', '')[:100]}...")
                return True
            else:
                print(f"❌ Test upload failed with status {response.status_code}")
                print(f"Error: {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ Exception during test upload: {e}")
        return False

if __name__ == "__main__":
    test_simple_upload()
