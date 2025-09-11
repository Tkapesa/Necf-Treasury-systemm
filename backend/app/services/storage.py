"""
Storage service with adapter pattern for Church Treasury Management System.

Provides unified interface for file storage with support for local filesystem
and S3-compatible storage. Uses adapter pattern for easy switching between
storage backends.
"""

from abc import ABC, abstractmethod
from typing import BinaryIO, Optional
import os
import shutil
import aiofiles
import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile

from app.core.config import get_settings


class StorageAdapter(ABC):
    """Abstract base class for storage adapters."""
    
    @abstractmethod
    async def save_file(self, file: UploadFile, filename: str) -> str:
        """
        Save uploaded file to storage.
        
        Args:
            file: Uploaded file object
            filename: Target filename
            
        Returns:
            Storage path/URL of saved file
        """
        pass
    
    @abstractmethod
    async def get_file_path(self, storage_path: str) -> str:
        """
        Get local file path for storage path.
        
        Args:
            storage_path: Storage path from save_file
            
        Returns:
            Local file path for reading
        """
        pass
    
    @abstractmethod
    async def delete_file(self, storage_path: str) -> bool:
        """
        Delete file from storage.
        
        Args:
            storage_path: Storage path to delete
            
        Returns:
            True if successful, False otherwise
        """
        pass
    
    @abstractmethod
    async def file_exists(self, storage_path: str) -> bool:
        """
        Check if file exists in storage.
        
        Args:
            storage_path: Storage path to check
            
        Returns:
            True if file exists, False otherwise
        """
        pass


class LocalStorageAdapter(StorageAdapter):
    """
    Local filesystem storage adapter.
    
    Stores files in local directory with organized folder structure.
    Suitable for development and single-server deployments.
    """
    
    def __init__(self, base_path: str):
        """
        Initialize local storage adapter.
        
        Args:
            base_path: Base directory for file storage
        """
        self.base_path = os.path.abspath(base_path)
        os.makedirs(self.base_path, exist_ok=True)
    
    async def save_file(self, file: UploadFile, filename: str) -> str:
        """
        Save file to local filesystem.
        
        Creates date-based folder structure: YYYY/MM/DD/filename
        """
        from datetime import datetime
        
        # Create date-based folder structure
        now = datetime.utcnow()
        folder_path = os.path.join(
            self.base_path,
            str(now.year),
            f"{now.month:02d}",
            f"{now.day:02d}"
        )
        os.makedirs(folder_path, exist_ok=True)
        
        # Full file path
        file_path = os.path.join(folder_path, filename)
        
        # Save file asynchronously
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Return relative path for storage
        relative_path = os.path.relpath(file_path, self.base_path)
        return relative_path.replace(os.sep, '/')  # Use forward slashes
    
    async def get_file_path(self, storage_path: str) -> str:
        """Get absolute local file path."""
        # Convert forward slashes back to OS-specific separators
        local_path = storage_path.replace('/', os.sep)
        return os.path.join(self.base_path, local_path)
    
    async def delete_file(self, storage_path: str) -> bool:
        """Delete file from local filesystem."""
        try:
            file_path = await self.get_file_path(storage_path)
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception:
            return False
    
    async def file_exists(self, storage_path: str) -> bool:
        """Check if file exists on local filesystem."""
        try:
            file_path = await self.get_file_path(storage_path)
            return os.path.exists(file_path)
        except Exception:
            return False


class S3StorageAdapter(StorageAdapter):
    """
    S3-compatible storage adapter.
    
    Works with AWS S3 and S3-compatible services (MinIO, DigitalOcean Spaces, etc.).
    Suitable for production deployments and multi-server setups.
    """
    
    def __init__(self, bucket_name: str, access_key: str, secret_key: str, 
                 region: str = 'us-east-1', endpoint_url: Optional[str] = None):
        """
        Initialize S3 storage adapter.
        
        Args:
            bucket_name: S3 bucket name
            access_key: AWS access key ID
            secret_key: AWS secret access key
            region: AWS region
            endpoint_url: Custom endpoint URL for S3-compatible services
        """
        self.bucket_name = bucket_name
        
        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            endpoint_url=endpoint_url
        )
        
        # Ensure bucket exists
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist."""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                # Bucket doesn't exist, create it
                try:
                    self.s3_client.create_bucket(Bucket=self.bucket_name)
                except ClientError as create_error:
                    print(f"Error creating bucket: {create_error}")
                    raise
            else:
                print(f"Error accessing bucket: {e}")
                raise
    
    async def save_file(self, file: UploadFile, filename: str) -> str:
        """
        Save file to S3 storage.
        
        Uses date-based key structure: receipts/YYYY/MM/DD/filename
        """
        from datetime import datetime
        
        # Create date-based key structure
        now = datetime.utcnow()
        s3_key = f"receipts/{now.year}/{now.month:02d}/{now.day:02d}/{filename}"
        
        try:
            # Upload file to S3
            content = await file.read()
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=content,
                ContentType=file.content_type or 'application/octet-stream'
            )
            
            return s3_key
            
        except ClientError as e:
            print(f"Error uploading to S3: {e}")
            raise
    
    async def get_file_path(self, storage_path: str) -> str:
        """
        Generate presigned URL for S3 object.
        
        For S3, we return a presigned URL instead of a local path.
        This URL can be used to download the file temporarily.
        """
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': storage_path},
                ExpiresIn=3600  # URL expires in 1 hour
            )
            return url
        except ClientError as e:
            print(f"Error generating presigned URL: {e}")
            raise
    
    async def delete_file(self, storage_path: str) -> bool:
        """Delete file from S3 storage."""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=storage_path)
            return True
        except ClientError:
            return False
    
    async def file_exists(self, storage_path: str) -> bool:
        """Check if file exists in S3 storage."""
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=storage_path)
            return True
        except ClientError:
            return False


class StorageService:
    """
    Storage service that uses appropriate adapter based on configuration.
    
    Provides unified interface for file operations regardless of storage backend.
    """
    
    def __init__(self, adapter: StorageAdapter):
        """
        Initialize storage service with adapter.
        
        Args:
            adapter: Storage adapter instance
        """
        self.adapter = adapter
    
    async def save_file(self, file: UploadFile, filename: str) -> str:
        """Save file using configured adapter."""
        return await self.adapter.save_file(file, filename)
    
    async def get_file_path(self, storage_path: str) -> str:
        """Get file path using configured adapter."""
        return await self.adapter.get_file_path(storage_path)
    
    async def delete_file(self, storage_path: str) -> bool:
        """Delete file using configured adapter."""
        return await self.adapter.delete_file(storage_path)
    
    async def file_exists(self, storage_path: str) -> bool:
        """Check file existence using configured adapter."""
        return await self.adapter.file_exists(storage_path)


# Storage service factory function
def get_storage_service() -> StorageService:
    """
    Create storage service instance based on configuration.
    
    Returns:
        StorageService instance with appropriate adapter
    """
    settings = get_settings()
    
    if settings.USE_S3_STORAGE:
        # Use S3 storage
        if not all([settings.S3_ACCESS_KEY_ID, settings.S3_SECRET_ACCESS_KEY]):
            raise ValueError("S3 credentials not configured")
        
        adapter = S3StorageAdapter(
            bucket_name=settings.S3_BUCKET_NAME,
            access_key=settings.S3_ACCESS_KEY_ID,
            secret_key=settings.S3_SECRET_ACCESS_KEY,
            region=settings.S3_REGION,
            endpoint_url=settings.S3_ENDPOINT_URL if settings.S3_ENDPOINT_URL != "https://s3.amazonaws.com" else None
        )
    else:
        # Use local storage
        adapter = LocalStorageAdapter(settings.upload_path)
    
    return StorageService(adapter)


# TODO: Add features:
# - File compression for large uploads
# - Automatic backup to secondary storage
# - File versioning and rollback
# - Storage usage monitoring and cleanup
# - Integration with CDN for public file access
# - Virus scanning for uploaded files
