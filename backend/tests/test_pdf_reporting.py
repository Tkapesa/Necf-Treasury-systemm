"""
Unit tests for PDF reporting service.

Tests cover:
- PDF generation with both WeasyPrint and ReportLab engines
- HTML template rendering with proper data
- Thumbnail generation and base64 encoding
- Caching and storage integration
- Error handling and fallback mechanisms
- PDF content validation (bytes length > 0)
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, date
from pathlib import Path
from io import BytesIO
import base64

# Import the service to test
from app.services.pdf_reporting import (
    PDFEngine,
    WeasyPrintEngine,
    ReportLabEngine,
    ReportGenerationService,
    PDFGenerationError
)


class TestPDFEngines:
    """Test PDF engine implementations."""
    
    def test_weasyprint_engine_available(self):
        """Test WeasyPrint engine availability check."""
        engine = WeasyPrintEngine()
        # This will return False in test environment without WeasyPrint installed
        # In production with WeasyPrint installed, this should return True
        assert isinstance(engine.is_available(), bool)
    
    def test_reportlab_engine_available(self):
        """Test ReportLab engine availability check."""
        engine = ReportLabEngine()
        # ReportLab should be available as it's in test dependencies
        assert engine.is_available() is True
    
    @patch('app.services.pdf_reporting.weasyprint')
    def test_weasyprint_engine_generate_pdf(self, mock_weasyprint):
        """Test WeasyPrint PDF generation."""
        # Mock WeasyPrint components
        mock_html = Mock()
        mock_weasyprint.HTML.return_value = mock_html
        mock_html.write_pdf.return_value = b'fake pdf content'
        
        engine = WeasyPrintEngine()
        html_content = "<html><body><h1>Test Report</h1></body></html>"
        
        pdf_bytes = engine.generate_pdf(html_content)
        
        assert pdf_bytes == b'fake pdf content'
        assert len(pdf_bytes) > 0
        mock_weasyprint.HTML.assert_called_once_with(string=html_content)
        mock_html.write_pdf.assert_called_once()
    
    def test_reportlab_engine_generate_pdf(self):
        """Test ReportLab PDF generation."""
        engine = ReportLabEngine()
        html_content = "<html><body><h1>Test Report</h1><p>Some content</p></body></html>"
        
        pdf_bytes = engine.generate_pdf(html_content)
        
        # Should generate actual PDF bytes
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        # PDF files start with %PDF
        assert pdf_bytes.startswith(b'%PDF')
    
    @patch('app.services.pdf_reporting.weasyprint')
    def test_weasyprint_engine_error_handling(self, mock_weasyprint):
        """Test WeasyPrint error handling."""
        mock_weasyprint.HTML.side_effect = Exception("WeasyPrint error")
        
        engine = WeasyPrintEngine()
        
        with pytest.raises(PDFGenerationError) as exc_info:
            engine.generate_pdf("<html></html>")
        
        assert "WeasyPrint PDF generation failed" in str(exc_info.value)
    
    def test_reportlab_engine_error_handling(self):
        """Test ReportLab error handling with invalid HTML."""
        engine = ReportLabEngine()
        
        # ReportLab should handle invalid HTML gracefully
        # and still produce a PDF with basic content
        pdf_bytes = engine.generate_pdf("Invalid HTML content")
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0


class TestReportGenerationService:
    """Test the main report generation service."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Create a mock database session."""
        session = AsyncMock()
        return session
    
    @pytest.fixture
    def mock_storage(self):
        """Create a mock storage adapter."""
        storage = AsyncMock()
        storage.save_file.return_value = "reports/monthly_2024-03.pdf"
        storage.get_signed_url.return_value = "https://storage.example.com/signed-url"
        storage.file_exists.return_value = False
        return storage
    
    @pytest.fixture
    def report_service(self, mock_db_session, mock_storage):
        """Create a report service with mocked dependencies."""
        with patch('app.services.pdf_reporting.get_storage_adapter', return_value=mock_storage):
            service = ReportGenerationService(mock_db_session)
            return service
    
    @pytest.fixture
    def sample_receipts(self):
        """Create sample receipt data for testing."""
        from app.models import Receipt, User
        
        # Mock receipts
        receipts = []
        for i in range(3):
            receipt = Mock(spec=Receipt)
            receipt.id = f"receipt_{i}"
            receipt.vendor = f"Vendor {i}"
            receipt.amount = 100.00 + i * 50
            receipt.date = date(2024, 3, 1 + i)
            receipt.description = f"Test receipt {i}"
            receipt.category = "Office Supplies"
            receipt.image_url = f"https://storage.example.com/receipt_{i}.jpg"
            receipt.status = "approved"
            
            # Mock user
            user = Mock(spec=User)
            user.username = f"user{i}"
            user.email = f"user{i}@example.com"
            receipt.user = user
            
            receipts.append(receipt)
        
        return receipts
    
    @pytest.mark.asyncio
    async def test_get_monthly_receipts(self, report_service, mock_db_session, sample_receipts):
        """Test retrieving monthly receipts from database."""
        # Mock database query
        mock_result = AsyncMock()
        mock_result.all.return_value = sample_receipts
        mock_db_session.execute.return_value = mock_result
        
        receipts = await report_service._get_monthly_receipts(2024, 3)
        
        assert len(receipts) == 3
        assert receipts[0].vendor == "Vendor 0"
        assert receipts[1].amount == 150.00
        mock_db_session.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_generate_thumbnail(self, report_service):
        """Test thumbnail generation from image URL."""
        # Mock image response
        mock_image_data = b"fake image data"
        
        with patch('app.services.pdf_reporting.requests.get') as mock_get, \
             patch('app.services.pdf_reporting.Image') as mock_pil:
            
            # Mock requests response
            mock_response = Mock()
            mock_response.content = mock_image_data
            mock_response.raise_for_status = Mock()
            mock_get.return_value = mock_response
            
            # Mock PIL operations
            mock_image = Mock()
            mock_image.convert.return_value = mock_image
            mock_image.thumbnail = Mock()
            mock_pil.open.return_value = mock_image
            
            # Mock BytesIO for base64 encoding
            mock_buffer = BytesIO(b"thumbnail data")
            mock_image.save = Mock(side_effect=lambda buf, format: buf.write(b"thumbnail data"))
            
            with patch('app.services.pdf_reporting.BytesIO', return_value=mock_buffer):
                thumbnail_b64 = await report_service._generate_thumbnail("https://example.com/image.jpg")
            
            assert thumbnail_b64 is not None
            assert isinstance(thumbnail_b64, str)
            # Should be valid base64
            base64.b64decode(thumbnail_b64)
    
    @pytest.mark.asyncio
    async def test_generate_thumbnail_error_handling(self, report_service):
        """Test thumbnail generation error handling."""
        with patch('app.services.pdf_reporting.requests.get') as mock_get:
            mock_get.side_effect = Exception("Network error")
            
            thumbnail_b64 = await report_service._generate_thumbnail("https://example.com/image.jpg")
            
            # Should return None on error, not raise exception
            assert thumbnail_b64 is None
    
    @pytest.mark.asyncio
    async def test_render_html_template(self, report_service, sample_receipts):
        """Test HTML template rendering with receipt data."""
        template_data = {
            'year': 2024,
            'month': 3,
            'month_name': 'March',
            'receipts': sample_receipts,
            'summary': {
                'total_receipts': 3,
                'total_amount': 300.00,
                'vendor_count': 3,
                'category_count': 1
            },
            'vendor_breakdown': [
                {'vendor': 'Vendor 0', 'amount': 100.00, 'count': 1}
            ],
            'category_breakdown': [
                {'category': 'Office Supplies', 'amount': 300.00, 'count': 3}
            ]
        }
        
        html_content = await report_service._render_html_template(template_data)
        
        assert isinstance(html_content, str)
        assert len(html_content) > 0
        # Should contain expected content
        assert "March 2024" in html_content
        assert "Monthly Receipt Report" in html_content
        assert "Vendor 0" in html_content
        assert "Office Supplies" in html_content
    
    @pytest.mark.asyncio
    async def test_generate_monthly_report_new(self, report_service, mock_db_session, sample_receipts):
        """Test generating a new monthly report."""
        # Mock database query
        mock_result = AsyncMock()
        mock_result.all.return_value = sample_receipts
        mock_db_session.execute.return_value = mock_result
        
        # Mock PDF generation
        with patch.object(report_service, '_get_pdf_engine') as mock_get_engine:
            mock_engine = Mock()
            mock_engine.generate_pdf.return_value = b'fake pdf content'
            mock_get_engine.return_value = mock_engine
            
            result = await report_service.generate_monthly_report(2024, 3)
        
        assert result['status'] == 'completed'
        assert result['receipts_count'] == 3
        assert result['summary']['total_receipts'] == 3
        assert 'download_url' in result
        assert 'report_path' in result
        
        # Verify storage operations
        report_service.storage.save_file.assert_called_once()
        report_service.storage.get_signed_url.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_generate_monthly_report_cached(self, report_service, mock_storage):
        """Test retrieving cached monthly report."""
        # Mock existing file
        mock_storage.file_exists.return_value = True
        
        result = await report_service.generate_monthly_report(2024, 3)
        
        assert result['cached'] is True
        assert 'download_url' in result
        # Should not save new file
        mock_storage.save_file.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_generate_monthly_report_force_regenerate(self, report_service, mock_db_session, sample_receipts, mock_storage):
        """Test force regenerating existing report."""
        # Mock existing file
        mock_storage.file_exists.return_value = True
        
        # Mock database query
        mock_result = AsyncMock()
        mock_result.all.return_value = sample_receipts
        mock_db_session.execute.return_value = mock_result
        
        # Mock PDF generation
        with patch.object(report_service, '_get_pdf_engine') as mock_get_engine:
            mock_engine = Mock()
            mock_engine.generate_pdf.return_value = b'fake pdf content'
            mock_get_engine.return_value = mock_engine
            
            result = await report_service.generate_monthly_report(2024, 3, force_regenerate=True)
        
        assert result['cached'] is False
        # Should save new file even though one exists
        mock_storage.save_file.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_report_status_available(self, report_service, mock_storage):
        """Test getting status of available report."""
        mock_storage.file_exists.return_value = True
        
        status = await report_service.get_report_status(2024, 3)
        
        assert status['status'] == 'available'
        assert 'download_url' in status
        assert 'report_path' in status
    
    @pytest.mark.asyncio
    async def test_get_report_status_not_available(self, report_service, mock_storage):
        """Test getting status of non-existent report."""
        mock_storage.file_exists.return_value = False
        
        status = await report_service.get_report_status(2024, 3)
        
        assert status['status'] == 'not_available'
        assert 'download_url' not in status
    
    def test_get_pdf_engine_weasyprint_available(self, report_service):
        """Test PDF engine selection when WeasyPrint is available."""
        with patch('app.services.pdf_reporting.WeasyPrintEngine') as mock_wp_class:
            mock_engine = Mock()
            mock_engine.is_available.return_value = True
            mock_wp_class.return_value = mock_engine
            
            engine = report_service._get_pdf_engine()
            
            assert engine == mock_engine
    
    def test_get_pdf_engine_fallback_to_reportlab(self, report_service):
        """Test PDF engine fallback to ReportLab when WeasyPrint unavailable."""
        with patch('app.services.pdf_reporting.WeasyPrintEngine') as mock_wp_class, \
             patch('app.services.pdf_reporting.ReportLabEngine') as mock_rl_class:
            
            # WeasyPrint not available
            mock_wp_engine = Mock()
            mock_wp_engine.is_available.return_value = False
            mock_wp_class.return_value = mock_wp_engine
            
            # ReportLab available
            mock_rl_engine = Mock()
            mock_rl_engine.is_available.return_value = True
            mock_rl_class.return_value = mock_rl_engine
            
            engine = report_service._get_pdf_engine()
            
            assert engine == mock_rl_engine
    
    def test_get_pdf_engine_no_engines_available(self, report_service):
        """Test PDF engine selection when no engines are available."""
        with patch('app.services.pdf_reporting.WeasyPrintEngine') as mock_wp_class, \
             patch('app.services.pdf_reporting.ReportLabEngine') as mock_rl_class:
            
            # Both engines unavailable
            mock_wp_engine = Mock()
            mock_wp_engine.is_available.return_value = False
            mock_wp_class.return_value = mock_wp_engine
            
            mock_rl_engine = Mock()
            mock_rl_engine.is_available.return_value = False
            mock_rl_class.return_value = mock_rl_engine
            
            with pytest.raises(PDFGenerationError) as exc_info:
                report_service._get_pdf_engine()
            
            assert "No PDF generation engines available" in str(exc_info.value)


class TestIntegration:
    """Integration tests for PDF reporting."""
    
    @pytest.mark.asyncio
    async def test_end_to_end_pdf_generation(self):
        """Test complete PDF generation flow with ReportLab engine."""
        from app.services.pdf_reporting import ReportLabEngine
        
        # Use real ReportLab engine
        engine = ReportLabEngine()
        
        # Simple HTML content
        html_content = """
        <html>
        <body>
            <h1>Test Monthly Report</h1>
            <h2>March 2024</h2>
            <p>This is a test report generated during unit testing.</p>
            <table>
                <tr>
                    <th>Vendor</th>
                    <th>Amount</th>
                </tr>
                <tr>
                    <td>Test Vendor</td>
                    <td>$100.00</td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        # Generate PDF
        pdf_bytes = engine.generate_pdf(html_content)
        
        # Validate PDF
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
        
        # PDF should be reasonable size (at least 1KB)
        assert len(pdf_bytes) > 1024
    
    def test_pdf_bytes_length_validation(self):
        """Test that generated PDFs have valid byte length > 0."""
        from app.services.pdf_reporting import ReportLabEngine
        
        engine = ReportLabEngine()
        
        # Test with minimal HTML
        minimal_html = "<html><body><p>Test</p></body></html>"
        pdf_bytes = engine.generate_pdf(minimal_html)
        
        # Critical validation: PDF bytes length must be > 0
        assert len(pdf_bytes) > 0
        assert isinstance(pdf_bytes, bytes)
        
        # Test with more complex HTML
        complex_html = """
        <html>
        <head><title>Complex Report</title></head>
        <body>
            <h1>Monthly Report</h1>
            <div>
                <h2>Summary</h2>
                <ul>
                    <li>Total Receipts: 10</li>
                    <li>Total Amount: $1,250.00</li>
                </ul>
            </div>
            <div>
                <h2>Details</h2>
                <table border="1">
                    <thead>
                        <tr><th>Date</th><th>Vendor</th><th>Amount</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>2024-03-01</td><td>Office Depot</td><td>$50.00</td></tr>
                        <tr><td>2024-03-15</td><td>Staples</td><td>$75.00</td></tr>
                    </tbody>
                </table>
            </div>
        </body>
        </html>
        """
        
        complex_pdf_bytes = engine.generate_pdf(complex_html)
        
        # Should generate larger PDF for complex content
        assert len(complex_pdf_bytes) > len(pdf_bytes)
        assert len(complex_pdf_bytes) > 0


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])
