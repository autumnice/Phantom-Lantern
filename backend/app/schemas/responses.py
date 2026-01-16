"""Response schemas aligned with OpenAPI specification."""

from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    """Health check response."""

    model_config = ConfigDict(extra="forbid")
    status: str = Field(default="ok", examples=["ok"])


class SlidePlan(BaseModel):
    """Slide plan from AI generation."""

    model_config = ConfigDict(extra="forbid")
    id: int = Field(..., ge=1, description="Slide ID starting from 1")
    title: str = Field(..., description="Slide title")
    content: str = Field(..., description="Markdown content for the slide")
    visualDescription: str = Field(..., description="English prompt for image generation")


class GeneratePlanResponse(BaseModel):
    """Response for plan generation."""

    model_config = ConfigDict(extra="forbid")
    slides: List[SlidePlan]


class GenerateImageResponse(BaseModel):
    """Response for single image generation."""

    model_config = ConfigDict(extra="forbid")
    imageBase64: str = Field(..., description="Base64 encoded image or data URL")


class BatchSlideResult(BaseModel):
    """Result for a single slide in batch image generation."""

    model_config = ConfigDict(extra="forbid")
    id: int
    status: Literal["success", "error"]
    imageBase64: Optional[str] = None
    error: Optional[str] = None


class GenerateImagesBatchResponse(BaseModel):
    """Response for batch image generation."""

    model_config = ConfigDict(extra="forbid")
    slides: List[BatchSlideResult]


class ExportResponse(BaseModel):
    """Response for export operations."""

    model_config = ConfigDict(extra="forbid")
    fileUrl: str = Field(..., description="URL to download the exported file")
