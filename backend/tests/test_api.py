"""
API endpoint tests using FastAPI's TestClient.

Every external dependency (Gemini, the MCP server) is mocked, so these run fully
offline and deterministically — they validate routing, request/response schemas,
SSE streaming and error handling, NOT the third-party services themselves.
"""
import json
from contextlib import asynccontextmanager

import pytest

pytestmark = pytest.mark.api


# ── /api/detect-lang (pure, no mocking needed) ───────────────────────────────

@pytest.mark.parametrize("text,expected", [
    ("I want a birthday cake", "en"),
    ("මට කේක් එකක් ඕනේ", "si"),
    ("எனக்கு கேக் வேண்டும்", "ta"),
])
def test_detect_lang(client, text, expected):
    resp = client.post("/api/detect-lang", json={"text": text})
    assert resp.status_code == 200
    assert resp.json()["detected_lang"] == expected


def test_detect_lang_empty_defaults_english(client):
    resp = client.post("/api/detect-lang", json={"text": "   "})
    assert resp.status_code == 200
    assert resp.json()["detected_lang"] == "en"


# ── /api/chat (SSE; process_chat mocked) ─────────────────────────────────────

def test_chat_streams_sse(client, monkeypatch):
    async def fake_process_chat(messages, cart, language_preference):
        yield 'data: {"type": "detected_lang", "lang": "en"}\n\n'
        yield 'data: {"type": "text", "content": "Hello!"}\n\n'
        yield 'data: {"type": "done"}\n\n'

    import app.api.chat as chat_module
    monkeypatch.setattr(chat_module, "process_chat", fake_process_chat)

    resp = client.post("/api/chat", json={
        "messages": [{"role": "user", "content": "hi"}],
        "cart": [],
        "language_preference": "auto",
    })
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")
    body = resp.text
    assert '"type": "text"' in body
    assert '"type": "done"' in body


def test_chat_requires_messages(client):
    """Missing the required `messages` field → 422 validation error."""
    resp = client.post("/api/chat", json={"cart": []})
    assert resp.status_code == 422


# ── /api/gift-message (Gemini mocked) ────────────────────────────────────────

class _FakeResp:
    def __init__(self, text):
        self.text = text


class _FakeModels:
    def __init__(self, text):
        self._text = text

    async def generate_content(self, *args, **kwargs):
        return _FakeResp(self._text)


class _FakeAio:
    def __init__(self, text):
        self.models = _FakeModels(text)


class _FakeClient:
    def __init__(self, text):
        self.aio = _FakeAio(text)


def test_gift_message_success(client, monkeypatch):
    import app.services.agent as agent_module
    monkeypatch.setattr(
        agent_module, "_get_client",
        lambda: _FakeClient("Wishing you the happiest birthday, Nimal!\n— Kamal"),
    )
    resp = client.post("/api/gift-message", json={
        "recipient_name": "Nimal",
        "sender_name": "Kamal",
        "occasion": "birthday",
        "language": "EN",
    })
    assert resp.status_code == 200
    assert "Nimal" in resp.json()["message"]


def test_gift_message_handles_failure(client, monkeypatch):
    import app.services.agent as agent_module

    def _boom():
        raise RuntimeError("gemini down")

    monkeypatch.setattr(agent_module, "_get_client", _boom)
    resp = client.post("/api/gift-message", json={"occasion": "birthday"})
    assert resp.status_code == 500


# ── /api/categories (MCP mocked) ─────────────────────────────────────────────

class _FakeMcpItem:
    def __init__(self, text):
        self.text = text


class _FakeMcpResult:
    def __init__(self, text):
        self.content = [_FakeMcpItem(text)]


class _FakeSession:
    def __init__(self, payload):
        self._payload = payload

    async def call_tool(self, name, arguments=None):
        return _FakeMcpResult(self._payload)


def test_categories_success(client, monkeypatch):
    import app.api.chat as chat_module

    payload = json.dumps({"categories": [{"name": "Flowers"}, {"name": "Cakes"}]})

    @asynccontextmanager
    async def fake_new_session():
        yield _FakeSession(payload)

    monkeypatch.setattr(chat_module.mcp_client, "new_session", fake_new_session)

    resp = client.get("/api/categories")
    assert resp.status_code == 200
    names = [c["name"] for c in resp.json()["categories"]]
    assert "Flowers" in names and "Cakes" in names


def test_categories_falls_back_when_mcp_down(client, monkeypatch):
    import app.api.chat as chat_module

    @asynccontextmanager
    async def broken_new_session():
        raise RuntimeError("mcp unreachable")
        yield  # pragma: no cover

    monkeypatch.setattr(chat_module.mcp_client, "new_session", broken_new_session)

    resp = client.get("/api/categories")
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("fallback") is True
    assert len(body["categories"]) > 0  # curated list keeps the UI non-empty
