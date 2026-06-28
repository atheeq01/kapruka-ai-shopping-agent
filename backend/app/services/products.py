"""
Parse and enrich MCP tool results into structured product/order dicts.

The MCP server can return either Markdown (human-readable) or JSON (structured).
We ask it for JSON (see agent.py) because it carries far richer, cleaner data —
descriptions, ratings, stock levels, full image galleries, variants and category —
none of which survive the lossy Markdown scrape. Markdown parsers are kept as a
defensive fallback for the rare case the server hands back Markdown anyway.

kapruka_search_products  → parse_search_json / parse_search_markdown  → list[dict]
kapruka_get_product      → parse_product_detail (json|markdown)        → dict | None
kapruka_create_order     → parse_order_result                         → dict | None
kapruka_track_order      → parse_order                                → dict | None
"""
import asyncio
import json
import re
from typing import Optional, Any

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


# ── JSON parsing (preferred path) ──────────────────────────────────────────────
# The MCP server hands us structured JSON when asked. It is dramatically richer
# than the Markdown view, so these are the primary parsers.

# Mojibake the upstream catalogue occasionally emits (UTF-8 mis-decoded as latin-1).
_MOJIBAKE = {
    "â??": "'", "â?T": "'", "â?": "”", "â?": "“",
    "â?": "—", "â?": "—", "â?¦": "…", "Ã©": "é", "Â": "",
}


def _clean_text(text: Any) -> str:
    """Fix common mojibake and collapse runaway whitespace from the catalogue feed."""
    if not isinstance(text, str):
        return ""
    for bad, good in _MOJIBAKE.items():
        text = text.replace(bad, good)
    # Any remaining stray replacement artefacts → a neutral apostrophe/space.
    text = text.replace("â??", "'").replace("�", "")
    return re.sub(r"\s+", " ", text).strip()


def _clean_description(text: Any, product_id: str = "", name: str = "") -> str:
    """
    Tidy a product description: fix encoding, drop the leading SKU + weight/vendor
    boilerplate the feed prepends, and normalise whitespace into readable prose.
    """
    desc = _clean_text(text)
    if not desc:
        return ""
    # Strip a leading bare SKU token (e.g. "CAKE00KA001832 ...").
    if product_id:
        desc = re.sub(rf"^{re.escape(product_id)}\b[:\s]*", "", desc, flags=re.I)
    desc = re.sub(r"^[A-Z0-9_]{6,}\b[:\s]*", "", desc)
    # Strip a leading "Weight: 0.94 Lbs (0.42 KG)" preamble.
    desc = re.sub(r"^Weight:\s*[\d.]+\s*Lbs\s*\([^)]*\)\s*", "", desc, flags=re.I)
    return desc.strip()


def _price_amount(price: Any) -> float:
    """Accept either a {'amount': n} object or a bare number."""
    if isinstance(price, dict):
        return float(price.get("amount") or 0)
    try:
        return float(price)
    except (TypeError, ValueError):
        return 0.0


# Category slugs / type hints that drive product-specific UI affordances.
_CAKE_HINTS = ("cake", "cheesecake", "gateau")
_PERSONALIZE_HINTS = (
    "personalized", "personalised", "personalized-gifts", "customized",
    "customised", "custom-gift", "specialgifts",
)
# Phrases in a description that mean the buyer must supply a photo / custom text,
# which is only collectable on the Kapruka checkout page (not via the agent).
_PHOTO_RE = re.compile(
    r"\b(add your (?:own )?(?:photo|picture|image)|upload (?:a |your )?photo"
    r"|favou?rite photo|your photo here|add your (?:own )?message and photo)\b",
    re.I,
)


def _detect_flags(name: str, category: str, ptype: str, description: str) -> dict:
    """Derive UI hints: cakes (icing greeting) and personalised/photo gifts."""
    haystack = " ".join((name, category, ptype, description)).lower()
    is_cake = any(h in haystack for h in _CAKE_HINTS)
    personalize_cat = any(h in (category + " " + ptype).lower() for h in _PERSONALIZE_HINTS)
    needs_photo = bool(_PHOTO_RE.search(description or ""))
    needs_personalization = needs_photo or (personalize_cat and "card" in haystack)
    flags: dict = {}
    if is_cake:
        flags["isCake"] = True
    if needs_personalization:
        flags["needsPersonalization"] = True
        flags["personalizationNote"] = (
            "This is a personalised item — add your photo and custom message on the "
            "Kapruka product page before paying. (It can't be uploaded here in chat.)"
        )
    return flags


def _product_from_json(obj: dict) -> Optional[dict]:
    """Normalise one product object (search result or full detail) into our shape."""
    if not isinstance(obj, dict):
        return None
    pid = str(obj.get("id") or obj.get("product_id") or "").strip()
    name = _clean_text(obj.get("name") or obj.get("title"))
    if not name:
        return None

    category_obj = obj.get("category")
    category = ""
    if isinstance(category_obj, dict):
        category = _clean_text(category_obj.get("name"))
    elif isinstance(category_obj, str):
        category = _clean_text(category_obj)

    attributes = obj.get("attributes") if isinstance(obj.get("attributes"), dict) else {}
    ptype = str(attributes.get("subtype") or attributes.get("type") or "")

    description = _clean_description(obj.get("description"), pid, name)
    summary = _clean_text(obj.get("summary"))

    # Images: detail uses `images` (list), search uses `image_url` (single CDN URL).
    images = [str(u) for u in obj.get("images", []) if u] if isinstance(obj.get("images"), list) else []
    if not images and obj.get("image_url"):
        images = [str(obj["image_url"])]

    # Variants — only surface as real choices when there's more than the lone default.
    variants: list[dict] = []
    raw_variants = obj.get("variants") if isinstance(obj.get("variants"), list) else []
    for v in raw_variants:
        if not isinstance(v, dict):
            continue
        attrs = v.get("attributes") if isinstance(v.get("attributes"), dict) else {}
        weight = attrs.get("weight")
        label = _clean_text(v.get("name"))
        if label.lower() in ("", "default"):
            label = f"{weight} KG" if weight and str(weight) not in ("0", "0.0") else ""
        variants.append({
            "label": label,
            "price": _price_amount(v.get("price")),
            "inStock": bool(v.get("in_stock", True)),
            "weight": str(weight) if weight else None,
        })
    meaningful_variants = [v for v in variants if v["label"]]
    if len(meaningful_variants) < 2:
        meaningful_variants = []

    weight_attr = attributes.get("weight")
    weight = None
    if weight_attr and str(weight_attr) not in ("0", "0.0"):
        weight = f"{weight_attr} KG"

    product: dict = {
        "id": pid or "product-detail",
        "name": name,
        "price": _price_amount(obj.get("price")),
        "currency": (obj.get("price") or {}).get("currency", "LKR") if isinstance(obj.get("price"), dict) else "LKR",
        "inStock": bool(obj.get("in_stock", True)),
        "category": category or "Product",
        "url": obj.get("url"),
    }
    compare_at = _price_amount(obj.get("compare_at_price")) if obj.get("compare_at_price") else 0
    if compare_at and compare_at > product["price"]:
        product["compareAtPrice"] = compare_at
    if obj.get("stock_level"):
        product["stockLevel"] = str(obj["stock_level"])
    if images:
        product["image"] = images[0]
        if len(images) > 1:
            product["images"] = images
    if description:
        product["description"] = description
    if summary:
        product["summary"] = summary
    if meaningful_variants:
        product["variants"] = meaningful_variants
    if weight:
        product["weight"] = weight
    if obj.get("rating") is not None:
        try:
            product["rating"] = float(obj["rating"])
        except (TypeError, ValueError):
            pass
    if isinstance(attributes.get("vendor"), str):
        product["vendor"] = _clean_text(attributes["vendor"])

    product.update(_detect_flags(name, category, ptype, description))
    return product


def _loads(text: str) -> Optional[Any]:
    """Best-effort JSON load; tolerate code fences or leading prose."""
    if not isinstance(text, str):
        return None
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = re.sub(r"^json", "", text, flags=re.I).strip()
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r"[\[{].*[\]}]", text, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                return None
    return None


def parse_search_json(text: str) -> list[dict]:
    """Parse kapruka_search_products JSON into normalized product dicts. [] on miss."""
    data = _loads(text)
    if data is None:
        return []
    results = data.get("results") if isinstance(data, dict) else data
    if not isinstance(results, list):
        return []
    out = [_product_from_json(r) for r in results]
    return [p for p in out if p]


def parse_product_detail_json(text: str) -> Optional[dict]:
    """Parse kapruka_get_product JSON into a single normalized product dict."""
    data = _loads(text)
    if not isinstance(data, dict):
        return None
    # Some servers wrap the product under a key; unwrap the obvious cases.
    if "name" not in data and isinstance(data.get("product"), dict):
        data = data["product"]
    return _product_from_json(data)


def parse_order_result(args: dict, output: str) -> Optional[dict]:
    """
    Build a complete order-confirmation dict for the UI.

    The create_order *result* only carries pricing + the checkout link, so we merge
    it with the *arguments* the agent submitted (recipient, delivery, sender, gift
    message, per-item icing) — guaranteeing the confirmation card shows every detail,
    including the special instructions / personal message / anonymity that were
    previously dropped.
    """
    result = _loads(output)
    if not isinstance(result, dict):
        result = {}

    cart = args.get("cart") or []
    items = []
    for it in cart if isinstance(cart, list) else []:
        if not isinstance(it, dict):
            continue
        items.append({
            "product_id": it.get("product_id"),
            "name": _clean_text(it.get("name")) or it.get("product_id"),
            "quantity": it.get("quantity", 1),
            "icing_text": _clean_text(it.get("icing_text")) or None,
        })

    recipient = args.get("recipient") if isinstance(args.get("recipient"), dict) else {}
    delivery = args.get("delivery") if isinstance(args.get("delivery"), dict) else {}
    sender = args.get("sender") if isinstance(args.get("sender"), dict) else {}
    summary = result.get("summary") if isinstance(result.get("summary"), dict) else {}

    order: dict = {
        "items": items,
        "recipient": {
            "name": _clean_text(recipient.get("name")),
            "phone": recipient.get("phone"),
        },
        "delivery": {
            "address": _clean_text(delivery.get("address")),
            "city": _clean_text(delivery.get("city")),
            "location_type": delivery.get("location_type") or "house",
            "date": delivery.get("date"),
            "instructions": _clean_text(delivery.get("instructions")) or None,
        },
        "sender": {
            "name": _clean_text(sender.get("name")),
            "anonymous": bool(sender.get("anonymous", False)),
        },
        "gift_message": _clean_text(args.get("gift_message")) or None,
        "checkout_url": result.get("checkout_url"),
        "order_ref": result.get("order_ref"),
        "expires_at": result.get("expires_at"),
        "currency": summary.get("currency", "LKR"),
    }
    if summary:
        order["totals"] = {
            "items_total": summary.get("items_total"),
            "delivery_fee": summary.get("delivery_fee"),
            "addons_total": summary.get("addons_total"),
            "grand_total": summary.get("grand_total"),
        }
    # Only emit a card when we actually produced a checkout link or have line items.
    if not order["checkout_url"] and not items:
        return None
    return order


# ── Post-retrieval relevance / consistency filter ──────────────────────────────
# The upstream catalogue search is noisy: a "flowers" query can return cakes, and a
# "perfume for her" query can return men's fragrances. We must NEVER render a results
# grid whose contents contradict what the user asked for (it instantly kills trust),
# so we enforce category- and gender-consistency here, before the products reach the
# UI and before the model describes them.

# Each family maps to the keyword fragments that identify it in a product's
# name / category / description AND in the user's query.
_CATEGORY_FAMILIES: dict[str, tuple[str, ...]] = {
    "flowers":     ("flower", "bouquet", "rose", "bloom", "floral", "orchid",
                    "carnation", "lily", "anthurium", "petal", "gerbera", "tulip"),
    "cake":        ("cake", "gateau", "gâteau", "cheesecake", "cupcake", "brownie",
                    "pastry", "gateaux", "torte", "muffin"),
    "fragrance":   ("perfume", "fragrance", "cologne", "eau de", " edt", " edp",
                    "parfum", "scent", "deodorant", "body spray", "body mist",
                    "aftershave"),
    "chocolate":   ("chocolate", "choco", "praline", "truffle", "ferrero"),
    "watch":       ("watch", "wristwatch", "timepiece"),
    "jewellery":   ("jewel", "necklace", "earring", "bracelet", "pendant",
                    "bangle", "brooch"),
    "fruit":       ("fruit", "fruit basket"),
    "hamper":      ("hamper", "gift basket", "gift hamper"),
    "wine":        ("wine", "whisky", "whiskey", "liquor", "vodka", "brandy",
                    "champagne", "spirits"),
    "toys":        ("toy", "teddy", "soft toy", " doll", "plush"),
    "plant":       ("plant", "bonsai", "succulent", "sapling", "potted"),
    "card":        ("greeting card", "greeting-card"),
    "electronics": ("phone", "laptop", "headphone", "earbud", "speaker", "tablet"),
}

# Gendered recipient cues in the user's query (matched as whole words). Note "men"
# is a substring of "women", so all matching is whole-word (space-padded).
_QUERY_FEMALE = (
    "her", "she", "women", "womens", "woman", "ladies", "lady", "girl",
    "girlfriend", "gf", "wife", "mom", "mum", "mummy", "mother", "amma", "ammi",
    "sister", "daughter", "aunty", "auntie", "akka", "nangi", "female", "feminine",
    "femme", "wifey", "fiancee",
)
_QUERY_MALE = (
    "him", "his", "men", "mens", "man", "gents", "gent", "guy", "boy",
    "boyfriend", "bf", "husband", "hubby", "dad", "daddy", "father", "thaaththa",
    "thaththa", "appa", "brother", "son", "male", "masculine", "homme", "aiya",
    "ayya", "malli", "fiance", "gentleman",
)

# Gender markers as they appear in a PRODUCT's name/category/description.
_PROD_MALE = (
    " for him", "for men", "men's", "mens ", " gents", "gentlemen", "homme",
    "pour homme", " male", "masculine", "aftershave", "for boys",
)
_PROD_FEMALE = (
    " for her", "for women", "women's", "womens ", " ladies", "femme",
    "pour femme", " female", "feminine", "for girls", "for ladies",
)


def _families_in(text: str) -> set[str]:
    t = (text or "").lower()
    return {fam for fam, kws in _CATEGORY_FAMILIES.items() if any(k in t for k in kws)}


def _gender_from_query(query: str) -> Optional[str]:
    # Pad with spaces and reduce to word tokens so "women" never trips the "men" cue.
    ql = " " + re.sub(r"[^a-z]+", " ", (query or "").lower()).strip() + " "
    fem = any(f" {w} " in ql for w in _QUERY_FEMALE)
    masc = any(f" {w} " in ql for w in _QUERY_MALE)
    if fem and not masc:
        return "female"
    if masc and not fem:
        return "male"
    return None


def _gender_from_product(text: str) -> Optional[str]:
    t = " " + (text or "").lower() + " "
    masc = any(s in t for s in _PROD_MALE)
    fem = any(s in t for s in _PROD_FEMALE)
    if masc and not fem:
        return "male"
    if fem and not masc:
        return "female"
    return None


def filter_search_results(query: str, products: list[dict]) -> tuple[list[dict], list[str]]:
    """
    Enforce category + gender consistency on a search result set.

    Returns ``(kept, dropped_names)``. A product is dropped only on a genuine
    CONTRADICTION — it clearly belongs to a category the user didn't ask for, or
    its gender is the opposite of an explicitly gendered request. Products we
    can't classify are kept (under-filtering a generic gift is fine; rendering a
    cake under a "Flowers" header is not).
    """
    if not products:
        return [], []

    query_families = _families_in(query)
    query_gender = _gender_from_query(query)
    if not query_families and not query_gender:
        return list(products), []  # nothing to enforce

    kept: list[dict] = []
    dropped: list[str] = []
    for p in products:
        blob = " ".join(str(p.get(k, "")) for k in ("name", "category", "description", "summary"))

        # Category contradiction: the product has a clear family, none of which the
        # user asked for. (Unclassifiable products fall through and are kept.)
        if query_families:
            prod_families = _families_in(blob)
            if prod_families and not (prod_families & query_families):
                dropped.append(p.get("name", "item"))
                continue

        # Gender contradiction: explicit "for her"/"for him" request vs an
        # oppositely-gendered product.
        if query_gender:
            prod_gender = _gender_from_product(blob)
            if prod_gender and prod_gender != query_gender:
                dropped.append(p.get("name", "item"))
                continue

        kept.append(p)

    return kept, dropped


# ── Search products parsing (Markdown fallback) ────────────────────────────────

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
