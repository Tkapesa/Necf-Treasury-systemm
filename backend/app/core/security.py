"""
Security utilities for authentication and password handling.

Provides JWT token creation/validation, password hashing with bcrypt,
and security dependencies for protected endpoints.

TODO: Add refresh token support for better security
TODO: Add rate limiting for login attempts
TODO: Add session management for SSO integration
"""

from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from app.core.config import get_settings
from app.core.database import get_session
from app.models import User, UserRole
from app.schemas import TokenData

# Get settings instance
settings = get_settings()


# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for JWT token extraction
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="api/v1/auth/login",
    scheme_name="JWT"
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against its hash.
    
    Args:
        plain_password: The plain text password
        hashed_password: The bcrypt hashed password
        
    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Generate bcrypt hash of a password.
    
    Args:
        password: Plain text password
        
    Returns:
        Bcrypt hashed password
    """
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Payload data to encode in token
        expires_delta: Token expiration time (default from settings)
        
    Returns:
        Encoded JWT token string
        
    TODO: Add refresh token creation for longer-lived sessions
    TODO: Add token blacklisting support for logout
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[TokenData]:
    """
    Verify and decode a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        TokenData if valid, None if invalid
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        username: str = payload.get("username")
        email: str = payload.get("email")
        
        if user_id is None:
            return None
            
        token_data = TokenData(
            user_id=user_id,
            username=username,
            email=email
        )
        return token_data
    except JWTError:
        return None


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session)
) -> User:
    """
    Get current authenticated user from JWT token.
    
    Args:
        token: JWT token from Authorization header
        session: Database session
        
    Returns:
        User object if valid token and user exists
        
    Raises:
        HTTPException: If token invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = verify_token(token)
    if token_data is None:
        raise credentials_exception
    
    user = session.get(User, token_data.user_id)
    if user is None:
        raise credentials_exception
        
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current authenticated and active user.
    
    Args:
        current_user: User from get_current_user dependency
        
    Returns:
        Active user object
        
    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


def require_role(required_role: UserRole):
    """
    Create a dependency that requires a specific user role.
    
    Args:
        required_role: The minimum required role
        
    Returns:
        FastAPI dependency function
        
    TODO: Add hierarchical role checking (admin > treasurer > pastor > auditor)
    TODO: Add multi-tenancy role checking with church_id
    """
    async def role_checker(
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        """Check if user has required role."""
        
        # Define role hierarchy (higher number = more permissions)
        role_hierarchy = {
            UserRole.AUDITOR: 1,
            UserRole.PASTOR: 2, 
            UserRole.TREASURER: 3,
            UserRole.ADMIN: 4
        }
        
        user_level = role_hierarchy.get(current_user.role, 0)
        required_level = role_hierarchy.get(required_role, 0)
        
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role.value}"
            )
            
        return current_user
    
    return role_checker


# Convenience dependencies for common role requirements
require_admin = require_role(UserRole.ADMIN)
require_treasurer = require_role(UserRole.TREASURER)
require_pastor = require_role(UserRole.PASTOR)


def authenticate_user(
    session: Session, 
    username: str, 
    password: str
) -> Optional[User]:
    """
    Authenticate a user with username/email and password.
    
    Args:
        session: Database session
        username: Username or email address
        password: Plain text password
        
    Returns:
        User object if authentication successful, None otherwise
        
    TODO: Add rate limiting to prevent brute force attacks
    TODO: Add login attempt logging for security monitoring
    """
    # Try to find user by username first, then by email
    from sqlmodel import select, or_
    
    statement = select(User).where(
        or_(
            User.username == username,
            User.email == username
        )
    )
    user = session.exec(statement).first()
    
    if not user:
        return None
        
    if not verify_password(password, user.hashed_password):
        return None
        
    return user


# TODO: Add additional security functions:
# - create_refresh_token() for longer-lived sessions
# - revoke_token() for logout and security incidents  
# - check_password_strength() for registration validation
# - generate_reset_token() for password reset functionality
# - verify_reset_token() for password reset validation
# - rate_limit_login() to prevent brute force attacks
# - log_security_event() for audit trail
