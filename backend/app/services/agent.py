import asyncio
import json
from contextlib import AsyncExitStack
from typing import AsyncGenerator, Optional
from google import genai
from google.genai import types
from mcp.client.session import ClientSession
from app.mcp.client import mcp_client
from app.prompts.system import KAPRUKA_AGENT_PROMPT
from app.services.products import (
    parse_search_markdown,
    parse_search_json,
    enrich_with_images,
    parse_product_detail,
    parse_product_detail_json,
    parse_order,
    parse_order_result,
)
from app.services.language import detect_language, language_directive
from app.core.config import settings

MAX_ITERATIONS = 10
MAX_RETRIES = 3
RETRY_DELAYS = [1.0, 3.0, 7.0]


def _is_retryable(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(k in msg for k in ('503', 'unavailable', 'overloaded', 'resource exhausted', '429', 'quota'))

_client: Optional[genai.Client] = None

def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


# ── Schema conversion ──────────────────────────────────────────────────────────

_TYPE_MAP = {
    "string":  types.Type.STRING,
    "number":  types.Type.NUMBER,
    "integer": types.Type.INTEGER,
    "boolean": types.Type.BOOLEAN,
    "array":   types.Type.ARRAY,
    "object":  types.Type.OBJECT,
}

def _json_schema_to_gemini(schema: dict) -> Optional[types.Schema]:
    if not schema:
        return None
    raw_type = schema.get("type", "object" if "properties" in schema else "string")
    gemini_type = _TYPE_MAP.get(raw_type, types.Type.STRING)
    kwargs: dict = {
        "type": gemini_type,
        "description": schema.get("description", ""),
    }
    if schema.get("properties"):
        kwargs["properties"] = {
            k: _json_schema_to_gemini(v)
            for k, v in schema["properties"].items()
        }
    if schema.get("required"):
        kwargs["required"] = schema["required"]
    if gemini_type == types.Type.ARRAY and schema.get("items"):
        kwargs["items"] = _json_schema_to_gemini(schema["items"])
    return types.Schema(**kwargs)


def _mcp_tools_to_gemini(mcp_tools: list) -> list[types.Tool]:
    declarations = []
    for tool in mcp_tools:
        try:
            declarations.append(
                types.FunctionDeclaration(
                    name=tool.name,
                    description=tool.description or "",
                    parameters=_json_schema_to_gemini(tool.inputSchema or {}),
                )
            )
        except Exception as e:
            print(f"[agent] Skipping tool '{tool.name}': {e}")
    return [types.Tool(function_declarations=declarations)] if declarations else []


# ── Tool declaration cache ──────────────────────────────────────────────────────
# The MCP tool catalogue is identical for every user and effectively static, so we
# fetch + convert it once and share the result. This keeps per-request work minimal
# and means chat turns that don't call any tool open zero MCP connections.

_tools_lock = asyncio.Lock()
_cached_gemini_tools: Optional[list[types.Tool]] = None


async def get_gemini_tools() -> list[types.Tool]:
    """Return the cached Gemini tool declarations, fetching them once if needed."""
    global _cached_gemini_tools
    if _cached_gemini_tools is not None:
        return _cached_gemini_tools
    async with _tools_lock:
        if _cached_gemini_tools is not None:  # another task filled it while we waited
            return _cached_gemini_tools
        mcp_tools = await mcp_client.list_tools()
        _cached_gemini_tools = _mcp_tools_to_gemini(mcp_tools)
        print(f"[agent] {len(mcp_tools)} MCP tools loaded and cached")
    return _cached_gemini_tools


def tools_ready() -> bool:
    """Whether the tool catalogue has been successfully cached (for health checks)."""
    return _cached_gemini_tools is not None


# ── MCP result extraction ──────────────────────────────────────────────────────

def _extract_mcp_text(result) -> str:
    if hasattr(result, "content"):
        parts = []
        for item in result.content:
            if hasattr(item, "text"):
                parts.append(item.text)
            elif hasattr(item, "json"):
                parts.append(json.dumps(item.json))
        return "\n".join(parts) or str(result)
    return str(result)


# ── SSE helper ─────────────────────────────────────────────────────────────────

def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


# ── Tool label helpers ─────────────────────────────────────────────────────────

def _flatten_args(args: dict) -> dict:
    flat = dict(args)
    params = flat.get("params")
    if isinstance(params, str):
        try:
            flat.update(json.loads(params))
        except Exception:
            pass
    elif isinstance(params, dict):
        flat.update(params)
    return flat


# Tools whose results we parse as structured JSON. We force the JSON response
# format regardless of what the model requested, so the parsers always get the
# rich, clean payload (descriptions, ratings, image galleries, variants).
_JSON_RESULT_TOOLS = {
    "kapruka_search_products",
    "kapruka_get_product",
    "kapruka_create_order",
}


def _force_json_format(name: str, args: dict) -> dict:
    """Return a copy of args with response_format='json' for JSON-result tools."""
    if name not in _JSON_RESULT_TOOLS:
        return args
    args = dict(args)
    params = args.get("params")
    if isinstance(params, dict):
        params = dict(params)
        params["response_format"] = "json"
        args["params"] = params
    else:
        args["response_format"] = "json"
    return args


def _tool_label(name: str, args: dict) -> str:
    args = _flatten_args(args)
    if name == "kapruka_search_products":
        query = args.get("query") or args.get("q") or args.get("keyword")
        return f'Searching the catalog for "{query}"' if query else "Searching the Kapruka catalog"
    if name == "kapruka_get_product":
        pid = args.get("product_id") or args.get("id")
        return f"Loading product {pid}" if pid else "Loading product details"
    if name == "kapruka_check_delivery":
        city = args.get("city") or args.get("location") or args.get("address")
        return f"Checking delivery to {city}" if city else "Checking delivery availability"
    if name == "kapruka_track_order":
        order_num = args.get("order_number") or args.get("order_id")
        return f"Tracking order {order_num}" if order_num else "Tracking your order"
    if name in ("kapruka_create_order",) or "order" in name:
        return "Placing your order"
    if name == "kapruka_list_categories":
        return "Browsing product categories"
    if name == "kapruka_list_delivery_cities":
        return "Looking up delivery cities"
    pretty = name.replace("kapruka_", "").replace("_", " ").strip().capitalize()
    return f"Running {pretty}" if pretty else "Working"


# ── Main agentic loop ──────────────────────────────────────────────────────────

async def process_chat(
    messages: list,
    cart: list,
    language_preference: str,
) -> AsyncGenerator[str, None]:
    """
    Drives the Gemini ↔ MCP agentic loop and yields SSE-formatted events.

    Event shapes:
      {"type": "detected_lang", "lang": "si-rom"}
      {"type": "text",          "content": "..."}
      {"type": "thought",       "content": "..."}
      {"type": "tool_use",      "name": "...", "args": {...}, "label": "..."}
      {"type": "tool_result",   "name": "..."}
      {"type": "products",      "items": [...]}
      {"type": "order",         "order": {...}}
      {"type": "warning",       "content": "..."}
      {"type": "error",         "content": "..."}
      {"type": "done"}
    """
    client = _get_client()

    # ── 1. Detect language from the last user message ──────────────────────────
    last_user_text = ""
    for msg in reversed(messages):
        if getattr(msg, 'role', None) == 'user' or (isinstance(msg, dict) and msg.get('role') == 'user'):
            last_user_text = getattr(msg, 'content', None) or msg.get('content', '')
            break

    detected_lang = "en"
    if last_user_text.strip():
        try:
            detected_lang = await detect_language(last_user_text)
        except Exception as e:
            print(f"[agent] Language detection failed: {e}")

    yield _sse({"type": "detected_lang", "lang": detected_lang})

    # ── 2. Build system prompt ─────────────────────────────────────────────────
    system_parts = [KAPRUKA_AGENT_PROMPT]

    # Language directive (overrides the generic mirroring note in base prompt)
    lang_dir = language_directive(detected_lang)
    system_parts.append(
        "\n\n=== LANGUAGE & STYLE DIRECTIVE (governs HOW you write — never overrides the "
        f"grounding/tool rules in section 3) ===\n{lang_dir}"
    )

    if cart:
        cart_data = [c.model_dump() if hasattr(c, "model_dump") else c for c in cart]
        system_parts.append(f"\n\n=== CURRENT CART ===\n{json.dumps(cart_data, indent=2)}")

    # Only append user preference if it was explicitly set (not auto/matched)
    if language_preference and language_preference not in ("auto", detected_lang):
        system_parts.append(f"\n\nUser previously preferred: {language_preference}")

    system_prompt = "".join(system_parts)

    # ── 3. MCP tools (cached globally; catalogue is identical for all users) ───
    gemini_tools: list[types.Tool] = []
    try:
        gemini_tools = await get_gemini_tools()
    except Exception as e:
        print(f"[agent] MCP tools unavailable: {e}")
        yield _sse({"type": "warning", "content": "Tool integration unavailable — answering from knowledge only."})

    # ── 4. Build conversation history ─────────────────────────────────────────
    history: list[types.Content] = []
    for msg in messages:
        role = "user" if msg.role == "user" else "model"
        history.append(types.Content(role=role, parts=[types.Part(text=msg.content)]))

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        tools=gemini_tools if gemini_tools else None,
        temperature=0.7,
        thinking_config=types.ThinkingConfig(include_thoughts=True),
    )

    # ── 5. Agentic loop ────────────────────────────────────────────────────────
    # Each request gets its OWN MCP session, opened lazily on the first tool call
    # and closed in `finally`. This isolates concurrent users from one another and
    # keeps the session's open/close inside this single request task (anyio-safe).
    mcp_stack = AsyncExitStack()
    mcp_session: Optional[ClientSession] = None

    async def _get_mcp_session() -> ClientSession:
        nonlocal mcp_session
        if mcp_session is None:
            mcp_session = await mcp_stack.enter_async_context(mcp_client.new_session())
        return mcp_session

    try:
      for iteration in range(MAX_ITERATIONS):
        function_calls: list = []
        model_text = ""
        fc_parts: list[types.Part] = []

        last_error: Optional[Exception] = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                model_to_use = settings.gemini_model if attempt < MAX_RETRIES else settings.gemini_fallback_model
                if attempt > 0:
                    delay = RETRY_DELAYS[min(attempt - 1, len(RETRY_DELAYS) - 1)]
                    print(f"[agent] retry {attempt}/{MAX_RETRIES} after {delay}s (model={model_to_use})")
                    yield _sse({"type": "thought", "content": f"⏳ High demand — retrying in {int(delay)}s…"})
                    await asyncio.sleep(delay)

                stream = await client.aio.models.generate_content_stream(
                    model=model_to_use,
                    contents=history,
                    config=config,
                )

                async for chunk in stream:
                    if not chunk.candidates:
                        continue
                    candidate = chunk.candidates[0]
                    if not candidate.content or not candidate.content.parts:
                        continue

                    for part in candidate.content.parts:
                        if getattr(part, "thought", False) and part.text:
                            yield _sse({"type": "thought", "content": part.text})
                        elif part.text:
                            model_text += part.text
                            yield _sse({"type": "text", "content": part.text})

                        if part.function_call:
                            function_calls.append(part.function_call)
                            fc_parts.append(part)

                last_error = None
                break  # success — exit retry loop

            except Exception as e:
                last_error = e
                if _is_retryable(e) and attempt < MAX_RETRIES:
                    print(f"[agent] transient error (attempt {attempt+1}): {e}")
                    continue
                # Non-retryable or retries exhausted
                yield _sse({"type": "error", "content": f"Gemini API error: {e}"})
                return

        if last_error is not None:
            yield _sse({"type": "error", "content": f"Gemini API unavailable after {MAX_RETRIES} retries. Please try again shortly."})
            return

        if not function_calls:
            break

        model_parts: list[types.Part] = []
        if model_text:
            model_parts.append(types.Part(text=model_text))
        model_parts.extend(fc_parts)
        history.append(types.Content(role="model", parts=model_parts))

        tool_response_parts: list[types.Part] = []
        for fc in function_calls:
            args = dict(fc.args) if fc.args else {}
            yield _sse({
                "type": "tool_use",
                "name": fc.name,
                "args": args,
                "label": _tool_label(fc.name, args),
            })

            try:
                session = await _get_mcp_session()
                call_args = _force_json_format(fc.name, args)
                result = await session.call_tool(fc.name, arguments=call_args)
                output = _extract_mcp_text(result)
            except Exception as e:
                output = f"Tool error: {e}"
                print(f"[agent] Tool '{fc.name}' failed: {e}")

            yield _sse({"type": "tool_result", "name": fc.name, "data": output})

            # ── Rich structured events per tool ────────────────────────────────
            if fc.name == "kapruka_search_products":
                try:
                    # JSON is the rich path (clean CDN images, descriptions, stock).
                    parsed = parse_search_json(output)
                    if parsed:
                        yield _sse({"type": "products", "items": parsed})
                    else:
                        # Defensive fallback if the server returned Markdown anyway.
                        md = parse_search_markdown(output)
                        if md:
                            md = await enrich_with_images(md)
                            yield _sse({"type": "products", "items": md})
                except Exception as e:
                    print(f"[agent] search parse failed: {e}")

            elif fc.name == "kapruka_get_product":
                try:
                    # A specific product (with its size variants) gets its OWN
                    # prominent detail card, separate from any search-results grid.
                    detail = parse_product_detail_json(output) or parse_product_detail(output)
                    if detail:
                        yield _sse({"type": "product_detail", "item": detail})
                except Exception as e:
                    print(f"[agent] product detail parse failed: {e}")

            elif fc.name == "kapruka_create_order":
                try:
                    # Combine the submitted order (recipient/delivery/sender/message/
                    # icing) with the checkout result so the confirmation card shows
                    # EVERY detail — not just the totals the result echoes back.
                    order = parse_order_result(_flatten_args(args), output)
                    if order:
                        yield _sse({"type": "order_confirmation", "order": order})
                except Exception as e:
                    print(f"[agent] order confirmation parse failed: {e}")

            elif fc.name == "kapruka_track_order":
                try:
                    order = parse_order(output)
                    if order:
                        yield _sse({"type": "order", "order": order})
                except Exception as e:
                    print(f"[agent] order parse failed: {e}")

            tool_response_parts.append(
                types.Part(
                    function_response=types.FunctionResponse(
                        name=fc.name,
                        response={"output": output},
                    )
                )
            )

        history.append(types.Content(role="user", parts=tool_response_parts))
    finally:
        # Tear down this request's MCP session (no-op if it was never opened).
        await mcp_stack.aclose()

    yield _sse({"type": "done"})
