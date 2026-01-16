"""Health check endpoint."""

from fastapi import APIRouter

from app.schemas.responses import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint.

    Returns:
        HealthResponse: Status OK response.
    """
    return HealthResponse(status="ok")
