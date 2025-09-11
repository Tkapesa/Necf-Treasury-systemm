#!/usr/bin/env python3
"""
Delete all receipts from the database to start fresh
"""

import sys
import os
from pathlib import Path

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import get_session
from app.models import Receipt
from sqlmodel import select

def delete_all_receipts():
    """Delete all receipts from the database"""
    
    print("🗑️  Starting fresh - deleting all receipts...")
    
    with next(get_session()) as session:
        # Get all receipts first
        receipts = session.exec(select(Receipt)).all()
        receipt_count = len(receipts)
        
        print(f"📋 Found {receipt_count} receipts to delete")
        
        if receipt_count == 0:
            print("✅ No receipts found - database is already clean!")
            return
        
        # Delete all receipt files from storage if they exist
        deleted_files = 0
        for receipt in receipts:
            try:
                file_path = Path(receipt.storage_path)
                if file_path.exists():
                    file_path.unlink()  # Delete the file
                    deleted_files += 1
                    print(f"   🗑️  Deleted file: {receipt.filename}")
            except Exception as e:
                print(f"   ⚠️  Could not delete file {receipt.filename}: {str(e)}")
        
        # Delete all receipts from database
        for receipt in receipts:
            session.delete(receipt)
        
        # Commit the changes
        session.commit()
        
        print(f"\n🎉 Successfully deleted:")
        print(f"   • {receipt_count} receipts from database")
        print(f"   • {deleted_files} files from storage")
        print(f"\n✅ Database is now clean and ready for fresh receipts!")
        
        # Verify deletion
        remaining_receipts = session.exec(select(Receipt)).all()
        if len(remaining_receipts) == 0:
            print("✅ Verification: Database is completely clean!")
        else:
            print(f"⚠️  Warning: {len(remaining_receipts)} receipts still remain")

if __name__ == "__main__":
    print("⚠️  This will DELETE ALL RECEIPTS from the database!")
    print("   Are you sure you want to continue? This cannot be undone!")
    
    # For script execution, assume yes
    print("🚀 Proceeding with deletion...")
    delete_all_receipts()
