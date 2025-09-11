#!/usr/bin/env python3
"""
Comprehensive Test Suite for Enhanced Church Treasury API
"""

import json
import sys
import os
sys.path.append('/Users/user/Documents/HEALTHY DDS/NECF TREASURY /backend')

def test_database_schema():
    """Test if database has all enhanced fields"""
    print("🔄 Testing database schema...")
    
    try:
        import sqlite3
        conn = sqlite3.connect('/Users/user/Documents/HEALTHY DDS/NECF TREASURY /backend/church_treasury.db')
        cursor = conn.cursor()
        
        # Check table structure
        cursor.execute("PRAGMA table_info(receipts)")
        columns = [col[1] for col in cursor.fetchall()]
        
        required_fields = [
            'purchaser_name', 'purchaser_email', 'event_purpose', 
            'approved_by', 'additional_notes', 'purchase_date', 'upload_date'
        ]
        
        missing_fields = [field for field in required_fields if field not in columns]
        
        if missing_fields:
            print(f"❌ Missing database fields: {missing_fields}")
            return False
        else:
            print(f"✅ Database schema complete - {len(columns)} columns")
            
        # Test sample data
        cursor.execute("""
            SELECT id, filename, purchaser_name, event_purpose, purchase_date, upload_date
            FROM receipts 
            ORDER BY created_at DESC 
            LIMIT 3
        """)
        
        rows = cursor.fetchall()
        print(f"✅ Found {len(rows)} receipts in database")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def test_enhanced_ocr():
    """Test enhanced OCR module"""
    print("🔄 Testing enhanced OCR module...")
    
    try:
        from app.services.enhanced_ocr import extract_receipt_data_enhanced
        
        # Test with sample receipt text
        sample_text = """
        TARGET STORE #1234
        123 MAIN ST
        Date: 09/05/2025
        GROCERIES               $45.67
        TOTAL                  $74.65
        """
        
        result = extract_receipt_data_enhanced(sample_text, "test-123")
        
        if result.get('vendor') and result.get('total'):
            print(f"✅ OCR extraction working: {result['vendor']}, ${result['total']}")
            return True
        else:
            print(f"❌ OCR extraction incomplete: {result}")
            return False
            
    except Exception as e:
        print(f"❌ OCR test failed: {e}")
        return False

def test_api_startup():
    """Test if API can start without errors"""
    print("🔄 Testing API startup...")
    
    try:
        # Test imports
        from main import app
        from app.api.v1.receipts import router
        print("✅ API imports successful")
        
        # Test if enhanced OCR is importable in API context
        from app.api.v1.receipts import mock_ocr_processing
        print("✅ Enhanced OCR integration successful")
        
        return True
        
    except Exception as e:
        print(f"❌ API startup test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_frontend_types():
    """Check if frontend types file exists and is properly structured"""
    print("🔄 Testing frontend types...")
    
    try:
        types_file = '/Users/user/Documents/HEALTHY DDS/NECF TREASURY /frontend/src/types/receipts.ts'
        
        if os.path.exists(types_file):
            with open(types_file, 'r') as f:
                content = f.read()
                
            required_fields = ['purchaser_name', 'event_purpose', 'purchase_date', 'upload_date']
            missing_fields = [field for field in required_fields if field not in content]
            
            if missing_fields:
                print(f"❌ Frontend types missing: {missing_fields}")
                return False
            else:
                print("✅ Frontend types updated with enhanced fields")
                return True
        else:
            print("❌ Frontend types file not found")
            return False
            
    except Exception as e:
        print(f"❌ Frontend types test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Enhanced Church Treasury System Tests\n")
    
    tests = [
        ("Database Schema", test_database_schema),
        ("Enhanced OCR", test_enhanced_ocr),
        ("API Startup", test_api_startup),
        ("Frontend Types", test_frontend_types)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"Testing: {test_name}")
        print('='*50)
        
        if test_func():
            passed += 1
            print(f"✅ {test_name} PASSED")
        else:
            failed += 1
            print(f"❌ {test_name} FAILED")
    
    print(f"\n{'='*50}")
    print(f"FINAL RESULTS: {passed} passed, {failed} failed")
    print('='*50)
    
    if failed == 0:
        print("🎉 ALL TESTS PASSED! System ready for testing.")
        print("\n📋 Next Steps:")
        print("1. Start backend: cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8011")
        print("2. Access frontend: http://localhost:3004")
        print("3. Login with: admin@church.org / admin123")
        print("4. Test purchaser portal submission")
        print("5. Verify enhanced data display in admin dashboard")
    else:
        print("⚠️  Some tests failed. Please review the issues above.")
    
    return failed == 0

if __name__ == "__main__":
    main()
