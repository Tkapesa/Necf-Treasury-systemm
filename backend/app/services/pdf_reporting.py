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


class PDFEngine(Protocol):
    """Protocol for PDF generation engines"""
    
    def generate_pdf(self, html_content: str) -> bytes:
        """Generate PDF from HTML content"""
        ...


class WeasyPrintEngine:
    """WeasyPrint PDF engine implementation"""
    
    def __init__(self):
        try:
            import weasyprint
            self.weasyprint = weasyprint
            self.available = True
        except ImportError:
            self.available = False
            
    def generate_pdf(self, html_content: str) -> bytes:
        if not self.available:
            raise ImportError("WeasyPrint is not available")
            
        # Configure WeasyPrint with custom CSS for better PDF output
        html_doc = self.weasyprint.HTML(string=html_content)
        css = self.weasyprint.CSS(string="""
            @page {
                size: A4;
                margin: 1in;
                @bottom-center {
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 10px;
                    color: #666;
                }
            }
            body { 
                font-family: Arial, sans-serif; 
                font-size: 12px;
                line-height: 1.4;
            }
            .header { 
                border-bottom: 2px solid #333; 
                margin-bottom: 20px; 
                padding-bottom: 10px;
            }
            .summary-table, .receipts-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 15px 0;
            }
            .summary-table th, .summary-table td,
            .receipts-table th, .receipts-table td { 
                border: 1px solid #ddd; 
                padding: 8px; 
                text-align: left;
            }
            .summary-table th, .receipts-table th { 
                background-color: #f8f9fa; 
                font-weight: bold;
            }
            .amount { text-align: right; }
            .thumbnail { max-width: 40px; max-height: 40px; }
            .page-break { page-break-before: always; }
            .footer { margin-top: 30px; font-size: 10px; color: #666; }
        """)
        
        pdf_bytes = html_doc.write_pdf(stylesheets=[css])
        return pdf_bytes


class ReportLabEngine:
    """ReportLab PDF engine implementation (fallback)"""
    
    def __init__(self):
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import letter, A4
            from reportlab.lib.units import inch
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib import colors
            from reportlab.lib.colors import HexColor
            
            self.canvas = canvas
            self.letter = letter
            self.A4 = A4
            self.inch = inch
            self.getSampleStyleSheet = getSampleStyleSheet
            self.SimpleDocTemplate = SimpleDocTemplate
            self.Table = Table
            self.TableStyle = TableStyle
            self.Paragraph = Paragraph
            self.Spacer = Spacer
            self.colors = colors
            self.HexColor = HexColor
            self.available = True
        except ImportError:
            self.available = False
    
    def generate_pdf(self, html_content: str) -> bytes:
        if not self.available:
            raise ImportError("ReportLab is not available")
        
        # Note: This is a simplified implementation
        # In practice, you'd parse the HTML and convert to ReportLab elements
        buffer = io.BytesIO()
        doc = self.SimpleDocTemplate(buffer, pagesize=self.A4)
        
        styles = self.getSampleStyleSheet()
        story = []
        
        # Simple fallback - just convert HTML to plain text for ReportLab
        import re
        plain_text = re.sub('<[^<]+?>', '', html_content)
        
        story.append(self.Paragraph("Monthly Receipt Report", styles['Title']))
        story.append(self.Spacer(1, 12))
        story.append(self.Paragraph(plain_text, styles['Normal']))
        
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes


class ReportGenerationService:
    """Main service for generating PDF reports"""
    
    def __init__(self, db: AsyncSession, storage_adapter = None):
        self.db = db
        self.storage = storage_adapter or get_storage_adapter()
        self.executor = ThreadPoolExecutor(max_workers=2)
        
        # Initialize template environment
        template_dir = Path(__file__).parent.parent / "templates" / "reports"
        template_dir.mkdir(parents=True, exist_ok=True)
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=True
        )
        
        # Initialize PDF engines with fallback
        self.pdf_engines = [WeasyPrintEngine(), ReportLabEngine()]
        self.active_engine = None
        
        for engine in self.pdf_engines:
            if engine.available:
                self.active_engine = engine
                break
        
        if not self.active_engine:
            raise RuntimeError("No PDF engine available. Install WeasyPrint or ReportLab.")
    
    def _get_cache_key(self, year: int, month: int) -> str:
        """Generate cache key for report"""
        return f"monthly_report_{year}_{month:02d}"
    
    def _get_report_path(self, year: int, month: int, generated_at: datetime) -> str:
        """Generate storage path for report"""
        timestamp = generated_at.strftime("%Y%m%d_%H%M%S")
        return f"reports/monthly/{year}/{month:02d}/report_{timestamp}.pdf"
    
    async def _check_existing_report(self, year: int, month: int) -> Optional[str]:
        """Check if report already exists and return path"""
        cache_key = self._get_cache_key(year, month)
        
        # In production, use Redis or database for caching
        # For now, check if file exists in storage
        report_dir = f"reports/monthly/{year}/{month:02d}/"
        
        try:
            # List files in the directory to find existing reports
            # This is a simplified check - in production, store metadata in database
            existing_files = await self.storage.list_files(report_dir)
            if existing_files:
                # Return the most recent report
                latest_file = sorted(existing_files)[-1]
                return f"{report_dir}{latest_file}"
        except Exception:
            pass  # Directory doesn't exist or other error
        
        return None
    
    async def _get_monthly_data(self, year: int, month: int) -> Dict[str, Any]:
        """Fetch and aggregate monthly receipt data"""
        
        # Query receipts for the specified month
        receipts_query = select(Receipt).where(
            and_(
                extract('year', Receipt.date) == year,
                extract('month', Receipt.date) == month
            )
        ).order_by(Receipt.date.desc())
        
        result = await self.db.execute(receipts_query)
        receipts = result.scalars().all()
        
        # Calculate summary statistics
        total_amount = sum(receipt.amount for receipt in receipts if receipt.amount)
        total_count = len(receipts)
        
        # Group by vendor
        vendor_breakdown = {}
        for receipt in receipts:
            vendor = receipt.vendor or "Unknown"
            if vendor not in vendor_breakdown:
                vendor_breakdown[vendor] = {"amount": 0, "count": 0}
            vendor_breakdown[vendor]["amount"] += receipt.amount or 0
            vendor_breakdown[vendor]["count"] += 1
        
        # Group by category
        category_breakdown = {}
        for receipt in receipts:
            category = receipt.category or "other"
            if category not in category_breakdown:
                category_breakdown[category] = {"amount": 0, "count": 0}
            category_breakdown[category]["amount"] += receipt.amount or 0
            category_breakdown[category]["count"] += 1
        
        # Sort breakdowns by amount
        vendor_breakdown = dict(sorted(
            vendor_breakdown.items(), 
            key=lambda x: x[1]["amount"], 
            reverse=True
        ))
        category_breakdown = dict(sorted(
            category_breakdown.items(), 
            key=lambda x: x[1]["amount"], 
            reverse=True
        ))
        
        return {
            "year": year,
            "month": month,
            "month_name": date(year, month, 1).strftime("%B %Y"),
            "receipts": receipts,
            "summary": {
                "total_amount": total_amount,
                "total_count": total_count,
                "average_amount": total_amount / total_count if total_count > 0 else 0
            },
            "vendor_breakdown": vendor_breakdown,
            "category_breakdown": category_breakdown,
            "generated_at": datetime.now()
        }
    
    async def _generate_thumbnails(self, receipts: List[Receipt]) -> Dict[str, str]:
        """Generate base64 thumbnails for receipt images"""
        thumbnails = {}
        
        for receipt in receipts:
            if not receipt.image_url:
                continue
                
            try:
                # Download image from storage
                image_data = await self.storage.read_file(receipt.image_url)
                
                # Generate thumbnail
                thumbnail_data = await asyncio.get_event_loop().run_in_executor(
                    self.executor, self._create_thumbnail, image_data
                )
                
                if thumbnail_data:
                    thumbnails[receipt.id] = base64.b64encode(thumbnail_data).decode('utf-8')
                    
            except Exception as e:
                print(f"Failed to generate thumbnail for receipt {receipt.id}: {e}")
                continue
        
        return thumbnails
    
    def _create_thumbnail(self, image_data: bytes, size: tuple = (60, 60)) -> Optional[bytes]:
        """Create thumbnail from image data"""
        try:
            image = Image.open(io.BytesIO(image_data))
            image.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Save as JPEG
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=85)
            return output.getvalue()
            
        except Exception:
            return None
    
    def _render_html_template(self, data: Dict[str, Any], thumbnails: Dict[str, str]) -> str:
        """Render HTML template with report data"""
        try:
            template = self.jinja_env.get_template("monthly_report.html")
        except Exception:
            # Use inline template if file doesn't exist
            template = Template(self._get_default_template())
        
        return template.render(
            **data,
            thumbnails=thumbnails,
            format_currency=lambda x: f"${x:,.2f}" if x else "$0.00",
            format_date=lambda x: x.strftime("%Y-%m-%d") if x else "",
            enumerate=enumerate
        )
    
    def _get_default_template(self) -> str:
        """Default HTML template for reports"""
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Monthly Receipt Report - {{ month_name }}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { margin-bottom: 30px; }
        .summary-table, .breakdown-table, .receipts-table { 
            width: 100%; border-collapse: collapse; margin: 20px 0; 
        }
        .summary-table th, .summary-table td,
        .breakdown-table th, .breakdown-table td,
        .receipts-table th, .receipts-table td { 
            border: 1px solid #ddd; padding: 8px; text-align: left; 
        }
        .summary-table th, .breakdown-table th, .receipts-table th { 
            background-color: #f8f9fa; font-weight: bold; 
        }
        .amount { text-align: right; }
        .thumbnail { max-width: 40px; max-height: 40px; }
        .section { margin: 30px 0; }
        .section h2 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>NECF Treasury - Monthly Receipt Report</h1>
        <h2>{{ month_name }}</h2>
        <p>Generated on {{ generated_at.strftime("%B %d, %Y at %I:%M %p") }}</p>
    </div>

    <div class="section summary">
        <h2>Summary</h2>
        <table class="summary-table">
            <tr>
                <th>Total Receipts</th>
                <td>{{ summary.total_count }}</td>
            </tr>
            <tr>
                <th>Total Amount</th>
                <td class="amount">{{ format_currency(summary.total_amount) }}</td>
            </tr>
            <tr>
                <th>Average Amount</th>
                <td class="amount">{{ format_currency(summary.average_amount) }}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Breakdown by Vendor</h2>
        <table class="breakdown-table">
            <thead>
                <tr>
                    <th>Vendor</th>
                    <th>Count</th>
                    <th class="amount">Amount</th>
                    <th class="amount">Percentage</th>
                </tr>
            </thead>
            <tbody>
                {% for vendor, data in vendor_breakdown.items() %}
                <tr>
                    <td>{{ vendor }}</td>
                    <td>{{ data.count }}</td>
                    <td class="amount">{{ format_currency(data.amount) }}</td>
                    <td class="amount">{{ "%.1f" | format((data.amount / summary.total_amount * 100) if summary.total_amount > 0 else 0) }}%</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Breakdown by Category</h2>
        <table class="breakdown-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Count</th>
                    <th class="amount">Amount</th>
                    <th class="amount">Percentage</th>
                </tr>
            </thead>
            <tbody>
                {% for category, data in category_breakdown.items() %}
                <tr>
                    <td>{{ category.title() }}</td>
                    <td>{{ data.count }}</td>
                    <td class="amount">{{ format_currency(data.amount) }}</td>
                    <td class="amount">{{ "%.1f" | format((data.amount / summary.total_amount * 100) if summary.total_amount > 0 else 0) }}%</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Receipt Details</h2>
        <table class="receipts-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Vendor</th>
                    <th>Description</th>
                    <th class="amount">Amount</th>
                    <th>Category</th>
                    <th>Image</th>
                </tr>
            </thead>
            <tbody>
                {% for receipt in receipts %}
                <tr>
                    <td>{{ format_date(receipt.date) }}</td>
                    <td>{{ receipt.vendor or "Unknown" }}</td>
                    <td>{{ receipt.description or "-" }}</td>
                    <td class="amount">{{ format_currency(receipt.amount) }}</td>
                    <td>{{ (receipt.category or "other").title() }}</td>
                    <td>
                        {% if receipt.id in thumbnails %}
                        <img src="data:image/jpeg;base64,{{ thumbnails[receipt.id] }}" 
                             alt="Receipt thumbnail" class="thumbnail">
                        {% else %}
                        -
                        {% endif %}
                    </td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>

    <div class="footer">
        <p>This report was automatically generated by the NECF Treasury System.</p>
        <p>For questions or concerns, please contact the finance team.</p>
    </div>
</body>
</html>
        """
    
    async def generate_monthly_report(
        self, 
        year: int, 
        month: int, 
        force_regenerate: bool = False
    ) -> Dict[str, Any]:
        """
        Generate monthly PDF report
        
        Args:
            year: Report year
            month: Report month (1-12)
            force_regenerate: Force regeneration even if cached report exists
            
        Returns:
            Dict with report_path, download_url, and metadata
        """
        
        # Check for existing report if not forcing regeneration
        if not force_regenerate:
            existing_path = await self._check_existing_report(year, month)
            if existing_path:
                download_url = await self.storage.get_signed_url(existing_path)
                return {
                    "report_path": existing_path,
                    "download_url": download_url,
                    "cached": True,
                    "generated_at": datetime.now()  # In production, get from metadata
                }
        
        # Fetch monthly data
        data = await self._get_monthly_data(year, month)
        
        # Generate thumbnails for receipt images
        thumbnails = await self._generate_thumbnails(data["receipts"])
        
        # Render HTML template
        html_content = self._render_html_template(data, thumbnails)
        
        # Generate PDF in background thread
        pdf_bytes = await asyncio.get_event_loop().run_in_executor(
            self.executor, self.active_engine.generate_pdf, html_content
        )
        
        # Store PDF in storage
        report_path = self._get_report_path(year, month, data["generated_at"])
        await self.storage.write_file(report_path, pdf_bytes)
        
        # Generate signed URL for download
        download_url = await self.storage.get_signed_url(report_path)
        
        # TODO: In production, store report metadata in database for caching
        # await self._store_report_metadata(year, month, report_path, data["generated_at"])
        
        return {
            "report_path": report_path,
            "download_url": download_url,
            "cached": False,
            "generated_at": data["generated_at"],
            "summary": data["summary"],
            "receipts_count": len(data["receipts"])
        }
    
    async def get_report_status(self, year: int, month: int) -> Dict[str, Any]:
        """Get status of monthly report (exists, generating, etc.)"""
        existing_path = await self._check_existing_report(year, month)
        
        if existing_path:
            download_url = await self.storage.get_signed_url(existing_path)
            return {
                "status": "available",
                "report_path": existing_path,
                "download_url": download_url
            }
        
        # TODO: Check if report is currently being generated (use Redis/DB)
        # For now, assume it doesn't exist
        return {
            "status": "not_generated"
        }


# Background job suggestions for production deployment
"""
For production use with large datasets, consider implementing:

1. Celery/RQ Background Jobs:
   - Move PDF generation to background workers
   - Add job status tracking and progress updates
   - Queue management for multiple report requests

2. Caching Strategy:
   - Redis cache for report metadata and status
   - Database table to track generated reports
   - TTL-based cache invalidation for monthly reports

3. Performance Optimizations:
   - Pagination for large receipt lists in reports
   - Lazy loading of receipt images/thumbnails
   - Compressed image storage for thumbnails
   - Database connection pooling for report queries

Example Celery task:
```python
@celery_app.task(bind=True)
def generate_monthly_report_task(self, year: int, month: int, user_id: str):
    try:
        # Update task state
        self.update_state(state='PROGRESS', meta={'current': 10, 'total': 100})
        
        # Generate report
        service = ReportGenerationService(db_session)
        result = await service.generate_monthly_report(year, month)
        
        # Notify user via email/websocket
        return result
    except Exception as exc:
        self.update_state(state='FAILURE', meta={'error': str(exc)})
        raise
```

4. Email Integration:
   - SMTP configuration for report delivery
   - Email templates for report notifications
   - Scheduled monthly report generation and delivery
"""
