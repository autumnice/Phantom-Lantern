"""Unit tests for export service."""

import pytest
import base64
from pathlib import Path

from app.services.export import ExportService
from app.schemas.requests import ExportSlide


class TestExportServiceDimensions:
    """Tests for slide dimension calculations."""

    def test_get_slide_dimensions_16_9(self, export_service):
        """Test 16:9 aspect ratio dimensions."""
        width, height = export_service._get_slide_dimensions("16:9")
        assert width == 13.333
        assert height == 7.5

    def test_get_slide_dimensions_4_3(self, export_service):
        """Test 4:3 aspect ratio dimensions."""
        width, height = export_service._get_slide_dimensions("4:3")
        assert width == 10.0
        assert height == 7.5

    def test_get_slide_dimensions_1_1(self, export_service):
        """Test 1:1 aspect ratio dimensions."""
        width, height = export_service._get_slide_dimensions("1:1")
        assert width == 7.5
        assert height == 7.5

    def test_get_slide_dimensions_default(self, export_service):
        """Test default dimensions for unknown aspect ratio."""
        width, height = export_service._get_slide_dimensions("unknown")
        assert width == 13.333
        assert height == 7.5


class TestExportServiceImageDecoding:
    """Tests for image data decoding."""

    def test_decode_data_url(self, export_service):
        """Test decoding data URL format."""
        original = b"test image data"
        encoded = base64.b64encode(original).decode("utf-8")
        data_url = f"data:image/png;base64,{encoded}"

        decoded = export_service._decode_image_data(data_url)
        assert decoded == original

    def test_decode_raw_base64(self, export_service):
        """Test decoding raw base64 string."""
        original = b"test image data"
        encoded = base64.b64encode(original).decode("utf-8")

        decoded = export_service._decode_image_data(encoded)
        assert decoded == original


class TestExportServicePPTX:
    """Tests for PPTX export."""

    @pytest.mark.asyncio
    async def test_export_pptx_creates_file(self, export_service):
        """Test that PPTX export creates a file."""
        slides = [
            ExportSlide(id=1, title="Test Slide", content="Test content"),
        ]

        file_url = await export_service.export_pptx(
            slides=slides,
            aspect_ratio="16:9",
        )

        assert file_url.startswith("/exports/")
        assert file_url.endswith(".pptx")

        filename = file_url.split("/")[-1]
        filepath = export_service.export_dir / filename
        assert filepath.exists()

    @pytest.mark.asyncio
    async def test_export_pptx_multiple_slides(self, export_service):
        """Test PPTX export with multiple slides."""
        slides = [
            ExportSlide(id=1, title="Slide 1", content="Content 1"),
            ExportSlide(id=2, title="Slide 2", content="Content 2"),
            ExportSlide(id=3, title="Slide 3", content="Content 3"),
        ]

        file_url = await export_service.export_pptx(
            slides=slides,
            aspect_ratio="4:3",
        )

        assert file_url.startswith("/exports/")
        filename = file_url.split("/")[-1]
        filepath = export_service.export_dir / filename
        assert filepath.exists()


class TestExportServicePDF:
    """Tests for PDF export."""

    @pytest.mark.asyncio
    async def test_export_pdf_creates_file(self, export_service):
        """Test that PDF export creates a file."""
        slides = [
            ExportSlide(id=1, title="Test Slide", content="Test content"),
        ]

        file_url = await export_service.export_pdf(
            slides=slides,
            aspect_ratio="16:9",
        )

        assert file_url.startswith("/exports/")
        assert file_url.endswith(".pdf")

        filename = file_url.split("/")[-1]
        filepath = export_service.export_dir / filename
        assert filepath.exists()

    @pytest.mark.asyncio
    async def test_export_pdf_multiple_slides(self, export_service):
        """Test PDF export with multiple slides."""
        slides = [
            ExportSlide(id=1, title="Slide 1", content="Content 1"),
            ExportSlide(id=2, title="Slide 2", content="Content 2"),
        ]

        file_url = await export_service.export_pdf(
            slides=slides,
            aspect_ratio="1:1",
        )

        assert file_url.startswith("/exports/")
        filename = file_url.split("/")[-1]
        filepath = export_service.export_dir / filename
        assert filepath.exists()


class TestExportServiceErrorHandling:
    """Tests for export error handling."""

    @pytest.mark.asyncio
    async def test_export_with_invalid_image_data_continues(self, export_service):
        """Test that export continues even with invalid image data."""
        slides = [
            ExportSlide(id=1, title="Test", content="Content", imageBase64="invalid_base64"),
        ]

        file_url = await export_service.export_pptx(
            slides=slides,
            aspect_ratio="16:9",
        )

        assert file_url.startswith("/exports/")
