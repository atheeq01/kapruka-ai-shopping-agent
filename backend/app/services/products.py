"""
Parse and enrich MCP tool results into structured product/order dicts.

kapruka_search_products  → parse_search_markdown  → list[dict]
kapruka_get_product      → parse_product_detail   → dict | None
kapruka_track_order      → parse_order            → dict | None
"""
import asyncio
import json
import re
from typing import Optional

import httpx

# ── Regex patterns ────────────────────────────────────────────────────────────

_NAME_RE     = re.compile(r"^\*\*\d+\.\s*(.+?)\s*\*\*\s*$")
_ID_RE       = re.compile(r"ID:\s*`([^`]+)`")
_PRICE_RE    = re.compile(r"(?:LKR|Rs\.?)\s*([\d,]+(?:\.\d+)?)", re.I)
_URL_RE      = re.compile(r"\[View [Pp]roduct\]\(([^)]+)\)")
_CATEGORY_RE = re.compile(r'Kapruka search:\s*"([^"]+)"', re.I)
_OG_IMAGE_RE = re.compile(
    r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
# Captures inline image URLs from MCP markdown:
#   ![alt](url)  or  Image: url  or  Image URL: url
_INLINE_IMG_RE = re.compile(
    r'(?:!\[[^\]]*\]\((https?://[^)]+)\)'
    r'|[Ii]mage\s*(?:[Uu][Rr][Ll])?:\s*(https?://[^\s\n)>]+))',
    re.IGNORECASE,
)


# ── Search products parsing ────────────────────────────────────────────────────

def _category_from(md: str) -> Optional[str]:
    m = _CATEGORY_RE.search(md)
    return m.group(1).strip().title() if m else None


def parse_search_markdown(md: str) -> list[dict]:
    """Turn the search Markdown into a list of normalized product dicts."""
    if not isinstance(md, str) or "ID:" not in md:
        return []

    category = _category_from(md)
    products: list[dict] = []
    current: Optional[dict] = None
    lines = md.splitlines()

    for line in lines:
        name_m = _NAME_RE.match(line.strip())
        if name_m:
            if current and current.get("id"):
                products.append(current)
            current = {"name": name_m.group(1).strip(), "category": category}
            continue

        if current is None:
            continue

        # Try to capture inline image on any line for this product
        if "image" not in current:
            img_m = _INLINE_IMG_RE.search(line)
            if img_m:
                current["image"] = (img_m.group(1) or img_m.group(2)).strip()

        id_m = _ID_RE.search(line)
        if id_m and "id" not in current:
            current["id"] = id_m.group(1).strip()
            price_m = _PRICE_RE.search(line)
            current["price"] = float(price_m.group(1).replace(",", "")) if price_m else 0.0
            current["inStock"] = "out of stock" not in line.lower()

        url_m = _URL_RE.search(line)
        if url_m and "url" not in current:
            current["url"] = url_m.group(1).strip()

    if current and current.get("id"):
        products.append(current)

    return products


# Variant lines look like:  - 1KG — LKR 3,010 — In stock (low)
# Separator is an em/en dash (or hyphen as a fallback); the label itself never
# contains one, so splitting on the dash is safe.
_VARIANT_LINE_RE = re.compile(
    r"^[-*]\s*(?P<label>.+?)\s*[—–]\s*(?:LKR|Rs\.?)\s*(?P<price>[\d,]+(?:\.\d+)?)"
    r"(?:\s*[—–]\s*(?P<stock>.+))?$",
    re.I,
)
_WEIGHT_RE = re.compile(r"\*\*Weight\*\*:\s*(.+)", re.I)


def _parse_variants(md: str) -> list[dict]:
    """Extract the **Variants:** block (size/weight options) into structured dicts."""
    start = re.search(r"\*\*Variants:?\*\*", md, re.I)
    if not start:
        return []

    variants: list[dict] = []
    for line in md[start.end():].splitlines():
        stripped = line.strip()
        if not stripped:
            # blank line ends the block only once we've started collecting
            if variants:
                break
            continue
        if stripped.startswith("**"):  # next section heading
            break
        m = _VARIANT_LINE_RE.match(stripped)
        if not m:
            continue
        stock = (m.group("stock") or "").strip()
        variants.append({
            "label": m.group("label").strip(),
            "price": float(m.group("price").replace(",", "")),
            "inStock": "out of stock" not in stock.lower(),
        })
    return variants


# ── Single product detail parsing ─────────────────────────────────────────────

def parse_product_detail(md: str) -> Optional[dict]:
    """
    Parse kapruka_get_product markdown into a normalized product dict.
    Returns None if the text doesn't look like a product detail page.
    """
    if not isinstance(md, str) or len(md) < 30:
        return None

    product: dict = {}

    # Name — first H1/H2/bold heading
    name_m = re.search(r'^#{1,2}\s+(.+)$|^\*\*(.+?)\*\*', md, re.M)
    if name_m:
        product["name"] = (name_m.group(1) or name_m.group(2)).strip()

    # Price
    price_m = _PRICE_RE.search(md)
    if price_m:
        product["price"] = float(price_m.group(1).replace(",", ""))

    # Stock status
    if re.search(r'\bin\s*stock\b', md, re.I):
        product["inStock"] = True
    elif re.search(r'\bout\s*of\s*stock\b', md, re.I):
        product["inStock"] = False
    else:
        product["inStock"] = True

    # Images — collect all
    images = [
        (m.group(1) or m.group(2)).strip()
        for m in _INLINE_IMG_RE.finditer(md)
    ]
    if images:
        product["image"] = images[0]
        if len(images) > 1:
            product["images"] = images

    # Product URL — prefer the canonical buyonline/product link over any image URL,
    # which also lives on kapruka.com and would otherwise be matched first.
    url_m = (
        re.search(r'https?://(?:www\.)?kapruka\.com/buyonline/[^\s\n)>"]+', md)
        or re.search(r'https?://(?:www\.)?kapruka\.com/[^\s\n)>"]+', md)
    )
    if url_m:
        product["url"] = url_m.group(0).rstrip('.,)')

    # Description — grab first non-header paragraph
    for line in md.splitlines():
        line = line.strip()
        if (
            line
            and not line.startswith('#')
            and not line.startswith('*')
            and not line.startswith('|')
            and not line.startswith('-')
            and len(line) > 40
            and 'http' not in line
        ):
            product["description"] = line
            break

    # Product ID — the explicit **ID**: `...` line is authoritative; fall back to
    # the `/kid/<id>` (or legacy `/p/<id>`) segment of the product URL.
    id_m = re.search(r'\*\*ID\*\*:\s*`?([A-Za-z0-9_\-]+)`?', md)
    if id_m:
        product["id"] = id_m.group(1).strip()
    elif "url" in product:
        url_id_m = re.search(r'/(?:kid|p)/([A-Za-z0-9_\-]+)', product["url"])
        if url_id_m:
            product["id"] = url_id_m.group(1)

    # Size / weight variants (e.g. cakes: 1KG / 2KG / 4KG, each its own price)
    variants = _parse_variants(md)
    if variants:
        product["variants"] = variants
        # Base price defaults to the smallest/first variant if not already captured
        product.setdefault("price", variants[0]["price"])

    # Net weight, if listed
    weight_m = _WEIGHT_RE.search(md)
    if weight_m:
        product["weight"] = weight_m.group(1).strip()

    if not product.get("name"):
        return None

    product.setdefault("id", "product-detail")
    product.setdefault("category", "Product Detail")
    return product


# ── Order tracking parsing ────────────────────────────────────────────────────

def parse_order(md: str) -> Optional[dict]:
    """
    Parse kapruka_track_order markdown into a structured order dict.
    Returns None if the text doesn't look like an order tracking result.
    """
    if not isinstance(md, str):
        return None
    if not any(kw in md.lower() for kw in ('order', 'delivery', 'status', 'track')):
        return None

    order: dict = {}

    # Order number / reference
    ref_m = re.search(r'(?:order\s*(?:number|ref|#|id))\s*[:\s]+([A-Z0-9\-]+)', md, re.I)
    if ref_m:
        order["order_number"] = ref_m.group(1).strip()

    # Status
    status_m = re.search(r'(?:status|state)\s*[:\s]+([^\n\r|]+)', md, re.I)
    if status_m:
        order["status"] = status_m.group(1).strip().strip('*').strip()

    # Delivery date
    date_m = re.search(
        r'(?:delivery\s*date|estimated|expected)\s*[:\s]+([^\n\r|]+)',
        md, re.I,
    )
    if date_m:
        order["delivery_date"] = date_m.group(1).strip()

    # Recipient
    recip_m = re.search(r'(?:recipient|to)\s*[:\s]+([^\n\r|]+)', md, re.I)
    if recip_m:
        order["recipient"] = recip_m.group(1).strip()

    # Items — collect bullet list items
    items = re.findall(r'[-*]\s+(.+)', md)
    non_meta = [
        i.strip() for i in items
        if not any(kw in i.lower() for kw in ('status', 'date', 'delivery', 'order', 'track'))
    ]
    if non_meta:
        order["items"] = non_meta[:10]

    # Tracking info
    track_m = re.search(r'(?:tracking|courier)\s*[:\s]+([^\n\r|]+)', md, re.I)
    if track_m:
        order["tracking"] = track_m.group(1).strip()

    # Raw markdown fallback if we couldn't parse much
    if not order.get("status") and not order.get("order_number"):
        return None

    order["raw"] = md
    return order


# ── Image enrichment (fallback for products without inline image) ─────────────

async def _fetch_image(client: httpx.AsyncClient, product: dict) -> None:
    if product.get("image"):  # already has inline image — skip scrape
        return
    url = product.get("url")
    if not url:
        return
    try:
        resp = await client.get(url, follow_redirects=True)
        m = _OG_IMAGE_RE.search(resp.text)
        if m:
            product["image"] = m.group(1)
    except Exception:
        pass  # best-effort; card shows placeholder


async def enrich_with_images(products: list[dict], limit: int = 12) -> list[dict]:
    """Concurrently attach og:image to products that don't already have an inline image."""
    # Only scrape products missing an image
    targets = [p for p in products[:limit] if not p.get("image")]
    if not targets:
        return products

    headers = {"User-Agent": "Mozilla/5.0 (compatible; KaprukaAgent/1.0)"}
    async with httpx.AsyncClient(timeout=6.0, headers=headers) as client:
        await asyncio.gather(*(_fetch_image(client, p) for p in targets))
    return products
