"""
Simplified Receipt management API endpoints for Church Treasury Management System.

Handles receipt upload, basic CRUD operations, and image serving.
Uses synchronous database operations to match auth pattern.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlmodel import Session, select, and_, or_, desc, asc, func
from typing import List, Optional, Dict, Any
import os
import uuid
import json
from datetime import datetime
from decimal import Decimal

from app.core.config import get_settings
from app.core.database import get_session
from app.models import Receipt, User, ReceiptStatus, UserRole
from app.core.security import get_current_user

# Router setup
router = APIRouter()
settings = get_settings()

# Allowed file types for uploads
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".pdf", ".tiff", ".webp"}
ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/gif",
    "application/pdf", "image/tiff", "image/webp"
}


def validate_file(file: UploadFile) -> None:
    """Validate uploaded file type and size."""
    if file.filename:
        file_ext = os.path.splitext(file.filename.lower())[1]
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
    
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"MIME type not allowed: {file.content_type}"
        )


@router.post("/upload")
async def upload_receipt(
    file: UploadFile = File(...),
    vendor_name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Upload a receipt file for processing."""
    validate_file(file)
    
    # Generate unique filename
    file_ext = os.path.splitext(file.filename or "receipt")[1].lower()
    unique_filename = f"receipt_{uuid.uuid4()}{file_ext}"
    
    # Create upload directory if it doesn't exist
    upload_dir = os.path.join(settings.upload_path, "receipts")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(upload_dir, unique_filename)
    content = await file.read()
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create receipt record
    receipt = Receipt(
        filename=file.filename or unique_filename,
        storage_path=file_path,
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
        extracted_vendor=vendor_name,
        category=category,
        uploader_id=current_user.id,
        status=ReceiptStatus.PENDING
    )
    
    session.add(receipt)
    session.commit()
    session.refresh(receipt)
    
    # Start OCR processing (simplified)
    receipt.status = ReceiptStatus.PROCESSING
    session.commit()
    
    # Mock OCR completion after a delay
    import asyncio
    asyncio.create_task(mock_ocr_processing(receipt.id))
    
    return {
        "id": receipt.id,
        "filename": receipt.filename,
        "status": receipt.status.value,
        "message": "Receipt uploaded successfully"
    }


async def mock_ocr_processing(receipt_id: str):
    """Mock OCR processing with delay."""
    await asyncio.sleep(3)  # Simulate processing time
    
    # Update the receipt with mock OCR results
    from app.core.database import engine
    with Session(engine) as session:
        receipt = session.get(Receipt, receipt_id)
        if receipt:
            receipt.status = ReceiptStatus.COMPLETED
            receipt.extracted_vendor = "Sample Vendor"
            receipt.extracted_total = 25.99
            receipt.extracted_date = datetime.now()
            receipt.ocr_raw_text = "Sample receipt text extracted by OCR"
            session.commit()


@router.get("")
def get_receipts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[ReceiptStatus] = Query(None),
    vendor: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get receipts with pagination and filtering."""
    # Build query
    query = select(Receipt)
    
    # Apply user-based filtering (non-admins see only their receipts)
    if current_user.role not in [UserRole.ADMIN, UserRole.TREASURER]:
        query = query.where(Receipt.uploader_id == current_user.id)
    
    # Apply filters
    if status_filter:
        query = query.where(Receipt.status == status_filter)
    
    if vendor:
        query = query.where(Receipt.extracted_vendor.ilike(f"%{vendor}%"))
    
    # Add sorting and pagination
    query = query.order_by(desc(Receipt.created_at))
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    receipts = session.exec(query).all()
    
    # Get total count for pagination
    count_query = select(func.count(Receipt.id))
    if current_user.role not in [UserRole.ADMIN, UserRole.TREASURER]:
        count_query = count_query.where(Receipt.uploader_id == current_user.id)
    if status_filter:
        count_query = count_query.where(Receipt.status == status_filter)
    if vendor:
        count_query = count_query.where(Receipt.extracted_vendor.ilike(f"%{vendor}%"))
    
    total = session.exec(count_query).one()
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "receipts": [
            {
                "id": receipt.id,
                "filename": receipt.filename,
                "status": receipt.status.value,
                "extracted_vendor": receipt.extracted_vendor,
                "extracted_total": float(receipt.extracted_total) if receipt.extracted_total else None,
                "extracted_date": receipt.extracted_date.isoformat() if receipt.extracted_date else None,
                "category": receipt.category,
                "created_at": receipt.created_at.isoformat() if receipt.created_at else None,
                "uploader_id": receipt.uploader_id
            }
            for receipt in receipts
        ],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }


@router.get("/{receipt_id}")
def get_receipt(
    receipt_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get a specific receipt by ID."""
    receipt = session.get(Receipt, receipt_id)
    
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found"
        )
    
    # Check access permissions
    if (receipt.uploader_id != current_user.id and 
        current_user.role not in [UserRole.ADMIN, UserRole.TREASURER]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return {
        "id": receipt.id,
        "filename": receipt.filename,
        "status": receipt.status.value,
        "extracted_vendor": receipt.extracted_vendor,
        "extracted_total": float(receipt.extracted_total) if receipt.extracted_total else None,
        "extracted_date": receipt.extracted_date.isoformat() if receipt.extracted_date else None,
        "category": receipt.category,
        "created_at": receipt.created_at.isoformat() if receipt.created_at else None,
        "uploader_id": receipt.uploader_id,
        "ocr_raw_text": receipt.ocr_raw_text
    }


@router.get("/{receipt_id}/status")
def get_receipt_status(
    receipt_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get receipt processing status for polling."""
    receipt = session.get(Receipt, receipt_id)
    
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found"
        )
    
    # Check access permissions
    if (receipt.uploader_id != current_user.id and 
        current_user.role not in [UserRole.ADMIN, UserRole.TREASURER]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return {
        "id": receipt.id,
        "status": receipt.status.value,
        "uploaded_at": receipt.created_at.isoformat() if receipt.created_at else None,
        "ocr_completed": receipt.status in [ReceiptStatus.COMPLETED, ReceiptStatus.REVIEWED],
        "extracted_data": {
            "vendor": receipt.extracted_vendor,
            "total": float(receipt.extracted_total) if receipt.extracted_total else None,
            "date": receipt.extracted_date.isoformat() if receipt.extracted_date else None,
            "items": []  # Simplified for now
        } if receipt.status == ReceiptStatus.COMPLETED else None
    }


@router.get("/{receipt_id}/image")
def get_receipt_image(
    receipt_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Serve receipt image file."""
    receipt = session.get(Receipt, receipt_id)
    
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found"
        )
    
    # Check access permissions
    if (receipt.uploader_id != current_user.id and 
        current_user.role not in [UserRole.ADMIN, UserRole.TREASURER]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if file exists
    if not receipt.storage_path or not os.path.exists(receipt.storage_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt image not found"
        )
    
    return FileResponse(
        path=receipt.storage_path,
        media_type=receipt.mime_type or "image/jpeg",
        filename=receipt.filename
    )


@router.put("/{receipt_id}")
def update_receipt(
    receipt_id: str,
    extracted_vendor: Optional[str] = Form(None),
    extracted_total: Optional[float] = Form(None),
    category: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update receipt information."""
    receipt = session.get(Receipt, receipt_id)
    
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found"
        )
    
    # Check access permissions
    if (receipt.uploader_id != current_user.id and 
        current_user.role not in [UserRole.ADMIN, UserRole.TREASURER]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update fields
    if extracted_vendor is not None:
        receipt.extracted_vendor = extracted_vendor
    if extracted_total is not None:
        receipt.extracted_total = extracted_total
    if category is not None:
        receipt.category = category
    
    receipt.updated_at = datetime.utcnow()
    session.commit()
    session.refresh(receipt)
    
    return {
        "id": receipt.id,
        "filename": receipt.filename,
        "status": receipt.status.value,
        "extracted_vendor": receipt.extracted_vendor,
        "extracted_total": float(receipt.extracted_total) if receipt.extracted_total else None,
        "category": receipt.category,
        "message": "Receipt updated successfully"
    }


@router.post("/purchaser-submit")
async def submit_purchaser_receipt(
    file: UploadFile = File(...),
    purchaser_name: str = Form(...),
    purchaser_email: str = Form(...),
    event_or_purpose: str = Form(...),
    approved_by: str = Form(...),
    notes: str = Form(""),
    session: Session = Depends(get_session)
):
    """Submit receipt from purchaser portal (no authentication required)."""
    validate_file(file)
    
    # Generate unique filename
    file_ext = os.path.splitext(file.filename or "receipt")[1].lower()
    unique_filename = f"purchaser_{uuid.uuid4()}{file_ext}"
    
    # Create upload directory if it doesn't exist
    upload_dir = os.path.join(settings.upload_path, "receipts")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(upload_dir, unique_filename)
    content = await file.read()
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Prepare purchaser data
    purchaser_data = {
        "purchaser_name": purchaser_name.strip(),
        "purchaser_email": purchaser_email.strip().lower(),
        "event_or_purpose": event_or_purpose.strip(),
        "approved_by": approved_by.strip(),
        "notes": notes.strip() if notes else "",
        "submission_type": "purchaser_portal",
        "submission_date": datetime.utcnow().isoformat()
    }
    
    # Create receipt record
    receipt = Receipt(
        filename=file.filename or unique_filename,
        storage_path=file_path,
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
        uploader_id=None,  # No user authentication required
        status=ReceiptStatus.PENDING,
        category="purchaser_portal",
        extracted_items=json.dumps(purchaser_data),
        extracted_vendor=f"Purchaser: {purchaser_name.strip()}",
        description=f"Purchase for: {event_or_purpose.strip()}"
    )
    
    session.add(receipt)
    session.commit()
    session.refresh(receipt)
    
    return {
        "id": receipt.id,
        "filename": receipt.filename,
        "status": receipt.status.value,
        "message": "Receipt submitted successfully and is being processed"
    }
