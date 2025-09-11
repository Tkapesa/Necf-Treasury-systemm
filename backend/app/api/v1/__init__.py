"""
API v1 router configuration.

Combines all API endpoints into a single router for the application.
"""

from fastapi import APIRouter
from .auth import router as auth_router
from .receipts import router as receipts_router
from .health import router as health_router
from .admin import router as admin_router
from .reports import router as reports_router
from ...routers.analytics import router as analytics_router
# from .pdf_reports import router as pdf_reports_router  # Temporarily disabled

# Create main API router
api_router = APIRouter(prefix="/api/v1")

# Include all sub-routers
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(receipts_router, prefix="/receipts", tags=["receipts"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(analytics_router, prefix="/admin", tags=["analytics"])
api_router.include_router(reports_router, tags=["reports"])
# api_router.include_router(pdf_reports_router, prefix="/reports", tags=["pdf-reports"])  # Temporarily disabled

__all__ = ["api_router"]
