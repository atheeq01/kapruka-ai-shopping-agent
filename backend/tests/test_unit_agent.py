"""
Unit tests for the pure helpers in app.services.agent — schema conversion,
argument flattening, cart normalisation, tool labels and retry classification.
No Gemini or MCP calls are exercised here.
"""
import json

import pytest

from app.services import agent
from app.services.agent import (
    _json_schema_to_gemini,
    _flatten_args,
    _normalize_cart_items,
    _force_json_format,
    _tool_label,
    _is_retryable,
    _extract_mcp_text,
)

pytestmark = pytest.mark.unit


# ── JSON-schema → Gemini schema conversion ───────────────────────────────────

def test_json_schema_to_gemini_object():
    schema = {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "search text"},
            "limit": {"type": "integer"},
        },
        "required": ["query"],
    }
    g = _json_schema_to_gemini(schema)
    assert g is not None
    assert "query" in g.properties
    assert g.required == ["query"]


def test_json_schema_to_gemini_array_items():
    schema = {"type": "array", "items": {"type": "string"}}
    g = _json_schema_to_gemini(schema)
    assert g is not None
    assert g.items is not None


def test_json_schema_to_gemini_empty():
    assert _json_schema_to_gemini({}) is None


# ── Argument flattening (handles MCP's nested `params`) ──────────────────────

def test_flatten_args_with_json_string_params():
    flat = _flatten_args({"params": json.dumps({"query": "cake", "limit": 5})})
    assert flat["query"] == "cake"
    assert flat["limit"] == 5


def test_flatten_args_with_dict_params():
    flat = _flatten_args({"params": {"query": "roses"}})
    assert flat["query"] == "roses"


def test_flatten_args_passthrough():
    flat = _flatten_args({"query": "watch"})
    assert flat["query"] == "watch"


# ── Cart item normalisation ──────────────────────────────────────────────────

def test_normalize_cart_items_valid():
    items = _normalize_cart_items({"items": [
        {"product_id": "P1", "name": "Red Velvet", "quantity": 2, "price": "3500", "size": "1KG"},
    ]})
    assert len(items) == 1
    assert items[0]["product_id"] == "P1"
    assert items[0]["quantity"] == 2
    assert items[0]["price"] == 3500.0
    assert items[0]["size"] == "1KG"


def test_normalize_cart_items_drops_invalid_and_defaults_qty():
    items = _normalize_cart_items({"items": [
        {"product_id": "P1", "name": "Valid"},          # qty defaults to 1
        {"name": "No id — dropped"},                     # missing product_id
        {"product_id": "P3"},                            # missing name
    ]})
    assert len(items) == 1
    assert items[0]["quantity"] == 1


def test_normalize_cart_items_wraps_single_dict():
    items = _normalize_cart_items({"items": {"product_id": "P1", "name": "Solo"}})
    assert len(items) == 1


def test_normalize_cart_items_empty():
    assert _normalize_cart_items({"items": []}) == []
    assert _normalize_cart_items({}) == []


# ── Forced JSON response format for rich-result tools ────────────────────────

def test_force_json_format_for_search_tool():
    args = _force_json_format("kapruka_search_products", {"params": {"query": "cake"}})
    assert args["params"]["response_format"] == "json"


def test_force_json_format_untouched_for_other_tools():
    original = {"params": {"city": "Colombo"}}
    assert _force_json_format("kapruka_check_delivery", original) == original


# ── Human-readable tool labels (drive the "thinking" UI) ─────────────────────

def test_tool_label_add_to_cart_single():
    label = _tool_label("add_to_cart", {"items": [{"product_id": "P1", "name": "Red Velvet"}]})
    assert "Red Velvet" in label


def test_tool_label_search_includes_query():
    label = _tool_label("kapruka_search_products", {"query": "birthday cake"})
    assert "birthday cake" in label


def test_tool_label_checkout_form():
    assert _tool_label("show_checkout_form", {}) == "Opening the checkout form"


# ── Retry classification ─────────────────────────────────────────────────────

@pytest.mark.parametrize("msg,expected", [
    ("503 Service Unavailable", True),
    ("model is overloaded", True),
    ("429 Too Many Requests", True),
    ("resource exhausted", True),
    ("400 invalid argument", False),
    ("permission denied", False),
])
def test_is_retryable(msg, expected):
    assert _is_retryable(Exception(msg)) is expected


# ── MCP result text extraction ───────────────────────────────────────────────

def test_extract_mcp_text_from_content():
    class _Item:
        def __init__(self, text):
            self.text = text

    class _Result:
        content = [_Item("first"), _Item("second")]

    assert _extract_mcp_text(_Result()) == "first\nsecond"


def test_local_tool_names_are_not_sent_to_mcp():
    """The synthetic browser-side tools must stay out of the MCP-forced-JSON set."""
    assert agent.ADD_TO_CART_TOOL not in agent._JSON_RESULT_TOOLS
    assert agent.SHOW_CHECKOUT_FORM_TOOL not in agent._JSON_RESULT_TOOLS
