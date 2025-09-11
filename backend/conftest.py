"""
Pytest configuration and fixtures for Church Treasury Management System tests.

This file contains shared test fixtures and configuration that will be
automatically loaded by pytest for all test files.
"""

import os
import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlmodel.pool import StaticPool

# Set test environment
os.environ["ENVIRONMENT"] = "test"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from main import app
from app.core.config import get_settings


@pytest.fixture(name="session")
def session_fixture() -> Generator[Session, None, None]:
    """Create a test database session."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture() -> Generator[TestClient, None, None]:
    """Create a test client."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def test_settings():
    """Get test settings."""
    return get_settings()


@pytest.fixture
def sample_receipt_data():
    """Sample receipt data for testing."""
    return {
        "vendor": "Test Vendor",
        "total_amount": 100.50,
        "currency": "USD",
        "receipt_date": "2025-09-01",
        "description": "Test receipt description",
        "category": "Office Supplies"
    }


@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "email": "test@church.org",
        "password": "TestPassword123!",
        "full_name": "Test User",
        "phone": "+1234567890",
        "role": "user"
    }
