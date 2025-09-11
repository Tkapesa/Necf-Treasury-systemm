"""
Admin API endpoints for dashboard statistics and reports.

Provides aggregated data for admin dashboard including spending statistics,
vendor analysis, and performance metrics with efficient database queries.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from decimal import Decimal
from calendar import monthrange

from app.db import sync_engine
from app.models import Receipt, User, ReceiptStatus, UserRole
from app.core.security import get_current_active_user

router = APIRouter(tags=["admin"])


def get_session():
    """Get database session for dependency injection."""
    with Session(sync_engine) as session:
        yield session


def check_admin_access(user: User) -> None:
    """Check if user has admin or treasurer access."""
    if user.role not in [UserRole.ADMIN, UserRole.TREASURER]:
        raise HTTPException(
            status_code=403,
            detail="Admin or treasurer access required"
        )


class StatsResponse:
    """Admin dashboard statistics response model."""
    
    def __init__(
        self,
        total_spending: Decimal,
        receipts_count: int,
        top_vendors: List[Dict[str, Any]],
        spending_by_category: List[Dict[str, Any]],
        month: str
    ):
        self.total_spending = total_spending
        self.receipts_count = receipts_count
        self.top_vendors = top_vendors
        self.spending_by_category = spending_by_category
        self.month = month


@router.get("/stats")
def get_admin_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get admin dashboard statistics.
    
    Returns comprehensive dashboard data including total amounts, receipt counts,
    monthly spending trends, top vendors, category breakdown, and recent activity.
    """
    # Ensure user has admin or treasurer role
    check_admin_access(current_user)
    
    # Get overall statistics
    total_receipts = session.exec(
        select(func.count(Receipt.id))
        .where(Receipt.status == ReceiptStatus.COMPLETED)
    ).first() or 0
    
    total_amount = session.exec(
        select(func.sum(Receipt.extracted_total))
        .where(
            and_(
                Receipt.status == ReceiptStatus.COMPLETED,
                Receipt.extracted_total.is_not(None)
            )
        )
    ).first() or Decimal('0')
    
    # Get current date for activity stats
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    week_start = today_start - timedelta(days=7)
    month_start = datetime(now.year, now.month, 1)
    
    # Recent activity
    today_count = session.exec(
        select(func.count(Receipt.id))
        .where(
            and_(
                Receipt.created_at >= today_start,
                Receipt.status == ReceiptStatus.COMPLETED
            )
        )
    ).first() or 0
    
    week_count = session.exec(
        select(func.count(Receipt.id))
        .where(
            and_(
                Receipt.created_at >= week_start,
                Receipt.status == ReceiptStatus.COMPLETED
            )
        )
    ).first() or 0
    
    month_count = session.exec(
        select(func.count(Receipt.id))
        .where(
            and_(
                Receipt.created_at >= month_start,
                Receipt.status == ReceiptStatus.COMPLETED
            )
        )
    ).first() or 0
    
    # Get top vendors (limit to recent 6 months for performance)
    six_months_ago = now - timedelta(days=180)
    vendor_query = (
        select(Receipt.extracted_vendor, func.sum(Receipt.extracted_total), func.count(Receipt.id))
        .where(
            and_(
                Receipt.status == ReceiptStatus.COMPLETED,
                Receipt.extracted_vendor.is_not(None),
                Receipt.extracted_total.is_not(None),
                Receipt.created_at >= six_months_ago
            )
        )
        .group_by(Receipt.extracted_vendor)
        .order_by(func.sum(Receipt.extracted_total).desc())
        .limit(10)
    )
    
    vendor_results = session.exec(vendor_query).all()
    top_vendors = [
        {
            "vendor": vendor,
            "amount": float(amount),
            "count": count
        }
        for vendor, amount, count in vendor_results
    ]
    
    # Get category breakdown
    category_query = (
        select(Receipt.category, func.sum(Receipt.extracted_total), func.count(Receipt.id))
        .where(
            and_(
                Receipt.status == ReceiptStatus.COMPLETED,
                Receipt.category.is_not(None),
                Receipt.extracted_total.is_not(None),
                Receipt.created_at >= six_months_ago
            )
        )
        .group_by(Receipt.category)
        .order_by(func.sum(Receipt.extracted_total).desc())
    )
    
    category_results = session.exec(category_query).all()
    categories = [
        {
            "category": category,
            "amount": float(amount),
            "count": count
        }
        for category, amount, count in category_results
    ]
    
    # Monthly spending for last 12 months
    monthly_spending = []
    for i in range(12):
        month_date = now.replace(day=1) - timedelta(days=30 * i)
        month_start = month_date.replace(day=1)
        next_month = month_start.replace(month=month_start.month + 1) if month_start.month < 12 else month_start.replace(year=month_start.year + 1, month=1)
        
        month_total = session.exec(
            select(func.sum(Receipt.extracted_total))
            .where(
                and_(
                    Receipt.status == ReceiptStatus.COMPLETED,
                    Receipt.extracted_total.is_not(None),
                    Receipt.created_at >= month_start,
                    Receipt.created_at < next_month
                )
            )
        ).first() or Decimal('0')
        
        month_count = session.exec(
            select(func.count(Receipt.id))
            .where(
                and_(
                    Receipt.status == ReceiptStatus.COMPLETED,
                    Receipt.created_at >= month_start,
                    Receipt.created_at < next_month
                )
            )
        ).first() or 0
        
        monthly_spending.append({
            "month": month_start.strftime("%Y-%m"),
            "amount": float(month_total),
            "count": month_count
        })
    
    monthly_spending.reverse()  # Show oldest to newest
    
    return {
        "total_receipts": total_receipts,
        "total_amount": float(total_amount),
        "monthly_spending": monthly_spending,
        "top_vendors": top_vendors,
        "categories": categories,
        "recent_activity": {
            "today": today_count,
            "this_week": week_count,
            "this_month": month_count
        }
    }


@router.get("/stats/summary")
def get_stats_summary(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get overall system statistics summary.
    
    Provides high-level metrics for admin overview.
    """
    check_admin_access(current_user)
    
    # Get current month stats
    current_month = datetime.utcnow().strftime("%Y-%m")
    
    # Total receipts count
    total_receipts = session.exec(
        select(func.count(Receipt.id))
    ).first()
    
    # Pending receipts count
    pending_receipts = session.exec(
        select(func.count(Receipt.id))
        .where(Receipt.status.in_([ReceiptStatus.PENDING, ReceiptStatus.PROCESSING]))
    ).first()
    
    # Total spending this year
    current_year = datetime.utcnow().year
    year_start = datetime(current_year, 1, 1)
    
    yearly_spending = session.exec(
        select(func.sum(Receipt.extracted_total))
        .where(
            and_(
                Receipt.status == ReceiptStatus.COMPLETED,
                Receipt.extracted_date >= year_start,
                Receipt.extracted_total.is_not(None)
            )
        )
    ).first() or Decimal('0')
    
    return {
        "total_receipts": total_receipts,
        "pending_receipts": pending_receipts,
        "yearly_spending": float(yearly_spending),
        "current_year": current_year,
        "generated_at": datetime.utcnow().isoformat()
    }
