"""
Health check endpoints for monitoring and status verification.
"""

from fastapi import APIRouter
from typing import Dict

router = APIRouter(tags=["health"])

@router.get("/health")
async def health_check() -> Dict[str, str]:
    """
    API v1 health check endpoint.
    """
    return {
        "status": "healthy",
        "service": "Church Treasury API v1"
    }
