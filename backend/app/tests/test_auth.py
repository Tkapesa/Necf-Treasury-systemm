"""
Unit tests for authentication endpoints and security functions.

Tests user registration, login, JWT token handling, and role-based access control.
Uses httpx AsyncClient for testing FastAPI endpoints with pytest.

TODO: Add tests for refresh token functionality when implemented
TODO: Add tests for rate limiting on login attempts
TODO: Add tests for SSO integration endpoints
"""

import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient
from fastapi import FastAPI
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.core.security import (
    create_access_token,
    verify_password,
    get_password_hash,
    verify_token,
    authenticate_user
)
from app.core.config import settings
from app.models import User, UserRole
from app.main import app


# Test database setup
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@pytest.fixture
def session():
    """Create a test database session."""
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        yield session
    SQLModel.metadata.drop_all(test_engine)


@pytest.fixture
async def client():
    """Create test HTTP client."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def test_user_data():
    """Test user data for registration."""
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "TestPass123",
        "role": "pastor"
    }


@pytest.fixture
def admin_user(session: Session):
    """Create an admin user for testing."""
    hashed_password = get_password_hash("AdminPass123")
    admin = User(
        username="admin",
        email="admin@example.com",
        hashed_password=hashed_password,
        role=UserRole.ADMIN,
        is_active=True
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)
    return admin


@pytest.fixture
def regular_user(session: Session):
    """Create a regular user for testing."""
    hashed_password = get_password_hash("UserPass123")
    user = User(
        username="user",
        email="user@example.com", 
        hashed_password=hashed_password,
        role=UserRole.PASTOR,
        is_active=True
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user: User):
    """Create JWT token for admin user."""
    return create_access_token(
        data={
            "sub": admin_user.id,
            "username": admin_user.username,
            "email": admin_user.email,
            "role": admin_user.role.value
        }
    )


@pytest.fixture
def user_token(regular_user: User):
    """Create JWT token for regular user."""
    return create_access_token(
        data={
            "sub": regular_user.id,
            "username": regular_user.username,
            "email": regular_user.email,
            "role": regular_user.role.value
        }
    )


class TestPasswordSecurity:
    """Test password hashing and verification."""
    
    def test_password_hashing(self):
        """Test that passwords are properly hashed."""
        password = "TestPassword123"
        hashed = get_password_hash(password)
        
        # Hash should be different from original
        assert hashed != password
        
        # Should be bcrypt hash (starts with $2b$)
        assert hashed.startswith("$2b$")
        
        # Verify password works
        assert verify_password(password, hashed) is True
        
        # Wrong password should fail
        assert verify_password("WrongPassword", hashed) is False


class TestJWTTokens:
    """Test JWT token creation and verification."""
    
    def test_create_access_token(self):
        """Test JWT token creation."""
        data = {"sub": "test-user-id", "username": "testuser"}
        token = create_access_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Token should be verifiable
        token_data = verify_token(token)
        assert token_data is not None
        assert token_data.user_id == "test-user-id"
        assert token_data.username == "testuser"
    
    def test_token_expiration(self):
        """Test that tokens expire properly."""
        data = {"sub": "test-user-id"}
        
        # Create token that expires in 1 second
        short_token = create_access_token(
            data, 
            expires_delta=timedelta(seconds=1)
        )
        
        # Should be valid immediately
        token_data = verify_token(short_token)
        assert token_data is not None
        
        # TODO: Add test for expired token (need to mock time)
    
    def test_invalid_token(self):
        """Test that invalid tokens are rejected."""
        # Completely invalid token
        assert verify_token("invalid.token.here") is None
        
        # Empty token
        assert verify_token("") is None
        
        # Malformed token
        assert verify_token("not.a.jwt") is None


class TestUserAuthentication:
    """Test user authentication functions."""
    
    def test_authenticate_user_success(self, session: Session, regular_user: User):
        """Test successful user authentication."""
        # Authenticate with username
        authenticated = authenticate_user(
            session, 
            regular_user.username, 
            "UserPass123"
        )
        assert authenticated is not None
        assert authenticated.id == regular_user.id
        
        # Authenticate with email
        authenticated = authenticate_user(
            session,
            regular_user.email,
            "UserPass123"
        )
        assert authenticated is not None
        assert authenticated.id == regular_user.id
    
    def test_authenticate_user_wrong_password(self, session: Session, regular_user: User):
        """Test authentication with wrong password."""
        authenticated = authenticate_user(
            session,
            regular_user.username,
            "WrongPassword123"
        )
        assert authenticated is None
    
    def test_authenticate_user_not_found(self, session: Session):
        """Test authentication with non-existent user."""
        authenticated = authenticate_user(
            session,
            "nonexistent@example.com",
            "Password123"
        )
        assert authenticated is None


class TestAuthenticationEndpoints:
    """Test authentication API endpoints."""
    
    @pytest.mark.asyncio
    async def test_register_user_success(
        self,
        client: AsyncClient,
        admin_token: str,
        test_user_data: dict
    ):
        """Test successful user registration by admin."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = await client.post(
            "/api/v1/auth/register",
            json=test_user_data,
            headers=headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == test_user_data["username"]
        assert data["email"] == test_user_data["email"]
        assert data["role"] == test_user_data["role"]
        assert "hashed_password" not in data  # Should not expose password
    
    @pytest.mark.asyncio
    async def test_register_user_unauthorized(
        self,
        client: AsyncClient,
        test_user_data: dict
    ):
        """Test that registration requires admin privileges."""
        # No token
        response = await client.post("/api/v1/auth/register", json=test_user_data)
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_register_user_insufficient_role(
        self,
        client: AsyncClient,
        user_token: str,
        test_user_data: dict
    ):
        """Test that non-admin users cannot register others."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = await client.post(
            "/api/v1/auth/register",
            json=test_user_data,
            headers=headers
        )
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_register_duplicate_username(
        self,
        client: AsyncClient,
        admin_token: str,
        regular_user: User
    ):
        """Test registration with duplicate username."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        user_data = {
            "username": regular_user.username,  # Duplicate username
            "email": "different@example.com",
            "password": "TestPass123",
            "role": "pastor"
        }
        
        response = await client.post(
            "/api/v1/auth/register",
            json=user_data,
            headers=headers
        )
        assert response.status_code == 400
        assert "Username already registered" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_login_success(
        self,
        client: AsyncClient,
        regular_user: User
    ):
        """Test successful login."""
        login_data = {
            "username": regular_user.username,
            "password": "UserPass123"
        }
        
        response = await client.post(
            "/api/v1/auth/login",
            data=login_data  # OAuth2PasswordRequestForm uses form data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0
        
        # Token should be valid
        token_data = verify_token(data["access_token"])
        assert token_data is not None
        assert token_data.user_id == regular_user.id
    
    @pytest.mark.asyncio
    async def test_login_wrong_password(
        self,
        client: AsyncClient,
        regular_user: User
    ):
        """Test login with wrong password."""
        login_data = {
            "username": regular_user.username,
            "password": "WrongPassword"
        }
        
        response = await client.post("/api/v1/auth/login", data=login_data)
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_login_inactive_user(
        self,
        client: AsyncClient,
        session: Session
    ):
        """Test login with inactive user."""
        # Create inactive user
        hashed_password = get_password_hash("TestPass123")
        inactive_user = User(
            username="inactive",
            email="inactive@example.com",
            hashed_password=hashed_password,
            role=UserRole.PASTOR,
            is_active=False
        )
        session.add(inactive_user)
        session.commit()
        
        login_data = {
            "username": inactive_user.username,
            "password": "TestPass123"
        }
        
        response = await client.post("/api/v1/auth/login", data=login_data)
        assert response.status_code == 400
        assert "Inactive user account" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_get_current_user(
        self,
        client: AsyncClient,
        user_token: str,
        regular_user: User
    ):
        """Test getting current user profile."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == regular_user.id
        assert data["username"] == regular_user.username
        assert data["email"] == regular_user.email
        assert data["role"] == regular_user.role.value
    
    @pytest.mark.asyncio
    async def test_get_current_user_unauthorized(self, client: AsyncClient):
        """Test getting current user without token."""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_update_current_user(
        self,
        client: AsyncClient,
        user_token: str
    ):
        """Test updating current user profile."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        update_data = {
            "username": "updated_username",
            "email": "updated@example.com"
        }
        
        response = await client.put(
            "/api/v1/auth/me",
            json=update_data,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "updated_username"
        assert data["email"] == "updated@example.com"


class TestRoleBasedAccess:
    """Test role-based access control."""
    
    @pytest.mark.asyncio
    async def test_admin_can_list_users(
        self,
        client: AsyncClient,
        admin_token: str
    ):
        """Test that admin can list users."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = await client.get("/api/v1/auth/users", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.asyncio
    async def test_regular_user_cannot_list_users(
        self,
        client: AsyncClient,
        user_token: str
    ):
        """Test that regular user cannot list users."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = await client.get("/api/v1/auth/users", headers=headers)
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_admin_can_update_any_user(
        self,
        client: AsyncClient,
        admin_token: str,
        regular_user: User
    ):
        """Test that admin can update any user."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        update_data = {
            "role": "treasurer",
            "is_active": False
        }
        
        response = await client.put(
            f"/api/v1/auth/users/{regular_user.id}",
            json=update_data,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "treasurer"
        assert data["is_active"] is False


class TestPasswordValidation:
    """Test password validation requirements."""
    
    @pytest.mark.asyncio
    async def test_weak_password_rejected(
        self,
        client: AsyncClient,
        admin_token: str
    ):
        """Test that weak passwords are rejected."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        weak_passwords = [
            "123456",           # Too short, no letters
            "password",         # No numbers, no uppercase
            "PASSWORD",         # No numbers, no lowercase  
            "Password",         # No numbers
            "Pass123"           # Too short
        ]
        
        for weak_password in weak_passwords:
            user_data = {
                "username": f"test_{weak_password}",
                "email": f"test_{weak_password}@example.com",
                "password": weak_password,
                "role": "pastor"
            }
            
            response = await client.post(
                "/api/v1/auth/register",
                json=user_data,
                headers=headers
            )
            
            # Should fail validation
            assert response.status_code == 422  # Validation error


# TODO: Add tests for:
# - Refresh token functionality when implemented
# - Password reset flow when implemented  
# - Rate limiting on login attempts
# - Session management and logout
# - Multi-tenancy access control
# - SSO integration endpoints
# - Audit logging verification
