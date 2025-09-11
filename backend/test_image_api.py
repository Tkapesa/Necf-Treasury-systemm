#!/usr/bin/env python3

import requests
import os

# Test the image endpoint
def test_image_endpoint():
    # Login first to get token
    login_data = {
        'username': 'admin@church.org',
        'password': 'admin123'
    }
    
    try:
        login_response = requests.post(
            'http://localhost:8011/api/v1/auth/login',
            data=login_data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.status_code}")
            print(login_response.text)
            return
        
        token_data = login_response.json()
        access_token = token_data.get('access_token')
        
        if not access_token:
            print("No access token received")
            return
        
        print(f"✅ Login successful, got token")
        
        # Get receipts list
        headers = {'Authorization': f'Bearer {access_token}'}
        receipts_response = requests.get(
            'http://localhost:8011/api/v1/receipts?page=1&page_size=5',
            headers=headers
        )
        
        if receipts_response.status_code != 200:
            print(f"Failed to get receipts: {receipts_response.status_code}")
            print(receipts_response.text)
            return
        
        receipts_data = receipts_response.json()
        receipts = receipts_data.get('receipts', [])
        
        print(f"✅ Got {len(receipts)} receipts")
        
        # Test image endpoint for each receipt
        for receipt in receipts[:3]:  # Test first 3
            receipt_id = receipt.get('id')
            vendor = receipt.get('extracted_vendor', 'Unknown')
            
            print(f"\nTesting receipt {receipt_id} ({vendor})")
            
            image_response = requests.get(
                f'http://localhost:8011/api/v1/receipts/{receipt_id}/image',
                headers=headers
            )
            
            print(f"Image endpoint status: {image_response.status_code}")
            
            if image_response.status_code == 200:
                content_type = image_response.headers.get('content-type', '')
                content_length = len(image_response.content)
                print(f"✅ Image retrieved: {content_type}, {content_length} bytes")
            else:
                print(f"❌ Image failed: {image_response.text}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test_image_endpoint()
