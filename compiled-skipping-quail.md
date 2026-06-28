# Multilingual Voice & Text + Rich Rendering — Implementation Plan

## Context

Two goals:

1. **Multilingual (issue 1):** Make the Kapruka agent silently detect the user's language —
   English, Tamil, Sinhala, Romanized Tamil (Tanglish), Romanized Sinhala (Singlish) — from
   both **text** and **voice**, and always reply in the same language/script. No "what
   language are you using?" prompts, ever.
2. **Rich rendering (issue 2):** Today only `kapruka_search_products` renders rich product
   cards. `kapruka_get_product`, `kapruka_track_order`, and friends dump raw markdown with no
   photos/details. Product images are also scraped from each page's `og:image` (6s timeout,
   flaky) instead of read from the MCP payload. Fix all of it to production grade.

### Two deliberate deviations from the brief (with rationale)

- **Keep SSE streaming; do NOT add a one-shot JSON `/chat/text`.** The brief's `/chat/text`
  returns `{reply, detected_lang, reply_lang}` in a single blob. Our existing `/api/chat`
  (`agent.py::process_chat`) streams `thought` / `tool_use` / `tool_result` / `products`
  events that drive the live thinking timeline **and** the product grid. A JSON endpoint
  would throw all of that away. Instead we inject the detected language into the existing
  streaming pipeline and emit one extra `detected_lang` event. `reply_lang == detected_lang`
  (we mirror).
- **MCP "bridge" is already built and better than the brief's version.** `process_chat`
  already runs a full agentic loop where Gemini chooses which of the 7 MCP tools to call and
  feeds results back. The brief's "detect intent → call one tool → localize" is strictly less
  capable. We only need to add the language directive to the loop's system prompt — no bridge
  to build.

Provider note: this project uses **Google Gemini** (`google.genai`), not Anthropic — Claude
API guidance does not apply.

---

## Part A — Backend: language detection pipeline

### New `backend/app/services/language.py`

- Unicode script detection (instant, no API):
  - Tamil block `U+0B80–U+0BFF` → `"ta"`
  - Sinhala block `U+0D80–U+0DFF` → `"si"`
  - else ASCII/Latin → go to marker/Gemini step
- Marker-word sets from the brief (word-boundary matched, scored):
  - Tamil-rom: `enna, epdi, illa, romba, vanakkam, pa, da, bro, machan, seri`
  - Sinhala-rom: `kohomada, mama, eka, neda, hari, puluwan, oyage, mata, banne, aiya`
  - (`da`/`bro` overlap both → treated as weak signals; ties fall through to Gemini.)
- `quick_detect(text) -> str | None` — script + markers only, **zero API calls**. Returns
  `en|ta|si|ta-rom|si-rom` or `None` when ASCII is ambiguous. Powers `/detect-lang`.
- `async classify_romanized(text) -> "en"|"ta-rom"|"si-rom"` — single cheap Gemini call with
  the brief's classifier prompt; reuses the lazy client from `agent.py::_get_client`. Any
  error / unparseable label → `"en"`.
- `async detect_language(text) -> str` — orchestrates script → markers → Gemini fallback →
  default `"en"`. This is the authoritative path used by the chat pipeline.
- `LANG_LABELS` map + `language_directive(lang) -> str` producing the system-prompt injection:
  e.g. `si-rom` → "The user is communicating in Romanized Sinhala (Singlish). Reply in the
  exact same language and romanized script. Never switch languages unless the user switches
  first."

### New endpoint `POST /api/detect-lang`  (in `backend/app/api/chat.py`)

- Body `{text}` → returns `{detected_lang}`.
- Uses **`quick_detect` only** (script + markers, no Gemini) so it stays instant under the
  600ms-debounced per-keystroke calls from the live input badge. `None`/empty → `"en"`.
  (Deviation from brief's "Step 2 = Gemini": calling Gemini on every keystroke is wasteful;
  the authoritative Gemini fallback still runs server-side at send time.)

### Wire into `agent.py::process_chat`

- Before the agentic loop, take the **last user message**, call `detect_language(...)`, then
  append `language_directive(lang)` to `system_prompt`.
- Emit `_sse({"type": "detected_lang", "lang": lang})` as the first event so the frontend can
  badge the model message and (optionally) the preceding user message.
- The existing `KAPRUKA_AGENT_PROMPT` already covers Singlish/Tanglish mirroring — the
  directive reinforces it with the concrete detected signal.

---

## Part B — Backend: rich rendering fixes (issue 2)

### `backend/app/services/products.py`

- **Read the image straight from the MCP markdown.** Per the MCP spec, `kapruka_search_products`
  output already includes an **Image URL**. Add a regex to `parse_search_markdown` to capture
  it; only fall back to `og:image` scraping when a product has no image. This makes images
  fast + reliable instead of 12 concurrent 6s page fetches.
- **New `parse_product_detail(md) -> dict | None`** for `kapruka_get_product`: extract name,
  description, price, stock, image(s), variants, shipping, URL into one normalized product
  dict (superset of the search shape so `normalizeProduct` handles it).
- **New `parse_order(md) -> dict | None`** for `kapruka_track_order`: status, delivery
  progress, recipient, delivery date, ordered items, tracking info.

### `agent.py` tool-result handling (the `for fc in function_calls` block)

- Generalize beyond the current `if fc.name == "kapruka_search_products"`:
  - `kapruka_search_products` → `{"type":"products","items":[...]}` (unchanged, now with inline images)
  - `kapruka_get_product` → `{"type":"products","items":[<single detail>]}` so it renders one rich card
  - `kapruka_track_order` → `{"type":"order","order":{...}}` (new event → OrderCard)
- Keep `enrich_with_images` as the fallback only for products missing an inline image.

---

## Part C — Backend: voice (transcribe + detect, reuse the text pipeline)

**Approach: two-step, reuse everything.** The voice endpoint only transcribes + detects; the
reply is produced by the *existing* streaming `/api/chat` so voice replies get the same
thinking timeline, MCP tools, and product cards for free.

### Enhance `POST /api/audio` (rename-compatible alias `POST /api/chat/voice`)

- Send audio to Gemini multimodal with a JSON-returning instruction:
  *"Transcribe this audio in its ORIGINAL language and script (do not translate). Then detect
  the language as one of: en, ta, si, ta-rom, si-rom. Return JSON {transcript, detected_lang}."*
  Transcribing in the original script is what lets the downstream pipeline reply in-language.
- Parse JSON defensively; on failure fall back to plain transcript + `detect_language(transcript)`.
- Return `{transcript, detected_lang}`. (We keep `transcription` too for backward-compat with
  the current `VoiceRecorder`.)
- Frontend then: renders the user turn as a **voice bubble** (audio blob + transcript + badge)
  and calls `sendAgentMessage(transcript)` to stream the localized reply.

---

## Part D — Frontend (React + TS)

### Types — `frontend/src/store/cartStore.ts`

Extend `ChatMessage` with: `type?: 'text' | 'voice'`, `lang?: string`,
`transcript?: string`, `audioUrl?: string`. (Backward compatible — all optional.)

### New `frontend/src/lib/detectLang.ts`

Client-side mirror of the script + marker heuristic (instant, no network) for the live badge.
Same ranges/markers as the backend so behavior is consistent.

### New `frontend/src/hooks/useLanguageDetection.ts`

600ms-debounced. Instant local guess via `detectLang.ts`, then confirms against
`POST /api/detect-lang`. Returns `detectedLang` for the input-bar badge.

### New components (match existing style: framer-motion, tailwind, lucide)

- **`LanguageBadge.tsx`** — color-coded pill: EN=blue, TA=orange, SI=green, ta-rom=yellow,
  si-rom=cyan; optional tiny `auto` label. Used under every bubble and inside the input bar.
- **`VoiceBubble.tsx`** — for `type:'voice'` user messages: play/pause (`HTMLAudioElement` on
  the blob URL), animated waveform bars, duration, collapsible **"Show transcript"** (hidden
  by default), retry button if `audioUrl` upload failed.
- **`RecordingBar.tsx`** — replaces the input row while recording: cancel ✕, red pulsing dot,
  live MM:SS timer, live waveform (Web Audio `AnalyserNode` → animated bars), send button.
  On send → stop + upload. **< 1s → don't send, show "Tap and hold to record" tooltip.**

### Modify existing

- **`PromptInput.tsx`** — new placeholder *"Type in English, தமிழ், සිංහල, or romanized…"*; mic
  button immediately left of send; live `LanguageBadge` inside the bar driven by
  `useLanguageDetection`; swap in `RecordingBar` while recording.
- **`VoiceRecorder.tsx`** — fold its recording logic into `RecordingBar`; keep a thin mic
  trigger. Upload target becomes the enhanced audio endpoint; on success add a `type:'voice'`
  user message then stream the reply.
- **`MessageBubble.tsx`** — render `LanguageBadge` under each bubble (using `message.lang`);
  render `VoiceBubble` for voice user messages; render new **OrderCard** when an `order`
  arrives. Add a "processing voice…" shimmer bubble while the transcript is in flight.
- **`agentStream.ts`** — capture the new `detected_lang` event → store `lang` on the model
  message; capture the `order` event; add a `sendVoiceMessage(conversationId, blob)` helper
  that uploads audio, adds the voice user bubble, then reuses `sendAgentMessage`.

---

## Part E — Silent error handling (no user-facing errors)

- Gemini can't detect language → default `"en"` (handled in `detect_language` / `classify_romanized`).
- Voice < 1s → `RecordingBar` blocks send, shows tooltip, never uploads.
- Audio upload fails → retry button inside `VoiceBubble`.
- Romanized classifier unsure / unparseable → `"en"`.

---

## Files touched (summary)

**Backend**
- new `app/services/language.py`
- modify `app/services/products.py` (inline image parse, `parse_product_detail`, `parse_order`)
- modify `app/services/agent.py` (detect + inject + `detected_lang` event; per-tool rendering)
- modify `app/api/chat.py` (`/detect-lang`; enhance `/audio` + `/chat/voice` alias)
- modify `app/schemas/chat.py` (DetectLang + voice response models)
- modify `app/prompts/system.py` (optional: keep directive logic in `language.py`)

**Frontend**
- new `src/lib/detectLang.ts`, `src/hooks/useLanguageDetection.ts`
- new `src/components/chat/LanguageBadge.tsx`, `VoiceBubble.tsx`, `RecordingBar.tsx`,
  `src/components/shop/OrderCard.tsx`
- modify `src/store/cartStore.ts`, `src/lib/agentStream.ts`,
  `src/components/chat/{MessageBubble,PromptInput,VoiceRecorder}.tsx`

---

## Verification

**Backend (unit, no UI):**
- `detect_language` table test: `"vanakkam bro"`→`ta-rom`, `"kohomada mama"`→`si-rom`,
  `"මට කේක් එකක් ඕන"`→`si`, `"எனக்கு கேக் வேண்டும்"`→`ta`, `"I want a cake"`→`en`,
  ambiguous `"da"`→Gemini→default `en`.
- `curl POST /api/detect-lang -d '{"text":"kohomada mama"}'` → `{"detected_lang":"si-rom"}` fast.
- `curl POST /api/chat` with a Sinhala message → first SSE event is `detected_lang: si`, reply
  streams in Sinhala, product `products` event still fires for searches.
- `kapruka_get_product` request → a single rich detail card event; `kapruka_track_order` → `order` event.

**Frontend (manual, `/run` the app):**
- Type `enna da` → input badge shows Tamil-rom "auto"; send → reply in Tanglish, badge under bubble.
- Type Sinhala unicode → badge green SI; reply in Sinhala.
- Hold mic, speak Sinhala → voice bubble with play + waveform + collapsible transcript; reply
  streams in Sinhala. Tap <1s → tooltip, no send. Kill backend mid-upload → retry button.
- Search flowers → grid renders with **inline** images (no slow scrape); open one product →
  detail card; track an order → order card.

**Models:** reuse existing constants (`agent.py::MODEL` for text/classifier, `gemini-2.5-flash`
for audio) — already configured in this project.
