#!/usr/bin/env python3
"""
Database setup script for Church Treasury Management System.
Creates all tables and initial admin user.
"""

from app.core.database import create_db_and_tables, get_session
from app.models import User, UserRole
from app.core.security import get_password_hash

def setup_database():
    """Create database tables and initial data."""
    print("Creating database tables...")
    create_db_and_tables()
    print("✅ Database tables created")
    
    print("Creating admin user...")
    session = next(get_session())
    
    try:
        # Create admin user
        admin_user = User(
            username='admin',
            email='admin@church.org',
            hashed_password=get_password_hash('admin123'),
            role=UserRole.ADMIN,
            is_active=True
        )
        session.add(admin_user)
        session.commit()
        session.refresh(admin_user)
        print(f"✅ Created admin user: {admin_user.username} ({admin_user.email})")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error creating admin user: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    setup_database()
