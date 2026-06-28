"""
Shared test fixtures + environment bootstrap.

IMPORTANT: the env vars below MUST be set before any `app.*` module is imported,
because `app.core.config` instantiates `Settings()` (with required fields) at import
time. conftest.py is imported by pytest before the test modules, so setting them here
guarantees config loads with safe dummy values — no real keys, no .env file needed.
External services (Gemini, MCP) are always mocked in the API tests, so these values
are never used to make a real call.
"""
import os

os.environ.setdefault("GEMINI_API_KEY", "test-key-not-real")
os.environ.setdefault("GEMINI_MODEL", "gemini-test")
os.environ.setdefault("GEMINI_FALLBACK_MODEL", "gemini-test-fallback")
os.environ.setdefault("GEMINI_AUDIO_MODEL", "gemini-test-audio")
os.environ.setdefault("GEMINI_CLASSIFY_MODEL", "gemini-test-classify")
os.environ.setdefault("KAPRUKA_MCP_URL", "http://localhost:3200/mcp")
os.environ.setdefault("CORS_ORIGINS", "*")

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client():
    """
    A FastAPI TestClient WITHOUT lifespan startup, so the MCP tool prefetch never
    runs (and never tries to reach a real MCP server). Every endpoint that needs an
    external service is mocked per-test instead.
    """
    from app.main import app
    return TestClient(app)
