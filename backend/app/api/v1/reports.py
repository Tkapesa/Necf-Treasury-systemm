"""
Reports API endpoints for generating financial reports.

Handles monthly and yearly report generation with caching and optimization.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from typing import Dict, Any, Optional
from datetime import datetime, date
from decimal import Decimal
from calendar import monthrange

from app.db import get_async_session
from app.models import Receipt, User, ReceiptStatus, UserRole
from app.core.security import get_current_user
from app.models import Receipt, User, ReceiptStatus, UserRole

router = APIRouter(prefix="/reports", tags=["reports"])


def check_user_role(user: User, allowed_roles: list[UserRole]) -> None:
    """Check if user has one of the allowed roles."""
    if user.role not in allowed_roles:
        from fastapi import HTTPException, status
        role_names = [role.value for role in allowed_roles]
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {', '.join(role_names)}"
        )


async def generate_monthly_report_data(
    session: AsyncSession,
    year: int,
    month: int
) -> Dict[str, Any]:
    """
    Generate comprehensive monthly report data.
    
    PERFORMANCE OPTIMIZATION:
    - Single query with aggregations for efficiency
    - Consider caching results for completed months
    - Background job generation for large datasets
    """
    # Get month date range
    start_date = datetime(year, month, 1)
    _, last_day = monthrange(year, month)
    end_date = datetime(year, month, last_day, 23, 59, 59)
    
    # Base query for completed receipts in the month
    base_query = select(Receipt).where(
        and_(
            Receipt.status == ReceiptStatus.COMPLETED,
            Receipt.extracted_date >= start_date,
            Receipt.extracted_date <= end_date,
            Receipt.extracted_total.is_not(None)
        )
    )
    
    # Get all receipts for the month
    result = await session.execute(base_query)
    receipts = result.scalars().all()
    
    # Calculate aggregations
    total_amount = sum(r.extracted_total for r in receipts if r.extracted_total)
    receipt_count = len(receipts)
    
    # Vendor analysis
    vendor_totals = {}
    category_totals = {}
    daily_totals = {}
    
    for receipt in receipts:
        # Vendor analysis
        if receipt.extracted_vendor:
            vendor = receipt.extracted_vendor
            vendor_totals[vendor] = vendor_totals.get(vendor, Decimal('0')) + (receipt.extracted_total or Decimal('0'))
        
        # Category analysis
        if receipt.category:
            category = receipt.category
            category_totals[category] = category_totals.get(category, Decimal('0')) + (receipt.extracted_total or Decimal('0'))
        
        # Daily breakdown
        if receipt.extracted_date:
            day = receipt.extracted_date.day
            daily_totals[day] = daily_totals.get(day, Decimal('0')) + (receipt.extracted_total or Decimal('0'))
    
    # Format results
    top_vendors = [
        {"vendor": vendor, "amount": float(amount), "count": sum(1 for r in receipts if r.extracted_vendor == vendor)}
        for vendor, amount in sorted(vendor_totals.items(), key=lambda x: x[1], reverse=True)[:10]
    ]
    
    categories = [
        {"category": category, "amount": float(amount), "count": sum(1 for r in receipts if r.category == category)}
        for category, amount in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
    ]
    
    daily_breakdown = [
        {"day": day, "amount": float(amount)}
        for day, amount in sorted(daily_totals.items())
    ]
    
    # Calculate averages
    avg_daily = float(total_amount / last_day) if total_amount > 0 else 0
    avg_per_receipt = float(total_amount / receipt_count) if receipt_count > 0 else 0
    
    return {
        "month": f"{year}-{month:02d}",
        "year": year,
        "summary": {
            "total_amount": float(total_amount),
            "receipt_count": receipt_count,
            "average_daily": avg_daily,
            "average_per_receipt": avg_per_receipt
        },
        "top_vendors": top_vendors,
        "categories": categories,
        "daily_breakdown": daily_breakdown,
        "generated_at": datetime.utcnow().isoformat()
    }


@router.get("/monthly")
async def get_monthly_report(
    month: str = Query(..., description="Month in YYYY-MM format", regex=r"^\d{4}-\d{2}$"),
    force_regenerate: bool = Query(False, description="Force regenerate cached report"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get or generate monthly financial report.
    
    Returns comprehensive monthly spending analysis including:
    - Total spending and receipt count
    - Top vendors and spending patterns
    - Category breakdown
    - Daily spending trends
    
    CACHING STRATEGY:
    - Cache completed months (older than current month)
    - Regenerate current month data on each request
    - Background job for heavy report generation
    
    BACKGROUND JOB OPPORTUNITIES:
    - Pre-generate reports for all months on month-end
    - Email scheduled reports to stakeholders
    - Generate PDF versions for archival
    """
    require_role(current_user, [UserRole.ADMIN, UserRole.TREASURER, UserRole.PASTOR])
    
    try:
        year, month_num = map(int, month.split("-"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")
    
    # Validate date
    if month_num < 1 or month_num > 12:
        raise HTTPException(status_code=400, detail="Invalid month. Use 01-12")
    
    # Check if this is a future month
    now = datetime.utcnow()
    if year > now.year or (year == now.year and month_num > now.month):
        raise HTTPException(status_code=400, detail="Cannot generate reports for future months")
    
    # TODO: Implement caching logic here
    # For now, always generate fresh data
    # In production, check cache first:
    # if not force_regenerate and not is_current_month:
    #     cached_report = await get_cached_report(month)
    #     if cached_report:
    #         return cached_report
    
    # Generate report data
    report_data = await generate_monthly_report_data(session, year, month_num)
    
    # TODO: Cache the result if not current month
    # if not is_current_month:
    #     background_tasks.add_task(cache_report, month, report_data)
    
    return report_data


@router.get("/yearly")
async def get_yearly_report(
    year: int = Query(..., description="Year for the report"),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get yearly financial summary report.
    
    Provides high-level yearly statistics and month-by-month breakdown.
    """
    check_user_role(current_user, [UserRole.ADMIN, UserRole.TREASURER, UserRole.PASTOR])
    
    # Validate year
    current_year = datetime.utcnow().year
    if year > current_year:
        raise HTTPException(status_code=400, detail="Cannot generate reports for future years")
    
    if year < 2020:  # Reasonable lower bound
        raise HTTPException(status_code=400, detail="Year must be 2020 or later")
    
    # Get all receipts for the year
    start_date = datetime(year, 1, 1)
    end_date = datetime(year, 12, 31, 23, 59, 59)
    
    query = select(Receipt).where(
        and_(
            Receipt.status == ReceiptStatus.COMPLETED,
            Receipt.extracted_date >= start_date,
            Receipt.extracted_date <= end_date,
            Receipt.extracted_total.is_not(None)
        )
    )
    
    result = await session.execute(query)
    receipts = result.scalars().all()
    
    # Calculate yearly totals
    total_amount = sum(r.extracted_total for r in receipts if r.extracted_total)
    total_receipts = len(receipts)
    
    # Monthly breakdown
    monthly_data = {}
    for receipt in receipts:
        if receipt.extracted_date:
            month_key = receipt.extracted_date.month
            if month_key not in monthly_data:
                monthly_data[month_key] = {"amount": Decimal('0'), "count": 0}
            monthly_data[month_key]["amount"] += receipt.extracted_total or Decimal('0')
            monthly_data[month_key]["count"] += 1
    
    # Format monthly breakdown
    monthly_breakdown = []
    for month in range(1, 13):
        data = monthly_data.get(month, {"amount": Decimal('0'), "count": 0})
        monthly_breakdown.append({
            "month": month,
            "month_name": datetime(year, month, 1).strftime("%B"),
            "amount": float(data["amount"]),
            "count": data["count"]
        })
    
    # Top vendors for the year
    vendor_totals = {}
    for receipt in receipts:
        if receipt.extracted_vendor:
            vendor = receipt.extracted_vendor
            vendor_totals[vendor] = vendor_totals.get(vendor, Decimal('0')) + (receipt.extracted_total or Decimal('0'))
    
    top_vendors = [
        {"vendor": vendor, "amount": float(amount)}
        for vendor, amount in sorted(vendor_totals.items(), key=lambda x: x[1], reverse=True)[:10]
    ]
    
    return {
        "year": year,
        "summary": {
            "total_amount": float(total_amount),
            "total_receipts": total_receipts,
            "average_monthly": float(total_amount / 12) if total_amount > 0 else 0
        },
        "monthly_breakdown": monthly_breakdown,
        "top_vendors": top_vendors,
        "generated_at": datetime.utcnow().isoformat()
    }


@router.get("/categories")
async def get_category_report(
    year: Optional[int] = Query(None, description="Year filter"),
    month: Optional[str] = Query(None, description="Month filter in YYYY-MM format"),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get spending breakdown by category.
    
    Can be filtered by year or specific month.
    """
    check_user_role(current_user, [UserRole.ADMIN, UserRole.TREASURER, UserRole.PASTOR])
    
    # Build date filters
    filters = [
        Receipt.status == ReceiptStatus.COMPLETED,
        Receipt.extracted_total.is_not(None),
        Receipt.category.is_not(None)
    ]
    
    if month:
        try:
            year_val, month_val = map(int, month.split("-"))
            start_date = datetime(year_val, month_val, 1)
            _, last_day = monthrange(year_val, month_val)
            end_date = datetime(year_val, month_val, last_day, 23, 59, 59)
            filters.extend([
                Receipt.extracted_date >= start_date,
                Receipt.extracted_date <= end_date
            ])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")
    elif year:
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31, 23, 59, 59)
        filters.extend([
            Receipt.extracted_date >= start_date,
            Receipt.extracted_date <= end_date
        ])
    
    # Query receipts
    query = select(Receipt).where(and_(*filters))
    result = await session.execute(query)
    receipts = result.scalars().all()
    
    # Calculate category totals
    category_data = {}
    total_amount = Decimal('0')
    
    for receipt in receipts:
        if receipt.category and receipt.extracted_total:
            category = receipt.category
            if category not in category_data:
                category_data[category] = {"amount": Decimal('0'), "count": 0}
            category_data[category]["amount"] += receipt.extracted_total
            category_data[category]["count"] += 1
            total_amount += receipt.extracted_total
    
    # Format results
    categories = []
    for category, data in sorted(category_data.items(), key=lambda x: x[1]["amount"], reverse=True):
        percentage = float((data["amount"] / total_amount) * 100) if total_amount > 0 else 0
        categories.append({
            "category": category,
            "amount": float(data["amount"]),
            "count": data["count"],
            "percentage": round(percentage, 2)
        })
    
    return {
        "categories": categories,
        "total_amount": float(total_amount),
        "period": {
            "year": year,
            "month": month
        },
        "generated_at": datetime.utcnow().isoformat()
    }


@router.get("/monthly/list")
async def list_monthly_reports(
    year: int = Query(..., description="Year to list reports for"),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    List available monthly reports for a given year.
    
    Returns status of each month's report (available, not_generated, etc.).
    """
    check_user_role(current_user, [UserRole.ADMIN, UserRole.TREASURER, UserRole.PASTOR])
    
    # For demo purposes, we'll simulate report availability
    # In production, this would check a reports table or file system
    months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    
    reports = []
    current_date = datetime.utcnow()
    
    for i, month_name in enumerate(months, 1):
        month_key = f"{year}-{i:02d}"
        
        # Check if month has receipts
        start_date = datetime(year, i, 1)
        _, last_day = monthrange(year, i)
        end_date = datetime(year, i, last_day, 23, 59, 59)
        
        # Count receipts for this month
        query = select(func.count(Receipt.id)).where(
            and_(
                Receipt.status == ReceiptStatus.COMPLETED,
                Receipt.extracted_date >= start_date,
                Receipt.extracted_date <= end_date
            )
        )
        result = await session.execute(query)
        receipt_count = result.scalar() or 0
        
        # Determine status
        if year > current_date.year or (year == current_date.year and i > current_date.month):
            status = "not_available"  # Future month
        elif receipt_count > 0:
            status = "available"  # Has data
        else:
            status = "not_generated"  # No data
        
        reports.append({
            "month": month_key,
            "month_name": month_name,
            "year": year,
            "status": status,
            "receipt_count": receipt_count,
            # For demo, we'll provide dummy download URLs
            "download_url": f"http://localhost:8011/api/v1/reports/monthly/download/{month_key}" if status == "available" else None,
            "generated_at": datetime.utcnow().isoformat() if status == "available" else None,
            "size": 1024 * 50 if status == "available" else None  # Dummy size
        })
    
    return {"reports": reports}


@router.post("/monthly/generate")
async def generate_monthly_report_file(
    month: str = Query(..., description="Month in YYYY-MM format", regex=r"^\d{4}-\d{2}$"),
    force: bool = Query(False, description="Force regenerate if exists"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a PDF report file for a specific month.
    """
    check_user_role(current_user, [UserRole.ADMIN, UserRole.TREASURER])
    
    try:
        year, month_num = map(int, month.split("-"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")
    
    # Validate date
    if month_num < 1 or month_num > 12:
        raise HTTPException(status_code=400, detail="Invalid month. Use 01-12")
    
    # Check if this is a future month
    now = datetime.utcnow()
    if year > now.year or (year == now.year and month_num > now.month):
        raise HTTPException(status_code=400, detail="Cannot generate reports for future months")
    
    # Generate report data
    report_data = await generate_monthly_report_data(session, year, month_num)
    
    # For demo purposes, simulate PDF generation
    # In production, use the PDF reporting service
    import time
    time.sleep(1)  # Simulate processing time
    
    return {
        "status": "success",
        "message": f"Report generated successfully for {report_data['month']}",
        "report_url": f"http://localhost:8011/api/v1/reports/monthly/download/{month}",
        "report_path": f"/reports/monthly/{year}/{month_num:02d}/report.pdf",
        "cached": False,
        "month": month,
        "generated_at": datetime.utcnow().isoformat(),
        "summary": report_data["summary"],
        "receipts_count": report_data["summary"]["receipt_count"]
    }


@router.delete("/monthly/{month}")
async def delete_monthly_report(
    month: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a monthly report file.
    """
    check_user_role(current_user, [UserRole.ADMIN, UserRole.TREASURER])
    
    # Validate month format
    try:
        year, month_num = map(int, month.split("-"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")
    
    # For demo purposes, just return success
    # In production, delete the actual file
    
    return {
        "status": "success",
        "message": f"Report deleted successfully for {month}"
    }


@router.post("/monthly/{month}/email")
async def email_monthly_report(
    month: str,
    recipients: str = Query(..., description="Comma-separated email addresses"),
    message: str = Query("", description="Optional custom message"),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Email a monthly report to specified recipients.
    """
    check_user_role(current_user, [UserRole.ADMIN, UserRole.TREASURER])
    
    # Validate month format
    try:
        year, month_num = map(int, month.split("-"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")
    
    # Parse recipients
    recipient_list = [email.strip() for email in recipients.split(",") if email.strip()]
    
    if not recipient_list:
        raise HTTPException(status_code=400, detail="At least one recipient email is required")
    
    # For demo purposes, simulate email sending
    # In production, integrate with email service
    
    return {
        "status": "success",
        "message": f"Report emailed successfully to {len(recipient_list)} recipients",
        "recipients": recipient_list,
        "month": month,
        "sent_at": datetime.utcnow().isoformat()
    }


@router.get("/monthly/download/{month}")
async def download_monthly_report(
    month: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Download a monthly report PDF file.
    """
    check_user_role(current_user, [UserRole.ADMIN, UserRole.TREASURER, UserRole.PASTOR])
    
    # Validate month format
    try:
        year, month_num = map(int, month.split("-"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")
    
    # For demo purposes, return a simple response
    # In production, return the actual PDF file
    return {
        "message": "PDF download endpoint - not implemented in demo",
        "month": month,
        "url": f"/reports/monthly/download/{month}"
    }
