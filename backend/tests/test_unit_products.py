"""
Unit tests for app.services.products — the pure parse/normalise/filter functions
that turn MCP tool output into the structured dicts the frontend renders.
"""
import json

import pytest

from app.services.products import (
    parse_search_json,
    parse_product_detail_json,
    parse_search_markdown,
    parse_product_detail,
    parse_order,
    parse_order_result,
    filter_search_results,
    _clean_text,
    _gender_from_query,
)

pytestmark = pytest.mark.unit


# ── JSON search parsing ──────────────────────────────────────────────────────

def test_parse_search_json_basic():
    payload = json.dumps({"results": [
        {
            "id": "FLW001",
            "name": "Red Rose Bouquet",
            "price": {"amount": 3500, "currency": "LKR"},
            "in_stock": True,
            "category": {"name": "Flowers"},
            "image_url": "https://cdn.example.com/rose.jpg",
        }
    ]})
    out = parse_search_json(payload)
    assert len(out) == 1
    p = out[0]
    assert p["id"] == "FLW001"
    assert p["name"] == "Red Rose Bouquet"
    assert p["price"] == 3500
    assert p["image"] == "https://cdn.example.com/rose.jpg"
    assert p["category"] == "Flowers"


def test_parse_search_json_handles_code_fence():
    payload = "```json\n" + json.dumps({"results": [
        {"id": "X1", "name": "Item", "price": 100}
    ]}) + "\n```"
    out = parse_search_json(payload)
    assert out and out[0]["id"] == "X1"


def test_parse_search_json_variants_surface_only_when_multiple():
    payload = json.dumps({"results": [{
        "id": "CAKE1", "name": "Marble Cake", "price": {"amount": 3000},
        "variants": [
            {"name": "1KG", "price": {"amount": 3000}, "attributes": {"weight": "1"}},
            {"name": "2KG", "price": {"amount": 5500}, "attributes": {"weight": "2"}},
        ],
    }]})
    p = parse_search_json(payload)[0]
    assert "variants" in p and len(p["variants"]) == 2
    assert p["variants"][1]["label"] == "2KG"


def test_parse_search_json_empty_on_garbage():
    assert parse_search_json("not json at all") == []
    assert parse_search_json("") == []


def test_parse_search_json_price_from_single_variant():
    """A product whose price only lives on a lone default variant must not be Rs. 0."""
    payload = json.dumps({"results": [{
        "id": "FLW6", "name": "6 Red Rose Bouquet With Elegant Wrapping",
        "price": {"amount": 0},  # top-level price missing/zero
        "variants": [
            {"name": "Default", "price": {"amount": 4500}, "attributes": {"weight": "0"}},
        ],
    }]})
    p = parse_search_json(payload)[0]
    assert p["price"] == 4500
    # A single (default) variant should not surface as a size choice.
    assert "variants" not in p


def test_parse_search_json_price_string_and_alt_key():
    payload = json.dumps({"results": [{
        "id": "X2", "name": "Comma Priced", "price": None, "selling_price": "Rs. 3,500.00",
    }]})
    assert parse_search_json(payload)[0]["price"] == 3500


def test_price_amount_handles_string_and_nested():
    from app.services.products import _price_amount
    assert _price_amount("LKR 12,345.50") == 12345.5
    assert _price_amount({"value": "2,000"}) == 2000
    assert _price_amount(None) == 0.0
    assert _price_amount("free") == 0.0


# ── Product detail parsing ───────────────────────────────────────────────────

def test_parse_product_detail_json_unwraps_product_key():
    payload = json.dumps({"product": {"id": "P9", "name": "Photo Mug", "price": 1500}})
    p = parse_product_detail_json(payload)
    assert p and p["id"] == "P9" and p["name"] == "Photo Mug"


def test_parse_product_detail_markdown():
    md = (
        "# Marble Butter Cake\n"
        "**ID**: `CAKE123`\n"
        "Price: LKR 3,010\n"
        "In stock\n"
        "A rich, buttery marble cake baked fresh and delivered island-wide today.\n"
        "https://www.kapruka.com/buyonline/cake-123\n"
    )
    p = parse_product_detail(md)
    assert p["name"] == "Marble Butter Cake"
    assert p["id"] == "CAKE123"
    assert p["price"] == 3010
    assert p["inStock"] is True
    assert "kapruka.com/buyonline" in p["url"]


# ── Markdown search fallback ─────────────────────────────────────────────────

def test_parse_search_markdown():
    md = (
        'Kapruka search: "flowers"\n\n'
        "**1. Red Rose Bouquet**\n"
        "ID: `FLOWER001` — LKR 3,500 — In stock\n"
        "[View Product](https://kapruka.com/p/flower001)\n"
    )
    out = parse_search_markdown(md)
    assert len(out) == 1
    assert out[0]["id"] == "FLOWER001"
    assert out[0]["price"] == 3500
    assert out[0]["category"] == "Flowers"


# ── Relevance / consistency filter ───────────────────────────────────────────

def test_filter_drops_off_category():
    products = [
        {"name": "Red Rose Bouquet", "category": "Flowers"},
        {"name": "Chocolate Fudge Cake", "category": "Cakes"},
    ]
    kept, dropped = filter_search_results("flowers for her", products)
    names = [p["name"] for p in kept]
    assert "Red Rose Bouquet" in names
    assert "Chocolate Fudge Cake" not in names
    assert "Chocolate Fudge Cake" in dropped


def test_filter_drops_opposite_gender():
    products = [
        {"name": "Eau de Parfum for Women", "category": "Fragrance"},
        {"name": "Aftershave Cologne for Men", "category": "Fragrance"},
    ]
    kept, dropped = filter_search_results("perfume for her", products)
    names = [p["name"] for p in kept]
    assert "Eau de Parfum for Women" in names
    assert "Aftershave Cologne for Men" not in names


def test_filter_keeps_unclassifiable_and_noops_without_intent():
    products = [{"name": "Mystery Gift Box", "category": "Gifts"}]
    # No category/gender intent in the query → return everything untouched.
    kept, dropped = filter_search_results("something nice", products)
    assert kept == products and dropped == []


@pytest.mark.parametrize("query,expected", [
    ("gift for her", "female"),
    ("watch for him", "male"),
    ("perfume for women", "female"),
    ("shirt for men", "male"),
    ("a nice gift", None),            # no gender cue
    ("gift for him and her", None),   # both cues → ambiguous
])
def test_gender_from_query(query, expected):
    assert _gender_from_query(query) == expected


# ── Order parsing ────────────────────────────────────────────────────────────

def test_parse_order_tracking():
    md = "Order Number: KAP12345\nStatus: Shipped\nDelivery Date: 2026-07-01\n"
    order = parse_order(md)
    assert order["order_number"] == "KAP12345"
    assert order["status"] == "Shipped"


def test_parse_order_returns_none_when_irrelevant():
    assert parse_order("just some random prose with nothing useful") is None


def test_parse_order_result_merges_args_and_output():
    args = {
        "cart": [{"product_id": "P1", "name": "Red Velvet 1KG", "quantity": 2}],
        "recipient": {"name": "Nimal", "phone": "0771234567"},
        "delivery": {"address": "12 Main St", "city": "Colombo", "date": "2026-07-01"},
        "sender": {"name": "Kamal", "anonymous": False},
        "gift_message": "Happy birthday!",
    }
    output = json.dumps({
        "checkout_url": "https://kapruka.com/checkout/abc",
        "order_ref": "ORD-1",
        "summary": {"grand_total": 7000, "currency": "LKR"},
    })
    order = parse_order_result(args, output)
    assert order["recipient"]["name"] == "Nimal"
    assert order["delivery"]["city"] == "Colombo"
    assert order["gift_message"] == "Happy birthday!"
    assert order["checkout_url"].endswith("/abc")
    assert order["totals"]["grand_total"] == 7000


def test_parse_order_result_none_when_empty():
    assert parse_order_result({}, "not json") is None


# ── Text cleaning ────────────────────────────────────────────────────────────

def test_clean_text_collapses_whitespace_and_handles_non_str():
    assert _clean_text("  hello   world \n") == "hello world"
    assert _clean_text(None) == ""
    assert _clean_text(12345) == ""
