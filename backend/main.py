"""
Church Treasury Management System - FastAPI Main Application

This is the entry point for the FastAPI application that manages church
financial records, receipts, and treasury operations.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
from typing import Dict, Any

from app.core.config import get_settings
from app.api.v1 import api_router
from app.db import init_db

# Initialize settings
settings = get_settings()

# Create FastAPI app instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Church Treasury Management System API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(api_router)

# Serve uploaded files (images, pdfs) under /static
# This maps the configured uploads directory to a public static path
app.mount("/static", StaticFiles(directory=settings.upload_path), name="static")


@app.on_event("startup")
async def startup_event() -> None:
    """Initialize database and perform startup tasks."""
    # TODO: Initialize database connection pool
    # TODO: Run database migrations
    # TODO: Set up file storage directories
    # await init_db()  # Temporarily disabled for testing
    print(f"🚀 {settings.PROJECT_NAME} API started successfully!")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Cleanup tasks on application shutdown."""
    # TODO: Close database connections
    # TODO: Cleanup temporary files
    print("👋 Church Treasury API shutting down...")


@app.get("/")
async def root() -> Dict[str, Any]:
    """Root endpoint with API information."""
    return {
        "message": "Church Treasury Management System API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "healthy"
    }


@app.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns:
        Dict containing health status and timestamp
    """
    try:
        # TODO: Add database connectivity check
        # TODO: Add external service checks (OCR, S3, etc.)
        return {
            "status": "healthy",
            "timestamp": "2025-09-01T00:00:00Z",
            "environment": settings.ENVIRONMENT
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """Global HTTP exception handler with consistent error format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "type": "http_error"
            }
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
