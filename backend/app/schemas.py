"""
Pydantic schemas for Church Treasury API request/response models.

Defines input/output schemas separate from database models for better
API design, validation, and security (password handling, etc.).
"""

from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from decimal import Decimal
from enum import Enum

from app.models import UserRole, ReceiptStatus


# ================================
# ADDITIONAL ENUMS
# ================================

class TransactionType(str, Enum):
    """Transaction types for future transaction management."""
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"


# ================================
# USER SCHEMAS
# ================================

class UserBase(BaseModel):
    """Base user schema with common fields."""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    role: UserRole = UserRole.PASTOR


class UserCreate(UserBase):
    """Schema for creating new users.
    
    TODO: Add church_id field for multi-tenancy support
    TODO: Add oauth_provider field for SSO integration
    """
    password: str = Field(..., min_length=8, max_length=128)
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserUpdate(BaseModel):
    """Schema for updating user information."""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserInDB(UserBase):
    """Schema for user data stored in database."""
    id: str
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserResponse(UserInDB):
    """Schema for user data in API responses (excludes sensitive fields)."""
    pass


# ================================
# AUTHENTICATION SCHEMAS
# ================================

class Token(BaseModel):
    """JWT token response schema."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # Seconds until expiration


class LoginResponse(BaseModel):
    """Login response with token and user data."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenData(BaseModel):
    """Token payload data."""
    user_id: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None


class LoginRequest(BaseModel):
    """User login request schema."""
    username: str  # Can be username or email
    password: str


class PasswordReset(BaseModel):
    """Password reset request schema."""
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


# ================================
# RECEIPT SCHEMAS
# ================================

class ReceiptBase(BaseModel):
    """Base receipt schema."""
    filename: str = Field(..., max_length=255)
    vendor_name: Optional[str] = Field(None, max_length=255)
    total_amount: Optional[Decimal] = Field(None, ge=0)
    transaction_date: Optional[datetime] = None
    category: Optional[str] = Field(None, max_length=100)


class ReceiptCreate(ReceiptBase):
    """Schema for creating receipts (file upload)."""
    # File data handled separately in multipart upload
    pass


class ReceiptUpdate(BaseModel):
    """Schema for updating receipt information."""
    vendor_name: Optional[str] = Field(None, max_length=255)
    total_amount: Optional[Decimal] = Field(None, ge=0)
    transaction_date: Optional[datetime] = None
    category: Optional[str] = Field(None, max_length=100)
    status: Optional[ReceiptStatus] = None


class ReceiptInDB(BaseModel):
    """Schema for receipt data in database - matches Receipt model exactly."""
    # Primary identification
    id: str
    
    # File metadata  
    filename: str
    storage_path: str
    mime_type: str
    file_size: int
    
    # Processing status and OCR results
    status: ReceiptStatus
    ocr_raw_text: Optional[str] = None
    
    # OCR processing metadata
    ocr_confidence: Optional[float] = None
    processing_time: Optional[float] = None
    
    # Extracted financial data
    extracted_vendor: Optional[str] = None
    extracted_total: Optional[float] = None
    extracted_date: Optional[datetime] = None
    extracted_items: Optional[str] = None  # JSON string
    
    # Manual entry and categorization
    description: Optional[str] = None
    purchaser_name: Optional[str] = None
    purchaser_email: Optional[str] = None
    event_purpose: Optional[str] = None
    approved_by: Optional[str] = None
    additional_notes: Optional[str] = None
    purchase_date: Optional[datetime] = None
    upload_date: datetime
    category: Optional[str] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    uploader_id: Optional[str] = None
    
    class Config:
        from_attributes = True


class ReceiptResponse(ReceiptInDB):
    """Schema for receipt data in API responses."""
    uploaded_by: Optional[UserResponse] = None


# ================================
# ENHANCED RECEIPT SCHEMAS
# ================================

class ReceiptListResponse(BaseModel):
    """Schema for paginated receipt list responses."""
    receipts: List[ReceiptResponse]
    pagination: "PaginationInfo"


class OCRResult(BaseModel):
    """Schema for OCR processing results."""
    vendor: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[datetime] = None  # Changed from date to datetime
    description: Optional[str] = None
    category: Optional[str] = None
    confidence: float = Field(..., ge=0, le=1)
    raw_text: str
    processing_time: float  # in seconds


# ================================
# PAGINATION SCHEMAS
# ================================

class PaginationInfo(BaseModel):
    """Pagination metadata for list responses."""
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1, le=100)
    total: int = Field(..., ge=0)
    pages: int = Field(..., ge=0)
    has_next: bool
    has_prev: bool


# ================================
# ANALYTICS SCHEMAS
# ================================

class CategoryStats(BaseModel):
    """Statistics for a spending category."""
    category: str
    count: int
    amount: float
    percentage: Optional[float] = None


class VendorStats(BaseModel):
    """Statistics for a vendor."""
    vendor: str
    count: int
    amount: float
    avg_amount: Optional[float] = None


class MonthlyStats(BaseModel):
    """Monthly spending statistics."""
    month: str  # YYYY-MM format
    count: int
    amount: float
    avg_amount: Optional[float] = None


class ActivityStats(BaseModel):
    """Recent activity statistics."""
    today: int
    this_week: int
    this_month: int


class ReceiptStats(BaseModel):
    """Comprehensive receipt statistics."""
    total_receipts: int
    total_amount: float
    monthly_spending: List[MonthlyStats]
    top_vendors: List[VendorStats]
    categories: List[CategoryStats]
    recent_activity: ActivityStats


class AdminStats(BaseModel):
    """Admin dashboard statistics."""
    total_receipts: int
    total_amount: float
    total_users: int
    active_users: int
    monthly_spending: List[MonthlyStats]
    top_vendors: List[VendorStats]
    categories: List[CategoryStats]
    recent_activity: ActivityStats
    processing_stats: Dict[str, int]  # status -> count


# ================================
# TRANSACTION SCHEMAS
# ================================

class TransactionBase(BaseModel):
    """Base transaction schema."""
    type: TransactionType
    amount: Decimal = Field(..., gt=0)
    description: str = Field(..., min_length=1, max_length=500)
    category: str = Field(..., max_length=100)
    transaction_date: datetime
    account_from: Optional[str] = Field(None, max_length=100)
    account_to: Optional[str] = Field(None, max_length=100)
    reference_number: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)


class TransactionCreate(TransactionBase):
    """Schema for creating transactions."""
    receipt_id: Optional[int] = None


class TransactionUpdate(BaseModel):
    """Schema for updating transactions."""
    type: Optional[TransactionType] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    category: Optional[str] = Field(None, max_length=100)
    transaction_date: Optional[datetime] = None
    account_from: Optional[str] = Field(None, max_length=100)
    account_to: Optional[str] = Field(None, max_length=100)
    reference_number: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)
    is_approved: Optional[bool] = None


class TransactionInDB(TransactionBase):
    """Schema for transaction data in database."""
    id: int
    is_approved: bool
    approved_by_id: Optional[int]
    approved_at: Optional[datetime]
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class TransactionResponse(TransactionInDB):
    """Schema for transaction data in API responses."""
    created_by: Optional[UserResponse] = None
    receipt: Optional[ReceiptResponse] = None


# ================================
# GENERIC SCHEMAS
# ================================

class ErrorResponse(BaseModel):
    """Standard error response schema."""
    error: Dict[str, Any] = Field(
        ...,
        example={
            "code": 400,
            "message": "Validation error",
            "type": "validation_error",
            "details": []
        }
    )


class SuccessResponse(BaseModel):
    """Standard success response schema."""
    message: str
    data: Optional[Dict[str, Any]] = None


class PaginationParams(BaseModel):
    """Pagination parameters for list endpoints."""
    page: int = Field(1, ge=1)
    size: int = Field(10, ge=1, le=100)


class PaginatedResponse(BaseModel):
    """Paginated response wrapper."""
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int


# ================================
# AUTOCOMPLETE SCHEMAS
# ================================

class AutocompleteResponse(BaseModel):
    """Schema for autocomplete responses."""
    vendors: Optional[List[Dict[str, Union[str, int]]]] = None
    users: Optional[List[Dict[str, Union[str, int]]]] = None


# ================================
# REPORTING SCHEMAS
# ================================

class FinancialSummary(BaseModel):
    """Financial summary for reporting."""
    total_income: Decimal
    total_expenses: Decimal
    net_balance: Decimal
    transaction_count: int
    period_start: datetime
    period_end: datetime


class CategorySummary(BaseModel):
    """Category-wise financial summary."""
    category: str
    total_amount: Decimal
    transaction_count: int
    percentage_of_total: float


# Forward reference update for PaginationInfo
ReceiptListResponse.model_rebuild()
