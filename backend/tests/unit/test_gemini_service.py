"""Unit tests for Gemini service."""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import asyncio

from app.services.gemini import GeminiService
from app.schemas.responses import SlidePlan


class TestGeminiServicePlanParsing:
    """Tests for plan response parsing."""

    def test_parse_valid_plan_response(self, gemini_service, sample_plan_response):
        """Test parsing a valid plan response."""
        slides = gemini_service._parse_plan_response(sample_plan_response)

        assert len(slides) == 3
        assert slides[0].id == 1
        assert slides[0].title == "Introduction"
        assert "Welcome" in slides[0].content
        assert "professional" in slides[0].visualDescription.lower()

    def test_parse_plan_response_with_extra_text(self, gemini_service):
        """Test parsing plan response with extra text around JSON."""
        response = """Here is the plan:
        [{"id": 1, "title": "Test", "content": "Content", "visualDescription": "Description"}]
        Hope this helps!"""

        slides = gemini_service._parse_plan_response(response)
        assert len(slides) == 1
        assert slides[0].title == "Test"

    def test_parse_malformed_json_raises_error(self, gemini_service, malformed_json_response):
        """Test that malformed JSON raises appropriate error."""
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            gemini_service._parse_plan_response(malformed_json_response)

        assert exc_info.value.status_code == 500
        assert "AI_GENERATION_FAILED" in str(exc_info.value.detail)

    def test_parse_empty_response_raises_error(self, gemini_service, empty_response):
        """Test that empty response raises appropriate error."""
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            gemini_service._parse_plan_response(empty_response)

        assert exc_info.value.status_code == 500

    def test_parse_plan_with_missing_fields_uses_defaults(self, gemini_service):
        """Test that missing fields use sensible defaults."""
        response = '[{"id": 1}]'
        slides = gemini_service._parse_plan_response(response)

        assert len(slides) == 1
        assert slides[0].id == 1
        assert slides[0].title == "Slide 1"
        assert slides[0].content == ""
        assert slides[0].visualDescription == ""


class TestGeminiServicePromptBuilding:
    """Tests for prompt building."""

    def test_build_plan_prompt_includes_all_params(self, gemini_service):
        """Test that plan prompt includes all required parameters."""
        prompt = gemini_service._build_plan_prompt(
            content="Test content about AI",
            slide_count=5,
            style_prompt="Modern minimalist",
            detail_level="High",
        )

        assert "Test content about AI" in prompt
        assert "5" in prompt
        assert "Modern minimalist" in prompt
        assert "High" in prompt
        assert "JSON" in prompt


class TestGeminiServiceImageGeneration:
    """Tests for image generation functionality."""

    def test_get_aspect_ratio_dimensions(self, gemini_service):
        """Test aspect ratio dimension calculation."""
        dims_16_9 = gemini_service._get_aspect_ratio_dimensions("16:9", "1K")
        assert dims_16_9[0] == 1024
        assert dims_16_9[1] == 576

        dims_1_1 = gemini_service._get_aspect_ratio_dimensions("1:1", "2K")
        assert dims_1_1[0] == 2048
        assert dims_1_1[1] == 2048


class TestGeminiServiceErrorMapping:
    """Tests for error code mapping."""

    @pytest.mark.asyncio
    async def test_rate_limit_error_mapping(self, gemini_service):
        """Test that rate limit errors are mapped correctly."""
        from fastapi import HTTPException

        with patch.object(gemini_service, '_get_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.models.generate_content.side_effect = Exception("rate limit exceeded")
            mock_get_client.return_value = mock_client

            with pytest.raises(HTTPException) as exc_info:
                await gemini_service.generate_plan(
                    content="Test",
                    slide_count=3,
                    aspect_ratio="16:9",
                    style_prompt="Modern",
                    detail_level="Normal",
                )

            assert exc_info.value.status_code == 429
            assert "AI_RATE_LIMITED" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_timeout_error_mapping(self, gemini_service):
        """Test that timeout errors are mapped correctly."""
        from fastapi import HTTPException

        with patch.object(gemini_service, '_get_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.models.generate_content.side_effect = Exception("timeout occurred")
            mock_get_client.return_value = mock_client

            with pytest.raises(HTTPException) as exc_info:
                await gemini_service.generate_plan(
                    content="Test",
                    slide_count=3,
                    aspect_ratio="16:9",
                    style_prompt="Modern",
                    detail_level="Normal",
                )

            assert exc_info.value.status_code == 504
            assert "AI_TIMEOUT" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_general_error_mapping(self, gemini_service):
        """Test that general errors are mapped to AI_GENERATION_FAILED."""
        from fastapi import HTTPException

        with patch.object(gemini_service, '_get_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.models.generate_content.side_effect = Exception("unknown error")
            mock_get_client.return_value = mock_client

            with pytest.raises(HTTPException) as exc_info:
                await gemini_service.generate_plan(
                    content="Test",
                    slide_count=3,
                    aspect_ratio="16:9",
                    style_prompt="Modern",
                    detail_level="Normal",
                )

            assert exc_info.value.status_code == 500
            assert "AI_GENERATION_FAILED" in str(exc_info.value.detail)


class TestGeminiServiceBatchGeneration:
    """Tests for batch image generation."""

    @pytest.mark.asyncio
    async def test_batch_generation_handles_partial_failures(self, gemini_service):
        """Test that batch generation handles partial failures gracefully."""
        from app.schemas.requests import BatchSlideInput

        call_count = 0

        async def mock_generate_image(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                from fastapi import HTTPException
                raise HTTPException(status_code=500, detail={"error": {"code": "AI_GENERATION_FAILED", "message": "Test error"}})
            return "data:image/png;base64,dGVzdA=="

        with patch.object(gemini_service, 'generate_image', side_effect=mock_generate_image):
            slides = [
                BatchSlideInput(id=1, prompt="Slide 1"),
                BatchSlideInput(id=2, prompt="Slide 2"),
                BatchSlideInput(id=3, prompt="Slide 3"),
            ]

            results = await gemini_service.generate_images_batch(
                slides=slides,
                aspect_ratio="16:9",
                image_size="1K",
            )

            assert len(results) == 3
            assert results[0].status == "success"
            assert results[0].imageBase64 is not None
            assert results[1].status == "error"
            assert results[1].error is not None
            assert results[2].status == "success"
