"""
Smoke tests — the cheapest possible "is the app fundamentally OK?" gate.
If these fail, deployment must stop: the app can't import, boot, or serve /health.
"""
import pytest

pytestmark = pytest.mark.smoke


def test_app_imports_and_config_loads():
    """The FastAPI app and settings import cleanly with env present."""
    from app.main import app
    from app.core.config import settings

    assert app.title == "Kapruka Chat Agent API"
    # Required settings are populated (from the dummy env in conftest).
    assert settings.gemini_model
    assert settings.kapruka_mcp_url
    assert isinstance(settings.cors_origins, list)


def test_health_endpoint(client):
    """/health responds 200 and reports the tool-cache flag."""
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "healthy"
    assert "tools_cached" in body


def test_expected_routes_registered(client):
    """All the routes the frontend depends on exist in the OpenAPI schema."""
    paths = client.get("/openapi.json").json()["paths"]
    for route in ("/health", "/api/chat", "/api/categories", "/api/detect-lang",
                  "/api/gift-message", "/api/audio"):
        assert route in paths, f"missing route: {route}"


def test_system_prompt_present():
    """The agent's master prompt is non-empty and on-brand (guards accidental wipe)."""
    from app.prompts.system import KAPRUKA_AGENT_PROMPT

    assert len(KAPRUKA_AGENT_PROMPT) > 500
    assert "Kapruka" in KAPRUKA_AGENT_PROMPT
