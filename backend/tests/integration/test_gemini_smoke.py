"""Integration tests with real Gemini API.

These tests are OPTIONAL and only run when RUN_GEMINI_INTEGRATION_TESTS=1 is set.
They require a valid GEMINI_API_KEY environment variable.
"""

import os
import pytest

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_GEMINI_INTEGRATION_TESTS", "").lower() not in ("1", "true"),
    reason="Real Gemini integration tests disabled (set RUN_GEMINI_INTEGRATION_TESTS=1 to enable)",
)


@pytest.fixture
def real_gemini_service():
    """Create a GeminiService with real API key."""
    from app.services.gemini import GeminiService
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "test_api_key":
        pytest.skip("Real GEMINI_API_KEY required for integration tests")
    return GeminiService(api_key=api_key)


@pytest.mark.asyncio
async def test_real_plan_generation(real_gemini_service):
    """Smoke test: generate a real presentation plan."""
    slides = await real_gemini_service.generate_plan(
        content="Introduction to Python programming",
        slide_count=3,
        aspect_ratio="16:9",
        style_prompt="Modern tech style",
        detail_level="Normal",
    )

    assert len(slides) == 3
    for slide in slides:
        assert slide.id > 0
        assert slide.title
        assert slide.content
        assert slide.visualDescription


@pytest.mark.asyncio
async def test_real_image_generation(real_gemini_service):
    """Smoke test: generate a real image."""
    image_base64 = await real_gemini_service.generate_image(
        prompt="A simple blue gradient background for a presentation slide",
        aspect_ratio="16:9",
        image_size="1K",
    )

    assert image_base64
    assert image_base64.startswith("data:image/")
