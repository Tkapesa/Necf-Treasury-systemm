#!/usr/bin/env python3

import sqlite3
import os

# Connect to database
db_path = 'church_treasury.db'
if not os.path.exists(db_path):
    print(f"Database {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Get receipt info
    cursor.execute("""
        SELECT id, extracted_vendor, storage_path, filename, status 
        FROM receipts 
        WHERE status = 'COMPLETED'
        LIMIT 5
    """)
    
    receipts = cursor.fetchall()
    print(f"Found {len(receipts)} completed receipts:")
    
    for receipt in receipts:
        id, vendor, storage_path, filename, status = receipt
        print(f"ID: {id}")
        print(f"Vendor: {vendor}")
        print(f"Storage Path: {storage_path}")
        print(f"Filename: {filename}")
        print(f"Status: {status}")
        
        if storage_path and os.path.exists(storage_path):
            print(f"✅ File exists: {storage_path}")
        else:
            print(f"❌ File missing: {storage_path}")
        print("-" * 50)

except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
