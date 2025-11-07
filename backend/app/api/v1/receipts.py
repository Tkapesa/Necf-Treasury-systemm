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
import asyncio
import re
from datetime import datetime
from decimal import Decimal

from app.core.config import get_settings
from app.core.database import get_session
from app.models import Receipt, User, ReceiptStatus, UserRole
from app.core.security import get_current_user
from urllib.parse import urljoin
from app.schemas import ReceiptUpdate

# Thumbnail helpers
def _public_url(rel_path: Optional[str]) -> Optional[str]:
    if not rel_path:
        return None
    public_base = os.environ.get("BASE_URL", "http://localhost:8000")
    return urljoin(public_base, f"/static/{rel_path}")

def _resolve_paths(storage_path: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """Return (abs_path, rel_path) for a stored file under uploads root."""
    if not storage_path:
        return None, None
    try:
        if os.path.isabs(storage_path):
            # If absolute and under uploads, convert to relative
            up = os.path.abspath(settings.upload_path)
            sp = os.path.abspath(storage_path)
            if os.path.commonpath([sp, up]) == up:
                rel_path = os.path.relpath(sp, start=up)
                return sp, rel_path
            return sp, None
        else:
            abs_path = os.path.join(settings.upload_path, storage_path)
            return abs_path, storage_path
    except Exception:
        return None, storage_path if not os.path.isabs(storage_path or '') else None

def _ensure_thumbnail(abs_path: Optional[str], rel_path: Optional[str], size: str = "medium") -> tuple[Optional[str], Optional[str]]:
    """Create thumbnail if needed; return (abs_thumb, rel_thumb). Works for images and PDFs.
    
    Args:
        abs_path: Absolute path to original image
        rel_path: Relative path for URL generation
        size: 'small' (256px for lists), 'medium' (1024px for viewing), or 'full' (original)
    """
    if not abs_path or not rel_path or not os.path.exists(abs_path):
        return abs_path, rel_path
    
    # Return original for full size
    if size == "full":
        return abs_path, rel_path
    
    # Determine thumbnail size
    thumb_size = (256, 256) if size == "small" else (1024, 1024)  # medium size
    size_suffix = "_small" if size == "small" else "_thumb"
    
    base, ext = os.path.splitext(rel_path)
    thumb_rel = f"{base}{size_suffix}.png" if ext.lower() == '.pdf' else f"{base}{size_suffix}{ext}"
    thumb_abs = os.path.join(settings.upload_path, thumb_rel)
    
    # If already exists, return it
    if os.path.exists(thumb_abs):
        return thumb_abs, thumb_rel
    
    try:
        os.makedirs(os.path.dirname(thumb_abs), exist_ok=True)
        if ext.lower() == '.pdf':
            from pdf2image import convert_from_path
            pages = convert_from_path(abs_path, dpi=200, first_page=1, last_page=1)
            if pages:
                img = pages[0]
                # Use LANCZOS resampling for better quality
                img.thumbnail(thumb_size, resample=getattr(__import__('PIL.Image'), 'LANCZOS', 3))
                img.save(thumb_abs, format='PNG', quality=95, optimize=True)
                return thumb_abs, thumb_rel
        else:
            from PIL import Image
            with Image.open(abs_path) as im:
                # Convert to RGB if necessary (handles PNG with transparency)
                if im.mode in ('RGBA', 'LA', 'P'):
                    rgb_im = Image.new('RGB', im.size, (255, 255, 255))
                    if im.mode == 'P':
                        im = im.convert('RGBA')
                    rgb_im.paste(im, mask=im.split()[-1] if im.mode in ('RGBA', 'LA') else None)
                    im = rgb_im
                
                # Use LANCZOS resampling for better quality
                im.thumbnail(thumb_size, resample=getattr(Image, 'LANCZOS', 3))
                
                # Save with high quality
                if ext.lower() in ['.jpg', '.jpeg']:
                    im.save(thumb_abs, format='JPEG', quality=95, optimize=True)
                else:
                    im.save(thumb_abs, quality=95, optimize=True)
                return thumb_abs, thumb_rel
    except Exception as e:
        print(f"⚠️ Thumbnail generation failed for {abs_path}: {e}")
        import traceback
        traceback.print_exc()
        return abs_path, rel_path


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


@router.post("/test-upload")
async def test_upload_receipt(
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """Test upload endpoint without authentication for debugging."""
    print(f"🧪 TEST UPLOAD: Received file {file.filename}")
    
    try:
        validate_file(file)
        
        # Generate unique filename
        import os
        file_ext = os.path.splitext(file.filename or "receipt")[1].lower()
        unique_filename = f"test_{uuid.uuid4()}{file_ext}"
        
        # Read file content for size
        content = await file.read()
        file_size = len(content)
        
        print(f"📁 Test file info: {file.filename}, size: {file_size} bytes")
        
        # Try OCR processing
        print("🔍 Processing test OCR...")
        
        # Create a temporary file for OCR
        import tempfile
        
        with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as tmp_file:
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Test OCR service
            from app.services.ocr_service import get_ocr_service
            
            ocr_service = get_ocr_service()
            
            # Extract OCR data
            raw_text = await ocr_service.extract_text(tmp_file_path)
            structured_data = await ocr_service.extract_structured_data(tmp_file_path)
            
            print(f"✅ Test OCR Results: {structured_data.get('vendor_name', 'Unknown')} - {structured_data.get('total_amount', 0)} TL")
            
            # Return results without saving to database
            result = {
                "filename": file.filename,
                "file_size": file_size,
                "ocr_text": raw_text[:200] + "..." if len(raw_text) > 200 else raw_text,
                "extracted_vendor": structured_data.get('vendor_name', ''),
                "extracted_total": structured_data.get('total_amount', 0),
                "confidence": structured_data.get('confidence', 0.95),
                "status": "COMPLETED",
                "message": "Test OCR completed successfully!"
            }
            
            print(f"🎉 TEST UPLOAD SUCCESS: {result}")
            return result
            
        finally:
            # Clean up test file
            try:
                os.unlink(tmp_file_path)
            except:
                pass
        
    except Exception as e:
        print(f"❌ Test upload failed: {e}")
        import traceback
        traceback.print_exc()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test upload failed: {str(e)}"
        )


@router.post("/upload")
async def upload_receipt(
    file: UploadFile = File(...),
    vendor_name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Upload a receipt file with IMMEDIATE OCR processing."""
    print(f"🚀 UPLOAD: Received file {file.filename} from user {current_user.username}")
    
    validate_file(file)
    
    # Generate unique filename
    file_ext = os.path.splitext(file.filename or "receipt")[1].lower()
    unique_filename = f"receipt_{uuid.uuid4()}{file_ext}"
    
    # Create upload directory if it doesn't exist
    upload_dir = os.path.join(settings.upload_path, "receipts")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file (absolute path)
    file_path = os.path.join(upload_dir, unique_filename)
    content = await file.read()
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    print(f"💾 File saved: {file_path}, size: {len(content)} bytes")
    
    # IMMEDIATE OCR PROCESSING
    print("🔍 Starting immediate OCR processing...")
    try:
        # Import and use OCR service
        from app.services.ocr_service import get_ocr_service
        
        ocr_service = get_ocr_service()
        
        # Extract OCR data immediately
        ocr_text = await ocr_service.extract_text(file_path)
        structured_data = await ocr_service.extract_structured_data(file_path)
        
        print(f"✅ OCR completed: {structured_data.get('vendor_name', 'Unknown')} - {structured_data.get('total_amount', 0)} TL")
        
        # Normalize storage_path to be relative under uploads root for static serving
        # settings.upload_path is the absolute uploads directory mounted at /static
        try:
            rel_storage_path = os.path.relpath(file_path, start=settings.upload_path)
        except Exception:
            # Fallback to filename under receipts
            rel_storage_path = os.path.join("receipts", unique_filename)

        # Create receipt record with COMPLETED status and OCR data
        # Parse date if provided by OCR
        purchase_dt = None
        try:
            if structured_data.get('date'):
                purchase_dt = datetime.fromisoformat(structured_data['date'])
        except Exception:
            purchase_dt = None

        receipt = Receipt(
            filename=file.filename or unique_filename,
            storage_path=rel_storage_path,
            file_size=len(content),
            mime_type=file.content_type or "application/octet-stream",
            extracted_vendor=vendor_name or structured_data.get('vendor_name', ''),
            extracted_total=structured_data.get('total_amount', 0),
            extracted_date=purchase_dt,
            category=category or 'general',
            uploader_id=current_user.id,
            status=ReceiptStatus.COMPLETED,  # Set to COMPLETED immediately
            upload_date=datetime.utcnow(),
            # OCR fields
            ocr_raw_text=ocr_text,
            ocr_confidence=structured_data.get('confidence', 0.95),
            processing_time=structured_data.get('processing_time', 1.2),
            extracted_items=str(structured_data.get('items', []))
        )
        
        session.add(receipt)
        session.commit()
        session.refresh(receipt)
        
        print(f"💾 Receipt saved with ID: {receipt.id}, Status: {receipt.status}")
        print("🎉 REAL-TIME OCR COMPLETE! User sees results immediately!")

        # Build public image URLs for frontend
        abs_path, rel_path = _resolve_paths(rel_storage_path)
        
        # Generate both small thumbnail (for lists) and medium preview (for viewing)
        _thumb_abs_small, thumb_rel_small = _ensure_thumbnail(abs_path, rel_path, size="small")
        _thumb_abs_medium, thumb_rel_medium = _ensure_thumbnail(abs_path, rel_path, size="medium")
        
        # Return medium-quality preview as default image_url
        image_url = _public_url(thumb_rel_medium or rel_path)
        thumbnail_url = _public_url(thumb_rel_small or rel_path)

        return {
            "id": receipt.id,
            "filename": receipt.filename,
            "status": receipt.status.value,
            "extracted_vendor": receipt.extracted_vendor,
            "extracted_total": float(receipt.extracted_total) if receipt.extracted_total else 0,
            "extracted_date": receipt.extracted_date.isoformat() if receipt.extracted_date else None,
            "ocr_raw_text": receipt.ocr_raw_text,
            "ocr_confidence": receipt.ocr_confidence,
            "processing_time": receipt.processing_time,
            "extracted_items": receipt.extracted_items,
            "image_url": image_url,  # Medium quality for viewing
            "thumbnail_url": thumbnail_url,  # Small for lists
            "message": "Receipt uploaded and processed successfully"
        }
        
    except Exception as e:
        print(f"❌ OCR processing failed: {e}")
        # Create receipt with FAILED status if OCR fails
        receipt = Receipt(
            filename=file.filename or unique_filename,
            storage_path=os.path.relpath(file_path, start=settings.upload_path) if os.path.commonpath([file_path, settings.upload_path]) else file_path,
            file_size=len(content),
            mime_type=file.content_type or "application/octet-stream",
            extracted_vendor=vendor_name or "OCR Failed",
            category=category or 'general',
            uploader_id=current_user.id,
            status=ReceiptStatus.FAILED
        )
        
        session.add(receipt)
        session.commit()
        session.refresh(receipt)
        
        return {
            "id": receipt.id,
            "filename": receipt.filename,
            "status": receipt.status.value,
            "message": f"Receipt uploaded but OCR failed: {str(e)}"
        }


async def mock_ocr_processing(receipt_id: str, session: Session):
    """Background OCR using the real OCR service on the stored file."""
    await asyncio.sleep(0.1)
    from app.core.database import get_session
    async_session = next(get_session())
    try:
        from app.services.ocr_service import get_ocr_service
        from app.core.config import get_settings
        settings_local = get_settings()
        receipt = async_session.get(Receipt, receipt_id)
        if not receipt:
            return
        # Resolve absolute path for stored file
        storage_path = receipt.storage_path or ''
        abs_path = storage_path if os.path.isabs(storage_path) else os.path.join(settings_local.upload_path, storage_path)
        try:
            ocr_service = get_ocr_service()
            ocr_text = await ocr_service.extract_text(abs_path)
            structured = await ocr_service.extract_structured_data(abs_path)
        except Exception as e:
            print(f"OCR failed for {receipt_id}: {e}")
            receipt.status = ReceiptStatus.FAILED
            async_session.commit()
            return

        # Parse purchase date
        purchase_dt = None
        try:
            if structured.get('date'):
                purchase_dt = datetime.fromisoformat(structured['date'])
        except Exception:
            purchase_dt = None

        # Update receipt
        receipt.status = ReceiptStatus.COMPLETED
        receipt.ocr_raw_text = ocr_text
        # Overwrite with new OCR results to avoid keeping incorrect old values
        receipt.extracted_vendor = structured.get('vendor_name', '')
        receipt.extracted_total = structured.get('total_amount', 0)
        receipt.extracted_date = purchase_dt or receipt.extracted_date
        if not receipt.upload_date:
            receipt.upload_date = datetime.utcnow()
        if not receipt.category:
            receipt.category = 'general'
        # Store items JSON
        try:
            receipt.extracted_items = json.dumps(structured.get('items', []))
        except Exception:
            pass

        async_session.add(receipt)
        async_session.commit()
        print(f"✅ OCR updated receipt {receipt_id}: {receipt.extracted_vendor}, {receipt.extracted_total}")
    except Exception as e:
        print(f"Error in OCR processing for {receipt_id}: {e}")
        try:
            receipt.status = ReceiptStatus.FAILED
            async_session.commit()
        except Exception:
            pass
    finally:
        async_session.close()


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
                
                # Enhanced extracted data
                "extracted_vendor": receipt.extracted_vendor,
                "extracted_total": float(receipt.extracted_total) if receipt.extracted_total else None,
                "extracted_date": receipt.extracted_date.isoformat() if receipt.extracted_date else None,
                # Aliases for frontend compatibility
                "vendor": receipt.extracted_vendor,
                "amount": float(receipt.extracted_total) if receipt.extracted_total else None,
                
                # Enhanced date tracking
                "purchase_date": receipt.purchase_date.isoformat() if receipt.purchase_date else None,
                "upload_date": receipt.upload_date.isoformat() if receipt.upload_date else receipt.created_at.isoformat(),
                
                # Purchaser portal information
                "purchaser_name": receipt.purchaser_name,
                "purchaser_email": receipt.purchaser_email,
                "event_purpose": receipt.event_purpose,
                "approved_by": receipt.approved_by,
                "additional_notes": receipt.additional_notes,
                
                # System data
                "category": receipt.category,
                "created_at": receipt.created_at.isoformat() if receipt.created_at else None,
                "uploader_id": receipt.uploader_id,
                
                # Additional fields for frontend
                "uploader_type": "purchaser_portal" if receipt.purchaser_name else "admin_user",
                # Image URLs: provide both thumbnail (small) and preview (medium)
                "image_url": (lambda r: _public_url(_ensure_thumbnail(*_resolve_paths(r.storage_path), size="medium")[1] or _resolve_paths(r.storage_path)[1]) if r.storage_path else None)(receipt),
                "thumbnail_url": (lambda r: _public_url(_ensure_thumbnail(*_resolve_paths(r.storage_path), size="small")[1] or _resolve_paths(r.storage_path)[1]) if r.storage_path else None)(receipt),
                # Extracted OCR data
            "ocr_raw_text": receipt.ocr_raw_text,
                "ocr_confidence": receipt.ocr_confidence,
            "extracted_items": receipt.extracted_items,
            # Manual edit tracking
            "manually_edited": receipt.manually_edited
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
    
    # Build image URLs with normalized paths (provide both sizes)
    abs_path, rel_path = _resolve_paths(receipt.storage_path)
    _thumb_abs_medium, thumb_rel_medium = _ensure_thumbnail(abs_path, rel_path, size="medium")
    _thumb_abs_small, thumb_rel_small = _ensure_thumbnail(abs_path, rel_path, size="small")
    
    image_url = _public_url(thumb_rel_medium or rel_path)
    thumbnail_url = _public_url(thumb_rel_small or rel_path)
    
    return {
        "id": receipt.id,
        "filename": receipt.filename,
        "status": receipt.status.value,
        
        # Enhanced extracted data
        "extracted_vendor": receipt.extracted_vendor,
        "extracted_total": float(receipt.extracted_total) if receipt.extracted_total else None,
        "extracted_date": receipt.extracted_date.isoformat() if receipt.extracted_date else None,
        # Aliases for frontend compatibility
        "vendor": receipt.extracted_vendor,
        "amount": float(receipt.extracted_total) if receipt.extracted_total else None,
        "extracted_items": receipt.extracted_items,
        "ocr_raw_text": receipt.ocr_raw_text,
        "ocr_confidence": receipt.ocr_confidence,
        "processing_time": receipt.processing_time,
        # Image URLs (medium for viewing, small for thumbnails)
        "image_url": image_url,
        "thumbnail_url": thumbnail_url,
        
        # Enhanced date tracking
        "purchase_date": receipt.purchase_date.isoformat() if receipt.purchase_date else None,
        "upload_date": receipt.upload_date.isoformat() if receipt.upload_date else receipt.created_at.isoformat(),
        
        # Purchaser portal information
        "purchaser_name": receipt.purchaser_name,
        "purchaser_email": receipt.purchaser_email,
        "event_purpose": receipt.event_purpose,
        "approved_by": receipt.approved_by,
        "additional_notes": receipt.additional_notes,
        
        # System data
        "category": receipt.category,
        "created_at": receipt.created_at.isoformat() if receipt.created_at else None,
        "uploader_id": receipt.uploader_id,
        "uploader_type": "purchaser_portal" if receipt.purchaser_name else "admin_user"
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
    size: str = Query("full", regex="^(small|medium|full)$"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Serve receipt image file with size options.
    
    Args:
        receipt_id: Receipt UUID
        size: Image size - 'small' (256px), 'medium' (1024px), 'full' (original)
    """
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
    
    # Resolve absolute path (storage_path may be relative under uploads root)
    storage_path = receipt.storage_path or ""
    abs_path = (
        storage_path if os.path.isabs(storage_path)
        else os.path.join(settings.upload_path, storage_path)
    )

    # Check if file exists
    if not storage_path or not os.path.exists(abs_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt image not found"
        )
    
    # Generate thumbnail if requested (otherwise serve full image)
    if size in ["small", "medium"]:
        abs_path_resolved, rel_path = _resolve_paths(storage_path)
        thumb_abs, thumb_rel = _ensure_thumbnail(abs_path_resolved, rel_path, size=size)
        if thumb_abs and os.path.exists(thumb_abs):
            abs_path = thumb_abs
        else:
            print(f"⚠️ Thumbnail not available, serving original")
    
    return FileResponse(
        path=abs_path,
        media_type=receipt.mime_type or "image/jpeg",
        filename=receipt.filename
    )


@router.put("/{receipt_id}")
def update_receipt(
    receipt_id: str,
    receipt_update: ReceiptUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update receipt information via JSON body (admin/owner)."""
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
    
    # Apply updates
    data = receipt_update.dict(exclude_unset=True)
    if "extracted_vendor" in data:
        receipt.extracted_vendor = data["extracted_vendor"]
    if "extracted_total" in data:
        try:
            receipt.extracted_total = float(data["extracted_total"]) if data["extracted_total"] is not None else None
        except (TypeError, ValueError):
            pass
    if "extracted_date" in data and data["extracted_date"] is not None:
        # Pydantic parses to datetime; store as-is
        receipt.extracted_date = data["extracted_date"]
        # Also set purchase_date for UI if not set
        if not receipt.purchase_date:
            receipt.purchase_date = data["extracted_date"]
    if "category" in data:
        receipt.category = data["category"]
    if "status" in data and data["status"] is not None:
        # Ensure valid enum
        try:
            receipt.status = ReceiptStatus(data["status"]) if isinstance(data["status"], str) else data["status"]
        except Exception:
            pass
    if "description" in data:
        receipt.description = data["description"]
    if "purchaser_name" in data:
        receipt.purchaser_name = data["purchaser_name"]
    if "purchaser_email" in data:
        receipt.purchaser_email = data["purchaser_email"]
    if "event_purpose" in data:
        receipt.event_purpose = data["event_purpose"]
    if "additional_notes" in data:
        receipt.additional_notes = data["additional_notes"]
    if "manually_edited" in data:
        receipt.manually_edited = bool(data["manually_edited"]) if data["manually_edited"] is not None else receipt.manually_edited
    
    receipt.updated_at = datetime.utcnow()
    session.commit()
    session.refresh(receipt)
    
    return {
        "id": receipt.id,
        "filename": receipt.filename,
        "status": receipt.status.value,
        "extracted_vendor": receipt.extracted_vendor,
        "extracted_total": float(receipt.extracted_total) if receipt.extracted_total is not None else None,
        "extracted_date": receipt.extracted_date.isoformat() if receipt.extracted_date else None,
        "category": receipt.category,
        "description": receipt.description,
        "purchaser_name": receipt.purchaser_name,
        "purchaser_email": receipt.purchaser_email,
        "event_purpose": receipt.event_purpose,
        "additional_notes": receipt.additional_notes,
        "manually_edited": receipt.manually_edited,
        "message": "Receipt updated successfully"
    }


@router.patch("/{receipt_id}")
def patch_receipt(
    receipt_id: str,
    receipt_update: dict,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update receipt information using JSON data."""
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
    
    # Update fields from JSON data
    if "extracted_vendor" in receipt_update:
        receipt.extracted_vendor = receipt_update["extracted_vendor"]
    if "extracted_total" in receipt_update:
        receipt.extracted_total = receipt_update["extracted_total"]
    if "category" in receipt_update:
        receipt.category = receipt_update["category"]
    if "status" in receipt_update:
        if receipt_update["status"] == 'reviewed':
            receipt.status = ReceiptStatus.COMPLETED
    
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
    
    # Normalize storage path relative to uploads root
    try:
        rel_storage_path = os.path.relpath(file_path, start=settings.upload_path)
    except Exception:
        rel_storage_path = os.path.join("receipts", unique_filename)

    # Create receipt record with enhanced purchaser data
    receipt = Receipt(
        filename=file.filename or unique_filename,
        storage_path=rel_storage_path,
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
        uploader_id=None,  # No user authentication required
        status=ReceiptStatus.PENDING,
        category="purchaser_portal",
        
        # Enhanced purchaser information
        purchaser_name=purchaser_name.strip(),
        purchaser_email=purchaser_email.strip().lower(),
        event_purpose=event_or_purpose.strip(),
        approved_by=approved_by.strip(),
        additional_notes=notes.strip() if notes else None,
        
        # Date tracking
        upload_date=datetime.utcnow(),
        
        # Legacy fields for backward compatibility
        extracted_items=json.dumps(purchaser_data),
        extracted_vendor=f"Purchaser: {purchaser_name.strip()}",
        description=f"Purchase for: {event_or_purpose.strip()}"
    )
    
    session.add(receipt)
    session.commit()
    session.refresh(receipt)
    
    # Trigger OCR processing for purchaser portal receipts too
    asyncio.create_task(mock_ocr_processing(receipt.id, session))
    
    public_base = os.environ.get("BASE_URL", "http://localhost:8000")
    return {
        "id": receipt.id,
        "filename": receipt.filename,
        "status": receipt.status.value,
        "image_url": urljoin(public_base, f"/static/{rel_storage_path}") if rel_storage_path else None,
        "message": "Receipt submitted successfully and is being processed"
    }


@router.post("/{receipt_id}/reprocess")
async def reprocess_receipt(
    receipt_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Reprocess a receipt for OCR extraction."""
    # Check if user has permission (admin/treasurer only)
    if current_user.role not in [UserRole.ADMIN, UserRole.TREASURER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators and treasurers can reprocess receipts"
        )
    
    receipt = session.get(Receipt, receipt_id)
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found"
        )
    
    # Reset receipt status and trigger reprocessing
    receipt.status = ReceiptStatus.PROCESSING
    receipt.extracted_vendor = None
    receipt.extracted_total = None
    receipt.extracted_date = None
    receipt.ocr_raw_text = None
    session.commit()
    
    # Start async OCR processing
    asyncio.create_task(mock_ocr_processing(receipt_id, session))
    
    return {
        "id": receipt.id,
        "status": receipt.status.value,
        "message": "Receipt reprocessing started"
    }


@router.post("/reprocess-all")
async def reprocess_all_incomplete(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    force: bool = Query(False)
):
    """Reprocess all receipts that are stuck in processing or have incomplete data."""
    # Check if user has permission (admin only)
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can reprocess all receipts"
        )
    
    # Find receipts that need reprocessing
    if force:
        # Force reprocess all non-purchaser_portal receipts
        query = select(Receipt).where(Receipt.category != "purchaser_portal")
    else:
        # Include receipts that look incomplete (None, empty string, or zero totals)
        query = select(Receipt).where(
            or_(
                Receipt.status == ReceiptStatus.PROCESSING,
                Receipt.status == ReceiptStatus.PENDING,
                and_(
                    Receipt.status == ReceiptStatus.COMPLETED,
                    or_(
                        Receipt.extracted_vendor.is_(None),
                        Receipt.extracted_vendor == '',
                        Receipt.extracted_total.is_(None),
                        Receipt.extracted_total == 0,
                        Receipt.extracted_date.is_(None)
                    )
                )
            )
        )
    
    receipts_to_reprocess = session.exec(query).all()
    
    reprocessed_count = 0
    for receipt in receipts_to_reprocess:
        # Skip purchaser portal receipts that already have vendor data unless forced
        if not force and receipt.category == "purchaser_portal" and receipt.extracted_vendor:
            continue

        receipt.status = ReceiptStatus.PROCESSING
        if receipt.category != "purchaser_portal":
            receipt.extracted_vendor = None
            receipt.extracted_total = None
            receipt.extracted_date = None
            receipt.ocr_raw_text = None

        # Start async OCR processing
        asyncio.create_task(mock_ocr_processing(receipt.id, session))
        reprocessed_count += 1
    
    session.commit()
    
    return {
        "message": f"Started reprocessing {reprocessed_count} receipts",
        "reprocessed_count": reprocessed_count,
        "total_found": len(receipts_to_reprocess)
    }
