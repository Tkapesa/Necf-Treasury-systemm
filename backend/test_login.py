#!/usr/bin/env python3
"""
Test login functionality for Church Treasury Management System.
"""

import requests
import json

def test_login():
    """Test the login endpoint."""
    url = "http://localhost:8011/api/v1/auth/login"
    
    # Test credentials
    data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        print("🧪 Testing login endpoint...")
        print(f"URL: {url}")
        print(f"Credentials: {data}")
        
        response = requests.post(
            url,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Login successful!")
            print(f"Access Token: {result.get('access_token', 'N/A')[:50]}...")
            print(f"Token Type: {result.get('token_type', 'N/A')}")
            print(f"Expires In: {result.get('expires_in', 'N/A')} seconds")
            if 'user' in result:
                user = result['user']
                print(f"User: {user.get('username')} ({user.get('role')})")
        else:
            print(f"❌ Login failed: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend server")
        print("Make sure the server is running on http://localhost:8011")
    except Exception as e:
        print(f"❌ Error testing login: {e}")

def test_health():
    """Test the health endpoint."""
    url = "http://localhost:8011/api/v1/health"
    
    try:
        print("🏥 Testing health endpoint...")
        response = requests.get(url)
        print(f"Health Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Health Response: {response.json()}")
        else:
            print(f"Health Error: {response.text}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")

if __name__ == "__main__":
    test_health()
    print("\n" + "="*50 + "\n")
    test_login()
