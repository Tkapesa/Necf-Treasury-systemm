#!/usr/bin/env python3
"""
Database initialization script for Church Treasury Management System.

Creates database tables and default admin user for initial setup.
"""

import asyncio
from sqlmodel import SQLModel, Session, select
from app.db import sync_engine, get_sync_session
from app.models import User, UserRole
from app.core.security import get_password_hash

def create_tables():
    """Create all database tables."""
    print("Creating database tables...")
    SQLModel.metadata.create_all(sync_engine)
    print("✅ Tables created successfully")

def create_default_admin():
    """Create default admin user if none exists."""
    session = Session(sync_engine)
    
    try:
        # Check if any admin users exist
        existing_admin = session.exec(
            select(User).where(User.role == UserRole.ADMIN)
        ).first()
        
        if existing_admin:
            print(f"✅ Admin user already exists: {existing_admin.username}")
            return
        
        # Create default admin user
        admin_user = User(
            username="admin",
            email="admin@church.org",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            is_active=True
        )
        
        session.add(admin_user)
        session.commit()
        session.refresh(admin_user)
        
        print("✅ Default admin user created:")
        print(f"   Username: {admin_user.username}")
        print(f"   Email: {admin_user.email}")
        print(f"   Password: admin123")
        print(f"   Role: {admin_user.role}")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        session.rollback()
        raise
    finally:
        session.close()

def main():
    """Main initialization function."""
    print("🚀 Initializing Church Treasury Database...")
    
    try:
        # Create tables
        create_tables()
        
        # Create default admin user
        create_default_admin()
        
        print("\n✅ Database initialization completed successfully!")
        print("\nYou can now login with:")
        print("   Username: admin")
        print("   Password: admin123")
        
    except Exception as e:
        print(f"\n❌ Database initialization failed: {e}")
        raise

if __name__ == "__main__":
    main()
