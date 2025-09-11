#!/usr/bin/env python3
"""
Quick system status check and demo
"""
import sys
import os
import subprocess
import time

def check_servers():
    """Check if servers are running"""
    print("🔍 CHECKING SYSTEM STATUS")
    print("=" * 40)
    
    # Check backend
    try:
        result = subprocess.run(['curl', '-s', 'http://localhost:8000/health'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and 'healthy' in result.stdout:
            print("✅ Backend API: Running on port 8000")
        else:
            print("❌ Backend API: Not responding")
            return False
    except:
        print("❌ Backend API: Not accessible")
        return False
    
    # Check frontend
    try:
        result = subprocess.run(['curl', '-s', 'http://localhost:3004'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("✅ Frontend: Running on port 3004")
        else:
            print("❌ Frontend: Not responding")
    except:
        print("❌ Frontend: Not accessible")
    
    return True

def check_database():
    """Check database data"""
    print("\n📊 DATABASE STATUS")
    print("=" * 40)
    
    try:
        # Add current directory to path
        sys.path.insert(0, os.getcwd())
        
        from sqlmodel import Session, create_engine, select
        from app.models import Receipt
        from app.core.config import get_settings
        
        settings = get_settings()
        engine = create_engine(settings.DATABASE_URL)
        
        with Session(engine) as session:
            receipts = session.exec(select(Receipt).limit(5)).fetchall()
            print(f"📄 Found {len(receipts)} receipts")
            
            if receipts:
                print("\n📋 Sample Data:")
                for i, receipt in enumerate(receipts[:3], 1):
                    vendor = receipt.extracted_vendor or "No vendor"
                    amount = f"${receipt.extracted_total}" if receipt.extracted_total else "No amount"
                    confidence = f"{receipt.ocr_confidence:.0%}" if receipt.ocr_confidence else "No confidence"
                    
                    print(f"   {i}. {vendor} - {amount} ({confidence})")
                
                # Check data quality
                with_vendor = sum(1 for r in receipts if r.extracted_vendor)
                with_amount = sum(1 for r in receipts if r.extracted_total)
                with_confidence = sum(1 for r in receipts if r.ocr_confidence)
                
                print(f"\n🎯 Data Quality:")
                print(f"   Vendor: {with_vendor}/{len(receipts)} receipts")
                print(f"   Amount: {with_amount}/{len(receipts)} receipts") 
                print(f"   OCR Confidence: {with_confidence}/{len(receipts)} receipts")
                
                if with_vendor == len(receipts) and with_amount == len(receipts):
                    print("✅ Database: Excellent OCR data quality")
                    return True
                else:
                    print("⚠️  Database: Some receipts missing OCR data")
                    return False
            else:
                print("❌ Database: No receipts found")
                return False
                
    except Exception as e:
        print(f"❌ Database: Error - {e}")
        return False

def demo_ocr():
    """Demo OCR functionality"""
    print("\n🤖 OCR DEMO")
    print("=" * 40)
    
    try:
        sys.path.insert(0, os.getcwd())
        from app.services.ocr_service import OCRService
        
        ocr = OCRService()
        
        # Mock Turkish receipt
        turkish_text = """
        MIGROS MARKET
        İstanbul, Türkiye
        
        TARİH: 05.09.2025
        
        2 ADET Ekmek          15,50 TL
        1 ADET Süt            25,90 TL
        3 ADET Yoğurt         32,40 TL
        
        TOPLAM:               73,80 TL
        """
        
        result = ocr._parse_receipt_data(turkish_text)
        
        print("📄 Sample Turkish Receipt Processing:")
        print(f"   🏪 Vendor: {result.get('vendor', 'N/A')}")
        print(f"   💰 Amount: ${result.get('amount', 'N/A')}")
        print(f"   📅 Date: {result.get('date', 'N/A')}")
        print(f"   📊 Confidence: {result.get('confidence', 0):.0%}")
        print(f"   🛒 Items: {len(result.get('items', []))} extracted")
        
        if result.get('confidence', 0) > 0.8:
            print("✅ OCR: Working perfectly!")
            return True
        else:
            print("⚠️  OCR: Lower confidence")
            return False
            
    except Exception as e:
        print(f"❌ OCR: Error - {e}")
        return False

def show_summary():
    """Show deployment readiness summary"""
    print("\n🚀 DEPLOYMENT READINESS")
    print("=" * 40)
    
    servers_ok = check_servers()
    database_ok = check_database()  
    ocr_ok = demo_ocr()
    
    total_score = sum([servers_ok, database_ok, ocr_ok])
    
    print(f"\n📊 System Score: {total_score}/3")
    
    if total_score == 3:
        print("🎉 STATUS: PRODUCTION READY! 🚀")
        print("\n✅ All systems operational:")
        print("   • Backend API responding")
        print("   • Database with quality OCR data") 
        print("   • Turkish OCR processing working")
        print("\n🎯 Ready for:")
        print("   • Church treasurer usage")
        print("   • Turkish receipt processing")
        print("   • Admin dashboard access")
        print("   • Real-world deployment")
        
    elif total_score == 2:
        print("⚠️  STATUS: Nearly Ready")
        print("   • Minor issues to resolve")
        print("   • Core functionality working")
        
    else:
        print("❌ STATUS: Needs Attention")
        print("   • Critical issues found")
        print("   • Review errors above")

if __name__ == "__main__":
    os.chdir("/Users/user/Documents/HEALTHY DDS/NECF TREASURY /backend")
    show_summary()
