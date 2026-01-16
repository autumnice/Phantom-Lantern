"""Pytest configuration and fixtures."""

import os
import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from httpx import AsyncClient, ASGITransport

os.environ["GEMINI_API_KEY"] = "test_api_key"
os.environ["EXPORT_DIR"] = "/tmp/test_exports"

from app.main import app
from app.services.gemini import GeminiService
from app.services.export import ExportService


@pytest.fixture
def mock_gemini_client():
    """Create a mock Gemini client."""
    client = MagicMock()
    return client


@pytest.fixture
def gemini_service(mock_gemini_client):
    """Create a GeminiService with mocked client."""
    service = GeminiService(api_key="test_api_key")
    service._client = mock_gemini_client
    return service


@pytest.fixture
def export_service(tmp_path):
    """Create an ExportService with temporary directory."""
    return ExportService(export_dir=str(tmp_path))


@pytest.fixture
async def async_client():
    """Create an async HTTP client for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def sample_plan_response():
    """Sample plan response from Gemini."""
    return """[
        {
            "id": 1,
            "title": "Introduction",
            "content": "- Welcome to the presentation\\n- Overview of topics",
            "visualDescription": "A professional business background with abstract geometric shapes"
        },
        {
            "id": 2,
            "title": "Main Topic",
            "content": "- Key point 1\\n- Key point 2\\n- Key point 3",
            "visualDescription": "A modern infographic style visualization with data points"
        },
        {
            "id": 3,
            "title": "Conclusion",
            "content": "- Summary of key findings\\n- Call to action",
            "visualDescription": "A closing slide with a thank you message and contact information"
        }
    ]"""


@pytest.fixture
def malformed_json_response():
    """Malformed JSON response for testing error handling."""
    return "This is not valid JSON {broken"


@pytest.fixture
def empty_response():
    """Empty response for testing error handling."""
    return ""


@pytest.fixture
def sample_slides_for_export():
    """Sample slides data for export testing."""
    return [
        {
            "id": 1,
            "title": "Test Slide 1",
            "content": "Content for slide 1",
            "imageBase64": None,
        },
        {
            "id": 2,
            "title": "Test Slide 2",
            "content": "Content for slide 2",
            "imageBase64": None,
        },
    ]
