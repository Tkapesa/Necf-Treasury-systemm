"""
SQLModel database models for Receipt and User entities.

This module defines the core models for the Church Treasury Management System
using SQLModel (Pydantic + SQLAlchemy) for type safety and validation.
"""

from sqlmodel import SQLModel, Field, Relationship, Index
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid
import os


class UserRole(str, Enum):
    """User roles for role-based access control."""
    TREASURER = "treasurer"  # Full financial access and transaction management
    ADMIN = "admin"         # System administration and user management  
    PASTOR = "pastor"       # Leadership access to reports and oversight
    AUDITOR = "auditor"     # Read-only access for compliance and auditing


class ReceiptStatus(str, Enum):
    """Processing status of uploaded receipts."""
    PENDING = "pending"      # Uploaded, awaiting OCR processing
    PROCESSING = "processing" # Currently being processed by OCR
    COMPLETED = "completed"  # Successfully processed and data extracted
    FAILED = "failed"        # Processing failed, manual intervention needed
    REVIEWED = "reviewed"    # Manually reviewed and approved by user


class User(SQLModel, table=True):
    """
    User model for authentication and authorization in the treasury system.
    
    Stores user credentials, role-based permissions, and activity tracking.
    Passwords are hashed using bcrypt for security compliance.
    """
    __tablename__ = "users"
    
    # Primary identification
    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()), 
        primary_key=True,
        description="Unique user identifier"
    )
    
    # Authentication credentials
    username: str = Field(
        unique=True, 
        index=True, 
        min_length=3, 
        max_length=50,
        description="Unique username for login (3-50 characters)"
    )
    email: str = Field(
        unique=True, 
        index=True, 
        max_length=255,
        description="User email address for notifications and recovery"
    )
    hashed_password: str = Field(
        min_length=1, 
        max_length=255,
        description="Bcrypt hashed password for secure authentication"
    )
    
    # Authorization and access control
    role: UserRole = Field(
        default=UserRole.PASTOR, 
        index=True,
        description="User role determining system permissions"
    )
    is_active: bool = Field(
        default=True, 
        index=True,
        description="Whether user account is active and can log in"
    )
    
    # Activity tracking
    last_login: Optional[datetime] = Field(
        default=None,
        description="Timestamp of user's last successful login"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow, 
        index=True,
        description="Account creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Last account modification timestamp"
    )
    
    # Relationships
    receipts: List["Receipt"] = Relationship(
        back_populates="uploaded_by"
    )


class Receipt(SQLModel, table=True):
    """
    Receipt model for uploaded financial documents and OCR data.
    
    Stores receipt metadata, file information, OCR extraction results,
    and manual categorization data for financial record keeping.
    Optimized with strategic indexes for admin dashboard performance.
    """
    __tablename__ = "receipts"
    
    # Primary identification
    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()), 
        primary_key=True,
        description="Unique receipt identifier"
    )
    
    # File metadata
    filename: str = Field(
        max_length=255,
        description="Original filename of uploaded receipt"
    )
    storage_path: str = Field(
        max_length=500,
        description="Path to file in storage system (S3, local, etc.)"
    )
    mime_type: str = Field(
        max_length=100,
        description="MIME type of uploaded file (image/pdf/etc.)"
    )
    file_size: int = Field(
        gt=0,
        description="File size in bytes for storage tracking"
    )
    
    # Processing status and OCR results
    status: ReceiptStatus = Field(
        default=ReceiptStatus.PENDING, 
        index=True,
        description="Current processing status for workflow tracking"
    )
    ocr_raw_text: Optional[str] = Field(
        default=None,
        description="Raw text extracted from receipt via OCR"
    )
    # OCR processing metadata
    ocr_confidence: Optional[float] = Field(
        default=None, 
        ge=0, 
        le=1,
        description="OCR processing confidence score (0-1)"
    )
    processing_time: Optional[float] = Field(
        default=None,
        description="OCR processing time in seconds"
    )
    
    # Extracted financial data (indexed for filtering)
    extracted_vendor: Optional[str] = Field(
        default=None, 
        max_length=200, 
        index=True,
        description="Vendor/merchant name extracted from receipt"
    )
    extracted_total: Optional[float] = Field(
        default=None, 
        index=True,
        description="Total amount extracted from receipt"
    )
    extracted_date: Optional[datetime] = Field(
        default=None, 
        index=True,
        description="Transaction date extracted from receipt"
    )
    extracted_items: Optional[str] = Field(
        default=None,
        description="JSON string of individual line items from receipt"
    )
    
    # Additional fields for manual entry/override
    description: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Manual description or notes about the receipt"
    )
    
    # Enhanced purchaser portal information
    purchaser_name: Optional[str] = Field(
        default=None, 
        max_length=200, 
        index=True,
        description="Name of person who made the purchase (from portal)"
    )
    purchaser_email: Optional[str] = Field(
        default=None, 
        max_length=200, 
        index=True,
        description="Email of person who made the purchase (from portal)"
    )
    event_purpose: Optional[str] = Field(
        default=None, 
        max_length=300, 
        index=True,
        description="Event or purpose for the purchase (from portal)"
    )
    approved_by: Optional[str] = Field(
        default=None, 
        max_length=200, 
        index=True,
        description="Name of person who approved the purchase (from portal)"
    )
    additional_notes: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Additional notes about the purchase (from portal)"
    )
    
    # Enhanced date tracking
    purchase_date: Optional[datetime] = Field(
        default=None, 
        index=True,
        description="Date of purchase extracted from receipt (vs upload date)"
    )
    upload_date: datetime = Field(
        default_factory=datetime.utcnow, 
        index=True,
        description="Date/time when receipt was uploaded to system"
    )
    
    # Manual categorization and corrections
    category: Optional[str] = Field(
        default=None, 
        max_length=100, 
        index=True,
        description="Manual category assignment for expense tracking"
    )
    manually_edited: Optional[bool] = Field(
        default=False,
        index=True,
        description="Flag indicating if receipt data was manually corrected by admin"
    )
    
    # Timestamps for audit trail
    created_at: datetime = Field(
        default_factory=datetime.utcnow, 
        index=True,
        description="Receipt upload timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Last modification timestamp"
    )
    
    # Relationships
    uploader_id: Optional[str] = Field(
        default=None,
        foreign_key="users.id", 
        index=True,
        description="ID of user who uploaded this receipt (null for purchaser portal)"
    )
    uploaded_by: Optional[User] = Relationship(
        back_populates="receipts"
    )
    
    def get_thumbnail_path(self) -> Optional[str]:
        """
        Generate thumbnail path for receipt image display.
        
        Returns path to thumbnail version of receipt for UI display.
        Returns None if receipt is not an image or thumbnail doesn't exist.
        """
        if not self.mime_type.startswith('image/'):
            return None
            
        # Generate thumbnail path by inserting '_thumb' before file extension
        base_path, ext = os.path.splitext(self.storage_path)
        thumbnail_path = f"{base_path}_thumb{ext}"
        
        return thumbnail_path
    
    def to_summary_dict(self) -> Dict[str, Any]:
        """
        Convert receipt to summary dictionary for API responses.
        
        Returns essential receipt information in a compact format
        suitable for dashboard displays and list views.
        """
        return {
            "id": self.id,
            "filename": self.filename,
            "vendor": self.extracted_vendor,
            "amount": float(self.extracted_total) if self.extracted_total else None,
            "purchase_date": self.purchase_date.isoformat() if self.purchase_date else None,
            "upload_date": self.upload_date.isoformat(),
            "category": self.category,
            "status": self.status.value,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "uploaded_at": self.created_at.isoformat(),
            "thumbnail_url": self.get_thumbnail_path(),
            # Enhanced purchaser information
            "purchaser_name": self.purchaser_name,
            "purchaser_email": self.purchaser_email,
            "event_purpose": self.event_purpose,
            "approved_by": self.approved_by,
            "additional_notes": self.additional_notes
        }


# Strategic database indexes for optimal query performance
# These would be created via Alembic migrations:

# Composite index for admin dashboard filtering (date desc, vendor, amount)
Index(
    "idx_receipts_dashboard_filter",
    Receipt.created_at.desc(),
    Receipt.extracted_vendor,
    Receipt.extracted_total
)

# Date range queries for monthly/quarterly reports
Index(
    "idx_receipts_date_range", 
    Receipt.extracted_date.desc()
)

# Amount range filtering for expense analysis
Index(
    "idx_receipts_amount_filter",
    Receipt.extracted_total
)

# User activity tracking
Index(
    "idx_receipts_by_uploader",
    Receipt.uploader_id,
    Receipt.created_at.desc()
)
