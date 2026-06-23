"""
Language detection pipeline — zero-interaction multilingual support.
Detects: en | ta | si | ta-rom | si-rom
"""
import re
from typing import Optional

_TAMIL_RE   = re.compile(r'[஀-௿]')
_SINHALA_RE = re.compile(r'[඀-෿]')
_WORD_RE    = re.compile(r'\b[a-z]+\b')

# Strong exclusive markers (score × 2)
_TA_ROM = {
    'enna', 'epdi', 'illa', 'romba', 'vanakkam', 'machan', 'seri',
    'sollu', 'theriyum', 'venum', 'irukku', 'nalla', 'ponga', 'thambi',
    'enakku', 'unakku', 'kandippa', 'paaru', 'kelunga', 'ungalukku',
    'vேண்டாம்', 'vendaam', 'panren', 'panni', 'kaattu', 'onnu', 'rendu',
    'theriyuma', 'onum', 'kavala', 'eppadi', 'edhu', 'idhu', 'adhu',
}
_SI_ROM = {
    'kohomada', 'mama', 'eka', 'neda', 'hari', 'puluwan', 'oyage',
    'mata', 'banne', 'aiya', 'kiyanna', 'ganna', 'denna', 'tikak',
    'monawada', 'hodai', 'api', 'meka', 'ohe', 'wage',
    'ekak', 'nethuwa', 'nathuwa', 'oni', 'oyata', 'oya', 'puluwanda',
    'kawda', 'mokak', 'mokakda', 'monawa', 'kiyala', 'thiyenawa',
    'thiyenne', 'balanna', 'hoyanna', 'deyak', 'mehema', 'ehema',
    'witharak', 'kohomda', 'naha', 'nae', 'enna', 'yanna', 'karanna',
}
# Weak shared markers (score × 1 for both)
_WEAK = {'da', 'bro', 'pa', 'ne', 'la'}

# Ultra-common English words used only to confirm a marker-less ASCII sentence
# is *confidently* English (fast path, no API). Anything containing tokens
# outside this set is treated as ambiguous and routed to the Gemini classifier,
# which reliably distinguishes English from Singlish/Tanglish.
_EN_COMMON = {
    'i', 'you', 'we', 'they', 'he', 'she', 'it', 'me', 'my', 'your', 'our',
    'a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'been',
    'do', 'does', 'did', 'have', 'has', 'had', 'can', 'could', 'would',
    'should', 'will', 'shall', 'may', 'might', 'must',
    'want', 'need', 'like', 'show', 'find', 'looking', 'look', 'get', 'give',
    'buy', 'order', 'send', 'deliver', 'check', 'add', 'help', 'tell',
    'for', 'to', 'of', 'in', 'on', 'at', 'with', 'without', 'and', 'or',
    'but', 'not', 'no', 'yes', 'please', 'thanks', 'thank',
    'this', 'that', 'these', 'those', 'here', 'there', 'what', 'which',
    'who', 'where', 'when', 'how', 'why',
    'price', 'delivery', 'under', 'over', 'around', 'about', 'some', 'any',
    'one', 'two', 'three', 'classic', 'smart', 'new', 'best', 'good',
    'nice', 'cheap', 'more', 'less', 'small', 'big', 'something',
    'hi', 'hello', 'hey', 'ok', 'okay', 'sure', 'rs', 'lkr', 'rupees',
    'watch', 'watches', 'cake', 'cakes', 'flower', 'flowers', 'bouquet',
    'chocolate', 'chocolates', 'gift', 'gifts', 'hamper', 'perfume', 'ring',
    'necklace', 'jewellery', 'jewelry', 'saree', 'dress', 'shirt', 'toy',
    'toys', 'fruit', 'fruits', 'basket', 'card', 'cards', 'box', 'set',
    'birthday', 'anniversary', 'wedding', 'men', 'mens', 'women', 'womens',
    'ladies', 'kids', 'color', 'colour', 'size', 'model', 'brand',
    'ship', 'available', 'stock', 'today', 'tomorrow', 'date', 'address',
    'number', 'track', 'cancel', 'pay', 'payment', 'cash', 'analog', 'digital',
}

LANG_LABELS: dict[str, str] = {
    'en':     'English',
    'ta':     'Tamil',
    'si':     'Sinhala',
    'ta-rom': 'Romanized Tamil',
    'si-rom': 'Romanized Sinhala',
}


def language_directive(lang: str) -> str:
    """Return the system-prompt snippet that enforces language mirroring."""
    directives = {
        'en': (
            "The user is communicating in English. "
            "Reply in clear, professional English."
        ),
        'ta': (
            "The user is communicating in Tamil script (தமிழ்). "
            "Reply ENTIRELY in Tamil script. Never switch to English unless the user does first."
        ),
        'si': (
            "The user is communicating in Sinhala script (සිංහල). "
            "Reply ENTIRELY in Sinhala script. Never switch to English unless the user does first."
        ),
        'ta-rom': (
            "The user is communicating in Romanized Tamil (Tanglish — Tamil words written in "
            "English letters, e.g. 'vanakkam bro', 'enna venum'). "
            "Reply in the EXACT same Romanized Tamil style. "
            "Do NOT use Tamil script. Do NOT switch to English. "
            "This controls STYLE only — never name or invent a product; always call "
            "kapruka_search_products first and describe only what it returns. "
            "Example: 'Kandippa! Naan search panni ungalukku nalla options kaatturen…'"
        ),
        'si-rom': (
            "The user is communicating in Romanized Sinhala (Singlish — Sinhala words written in "
            "English letters, e.g. 'kohomada mama', 'eka denna puluwan'). "
            "Reply in the EXACT same Romanized Sinhala style. "
            "Do NOT use Sinhala script. Do NOT switch to English. "
            "This controls STYLE only — never name or invent a product; always call "
            "kapruka_search_products first and describe only what it returns. "
            "Example: 'Aniwarenyen! Mama search karala oyata lassana options tikak penvannam…'"
        ),
    }
    return directives.get(lang, directives['en'])


def quick_detect(text: str) -> Optional[str]:
    """
    Script detection + marker scoring — zero API calls.
    Returns lang code, or None when ASCII text is ambiguous (caller should Gemini-classify).
    """
    if not text or not text.strip():
        return 'en'

    if _TAMIL_RE.search(text):
        return 'ta'
    if _SINHALA_RE.search(text):
        return 'si'

    words = set(_WORD_RE.findall(text.lower()))
    ta_score = sum(2 for w in words if w in _TA_ROM) + sum(1 for w in words if w in _WEAK)
    si_score = sum(2 for w in words if w in _SI_ROM) + sum(1 for w in words if w in _WEAK)

    if ta_score == 0 and si_score == 0:
        # No Singlish/Tanglish markers hit. Only short-circuit to English when EVERY
        # word is recognizable common English; otherwise the sentence may be Singlish/
        # Tanglish vocabulary we don't have a marker for (e.g. "watch ekak nethuwa
        # classic ekak one") → defer to the Gemini classifier rather than assuming 'en'.
        return 'en' if words and words <= _EN_COMMON else None

    if ta_score > si_score:
        return 'ta-rom'
    if si_score > ta_score:
        return 'si-rom'
    return None  # tied → Gemini


async def classify_romanized(text: str) -> str:
    """Single cheap Gemini call for ambiguous ASCII. Returns 'en' | 'ta-rom' | 'si-rom'."""
    import asyncio
    from app.services.agent import _get_client
    from google.genai import types
    from app.core.config import settings

    for attempt in range(3):
        try:
            client = _get_client()
            resp = await client.aio.models.generate_content(
                model=settings.gemini_classify_model,
                contents=text,
                config=types.GenerateContentConfig(
                    system_instruction=(
                        "Classify the language of the following text as exactly one of: "
                        "english, romanized-tamil, romanized-sinhala.\n"
                        "Romanized Tamil markers: enna, epdi, illa, romba, vanakkam, machan, seri, venum.\n"
                        "Romanized Sinhala markers: kohomada, mama, eka, neda, hari, puluwan, oyage, mata.\n"
                        "Reply with ONLY the label, no punctuation, nothing else."
                    ),
                    temperature=0.0,
                    max_output_tokens=8,
                    thinking_config=types.ThinkingConfig(thinking_budget=0),
                ),
            )
            label = (resp.text or '').strip().lower()
            if 'tamil' in label:
                return 'ta-rom'
            if 'sinhala' in label:
                return 'si-rom'
            return 'en'
        except Exception as e:
            msg = str(e).lower()
            if any(k in msg for k in ('503', 'unavailable', 'overloaded', '429')) and attempt < 2:
                await asyncio.sleep(2 ** attempt)
                continue
            print(f"[lang] classifier error: {e}")
            return 'en'
    return 'en'


async def detect_language(text: str) -> str:
    """
    Full pipeline: script → markers → Gemini fallback → default 'en'.
    Use this in the chat + voice pipelines.
    """
    result = quick_detect(text)
    if result is not None:
        return result
    return await classify_romanized(text)
