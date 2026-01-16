"""Error schemas aligned with OpenAPI specification."""

from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


ErrorCode = Literal[
    "VALIDATION_ERROR",
    "AI_GENERATION_FAILED",
    "AI_RATE_LIMITED",
    "AI_TIMEOUT",
    "EXPORT_FAILED",
    "INTERNAL_ERROR",
]


class ErrorObject(BaseModel):
    """Error object containing error details."""

    model_config = ConfigDict(extra="forbid")
    code: ErrorCode
    message: str
    details: Optional[Dict[str, Any]] = None
    requestId: Optional[str] = None


class ErrorEnvelope(BaseModel):
    """Error envelope wrapper."""

    model_config = ConfigDict(extra="forbid")
    error: ErrorObject
