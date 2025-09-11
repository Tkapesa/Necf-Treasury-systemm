"""
File storage utilities for handling receipt uploads.

Provides functions for saving uploaded files, generating URLs,
and managing file operations with proper security and validation.
"""

import os
import uuid
import shutil
import mimetypes
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException
from urllib.parse import urljoin

# Configuration
UPLOAD_BASE_DIR = os.environ.get("UPLOAD_DIR", "uploads")
BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME_TYPES = {
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/pdf'
}

def ensure_upload_dir(directory: str) -> Path:
    """Ensure upload directory exists and return Path object."""
    upload_path = Path(UPLOAD_BASE_DIR) / directory
    upload_path.mkdir(parents=True, exist_ok=True)
    return upload_path

def validate_file_type(file: UploadFile) -> None:
    """Validate uploaded file type."""
    if not file.content_type or file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
        )

def validate_file_size(file: UploadFile) -> None:
    """Validate uploaded file size."""
    if hasattr(file, 'size') and file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )

async def save_uploaded_file(
    file: UploadFile, 
    directory: str, 
    filename: Optional[str] = None
) -> str:
    """
    Save uploaded file to storage and return file path.
    
    Args:
        file: FastAPI UploadFile object
        directory: Subdirectory within upload directory
        filename: Optional custom filename (generates UUID if not provided)
    
    Returns:
        str: Relative path to saved file
    
    Raises:
        HTTPException: If file validation fails or save operation fails
    """
    # Validate file
    validate_file_type(file)
    validate_file_size(file)
    
    # Ensure upload directory exists
    upload_dir = ensure_upload_dir(directory)
    
    # Generate filename if not provided
    if not filename:
        file_ext = Path(file.filename).suffix if file.filename else ''
        filename = f"{uuid.uuid4()}{file_ext}"
    
    # Full file path
    file_path = upload_dir / filename
    
    try:
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return relative path
        return str(Path(directory) / filename)
        
    except Exception as e:
        # Clean up file if it was partially created
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )
    finally:
        # Reset file pointer
        await file.seek(0)

def get_file_url(file_path: str) -> str:
    """
    Generate public URL for accessing a file.
    
    Args:
        file_path: Relative path to file within upload directory
    
    Returns:
        str: Public URL for accessing the file
    """
    return urljoin(BASE_URL, f"/static/{file_path}")

def get_absolute_file_path(file_path: str) -> Path:
    """
    Get absolute path to file on filesystem.
    
    Args:
        file_path: Relative path to file within upload directory
    
    Returns:
        Path: Absolute path to file
    """
    return Path(UPLOAD_BASE_DIR) / file_path

def delete_file(file_path: str) -> bool:
    """
    Delete file from storage.
    
    Args:
        file_path: Relative path to file within upload directory
    
    Returns:
        bool: True if file was deleted, False if it didn't exist
    """
    absolute_path = get_absolute_file_path(file_path)
    
    try:
        if absolute_path.exists():
            absolute_path.unlink()
            return True
        return False
    except Exception:
        return False

def get_file_info(file_path: str) -> Optional[dict]:
    """
    Get file information including size, type, etc.
    
    Args:
        file_path: Relative path to file within upload directory
    
    Returns:
        dict: File information or None if file doesn't exist
    """
    absolute_path = get_absolute_file_path(file_path)
    
    if not absolute_path.exists():
        return None
    
    stat = absolute_path.stat()
    mime_type, _ = mimetypes.guess_type(str(absolute_path))
    
    return {
        'path': file_path,
        'absolute_path': str(absolute_path),
        'size': stat.st_size,
        'mime_type': mime_type,
        'created_at': stat.st_ctime,
        'modified_at': stat.st_mtime,
        'url': get_file_url(file_path)
    }

def list_files(directory: str, extension: Optional[str] = None) -> list:
    """
    List files in a directory.
    
    Args:
        directory: Subdirectory within upload directory
        extension: Optional file extension filter (e.g., '.jpg')
    
    Returns:
        list: List of file information dictionaries
    """
    upload_dir = Path(UPLOAD_BASE_DIR) / directory
    
    if not upload_dir.exists():
        return []
    
    files = []
    pattern = f"*{extension}" if extension else "*"
    
    for file_path in upload_dir.glob(pattern):
        if file_path.is_file():
            rel_path = str(Path(directory) / file_path.name)
            file_info = get_file_info(rel_path)
            if file_info:
                files.append(file_info)
    
    return files

def cleanup_old_files(directory: str, days_old: int = 30) -> int:
    """
    Clean up files older than specified days.
    
    Args:
        directory: Subdirectory within upload directory
        days_old: Files older than this many days will be deleted
    
    Returns:
        int: Number of files deleted
    """
    import time
    
    upload_dir = Path(UPLOAD_BASE_DIR) / directory
    
    if not upload_dir.exists():
        return 0
    
    cutoff_time = time.time() - (days_old * 24 * 60 * 60)
    deleted_count = 0
    
    for file_path in upload_dir.iterdir():
        if file_path.is_file() and file_path.stat().st_mtime < cutoff_time:
            try:
                file_path.unlink()
                deleted_count += 1
            except Exception:
                continue
    
    return deleted_count

def get_storage_stats() -> dict:
    """
    Get storage usage statistics.
    
    Returns:
        dict: Storage statistics including total size, file count, etc.
    """
    upload_path = Path(UPLOAD_BASE_DIR)
    
    if not upload_path.exists():
        return {
            'total_size': 0,
            'file_count': 0,
            'directories': {}
        }
    
    total_size = 0
    file_count = 0
    directories = {}
    
    for item in upload_path.rglob('*'):
        if item.is_file():
            size = item.stat().st_size
            total_size += size
            file_count += 1
            
            # Track by directory
            rel_dir = str(item.parent.relative_to(upload_path))
            if rel_dir not in directories:
                directories[rel_dir] = {'size': 0, 'count': 0}
            directories[rel_dir]['size'] += size
            directories[rel_dir]['count'] += 1
    
    return {
        'total_size': total_size,
        'file_count': file_count,
        'directories': directories,
        'total_size_mb': round(total_size / (1024 * 1024), 2),
        'upload_path': str(upload_path)
    }
