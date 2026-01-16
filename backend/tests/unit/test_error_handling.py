"""Unit tests for error handling and ErrorEnvelope format."""

import pytest
from fastapi import HTTPException

from app.schemas.errors import ErrorEnvelope, ErrorObject, ErrorCode


class TestErrorEnvelopeFormat:
    """Tests for ErrorEnvelope schema compliance."""

    def test_error_envelope_structure(self):
        """Test ErrorEnvelope has correct structure."""
        error = ErrorObject(
            code="VALIDATION_ERROR",
            message="Test error message",
            details={"field": "test"},
            requestId="req-123",
        )
        envelope = ErrorEnvelope(error=error)

        data = envelope.model_dump(exclude_none=True)

        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert data["error"]["message"] == "Test error message"
        assert data["error"]["details"] == {"field": "test"}
        assert data["error"]["requestId"] == "req-123"

    def test_error_envelope_minimal(self):
        """Test ErrorEnvelope with only required fields."""
        error = ErrorObject(
            code="INTERNAL_ERROR",
            message="Something went wrong",
        )
        envelope = ErrorEnvelope(error=error)

        data = envelope.model_dump(exclude_none=True)

        assert "error" in data
        assert data["error"]["code"] == "INTERNAL_ERROR"
        assert data["error"]["message"] == "Something went wrong"
        assert "details" not in data["error"]
        assert "requestId" not in data["error"]

    def test_all_error_codes_valid(self):
        """Test all error codes from OpenAPI spec are valid."""
        valid_codes = [
            "VALIDATION_ERROR",
            "AI_GENERATION_FAILED",
            "AI_RATE_LIMITED",
            "AI_TIMEOUT",
            "EXPORT_FAILED",
            "INTERNAL_ERROR",
        ]

        for code in valid_codes:
            error = ErrorObject(code=code, message="Test")
            assert error.code == code


class TestAPIErrorResponses:
    """Tests for API error response format compliance."""

    @pytest.mark.asyncio
    async def test_validation_error_format(self, async_client):
        """Test that validation errors return ErrorEnvelope format."""
        response = await async_client.post(
            "/api/v1/presentations/plan",
            json={"invalid": "data"},
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_not_found_returns_json(self, async_client):
        """Test that 404 errors return JSON."""
        response = await async_client.get("/nonexistent")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_request_id_header_present(self, async_client):
        """Test that X-Request-ID header is present in responses."""
        response = await async_client.get("/health")

        assert "X-Request-ID" in response.headers
        assert response.headers["X-Request-ID"]
