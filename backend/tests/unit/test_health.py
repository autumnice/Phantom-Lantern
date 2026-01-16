"""Unit tests for health endpoint."""

import pytest


@pytest.mark.asyncio
async def test_health_check(async_client):
    """Test health check endpoint returns OK status."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
