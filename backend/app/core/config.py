"""
Configuration management for Church Treasury API.

Handles environment variables, settings validation, and configuration
for different environments (development, staging, production).
"""

from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import validator
import os


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Uses pydantic BaseSettings for automatic validation and type conversion.
    Settings are cached using lru_cache for performance.
    """
    
    # API Configuration
    PROJECT_NAME: str = "Church Treasury Management System"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    
    # Security Configuration - CRITICAL: Change in production!
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database Configuration
    DATABASE_URL: str = "sqlite:///./church_treasury.db"  # Use SQLite for development
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "church_treasury"
    
        # CORS settings
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
        "http://localhost:3006",
        "http://localhost:3007",
        "http://localhost:3008",
        "http://localhost:3009",
        "http://localhost:3010",
        "http://localhost:3011",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
        "http://127.0.0.1:3004",
        "http://127.0.0.1:3005",
        "http://127.0.0.1:3006",
        "http://127.0.0.1:3007",
        "http://127.0.0.1:3008",
        "http://127.0.0.1:3009",
        "http://127.0.0.1:3010",
        "http://127.0.0.1:3011"
    ]
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # File Storage Configuration
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 10
    
    # S3 Storage Configuration (Optional)
    USE_S3_STORAGE: bool = False
    S3_BUCKET_NAME: str = "church-treasury-files"
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    S3_REGION: str = "us-east-1"
    S3_ENDPOINT_URL: str = "https://s3.amazonaws.com"
    
    # External Services Configuration
    OCR_ENABLED: bool = True
    OCR_API_KEY: Optional[str] = None
    
    # Email Configuration
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    
    @property
    def max_file_size_bytes(self) -> int:
        """Convert max file size from MB to bytes."""
        return self.MAX_FILE_SIZE_MB * 1024 * 1024
    
    @property
    def upload_path(self) -> str:
        """Get absolute path for upload directory."""
        return os.path.abspath(self.UPLOAD_DIR)
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached application settings.
    
    Returns:
        Settings instance with all configuration loaded from environment
    """
    return Settings()


# Convenience function for common use cases
def get_database_url() -> str:
    """Get database URL for SQLAlchemy."""
    return get_settings().DATABASE_URL


def is_production() -> bool:
    """Check if running in production environment."""
    return get_settings().ENVIRONMENT.lower() == "production"


def is_development() -> bool:
    """Check if running in development environment."""
    return get_settings().ENVIRONMENT.lower() == "development"
