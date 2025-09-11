"""
PDF Report Generation Service

Provides pluggable PDF generation with WeasyPrint (primary) and ReportLab (fallback).
Features:
- Monthly receipt reports with summaries and breakdowns
- HTML template rendering with Jinja2
- Thumbnail image generation for receipt previews
- Caching and storage management
- Background job integration suggestions
"""

import os
import io
import hashlib
from datetime import datetime, date
from typing import Dict, List, Optional, Any, Protocol, Union
from pathlib import Path
import asyncio
from concurrent.futures import ThreadPoolExecutor

from jinja2 import Environment, FileSystemLoader, Template
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from PIL import Image
import base64

from ..models import Receipt, User
from ..core.config import settings
from ..services.storage import get_storage_adapter


@dataclass
class ReportPeriod:
    """Represents a reporting time period."""
    start_date: datetime
    end_date: datetime
    label: str


class ReportingService:
    """
    Financial reporting service for generating treasury reports.
    
    Provides various financial reports, analytics, and summaries
    for church treasury management and decision making.
    """
    
    def __init__(self):
        """Initialize reporting service."""
        pass
    
    async def get_financial_summary(
        self, 
        db: AsyncSession,
        start_date: datetime,
        end_date: datetime
    ) -> FinancialSummary:
        """
        Generate financial summary for a given period.
        
        Args:
            db: Database session
            start_date: Start of reporting period
            end_date: End of reporting period
            
        Returns:
            FinancialSummary with key financial metrics
        """
        # Get total income
        income_query = select(func.sum(Transaction.amount)).where(
            and_(
                Transaction.type == TransactionType.INCOME,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
                Transaction.is_approved == True
            )
        )
        income_result = await db.execute(income_query)
        total_income = income_result.scalar() or Decimal('0.00')
        
        # Get total expenses
        expense_query = select(func.sum(Transaction.amount)).where(
            and_(
                Transaction.type == TransactionType.EXPENSE,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
                Transaction.is_approved == True
            )
        )
        expense_result = await db.execute(expense_query)
        total_expenses = expense_result.scalar() or Decimal('0.00')
        
        # Get transaction count
        count_query = select(func.count(Transaction.id)).where(
            and_(
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
                Transaction.is_approved == True
            )
        )
        count_result = await db.execute(count_query)
        transaction_count = count_result.scalar() or 0
        
        # Calculate net balance
        net_balance = total_income - total_expenses
        
        return FinancialSummary(
            total_income=total_income,
            total_expenses=total_expenses,
            net_balance=net_balance,
            transaction_count=transaction_count,
            period_start=start_date,
            period_end=end_date
        )
    
    async def get_category_summary(
        self,
        db: AsyncSession,
        start_date: datetime,
        end_date: datetime,
        transaction_type: Optional[TransactionType] = None
    ) -> List[CategorySummary]:
        """
        Generate category-wise financial summary.
        
        Args:
            db: Database session
            start_date: Start of reporting period
            end_date: End of reporting period
            transaction_type: Filter by transaction type (optional)
            
        Returns:
            List of CategorySummary objects
        """
        # Build query for category totals
        query = select(
            Transaction.category,
            func.sum(Transaction.amount).label('total_amount'),
            func.count(Transaction.id).label('transaction_count')
        ).where(
            and_(
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
                Transaction.is_approved == True
            )
        ).group_by(Transaction.category)
        
        # Add transaction type filter if specified
        if transaction_type:
            query = query.where(Transaction.type == transaction_type)
        
        result = await db.execute(query)
        categories = result.all()
        
        # Calculate total for percentage calculations
        total_amount = sum(cat.total_amount for cat in categories)
        
        # Build category summaries
        summaries = []
        for category in categories:
            percentage = float(category.total_amount / total_amount * 100) if total_amount > 0 else 0.0
            
            summaries.append(CategorySummary(
                category=category.category,
                total_amount=category.total_amount,
                transaction_count=category.transaction_count,
                percentage_of_total=percentage
            ))
        
        # Sort by total amount descending
        summaries.sort(key=lambda x: x.total_amount, reverse=True)
        
        return summaries
    
    async def get_monthly_trends(
        self,
        db: AsyncSession,
        year: int,
        transaction_type: Optional[TransactionType] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate monthly financial trends for a given year.
        
        Args:
            db: Database session
            year: Year for trend analysis
            transaction_type: Filter by transaction type (optional)
            
        Returns:
            List of monthly data points
        """
        trends = []
        
        for month in range(1, 13):
            start_date = datetime(year, month, 1)
            if month == 12:
                end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = datetime(year, month + 1, 1) - timedelta(days=1)
            
            # Build query for month
            query = select(
                func.sum(Transaction.amount).label('total_amount'),
                func.count(Transaction.id).label('transaction_count')
            ).where(
                and_(
                    Transaction.transaction_date >= start_date,
                    Transaction.transaction_date <= end_date,
                    Transaction.is_approved == True
                )
            )
            
            # Add transaction type filter if specified
            if transaction_type:
                query = query.where(Transaction.type == transaction_type)
            
            result = await db.execute(query)
            monthly_data = result.first()
            
            trends.append({
                'month': month,
                'month_name': start_date.strftime('%B'),
                'year': year,
                'total_amount': float(monthly_data.total_amount or 0),
                'transaction_count': monthly_data.transaction_count or 0,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            })
        
        return trends
    
    async def get_top_expenses(
        self,
        db: AsyncSession,
        start_date: datetime,
        end_date: datetime,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get top expenses for a given period.
        
        Args:
            db: Database session
            start_date: Start of reporting period
            end_date: End of reporting period
            limit: Maximum number of results
            
        Returns:
            List of top expense transactions
        """
        query = select(Transaction).where(
            and_(
                Transaction.type == TransactionType.EXPENSE,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
                Transaction.is_approved == True
            )
        ).order_by(Transaction.amount.desc()).limit(limit)
        
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        return [
            {
                'id': t.id,
                'description': t.description,
                'amount': float(t.amount),
                'category': t.category,
                'transaction_date': t.transaction_date.isoformat(),
                'reference_number': t.reference_number
            }
            for t in transactions
        ]
    
    async def get_receipt_processing_stats(
        self,
        db: AsyncSession,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        Get receipt processing statistics.
        
        Args:
            db: Database session
            start_date: Start of reporting period
            end_date: End of reporting period
            
        Returns:
            Dictionary with receipt processing metrics
        """
        # Total receipts uploaded
        total_query = select(func.count(Receipt.id)).where(
            and_(
                Receipt.created_at >= start_date,
                Receipt.created_at <= end_date
            )
        )
        total_result = await db.execute(total_query)
        total_receipts = total_result.scalar() or 0
        
        # Receipts by status
        status_query = select(
            Receipt.status,
            func.count(Receipt.id).label('count')
        ).where(
            and_(
                Receipt.created_at >= start_date,
                Receipt.created_at <= end_date
            )
        ).group_by(Receipt.status)
        
        status_result = await db.execute(status_query)
        status_counts = {row.status: row.count for row in status_result}
        
        # Processing success rate
        completed = status_counts.get('completed', 0)
        success_rate = (completed / total_receipts * 100) if total_receipts > 0 else 0
        
        return {
            'total_receipts': total_receipts,
            'status_breakdown': status_counts,
            'processing_success_rate': success_rate,
            'period_start': start_date.isoformat(),
            'period_end': end_date.isoformat()
        }
    
    def get_standard_periods(self) -> List[ReportPeriod]:
        """
        Get list of standard reporting periods.
        
        Returns:
            List of common reporting periods
        """
        now = datetime.utcnow()
        
        periods = []
        
        # Current month
        month_start = datetime(now.year, now.month, 1)
        periods.append(ReportPeriod(
            start_date=month_start,
            end_date=now,
            label="This Month"
        ))
        
        # Previous month
        if now.month == 1:
            prev_month_start = datetime(now.year - 1, 12, 1)
            prev_month_end = datetime(now.year, 1, 1) - timedelta(days=1)
        else:
            prev_month_start = datetime(now.year, now.month - 1, 1)
            prev_month_end = datetime(now.year, now.month, 1) - timedelta(days=1)
        
        periods.append(ReportPeriod(
            start_date=prev_month_start,
            end_date=prev_month_end,
            label="Previous Month"
        ))
        
        # Current quarter
        quarter = (now.month - 1) // 3 + 1
        quarter_start = datetime(now.year, (quarter - 1) * 3 + 1, 1)
        periods.append(ReportPeriod(
            start_date=quarter_start,
            end_date=now,
            label=f"Q{quarter} {now.year}"
        ))
        
        # Current year
        year_start = datetime(now.year, 1, 1)
        periods.append(ReportPeriod(
            start_date=year_start,
            end_date=now,
            label=f"Year {now.year}"
        ))
        
        # Previous year
        prev_year_start = datetime(now.year - 1, 1, 1)
        prev_year_end = datetime(now.year, 1, 1) - timedelta(days=1)
        periods.append(ReportPeriod(
            start_date=prev_year_start,
            end_date=prev_year_end,
            label=f"Year {now.year - 1}"
        ))
        
        return periods


# Global reporting service instance
_reporting_service = None


def get_reporting_service() -> ReportingService:
    """
    Get global reporting service instance.
    
    Returns:
        ReportingService instance
    """
    global _reporting_service
    if _reporting_service is None:
        _reporting_service = ReportingService()
    return _reporting_service


# TODO: Add additional reporting features:
# - Budget vs actual comparisons
# - Cash flow projections
# - Donor contribution analysis
# - Expense approval workflow reports
# - Tax reporting and export capabilities
# - Custom report builder with filters
# - Scheduled report generation and email delivery
# - Data export in multiple formats (PDF, Excel, CSV)
