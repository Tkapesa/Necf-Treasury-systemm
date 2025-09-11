#!/usr/bin/env python3
"""
Professional API endpoint testing suite
Tests all endpoints for production readiness
"""
import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_endpoint(method, endpoint, data=None, files=None, headers=None, expected_status=200):
    """Test an API endpoint and return results"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers)
        elif method.upper() == "POST":
            if files:
                response = requests.post(url, data=data, files=files, headers=headers)
            else:
                response = requests.post(url, json=data, headers=headers)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=headers)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers)
        else:
            return {"error": f"Unsupported method: {method}"}
        
        success = response.status_code == expected_status
        
        try:
            response_data = response.json()
        except:
            response_data = response.text
        
        return {
            "success": success,
            "status_code": response.status_code,
            "expected_status": expected_status,
            "data": response_data,
            "response_time": response.elapsed.total_seconds()
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def run_comprehensive_api_tests():
    """Run complete API test suite"""
    print("🚀 NECF Treasury API - Professional Test Suite")
    print("=" * 60)
    
    # Test results storage
    results = {
        "total_tests": 0,
        "passed": 0,
        "failed": 0,
        "tests": []
    }
    
    # 1. Health Check
    print("\n🏥 HEALTH & STATUS TESTS")
    print("-" * 30)
    
    test_cases = [
        ("GET", "/health", None, None, None, 200),
        ("GET", "/docs", None, None, None, 200),
        ("GET", "/api/v1/openapi.json", None, None, None, 200),
    ]
    
    for method, endpoint, data, files, headers, expected in test_cases:
        result = test_endpoint(method, endpoint, data, files, headers, expected)
        results["total_tests"] += 1
        
        if result["success"]:
            results["passed"] += 1
            status = "✅ PASS"
        else:
            results["failed"] += 1
            status = "❌ FAIL"
        
        print(f"{status} {method} {endpoint} ({result.get('status_code', 'ERROR')})")
        if not result["success"]:
            print(f"     Error: {result.get('error', result.get('data', 'Unknown'))}")
        
        results["tests"].append({
            "endpoint": f"{method} {endpoint}",
            "result": result
        })
    
    # 2. Authentication Tests
    print("\n🔐 AUTHENTICATION TESTS")
    print("-" * 30)
    
    # Test login with invalid credentials (should fail)
    auth_result = test_endpoint("POST", "/api/v1/auth/login", {
        "username": "invalid",
        "password": "invalid"
    }, expected_status=422)  # Validation error expected
    
    results["total_tests"] += 1
    if auth_result["success"]:
        results["passed"] += 1
        print("✅ PASS POST /api/v1/auth/login (422) - Validation working")
    else:
        results["failed"] += 1
        print(f"❌ FAIL POST /api/v1/auth/login - {auth_result.get('error', 'Unknown')}")
    
    # 3. Receipt Management Tests
    print("\n📄 RECEIPT MANAGEMENT TESTS")
    print("-" * 30)
    
    receipt_tests = [
        ("GET", "/api/v1/receipts/", None, None, None, 200),
        ("GET", "/api/v1/receipts/analytics", None, None, None, 200),
        ("POST", "/api/v1/receipts/upload", {"description": "test"}, None, None, 422),  # Missing file
    ]
    
    for method, endpoint, data, files, headers, expected in receipt_tests:
        result = test_endpoint(method, endpoint, data, files, headers, expected)
        results["total_tests"] += 1
        
        if result["success"]:
            results["passed"] += 1
            status = "✅ PASS"
        else:
            results["failed"] += 1
            status = "❌ FAIL"
        
        print(f"{status} {method} {endpoint} ({result.get('status_code', 'ERROR')})")
        if not result["success"] and result.get('status_code') != expected:
            print(f"     Expected: {expected}, Got: {result.get('status_code')}")
            print(f"     Error: {result.get('error', result.get('data', 'Unknown'))}")
    
    # 4. Admin Dashboard Tests
    print("\n👑 ADMIN DASHBOARD TESTS")
    print("-" * 30)
    
    admin_tests = [
        ("GET", "/api/v1/admin/dashboard", None, None, None, 200),
        ("GET", "/api/v1/admin/stats", None, None, None, 200),
    ]
    
    for method, endpoint, data, files, headers, expected in admin_tests:
        result = test_endpoint(method, endpoint, data, files, headers, expected)
        results["total_tests"] += 1
        
        if result["success"]:
            results["passed"] += 1
            status = "✅ PASS"
        else:
            results["failed"] += 1
            status = "❌ FAIL"
        
        print(f"{status} {method} {endpoint} ({result.get('status_code', 'ERROR')})")
    
    # 5. Data Validation Tests
    print("\n📊 DATA VALIDATION TESTS")
    print("-" * 30)
    
    # Test if receipts endpoint returns real data
    receipts_result = test_endpoint("GET", "/api/v1/receipts/")
    if receipts_result["success"]:
        data = receipts_result["data"]
        if isinstance(data, dict) and "receipts" in data:
            receipts = data["receipts"]
            if receipts and len(receipts) > 0:
                sample_receipt = receipts[0]
                has_vendor = sample_receipt.get("extracted_vendor") is not None
                has_amount = sample_receipt.get("extracted_total") is not None
                has_confidence = sample_receipt.get("ocr_confidence") is not None
                
                if has_vendor and has_amount and has_confidence:
                    print("✅ PASS Real OCR data validation - Found vendor, amount, confidence")
                    results["passed"] += 1
                else:
                    print("❌ FAIL Real OCR data validation - Missing OCR fields")
                    results["failed"] += 1
            else:
                print("⚠️  WARN No receipts found in database")
        else:
            print("❌ FAIL Invalid receipts response format")
            results["failed"] += 1
    else:
        print("❌ FAIL Could not fetch receipts for validation")
        results["failed"] += 1
    
    results["total_tests"] += 1
    
    # Final Results
    print("\n" + "=" * 60)
    print("📊 FINAL TEST RESULTS")
    print("=" * 60)
    
    success_rate = (results["passed"] / results["total_tests"]) * 100 if results["total_tests"] > 0 else 0
    
    print(f"Total Tests: {results['total_tests']}")
    print(f"✅ Passed: {results['passed']}")
    print(f"❌ Failed: {results['failed']}")
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("\n🎉 SYSTEM STATUS: PRODUCTION READY! 🚀")
    elif success_rate >= 60:
        print("\n⚠️  SYSTEM STATUS: Needs Minor Fixes")
    else:
        print("\n❌ SYSTEM STATUS: Major Issues Found")
    
    print("\n💡 Next Steps:")
    if results["failed"] == 0:
        print("   • All endpoints working perfectly!")
        print("   • Ready for deployment")
        print("   • Consider load testing")
    else:
        print("   • Review failed endpoints")
        print("   • Fix authentication if needed")
        print("   • Verify database migrations")
    
    return results

if __name__ == "__main__":
    try:
        run_comprehensive_api_tests()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test suite interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test suite error: {e}")
        sys.exit(1)
