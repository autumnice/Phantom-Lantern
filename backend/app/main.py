"""FastAPI application entry point."""

import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routes import health, presentations
from app.schemas.errors import ErrorEnvelope, ErrorObject


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""
    settings = get_settings()
    export_dir = Path(settings.export_dir)
    export_dir.mkdir(parents=True, exist_ok=True)
    yield


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Phantom-Lantern API",
        version="0.1.0",
        description="AI-powered presentation generator backend",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(presentations.router, prefix="/api/v1/presentations")

    export_dir = Path(settings.export_dir)
    export_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/exports", StaticFiles(directory=str(export_dir)), name="exports")

    @app.middleware("http")
    async def add_request_id(request: Request, call_next):
        """Add request ID to all requests for tracing."""
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Global exception handler to return ErrorEnvelope for all unhandled errors."""
        request_id = getattr(request.state, "request_id", None)
        error_envelope = ErrorEnvelope(
            error=ErrorObject(
                code="INTERNAL_ERROR",
                message=str(exc) if settings.debug else "An internal error occurred",
                requestId=request_id,
            )
        )
        return JSONResponse(
            status_code=500,
            content=error_envelope.model_dump(exclude_none=True),
        )

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
