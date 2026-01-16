"""Shared error handling utilities."""

from typing import Optional

from fastapi import HTTPException

from app.schemas.errors import ErrorEnvelope, ErrorObject


def create_error_response(
    code: str,
    message: str,
    status_code: int,
    request_id: Optional[str] = None
) -> HTTPException:
    """Create HTTPException with ErrorEnvelope body.

    Args:
        code: Error code from ErrorCode enum
        message: Human-readable error message
        status_code: HTTP status code
        request_id: Optional request ID for tracing

    Returns:
        HTTPException with ErrorEnvelope in detail

    Raises:
        HTTPException: Always raises with ErrorEnvelope body
    """
    error_envelope = ErrorEnvelope(
        error=ErrorObject(
            code=code,
            message=message,
            requestId=request_id,
        )
    )
    raise HTTPException(
        status_code=status_code,
        detail=error_envelope.model_dump(exclude_none=True),
    )
