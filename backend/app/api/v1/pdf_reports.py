"""
Reports API endpoints for generating and managing PDF reports.

Provides endpoints for:
- Monthly PDF report generation with thumbnails
- Report status checking and caching
- Report downloads and management
- Background job integration for large datasets
"""

import calendar
from datetime import datetime, date
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND, HTTP_202_ACCEPTED

from ...core.database import get_db
from ...core.auth import get_current_user, require_admin
from ...models import User
from ...services.pdf_reporting import ReportGenerationService


router = APIRouter()


@router.post("/monthly")
async def generate_monthly_report(
    background_tasks: BackgroundTasks,
    month: str = Query(..., description="Month in YYYY-MM format"),
    force: bool = Query(False, description="Force regeneration of existing report"),
    regenerate: bool = Query(False, description="Force regeneration (alias for force)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Generate monthly PDF report for receipts.
    
    **Admin Access Required**
    
    Args:
        month: Month in YYYY-MM format (e.g., "2024-03")
        force: Force regeneration even if report exists
        regenerate: Alias for force parameter
        
    Returns:
        Report generation result with download URL or job status
        
    Raises:
        400: Invalid month format
        403: Insufficient permissions
        500: Report generation failed
    """
    
    # Parse month parameter
    try:
        year, month_num = month.split('-')
        year = int(year)
        month_num = int(month_num)
        
        if not (1 <= month_num <= 12):
            raise ValueError("Month must be between 1-12")
        if not (2020 <= year <= 2030):
            raise ValueError("Year must be between 2020-2030")
            
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Invalid month format. Expected YYYY-MM, got '{month}'. Error: {str(e)}"
        )
    
    # Validate month is not in the future
    current_date = datetime.now()
    report_date = date(year, month_num, 1)
    if report_date > current_date.date():
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail="Cannot generate reports for future months"
        )
    
    force_regen = force or regenerate
    
    try:
        # Initialize report service
        report_service = ReportGenerationService(db)
        
        # Check if report already exists and return immediately if not forcing
        if not force_regen:
            status = await report_service.get_report_status(year, month_num)
            if status["status"] == "available":
                return {
                    "status": "completed",
                    "message": f"Report for {calendar.month_name[month_num]} {year} already exists",
                    "report_url": status["download_url"],
                    "cached": True,
                    "month": month,
                    "generated_at": datetime.now().isoformat()
                }
        
        # For larger datasets, add to background queue
        # For now, generate synchronously
        result = await report_service.generate_monthly_report(
            year=year,
            month=month_num,
            force_regenerate=force_regen
        )
        
        return {
            "status": "completed" if not result.get("cached") else "retrieved",
            "message": f"Monthly report for {calendar.month_name[month_num]} {year} generated successfully",
            "report_url": result["download_url"],
            "report_path": result["report_path"],
            "cached": result.get("cached", False),
            "month": month,
            "generated_at": result["generated_at"].isoformat(),
            "summary": result.get("summary", {}),
            "receipts_count": result.get("receipts_count", 0)
        }
        
    except Exception as e:
        # Log the error in production
        print(f"Report generation failed for {month}: {str(e)}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate report for {month}: {str(e)}"
        )


@router.get("/monthly/{month}/status")
async def get_monthly_report_status(
    month: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get status of monthly report generation.
    
    **Admin Access Required**
    
    Args:
        month: Month in YYYY-MM format
        
    Returns:
        Report status and download URL if available
        
    Raises:
        400: Invalid month format
        403: Insufficient permissions
    """
    
    # Parse month parameter
    try:
        year, month_num = month.split('-')
        year = int(year)
        month_num = int(month_num)
        
        if not (1 <= month_num <= 12):
            raise ValueError("Month must be between 1-12")
            
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Invalid month format. Expected YYYY-MM, got '{month}'"
        )
    
    try:
        report_service = ReportGenerationService(db)
        status = await report_service.get_report_status(year, month_num)
        
        return {
            "month": month,
            "month_name": calendar.month_name[month_num],
            "year": year,
            **status
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check report status: {str(e)}"
        )


@router.get("/monthly")
async def list_available_reports(
    year: Optional[int] = Query(None, description="Filter by year"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    List all available monthly reports.
    
    **Admin Access Required**
    
    Args:
        year: Optional year filter
        
    Returns:
        List of available reports with metadata
    """
    
    # This is a simplified implementation
    # In production, you'd query a reports metadata table
    current_year = datetime.now().year
    if year is None:
        year = current_year
    
    reports = []
    
    try:
        report_service = ReportGenerationService(db)
        
        for month_num in range(1, 13):
            # Skip future months for current year
            if year == current_year and month_num > datetime.now().month:
                continue
                
            status = await report_service.get_report_status(year, month_num)
            
            if status["status"] == "available":
                reports.append({
                    "month": f"{year}-{month_num:02d}",
                    "month_name": calendar.month_name[month_num],
                    "year": year,
                    "status": "available",
                    "download_url": status.get("download_url"),
                    "report_path": status.get("report_path")
                })
            else:
                reports.append({
                    "month": f"{year}-{month_num:02d}",
                    "month_name": calendar.month_name[month_num],
                    "year": year,
                    "status": "not_generated"
                })
        
        return {
            "year": year,
            "reports": reports,
            "total_available": len([r for r in reports if r["status"] == "available"])
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list reports: {str(e)}"
        )


@router.delete("/monthly/{month}")
async def delete_monthly_report(
    month: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Delete a monthly report.
    
    **Admin Access Required**
    
    Args:
        month: Month in YYYY-MM format
        
    Returns:
        Deletion confirmation
        
    Raises:
        400: Invalid month format
        404: Report not found
        403: Insufficient permissions
    """
    
    # Parse month parameter
    try:
        year, month_num = month.split('-')
        year = int(year)
        month_num = int(month_num)
        
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Invalid month format. Expected YYYY-MM, got '{month}'"
        )
    
    try:
        report_service = ReportGenerationService(db)
        status = await report_service.get_report_status(year, month_num)
        
        if status["status"] != "available":
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND,
                detail=f"Report for {month} not found"
            )
        
        # Delete the report file
        report_path = status.get("report_path")
        if report_path:
            await report_service.storage.delete_file(report_path)
        
        # TODO: In production, also delete from reports metadata table
        
        return {
            "message": f"Report for {month} deleted successfully",
            "month": month,
            "deleted_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete report: {str(e)}"
        )


# Email stub functionality for report delivery
@router.post("/monthly/{month}/email")
async def email_monthly_report(
    month: str,
    recipients: str = Query(..., description="Comma-separated email addresses"),
    message: Optional[str] = Query(None, description="Optional message to include"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Email monthly report to specified recipients (STUB IMPLEMENTATION).
    
    **Admin Access Required**
    
    Args:
        month: Month in YYYY-MM format
        recipients: Comma-separated list of email addresses
        message: Optional custom message
        
    Returns:
        Email delivery status
        
    Note:
        This is a stub implementation for demonstration.
        In production, integrate with SMTP service (SendGrid, AWS SES, etc.)
    """
    
    # Parse month parameter
    try:
        year, month_num = month.split('-')
        year = int(year)
        month_num = int(month_num)
        
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Invalid month format. Expected YYYY-MM, got '{month}'"
        )
    
    # Parse recipients
    recipient_list = [email.strip() for email in recipients.split(',')]
    
    # Validate email addresses
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    invalid_emails = [email for email in recipient_list if not re.match(email_pattern, email)]
    
    if invalid_emails:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Invalid email addresses: {', '.join(invalid_emails)}"
        )
    
    try:
        report_service = ReportGenerationService(db)
        status = await report_service.get_report_status(year, month_num)
        
        if status["status"] != "available":
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND,
                detail=f"Report for {month} not found. Generate the report first."
            )
        
        # STUB: In production, implement actual email sending
        # Example with SendGrid or AWS SES:
        """
        import sendgrid
        from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
        
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        
        # Download report file
        report_data = await report_service.storage.read_file(status["report_path"])
        
        # Create email
        mail = Mail(
            from_email=settings.FROM_EMAIL,
            to_emails=recipient_list,
            subject=f"Monthly Receipt Report - {calendar.month_name[month_num]} {year}",
            html_content=f'''
            <h2>Monthly Receipt Report</h2>
            <p>Please find attached the monthly receipt report for {calendar.month_name[month_num]} {year}.</p>
            {f"<p>Message: {message}</p>" if message else ""}
            <p>Generated by NECF Treasury System</p>
            '''
        )
        
        # Add PDF attachment
        attachment = Attachment(
            FileContent(base64.b64encode(report_data).decode()),
            FileName(f"monthly_report_{month}.pdf"),
            FileType("application/pdf"),
            Disposition("attachment")
        )
        mail.attachment = attachment
        
        # Send email
        response = sg.send(mail)
        """
        
        # STUB RESPONSE
        return {
            "status": "email_sent",
            "message": f"Report for {month} would be sent to {len(recipient_list)} recipients",
            "recipients": recipient_list,
            "month": month,
            "report_url": status.get("download_url"),
            "sent_at": datetime.now().isoformat(),
            "note": "This is a stub implementation. Actual email sending not configured."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to email report: {str(e)}"
        )


# Background job example for production use
"""
For production deployment with large datasets, consider this background job approach:

@router.post("/monthly/background")
async def generate_monthly_report_background(
    background_tasks: BackgroundTasks,
    month: str = Query(...),
    force: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    \"\"\"
    Generate monthly report in background job.
    Returns job ID for status tracking.
    \"\"\"
    
    # Add to background queue
    job_id = str(uuid.uuid4())
    
    background_tasks.add_task(
        generate_report_task,
        job_id=job_id,
        year=year,
        month=month_num,
        user_id=current_user.id,
        force=force
    )
    
    return {
        "status": "queued",
        "job_id": job_id,
        "message": f"Report generation queued for {month}",
        "check_status_url": f"/api/v1/reports/jobs/{job_id}/status"
    }

@router.get("/jobs/{job_id}/status")
async def get_job_status(
    job_id: str,
    current_user: User = Depends(require_admin)
):
    \"\"\"Get background job status.\"\"\"
    
    # Query job status from Redis/database
    job_status = await get_job_status_from_queue(job_id)
    
    return {
        "job_id": job_id,
        "status": job_status.get("status", "unknown"),
        "progress": job_status.get("progress", 0),
        "result": job_status.get("result"),
        "error": job_status.get("error")
    }

async def generate_report_task(job_id: str, year: int, month: int, user_id: str, force: bool):
    \"\"\"Background task for report generation.\"\"\"
    
    try:
        # Update job status
        await update_job_status(job_id, "processing", progress=10)
        
        # Generate report
        async with get_db_session() as db:
            report_service = ReportGenerationService(db)
            result = await report_service.generate_monthly_report(year, month, force)
        
        # Update completion status
        await update_job_status(job_id, "completed", progress=100, result=result)
        
        # Send notification email
        await send_report_ready_email(user_id, result["download_url"])
        
    except Exception as e:
        await update_job_status(job_id, "failed", error=str(e))
        raise
"""
