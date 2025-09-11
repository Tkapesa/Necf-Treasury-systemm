"""
Database configuration and connection management for Church Treasury.

Handles SQLModel database setup, connection pooling, and provides
database session management with proper async support.
"""

from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from typing import AsyncGenerator
import asyncio

from app.core.config import get_settings

# Get settings
settings = get_settings()

# Create sync engine for migrations and testing
sync_engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    pool_pre_ping=True,   # Validate connections before use
    pool_recycle=300,     # Recycle connections every 5 minutes
)

# Create async engine for FastAPI endpoints
if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite doesn't support async, use sync for now
    async_database_url = settings.DATABASE_URL
    async_engine = create_async_engine(
        "sqlite+aiosqlite:///./church_treasury.db",
        echo=settings.DEBUG,
        pool_pre_ping=True,
    )
else:
    # PostgreSQL with asyncpg
    async_database_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    async_engine = create_async_engine(
        async_database_url,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_recycle=300,
    )

# Create session factories
AsyncSessionLocal = sessionmaker(
    async_engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=sync_engine
)


async def init_db() -> None:
    """
    Initialize database tables.
    
    Creates all tables defined in SQLModel models. In production,
    this should be replaced with proper migration system (Alembic).
    """
    try:
        # Import all models to ensure they are registered with SQLModel
        from app.models import User, Receipt  # noqa: F401
        
        async with async_engine.begin() as conn:
            # Create all tables
            await conn.run_sync(SQLModel.metadata.create_all)
            print("✅ Database tables created successfully")
            
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        raise


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting async database session in FastAPI endpoints.
    
    Yields:
        AsyncSession: Database session for async operations
        
    Usage:
        @app.get("/items/")
        async def read_items(db: AsyncSession = Depends(get_async_session)):
            # Use db session here
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_sync_session() -> Session:
    """
    Get synchronous database session for migrations and scripts.
    
    Returns:
        Session: Synchronous database session
    """
    db = SessionLocal()
    try:
        return db
    finally:
        db.close()


async def check_database_health() -> bool:
    """
    Check if database connection is healthy.
    
    Returns:
        bool: True if database is accessible, False otherwise
    """
    try:
        async with AsyncSessionLocal() as session:
            # Simple query to test connection
            result = await session.execute("SELECT 1")
            return result.scalar() == 1
    except Exception as e:
        print(f"Database health check failed: {e}")
        return False


# TODO: Add Alembic configuration for production migrations
# TODO: Implement connection pooling optimization
# TODO: Add database backup/restore utilities
# TODO: Implement read/write replica support for scaling
