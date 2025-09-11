#!/usr/bin/env python3

import sys
sys.path.append('.')

from app.core.database import get_session
from app.models import User
from sqlmodel import select

def check_users():
    """Check if there are any users in the database."""
    session_gen = get_session()
    session = next(session_gen)
    
    try:
        statement = select(User)
        users = session.exec(statement).all()
        
        print(f"📊 Found {len(users)} users in database:")
        for user in users:
            print(f"  - ID: {user.id}, Username: {user.username}, Role: {user.role}, Active: {user.is_active}")
            
        if not users:
            print("❌ No users found! Creating a test admin user...")
            from app.core.security import get_password_hash
            from app.models import UserRole
            from datetime import datetime
            
            admin_user = User(
                username="admin",
                email="admin@necf.org",
                full_name="Admin User",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                is_active=True,
                created_at=datetime.utcnow()
            )
            
            session.add(admin_user)
            session.commit()
            session.refresh(admin_user)
            
            print(f"✅ Created admin user with ID: {admin_user.id}")
            print("📝 Login credentials: admin / admin123")
            
    except Exception as e:
        print(f"❌ Database error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    check_users()
