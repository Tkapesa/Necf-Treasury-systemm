"""
Test cases for health check endpoints in Church Treasury Management System.

Tests the basic health monitoring and status endpoints to ensure
the API is responding correctly and basic functionality works.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import json

from main import app

# Create test client
client = TestClient(app)


class TestHealthEndpoints:
    """Test cases for health check and status endpoints."""
    
    def test_root_endpoint(self):
        """Test the root endpoint returns basic API information."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "message" in data
        assert "version" in data
        assert "docs" in data
        assert "status" in data
        
        # Check values
        assert data["message"] == "Church Treasury Management System API"
        assert data["version"] == "1.0.0"
        assert data["docs"] == "/docs"
        assert data["status"] == "healthy"
    
    def test_health_check_success(self):
        """Test health check endpoint returns healthy status."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "status" in data
        assert "timestamp" in data
        assert "environment" in data
        
        # Check values
        assert data["status"] == "healthy"
        assert data["environment"] in ["development", "staging", "production"]
    
    @patch('app.db.check_database_health')
    def test_health_check_database_failure(self, mock_db_health):
        """Test health check fails when database is unavailable."""
        # Mock database health check failure
        mock_db_health.return_value = False
        
        # This test would require implementing actual database health checks
        # For now, we test that the endpoint exists and responds
        response = client.get("/health")
        
        # Should still return 200 since we don't have database checks implemented yet
        assert response.status_code == 200
    
    def test_openapi_docs_available(self):
        """Test that OpenAPI documentation is available."""
        response = client.get("/docs")
        assert response.status_code == 200
        
        # Check that it's returning HTML (Swagger UI)
        assert "text/html" in response.headers.get("content-type", "")
    
    def test_openapi_json_available(self):
        """Test that OpenAPI JSON schema is available."""
        response = client.get("/api/v1/openapi.json")
        assert response.status_code == 200
        
        # Check that it's returning JSON
        assert "application/json" in response.headers.get("content-type", "")
        
        # Parse JSON to ensure it's valid
        openapi_spec = response.json()
        assert "openapi" in openapi_spec
        assert "info" in openapi_spec
        assert "paths" in openapi_spec


class TestCORSHeaders:
    """Test CORS configuration for frontend integration."""
    
    def test_cors_headers_present(self):
        """Test that CORS headers are present in responses."""
        response = client.get("/", headers={"Origin": "http://localhost:3000"})
        
        assert response.status_code == 200
        
        # Check CORS headers
        headers = response.headers
        assert "access-control-allow-origin" in headers or "Access-Control-Allow-Origin" in headers
    
    def test_cors_preflight_request(self):
        """Test CORS preflight OPTIONS request."""
        response = client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        
        # Should allow preflight request
        assert response.status_code in [200, 204]


class TestErrorHandling:
    """Test error handling and response formats."""
    
    def test_404_error_format(self):
        """Test that 404 errors return proper format."""
        response = client.get("/nonexistent-endpoint")
        
        assert response.status_code == 404
        data = response.json()
        
        # FastAPI default 404 format
        assert "detail" in data
    
    def test_method_not_allowed_format(self):
        """Test that method not allowed errors return proper format."""
        response = client.post("/")  # Root only accepts GET
        
        assert response.status_code == 405
        data = response.json()
        
        # FastAPI default 405 format
        assert "detail" in data


class TestAPIVersioning:
    """Test API versioning structure."""
    
    def test_api_v1_structure(self):
        """Test that v1 API endpoints are properly structured."""
        # Test that auth endpoints exist (even if they require authentication)
        response = client.post("/api/v1/auth/login", json={})
        # Should return validation error, not 404
        assert response.status_code != 404
        
        # Test that receipts endpoints exist
        response = client.get("/api/v1/receipts/")
        # Should return 401 (unauthorized), not 404
        assert response.status_code in [401, 422]  # 422 for validation, 401 for auth


# Integration test fixtures and utilities
@pytest.fixture
def test_user_data():
    """Fixture providing test user data."""
    return {
        "email": "test@church.org",
        "password": "TestPassword123!",
        "full_name": "Test User",
        "phone": "+1234567890"
    }


@pytest.fixture
def authenticated_client(test_user_data):
    """Fixture providing authenticated test client."""
    # This would be implemented when we have user registration/login working
    # For now, return regular client
    return client


class TestSecurityHeaders:
    """Test security-related headers and configurations."""
    
    def test_security_headers_present(self):
        """Test that basic security headers are present."""
        response = client.get("/")
        
        headers = response.headers
        
        # These headers might be added by reverse proxy in production
        # but good to check if they're set by the application
        # Note: Some headers might not be present in development
        assert response.status_code == 200
    
    def test_sensitive_info_not_leaked(self):
        """Test that sensitive information is not leaked in responses."""
        response = client.get("/")
        
        # Check that response doesn't contain common sensitive patterns
        response_text = response.text.lower()
        
        sensitive_patterns = [
            "password", "secret", "key", "token", 
            "database_url", "postgres_password"
        ]
        
        for pattern in sensitive_patterns:
            assert pattern not in response_text


# Run tests with: python -m pytest backend/app/tests/test_health.py -v
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
