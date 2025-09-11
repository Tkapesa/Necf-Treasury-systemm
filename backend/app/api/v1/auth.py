"""
Authentication endpoints for Church Treasury Management System.

Provides user registration, login, and profile management with JWT tokens.
Includes role-based access control and secure password handling.

TODO: Add refresh token endpoints for better security
TODO: Add password reset functionality via email
TODO: Add SSO integration endpoints (Google, Microsoft)
"""

from datetime import datetime, timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import (
    authenticate_user,
    create_access_token, 
    get_password_hash,
    get_current_active_user,
    require_admin
)
from app.core.config import get_settings
from app.models import User
from app.schemas import (
    UserCreate,
    UserResponse, 
    UserUpdate,
    Token,
    LoginResponse
)

# Get settings instance
settings = get_settings()


router = APIRouter(tags=["authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    session: Session = Depends(get_session),
    _: User = Depends(require_admin)  # Only admins can create users
) -> UserResponse:
    """
    Register a new user (Admin only).
    
    Creates a new user account with hashed password and specified role.
    Only administrators can create new user accounts for security.
    
    TODO: Add email verification workflow for new users
    TODO: Add audit logging for user creation
    TODO: Add church_id validation for multi-tenancy
    """
    # Check if username already exists
    existing_user = session.exec(
        select(User).where(User.username == user_data.username)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists  
    existing_email = session.exec(
        select(User).where(User.email == user_data.email)
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user with hashed password
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        is_active=True
    )
    
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    
    return UserResponse.from_orm(db_user)


@router.post("/login", response_model=LoginResponse)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Session = Depends(get_session)
) -> LoginResponse:
    """
    Authenticate user and return JWT access token.
    
    Accepts username/email and password, returns JWT token for API access.
    Updates last_login timestamp on successful authentication.
    
    TODO: Add rate limiting to prevent brute force attacks
    TODO: Add login attempt logging for security monitoring
    TODO: Add refresh token generation for longer sessions
    """
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    # Update last login timestamp
    user.last_login = datetime.utcnow()
    session.add(user)
    session.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.value
        }, 
        expires_delta=access_token_expires
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.from_orm(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
) -> UserResponse:
    """
    Get current user profile information.
    
    Returns the authenticated user's profile data (excluding sensitive fields).
    Requires valid JWT token in Authorization header.
    """
    return UserResponse.from_orm(current_user)


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
) -> UserResponse:
    """
    Update current user profile information.
    
    Allows users to update their own profile data (username, email).
    Role changes require admin privileges.
    
    TODO: Add email verification for email changes
    TODO: Add password change endpoint with current password verification
    """
    # Check if new username is already taken (if changing)
    if user_update.username and user_update.username != current_user.username:
        existing_user = session.exec(
            select(User).where(User.username == user_update.username)
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        current_user.username = user_update.username
    
    # Check if new email is already taken (if changing)
    if user_update.email and user_update.email != current_user.email:
        existing_email = session.exec(
            select(User).where(User.email == user_update.email)
        ).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already taken"
            )
        current_user.email = user_update.email
    
    # Only allow role/status changes by admins
    if user_update.role is not None or user_update.is_active is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role and status changes require admin privileges"
        )
    
    current_user.update_timestamp()
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return UserResponse.from_orm(current_user)


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    session: Session = Depends(get_session),
    _: User = Depends(require_admin)
) -> list[UserResponse]:
    """
    List all users (Admin only).
    
    Returns a list of all registered users for administrative purposes.
    Only accessible by users with admin role.
    
    TODO: Add pagination for large user lists
    TODO: Add filtering and search capabilities
    TODO: Add user activity status (last seen, login count)
    """
    users = session.exec(select(User)).all()
    return [UserResponse.from_orm(user) for user in users]


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(require_admin)
) -> UserResponse:
    """
    Update any user (Admin only).
    
    Allows administrators to update any user's profile, role, and status.
    Includes ability to activate/deactivate user accounts.
    
    TODO: Add audit logging for admin user changes
    TODO: Add validation to prevent self-demotion of last admin
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields if provided
    if user_update.username:
        # Check if username is already taken
        existing_user = session.exec(
            select(User).where(User.username == user_update.username, User.id != user_id)
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        user.username = user_update.username
    
    if user_update.email:
        # Check if email is already taken
        existing_email = session.exec(
            select(User).where(User.email == user_update.email, User.id != user_id)
        ).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already taken"
            )
        user.email = user_update.email
    
    if user_update.role is not None:
        user.role = user_update.role
    
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    
    user.update_timestamp()
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return UserResponse.from_orm(user)


# TODO: Add additional endpoints:
# - POST /auth/refresh - Refresh access token using refresh token
# - POST /auth/logout - Invalidate current token
# - POST /auth/forgot-password - Request password reset email
# - POST /auth/reset-password - Reset password with token
# - POST /auth/change-password - Change password with current password
# - GET /auth/sessions - List active user sessions
# - DELETE /auth/sessions/{session_id} - Revoke specific session
