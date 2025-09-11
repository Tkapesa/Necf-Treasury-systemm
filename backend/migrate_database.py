#!/usr/bin/env python3
"""
Database migration script to add enhanced purchaser portal fields
"""

import sqlite3
from datetime import datetime

def migrate_database():
    """Add new columns to support enhanced purchaser portal features"""
    
    conn = sqlite3.connect('church_treasury.db')
    cursor = conn.cursor()
    
    # List of new columns to add
    new_columns = [
        ("purchaser_name", "TEXT"),
        ("purchaser_email", "TEXT"),
        ("event_purpose", "TEXT"),
        ("approved_by", "TEXT"),
        ("additional_notes", "TEXT"),
        ("purchase_date", "DATETIME"),
        ("upload_date", "DATETIME")  # Remove default for SQLite compatibility
    ]
    
    print("🔄 Starting database migration...")
    
    # Check existing columns
    cursor.execute("PRAGMA table_info(receipts)")
    existing_columns = [col[1] for col in cursor.fetchall()]
    print(f"📋 Found {len(existing_columns)} existing columns")
    
    # Add missing columns
    added_count = 0
    for column_name, column_type in new_columns:
        if column_name not in existing_columns:
            try:
                alter_sql = f"ALTER TABLE receipts ADD COLUMN {column_name} {column_type}"
                cursor.execute(alter_sql)
                print(f"✅ Added column: {column_name}")
                added_count += 1
            except sqlite3.Error as e:
                print(f"⚠️  Error adding {column_name}: {e}")
        else:
            print(f"⏭️  Column {column_name} already exists")
    
    # Update upload_date for existing records where it's null (only if column exists)
    try:
        cursor.execute("SELECT upload_date FROM receipts LIMIT 1")
        cursor.execute("""
            UPDATE receipts 
            SET upload_date = created_at 
            WHERE upload_date IS NULL
        """)
        
        updated_upload_dates = cursor.rowcount
        if updated_upload_dates > 0:
            print(f"📅 Updated upload_date for {updated_upload_dates} existing receipts")
    except sqlite3.OperationalError:
        print("⏭️  upload_date column not yet added")
    
    # Update purchase_date from extracted_date for existing records (only if column exists)
    try:
        cursor.execute("SELECT purchase_date FROM receipts LIMIT 1")
        cursor.execute("""
            UPDATE receipts 
            SET purchase_date = extracted_date 
            WHERE purchase_date IS NULL AND extracted_date IS NOT NULL
        """)
        
        updated_purchase_dates = cursor.rowcount
        if updated_purchase_dates > 0:
            print(f"📅 Updated purchase_date for {updated_purchase_dates} existing receipts")
    except sqlite3.OperationalError:
        print("⏭️  purchase_date column not yet added")
    
    # Create indexes for performance
    indexes = [
        ("idx_receipts_purchaser_name", "CREATE INDEX IF NOT EXISTS idx_receipts_purchaser_name ON receipts(purchaser_name)"),
        ("idx_receipts_purchaser_email", "CREATE INDEX IF NOT EXISTS idx_receipts_purchaser_email ON receipts(purchaser_email)"),
        ("idx_receipts_event_purpose", "CREATE INDEX IF NOT EXISTS idx_receipts_event_purpose ON receipts(event_purpose)"),
        ("idx_receipts_approved_by", "CREATE INDEX IF NOT EXISTS idx_receipts_approved_by ON receipts(approved_by)"),
        ("idx_receipts_purchase_date", "CREATE INDEX IF NOT EXISTS idx_receipts_purchase_date ON receipts(purchase_date)"),
        ("idx_receipts_upload_date", "CREATE INDEX IF NOT EXISTS idx_receipts_upload_date ON receipts(upload_date)")
    ]
    
    for index_name, index_sql in indexes:
        try:
            cursor.execute(index_sql)
            print(f"📊 Created index: {index_name}")
        except sqlite3.Error as e:
            print(f"⚠️  Error creating index {index_name}: {e}")
    
    # Commit changes
    conn.commit()
    
    # Verify migration
    cursor.execute("PRAGMA table_info(receipts)")
    final_columns = [col[1] for col in cursor.fetchall()]
    
    print(f"\n✅ Migration completed!")
    print(f"📊 Added {added_count} new columns")
    print(f"📋 Total columns now: {len(final_columns)}")
    
    # Show sample of updated data
    print(f"\n📋 Sample receipt data:")
    cursor.execute("""
        SELECT id, filename, purchaser_name, event_purpose, purchase_date, upload_date
        FROM receipts 
        ORDER BY created_at DESC 
        LIMIT 3
    """)
    
    rows = cursor.fetchall()
    print("ID | Filename | Purchaser | Event/Purpose | Purchase Date | Upload Date")
    print("-" * 90)
    for row in rows:
        receipt_id = row[0][:8] + "..." if row[0] else "NULL"
        filename = (row[1][:15] + "...") if row[1] and len(row[1]) > 15 else (row[1] or "NULL")
        purchaser = (row[2][:12] + "...") if row[2] and len(row[2]) > 12 else (row[2] or "NULL")
        purpose = (row[3][:15] + "...") if row[3] and len(row[3]) > 15 else (row[3] or "NULL")
        purchase_date = str(row[4])[:10] if row[4] else "NULL"
        upload_date = str(row[5])[:10] if row[5] else "NULL"
        
        print(f"{receipt_id:<12} | {filename:<15} | {purchaser:<12} | {purpose:<15} | {purchase_date:<13} | {upload_date}")
    
    conn.close()

if __name__ == "__main__":
    migrate_database()
