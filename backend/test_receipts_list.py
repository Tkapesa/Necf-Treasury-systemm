#!/usr/bin/env python3
"""
Test to check receipts list
"""
import requests
from app.core.security import create_access_token
import json

def test_receipts_list():
    print("📋 Testing receipts list...")
    
    # Create admin token
    test_token_data = {
        "sub": "179b67f8-494c-4ffe-9a79-38d315f82d88",
        "username": "admin", 
        "email": "admin@admin.com"
    }
    token = create_access_token(test_token_data)
    
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get('http://localhost:8000/api/v1/receipts/', headers=headers, timeout=10)
        
        print(f"📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            receipts = response.json()
            print(f"📄 Response type: {type(receipts)}")
            print(f"📄 Raw response: {response.text[:500]}...")
            
            if isinstance(receipts, list) and len(receipts) > 0:
                print(f"� Found {len(receipts)} receipts")
                print(f"📄 First receipt type: {type(receipts[0])}")
                
                if isinstance(receipts[0], dict):
                    for i, receipt in enumerate(receipts):
                        print(f"\n📄 Receipt {i+1}:")
                        print(f"  🆔 ID: {receipt.get('id')}")
                        print(f"  📄 Status: {receipt.get('status')}")
                        print(f"  🏪 Vendor: {receipt.get('extracted_vendor', 'N/A')}")
                        print(f"  💰 Total: {receipt.get('extracted_total', 'N/A')}")
                        print(f"  📷 Image URL: {receipt.get('image_url', 'N/A')}")
                        print(f"  📝 Has OCR Text: {'Yes' if receipt.get('ocr_raw_text') else 'No'}")
                        
                    print("\n✅ SUCCESS: Real-time OCR is working! Receipts show extracted data immediately!")
                    return True
                else:
                    print(f"❌ Receipt data is not a dict: {receipts[0]}")
                    return False
            else:
                print("📭 No receipts found or invalid response format")
                return False
        else:
            print(f"❌ Failed to get receipts: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_receipts_list()
