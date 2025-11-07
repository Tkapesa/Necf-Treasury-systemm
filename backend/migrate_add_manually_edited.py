"""
Database migration script to add manually_edited column to receipts table
This column tracks whether a receipt's data has been manually corrected by an admin
"""

import sqlite3
from pathlib import Path

def migrate():
    """Add manually_edited column to receipts table if it doesn't exist"""
    db_path = Path(__file__).parent.parent / "church_treasury.db"
    
    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(receipts)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'manually_edited' in columns:
            print("✅ Column 'manually_edited' already exists")
            return True
        
        # Add the column
        print("📝 Adding 'manually_edited' column to receipts table...")
        cursor.execute("""
            ALTER TABLE receipts 
            ADD COLUMN manually_edited INTEGER DEFAULT 0
        """)
        
        # Create index for better query performance
        print("📝 Creating index on 'manually_edited' column...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_receipts_manually_edited 
            ON receipts(manually_edited)
        """)
        
        conn.commit()
        print("✅ Migration completed successfully!")
        print("   - Added 'manually_edited' column (default: 0/False)")
        print("   - Created index for performance")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        return False
        
    finally:
        conn.close()

if __name__ == "__main__":
    print("🚀 Starting database migration...")
    print("=" * 50)
    success = migrate()
    print("=" * 50)
    
    if success:
        print("✅ Migration completed successfully!")
    else:
        print("❌ Migration failed!")
        exit(1)
