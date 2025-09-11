#!/usr/bin/env python3
"""
Professional database migration for OCR fields
"""
import sqlite3
import os
from pathlib import Path

def migrate_ocr_fields():
    """Add OCR confidence and processing time fields to receipts table"""
    db_path = "church_treasury.db"
    
    print("🔄 Starting OCR fields migration...")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check current schema
        cursor.execute("PRAGMA table_info(receipts)")
        columns = cursor.fetchall()
        existing_columns = [col[1] for col in columns]
        
        print(f"📋 Found {len(existing_columns)} existing columns")
        
        # Add OCR confidence field
        if 'ocr_confidence' not in existing_columns:
            cursor.execute("""
                ALTER TABLE receipts 
                ADD COLUMN ocr_confidence REAL DEFAULT NULL
            """)
            print("✅ Added ocr_confidence column")
        else:
            print("⏭️  ocr_confidence already exists")
            
        # Add processing time field
        if 'processing_time' not in existing_columns:
            cursor.execute("""
                ALTER TABLE receipts 
                ADD COLUMN processing_time REAL DEFAULT NULL
            """)
            print("✅ Added processing_time column")
        else:
            print("⏭️  processing_time already exists")
            
        # Create indexes for performance
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_receipts_ocr_confidence ON receipts(ocr_confidence)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_receipts_processing_time ON receipts(processing_time)")
            print("📊 Created performance indexes")
        except Exception as e:
            print(f"⚠️  Index creation note: {e}")
        
        conn.commit()
        
        # Verify the migration
        cursor.execute("PRAGMA table_info(receipts)")
        new_columns = cursor.fetchall()
        print(f"📋 Total columns after migration: {len(new_columns)}")
        
        # Show sample data
        cursor.execute("""
            SELECT id, filename, extracted_vendor, extracted_total, 
                   ocr_confidence, processing_time, status
            FROM receipts 
            ORDER BY created_at DESC 
            LIMIT 5
        """)
        
        receipts = cursor.fetchall()
        print(f"\n📄 Sample receipts ({len(receipts)} found):")
        
        for receipt in receipts:
            receipt_id, filename, vendor, total, confidence, proc_time, status = receipt
            short_id = receipt_id[:8] if receipt_id else "No ID"
            short_filename = filename[:30] + "..." if filename and len(filename) > 30 else filename or "No filename"
            
            print(f"   {short_id} | {short_filename}")
            print(f"      💰 ${total or 'N/A'} | 🏪 {vendor or 'N/A'}")
            print(f"      📊 Confidence: {confidence or 'N/A'} | ⏱️  Time: {proc_time or 'N/A'}s")
            print(f"      🔄 Status: {status or 'N/A'}")
            print("")
            
    except Exception as e:
        print(f"❌ Migration error: {e}")
        return False
    finally:
        conn.close()
        
    print("✅ OCR fields migration completed successfully!")
    return True

if __name__ == "__main__":
    migrate_ocr_fields()
