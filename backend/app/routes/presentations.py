"""Presentation generation endpoints."""

from fastapi import APIRouter, Depends, Request

from app.schemas.requests import (
    ExportRequest,
    GenerateImageRequest,
    GenerateImagesBatchRequest,
    GeneratePlanRequest,
)
from app.schemas.responses import (
    ExportResponse,
    GenerateImageResponse,
    GenerateImagesBatchResponse,
    GeneratePlanResponse,
    SlidePlan,
    BatchSlideResult,
)
from app.services.gemini import GeminiService, get_gemini_service
from app.services.export import ExportService, get_export_service

router = APIRouter(tags=["presentations"])


@router.post("/plan", response_model=GeneratePlanResponse)
async def generate_plan(
    request: Request,
    body: GeneratePlanRequest,
    gemini_service: GeminiService = Depends(get_gemini_service),
) -> GeneratePlanResponse:
    """Generate presentation plan from content."""
    request_id = getattr(request.state, "request_id", None)
    slides = await gemini_service.generate_plan(
        content=body.content,
        slide_count=body.slideCount,
        aspect_ratio=body.aspectRatio,
        style_prompt=body.stylePrompt,
        detail_level=body.detailLevel,
        use_search=body.useSearch,
        request_id=request_id,
    )
    return GeneratePlanResponse(slides=slides)


@router.post("/generate-image", response_model=GenerateImageResponse)
async def generate_image(
    request: Request,
    body: GenerateImageRequest,
    gemini_service: GeminiService = Depends(get_gemini_service),
) -> GenerateImageResponse:
    """Generate a single image from prompt."""
    request_id = getattr(request.state, "request_id", None)
    image_base64 = await gemini_service.generate_image(
        prompt=body.prompt,
        aspect_ratio=body.aspectRatio,
        image_size=body.imageSize,
        request_id=request_id,
    )
    return GenerateImageResponse(imageBase64=image_base64)


@router.post("/generate-images", response_model=GenerateImagesBatchResponse)
async def generate_images_batch(
    request: Request,
    body: GenerateImagesBatchRequest,
    gemini_service: GeminiService = Depends(get_gemini_service),
) -> GenerateImagesBatchResponse:
    """Generate images for multiple slides in batch."""
    request_id = getattr(request.state, "request_id", None)
    results = await gemini_service.generate_images_batch(
        slides=body.slides,
        aspect_ratio=body.aspectRatio,
        image_size=body.imageSize,
        request_id=request_id,
    )
    return GenerateImagesBatchResponse(slides=results)


@router.post("/export/pptx", response_model=ExportResponse)
async def export_pptx(
    request: Request,
    body: ExportRequest,
    export_service: ExportService = Depends(get_export_service),
) -> ExportResponse:
    """Export presentation as PPTX."""
    request_id = getattr(request.state, "request_id", None)
    file_url = await export_service.export_pptx(
        slides=body.slides,
        aspect_ratio=body.aspectRatio,
        request_id=request_id,
    )
    return ExportResponse(fileUrl=file_url)


@router.post("/export/pdf", response_model=ExportResponse)
async def export_pdf(
    request: Request,
    body: ExportRequest,
    export_service: ExportService = Depends(get_export_service),
) -> ExportResponse:
    """Export presentation as PDF."""
    request_id = getattr(request.state, "request_id", None)
    file_url = await export_service.export_pdf(
        slides=body.slides,
        aspect_ratio=body.aspectRatio,
        request_id=request_id,
    )
    return ExportResponse(fileUrl=file_url)
