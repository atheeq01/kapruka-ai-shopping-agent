import json
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from app.schemas.chat import (
    ChatRequest, DetectLangRequest, DetectLangResponse, VoiceResponse,
    GiftMessageRequest, GiftMessageResponse, TTSRequest,
)
from app.services.agent import process_chat
from app.services.language import quick_detect, detect_language
from app.mcp.client import mcp_client

router = APIRouter()


@router.get("/categories")
async def list_categories():
    """Fetches product categories from the Kapruka MCP kapruka_list_categories tool."""
    try:
        async with mcp_client.new_session() as session:
            result = await session.call_tool(
                "kapruka_list_categories",
                arguments={"params": {"depth": 1, "response_format": "json"}},
            )

        # Extract text from MCP result
        raw = ""
        if hasattr(result, "content"):
            parts = []
            for item in result.content:
                if hasattr(item, "text"):
                    parts.append(item.text)
            raw = "\n".join(parts)
        else:
            raw = str(result)

        # Try to parse as JSON
        try:
            raw_stripped = raw.strip()
            if raw_stripped.startswith("```"):
                raw_stripped = raw_stripped.strip("`")
                if raw_stripped.startswith("json"):
                    raw_stripped = raw_stripped[4:].strip()
            data = json.loads(raw_stripped)
            if isinstance(data, list):
                return {"categories": data}
            elif isinstance(data, dict):
                cats = data.get("categories") or data.get("items") or data.get("data") or []
                return {"categories": cats if isinstance(cats, list) else []}
        except Exception:
            pass

        # Return raw text for frontend to handle
        return {"categories": [], "raw": raw}

    except Exception as e:
        print(f"[categories] MCP error: {e}")
        # Curated fallback so the UI is never empty
        return {
            "categories": [
                {"name": "Flowers",          "emoji": "🌸"},
                {"name": "Birthday Cakes",   "emoji": "🎂"},
                {"name": "Gifts",            "emoji": "🎁"},
                {"name": "Fruit Baskets",    "emoji": "🍓"},
                {"name": "Chocolates",       "emoji": "🍫"},
                {"name": "Wine & Spirits",   "emoji": "🍷"},
                {"name": "Jewellery",        "emoji": "💍"},
                {"name": "Plants",           "emoji": "🌿"},
                {"name": "Personalised",     "emoji": "✍️"},
                {"name": "Kids & Toys",      "emoji": "🧸"},
            ],
            "fallback": True,
        }


@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Streams the agentic response as SSE."""
    print(f"[chat] {len(request.messages)} messages, lang_pref={request.language_preference}")
    return StreamingResponse(
        process_chat(request.messages, request.cart, request.language_preference),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/detect-lang", response_model=DetectLangResponse)
async def detect_lang_endpoint(request: DetectLangRequest):
    """
    Fast language detection for the live input badge.
    Uses script detection + marker scoring only (zero Gemini calls).
    Falls back to 'en' when text is empty or ambiguous.
    """
    if not request.text or not request.text.strip():
        return DetectLangResponse(detected_lang="en")

    detected = quick_detect(request.text) or "en"
    return DetectLangResponse(detected_lang=detected)


@router.post("/gift-message", response_model=GiftMessageResponse)
async def write_gift_message(request: GiftMessageRequest):
    """
    Draft a short, heartfelt gift-card message with Gemini (Task 9 creativity wow).
    Stateless — all context comes in the request; nothing is stored.
    """
    from google.genai import types as gtypes
    from app.services.agent import _get_client
    from app.core.config import settings

    _LANG_NAME = {
        "EN": "English", "SI": "Sinhala (සිංහල script)", "TA": "Tamil (தமிழ் script)",
    }
    lang = (request.language or "auto").upper()
    lang_line = (
        f"Write the message in {_LANG_NAME[lang]}."
        if lang in _LANG_NAME
        else "Write in the language that best fits the recipient (default warm English)."
    )

    ctx_parts = []
    if request.recipient_name:
        ctx_parts.append(f"Recipient: {request.recipient_name}")
    if request.relationship:
        ctx_parts.append(f"Relationship to sender: {request.relationship}")
    if request.occasion:
        ctx_parts.append(f"Occasion: {request.occasion}")
    if request.items:
        ctx_parts.append(f"Gift being sent: {', '.join(request.items[:5])}")
    if request.sender_name and not request.anonymous:
        ctx_parts.append(f"Sign off from: {request.sender_name}")
    elif request.anonymous:
        ctx_parts.append("The sender is anonymous — do NOT include a sender name.")
    context = "\n".join(ctx_parts) or "A thoughtful gift for someone special."

    try:
        client = _get_client()
        resp = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=(
                "Write a warm, sincere gift-card message for the gift below.\n\n"
                f"{context}\n\n"
                f"{lang_line}\n"
                "Rules: 2-4 short sentences, heartfelt and natural (not cheesy or generic), "
                "suitable to print on a gift card. If a sender name is given and not anonymous, "
                "sign off with it on a new line. Return ONLY the message text — no quotes, no "
                "preamble, no explanation."
            ),
            config=gtypes.GenerateContentConfig(
                temperature=0.9,
                max_output_tokens=200,
                thinking_config=gtypes.ThinkingConfig(thinking_budget=0),
            ),
        )
        message = (resp.text or "").strip().strip('"').strip()
        if not message:
            raise ValueError("empty draft")
        return GiftMessageResponse(message=message)
    except Exception as e:
        print(f"[gift-message] error: {e}")
        raise HTTPException(status_code=500, detail="Could not draft a message right now.")


@router.post("/audio", response_model=VoiceResponse)
@router.post("/chat/voice", response_model=VoiceResponse)
async def process_audio(audio: UploadFile = File(...)):
    """
    Transcribes audio in its ORIGINAL language/script via Gemini multimodal.
    Detects language and returns structured JSON for the voice pipeline.
    """
    from google import genai
    from google.genai import types as gtypes
    from app.services.agent import _get_client
    from app.core.config import settings

    try:
        audio_bytes = await audio.read()
        if len(audio_bytes) < 1000:
            raise HTTPException(status_code=400, detail="Audio too short")

        client = _get_client()

        # Determine MIME type from upload filename/content-type
        mime = "audio/webm"
        if audio.content_type and "ogg" in audio.content_type:
            mime = "audio/ogg"
        elif audio.content_type and "mp4" in audio.content_type:
            mime = "audio/mp4"
        elif audio.filename and audio.filename.endswith(".ogg"):
            mime = "audio/ogg"

        response = await client.aio.models.generate_content(
            model=settings.gemini_audio_model,
            contents=[
                gtypes.Part.from_bytes(data=audio_bytes, mime_type=mime),
                (
                    "Listen to this audio carefully.\n"
                    "1. Transcribe what was said in the ORIGINAL language and script "
                    "(Tamil script if Tamil, Sinhala script if Sinhala, English letters if Singlish/Tanglish, etc.). "
                    "Do NOT translate.\n"
                    "2. Detect the language as one of: en, ta, si, ta-rom, si-rom.\n"
                    "   - ta = Tamil script\n"
                    "   - si = Sinhala script\n"
                    "   - ta-rom = Romanized Tamil (Tanglish)\n"
                    "   - si-rom = Romanized Sinhala (Singlish)\n"
                    "   - en = English\n"
                    "3. Return ONLY a JSON object: {\"transcript\": \"...\", \"detected_lang\": \"...\"}\n"
                    "No extra text, no markdown, just the JSON."
                ),
            ],
            config=gtypes.GenerateContentConfig(
                temperature=0.0,
                thinking_config=gtypes.ThinkingConfig(thinking_budget=0),
            ),
        )

        raw = (response.text or "").strip()

        # Parse JSON response; fall back gracefully if Gemini wraps it in markdown
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        try:
            parsed = json.loads(raw)
            transcript = str(parsed.get("transcript", "")).strip()
            detected_lang = str(parsed.get("detected_lang", "en")).strip()
        except Exception:
            # Gemini didn't return JSON — treat entire response as plain transcript
            transcript = raw
            detected_lang = await detect_language(raw)

        # Validate / normalise detected_lang
        if detected_lang not in ("en", "ta", "si", "ta-rom", "si-rom"):
            detected_lang = await detect_language(transcript) if transcript else "en"

        return VoiceResponse(
            transcript=transcript,
            transcription=transcript,  # backward-compat
            detected_lang=detected_lang,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[audio] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tts")
@router.post("/chat/tts")
async def process_tts(request: TTSRequest):
    """Generates audio from text using Gemini TTS."""
    from google.genai import types as gtypes
    from app.services.agent import _get_client
    import struct

    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
        
    client = _get_client()
    try:
        response = await client.aio.models.generate_content(
            model="gemini-3.1-flash-tts-preview",
            contents=request.text,
            config=gtypes.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=gtypes.SpeechConfig(
                    voice_config=gtypes.VoiceConfig(
                        prebuilt_voice_config=gtypes.PrebuiltVoiceConfig(
                            voice_name="Aoede",
                        )
                    )
                )
            )
        )
        
        pcm_data = b""
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.data:
                pcm_data += part.inline_data.data
        
        if not pcm_data:
            raise HTTPException(status_code=500, detail="No audio returned from Gemini")

        # Create WAV header for 24kHz 16-bit mono PCM
        sample_rate = 24000
        num_channels = 1
        bits_per_sample = 16
        data_size = len(pcm_data)
        
        header = b'RIFF'
        header += struct.pack('<I', 36 + data_size)
        header += b'WAVE'
        header += b'fmt '
        header += struct.pack('<I', 16) # Subchunk1Size
        header += struct.pack('<H', 1)  # AudioFormat (PCM)
        header += struct.pack('<H', num_channels)
        header += struct.pack('<I', sample_rate)
        byte_rate = sample_rate * num_channels * bits_per_sample // 8
        header += struct.pack('<I', byte_rate)
        block_align = num_channels * bits_per_sample // 8
        header += struct.pack('<H', block_align)
        header += struct.pack('<H', bits_per_sample)
        header += b'data'
        header += struct.pack('<I', data_size)

        wav_data = header + pcm_data
        
        from fastapi.responses import Response
        return Response(content=wav_data, media_type="audio/wav")
    except Exception as e:
        print(f"[tts] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

