"""Request schemas aligned with OpenAPI specification."""

from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


AspectRatio = Literal["16:9", "4:3", "1:1", "3:4", "9:16"]
ImageSize = Literal["1K", "2K", "4K"]


class GeneratePlanRequest(BaseModel):
    """Request for generating presentation plan."""

    model_config = ConfigDict(extra="forbid")
    content: str = Field(..., description="User input text or URL")
    slideCount: int = Field(..., ge=1, le=20, description="Number of slides to generate")
    aspectRatio: AspectRatio
    stylePrompt: str = Field(..., description="Style prompt for the presentation")
    detailLevel: str = Field(..., description="Level of detail for content")
    useSearch: bool = Field(default=False, description="Whether to use web search")


class GenerateImageRequest(BaseModel):
    """Request for generating a single image."""

    model_config = ConfigDict(extra="forbid")
    prompt: str = Field(..., description="Image generation prompt")
    aspectRatio: AspectRatio
    imageSize: ImageSize


class BatchSlideInput(BaseModel):
    """Input for a single slide in batch image generation."""

    model_config = ConfigDict(extra="forbid")
    id: int
    prompt: str


class GenerateImagesBatchRequest(BaseModel):
    """Request for batch image generation."""

    model_config = ConfigDict(extra="forbid")
    slides: List[BatchSlideInput]
    aspectRatio: AspectRatio
    imageSize: ImageSize


class ExportSlide(BaseModel):
    """Slide data for export."""

    model_config = ConfigDict(extra="allow")
    id: int


class ExportRequest(BaseModel):
    """Request for exporting presentation."""

    model_config = ConfigDict(extra="forbid")
    slides: List[ExportSlide]
    aspectRatio: AspectRatio
