import json
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from app.schemas.chat import ChatRequest, DetectLangRequest, DetectLangResponse, VoiceResponse
from app.services.agent import process_chat
from app.services.language import quick_detect, detect_language

router = APIRouter()


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
