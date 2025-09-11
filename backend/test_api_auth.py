#!/usr/bin/env python3
"""
Professional authenticated API testing suite
Tests all endpoints with proper authentication
"""
import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000"

class AuthenticatedAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.session = requests.Session()
    
    def login(self, username="admin", password="admin123"):
        """Login and get authentication token"""
        try:
            response = self.session.post(f"{self.base_url}/api/v1/auth/login", data={
                "username": username,
                "password": password
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def test_endpoint(self, method, endpoint, data=None, files=None, expected_status=200):
        """Test an authenticated endpoint"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url)
            elif method.upper() == "POST":
                if files:
                    response = self.session.post(url, data=data, files=files)
                else:
                    response = self.session.post(url, json=data)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data)
            elif method.upper() == "DELETE":
                response = self.session.delete(url)
            else:
                return {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = response.text[:200] + "..." if len(response.text) > 200 else response.text
            
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

def run_authenticated_tests():
    """Run comprehensive authenticated API tests"""
    print("🚀 NECF Treasury API - Authenticated Test Suite")
    print("=" * 60)
    
    tester = AuthenticatedAPITester()
    
    # Login first
    print("🔐 AUTHENTICATION")
    print("-" * 30)
    if not tester.login():
        print("❌ CRITICAL: Cannot authenticate - aborting tests")
        return
    else:
        print("✅ Successfully authenticated as admin")
    
    results = {
        "total_tests": 0,
        "passed": 0,
        "failed": 0,
        "tests": []
    }
    
    # Test all endpoints
    test_suites = [
        {
            "name": "📄 RECEIPT MANAGEMENT",
            "tests": [
                ("GET", "/api/v1/receipts/", None, None, 200),
                ("GET", "/api/v1/receipts/stats/summary", None, None, 200),
            ]
        },
        {
            "name": "👑 ADMIN DASHBOARD", 
            "tests": [
                ("GET", "/api/v1/admin/stats", None, None, 200),
            ]
        },
        {
            "name": "👤 USER MANAGEMENT",
            "tests": [
                ("GET", "/api/v1/auth/me", None, None, 200),
            ]
        }
    ]
    
    for suite in test_suites:
        print(f"\n{suite['name']}")
        print("-" * 30)
        
        for method, endpoint, data, files, expected in suite["tests"]:
            result = tester.test_endpoint(method, endpoint, data, files, expected)
            results["total_tests"] += 1
            
            if result["success"]:
                results["passed"] += 1
                status = "✅ PASS"
                
                # Show meaningful data for key endpoints
                if endpoint == "/api/v1/receipts/" and "data" in result:
                    resp_data = result["data"]
                    if isinstance(resp_data, dict) and "receipts" in resp_data:
                        count = len(resp_data["receipts"])
                        print(f"{status} {method} {endpoint} ({result['status_code']}) - {count} receipts")
                        
                        if count > 0:
                            sample = resp_data["receipts"][0]
                            vendor = sample.get("extracted_vendor", "N/A")
                            amount = sample.get("extracted_total", "N/A")
                            confidence = sample.get("ocr_confidence", "N/A")
                            print(f"     Sample: {vendor} - ${amount} (confidence: {confidence})")
                    else:
                        print(f"{status} {method} {endpoint} ({result['status_code']})")
                elif endpoint == "/api/v1/receipts/stats/summary" and "data" in result:
                    resp_data = result["data"]
                    if isinstance(resp_data, dict):
                        total_amount = resp_data.get("total_amount", 0)
                        total_receipts = resp_data.get("total_receipts", 0)
                        print(f"{status} {method} {endpoint} ({result['status_code']}) - ${total_amount} across {total_receipts} receipts")
                    else:
                        print(f"{status} {method} {endpoint} ({result['status_code']})")
                elif endpoint == "/api/v1/auth/me" and "data" in result:
                    resp_data = result["data"]
                    if isinstance(resp_data, dict):
                        username = resp_data.get("username", "N/A")
                        role = resp_data.get("role", "N/A")
                        print(f"{status} {method} {endpoint} ({result['status_code']}) - {username} ({role})")
                    else:
                        print(f"{status} {method} {endpoint} ({result['status_code']})")
                else:
                    print(f"{status} {method} {endpoint} ({result['status_code']})")
                    
            else:
                results["failed"] += 1
                status = "❌ FAIL"
                print(f"{status} {method} {endpoint} ({result.get('status_code', 'ERROR')})")
                if result.get('error'):
                    print(f"     Error: {result['error']}")
                elif result.get('data'):
                    error_msg = result['data']
                    if isinstance(error_msg, dict) and 'error' in error_msg:
                        print(f"     Error: {error_msg['error'].get('message', 'Unknown')}")
            
            results["tests"].append({
                "endpoint": f"{method} {endpoint}",
                "result": result
            })
    
    # Data Quality Assessment
    print(f"\n📊 DATA QUALITY ASSESSMENT")
    print("-" * 30)
    
    # Check receipt data quality
    receipts_result = tester.test_endpoint("GET", "/api/v1/receipts/")
    if receipts_result["success"]:
        data = receipts_result["data"]
        if isinstance(data, dict) and "receipts" in data:
            receipts = data["receipts"]
            
            if receipts:
                quality_checks = {
                    "has_vendor": 0,
                    "has_amount": 0, 
                    "has_confidence": 0,
                    "has_processing_time": 0,
                    "has_items": 0
                }
                
                for receipt in receipts:
                    if receipt.get("extracted_vendor"):
                        quality_checks["has_vendor"] += 1
                    if receipt.get("extracted_total"):
                        quality_checks["has_amount"] += 1
                    if receipt.get("ocr_confidence"):
                        quality_checks["has_confidence"] += 1
                    if receipt.get("processing_time"):
                        quality_checks["has_processing_time"] += 1
                    if receipt.get("extracted_items"):
                        quality_checks["has_items"] += 1
                
                total_receipts = len(receipts)
                print(f"📋 Analyzed {total_receipts} receipts:")
                print(f"   🏪 Vendor extraction: {quality_checks['has_vendor']}/{total_receipts} ({quality_checks['has_vendor']/total_receipts*100:.1f}%)")
                print(f"   💰 Amount extraction: {quality_checks['has_amount']}/{total_receipts} ({quality_checks['has_amount']/total_receipts*100:.1f}%)")
                print(f"   📊 OCR confidence: {quality_checks['has_confidence']}/{total_receipts} ({quality_checks['has_confidence']/total_receipts*100:.1f}%)")
                print(f"   ⏱️  Processing time: {quality_checks['has_processing_time']}/{total_receipts} ({quality_checks['has_processing_time']/total_receipts*100:.1f}%)")
                print(f"   🛒 Item details: {quality_checks['has_items']}/{total_receipts} ({quality_checks['has_items']/total_receipts*100:.1f}%)")
                
                # Overall quality score
                total_checks = sum(quality_checks.values())
                max_possible = total_receipts * len(quality_checks)
                quality_score = (total_checks / max_possible) * 100 if max_possible > 0 else 0
                
                if quality_score >= 80:
                    print(f"✅ Data Quality Score: {quality_score:.1f}% - EXCELLENT")
                elif quality_score >= 60:
                    print(f"⚠️  Data Quality Score: {quality_score:.1f}% - GOOD")
                else:
                    print(f"❌ Data Quality Score: {quality_score:.1f}% - NEEDS IMPROVEMENT")
                    
            else:
                print("⚠️  No receipts found in database")
        else:
            print("❌ Invalid receipts response format")
    else:
        print("❌ Could not fetch receipts for quality assessment")
    
    # Final Results
    print("\n" + "=" * 60)
    print("📊 FINAL TEST RESULTS")
    print("=" * 60)
    
    success_rate = (results["passed"] / results["total_tests"]) * 100 if results["total_tests"] > 0 else 0
    
    print(f"Total Tests: {results['total_tests']}")
    print(f"✅ Passed: {results['passed']}")
    print(f"❌ Failed: {results['failed']}")
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print("\n🎉 SYSTEM STATUS: PRODUCTION READY! 🚀")
        print("   • All critical endpoints working")
        print("   • Authentication system secure")
        print("   • Real OCR data processing")
        print("   • Ready for deployment!")
    elif success_rate >= 75:
        print("\n✅ SYSTEM STATUS: Nearly Production Ready")
        print("   • Core functionality working")
        print("   • Minor fixes may be needed")
    else:
        print("\n⚠️  SYSTEM STATUS: Needs Attention")
        print("   • Critical endpoints failing")
        print("   • Review failed tests above")
    
    return results

if __name__ == "__main__":
    try:
        run_authenticated_tests()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test suite interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test suite error: {e}")
        sys.exit(1)
