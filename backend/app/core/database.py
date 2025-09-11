"""
Database configuration and session management for Church Treasury System.

Provides SQLModel database engine setup, session management, and 
connection utilities for PostgreSQL database operations.
"""

from sqlmodel import create_engine, Session, SQLModel
from app.core.config import get_settings

# Get settings instance
settings = get_settings()


# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    pool_pre_ping=True,   # Verify connections before use
)


def create_db_and_tables():
    """Create database tables based on SQLModel metadata."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """
    Get database session for dependency injection.
    
    Yields:
        Session: SQLModel database session
    """
    with Session(engine) as session:
        yield session
