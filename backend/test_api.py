#!/usr/bin/env python3
"""
Test script to verify the API is working properly with authentication
"""
import requests
import json

BASE_URL = "http://localhost:8011/api/v1"

def test_api():
    print("🔄 Testing Church Treasury API...")
    
    # Test health endpoint
    try:
        health_response = requests.get("http://localhost:8011/health")
        print(f"✅ Health check: {health_response.status_code} - {health_response.json()}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return
    
    # Test login
    try:
        login_data = {
            "username": "admin@church.org",
            "password": "admin123"
        }
        
        login_response = requests.post(
            f"{BASE_URL}/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            access_token = token_data["access_token"]
            print(f"✅ Login successful - Token: {access_token[:20]}...")
            
            # Test receipts endpoint with authentication
            headers = {"Authorization": f"Bearer {access_token}"}
            receipts_response = requests.get(f"{BASE_URL}/receipts", headers=headers)
            
            if receipts_response.status_code == 200:
                receipts_data = receipts_response.json()
                print(f"✅ Receipts API working - Found {len(receipts_data['receipts'])} receipts")
                
                # Display receipt data
                print("\n📋 Receipt Data:")
                print("ID | Filename | Status | Vendor | Amount | Date | Category")
                print("-" * 80)
                
                for i, receipt in enumerate(receipts_data['receipts'][:5]):
                    receipt_id = receipt.get('id', 'N/A')[:8] + '...'
                    filename = receipt.get('filename', 'N/A')[:15]
                    status = receipt.get('status', 'N/A')
                    vendor = receipt.get('extracted_vendor', 'N/A')[:15]
                    amount = receipt.get('extracted_total', 'N/A')
                    date = receipt.get('extracted_date', 'N/A')[:10]
                    category = receipt.get('category', 'N/A')
                    
                    print(f"{receipt_id:<12} | {filename:<15} | {status:<9} | {vendor:<15} | {amount:<8} | {date:<10} | {category}")
                
                # Check for missing data
                missing_data_count = 0
                for receipt in receipts_data['receipts']:
                    if not receipt.get('extracted_vendor') or not receipt.get('extracted_total') or not receipt.get('extracted_date'):
                        if receipt.get('category') != 'purchaser_portal':  # Skip purchaser portal receipts
                            missing_data_count += 1
                
                if missing_data_count == 0:
                    print(f"\n✅ All non-purchaser-portal receipts have complete OCR data!")
                else:
                    print(f"\n⚠️  {missing_data_count} receipts still have missing data")
                
            else:
                print(f"❌ Receipts API failed: {receipts_response.status_code} - {receipts_response.text}")
                
        else:
            print(f"❌ Login failed: {login_response.status_code} - {login_response.text}")
            
    except Exception as e:
        print(f"❌ API test failed: {e}")

if __name__ == "__main__":
    test_api()
