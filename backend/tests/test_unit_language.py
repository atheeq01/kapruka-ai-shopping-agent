"""
Unit tests for the zero-API language detection pipeline (app.services.language).
These cover the deterministic `quick_detect` path — no Gemini calls involved.
"""
import pytest

from app.services.language import (
    quick_detect,
    language_directive,
    LANG_LABELS,
)

pytestmark = pytest.mark.unit


@pytest.mark.parametrize("text,expected", [
    ("",                       "en"),   # empty → English default
    ("   ",                    "en"),   # whitespace only → English
    ("show me birthday cakes", "en"),   # all common English words
    ("show me watches under 5000", "en"),
])
def test_confident_english(text, expected):
    assert quick_detect(text) == expected


def test_tamil_script_detected():
    assert quick_detect("எனக்கு ஒரு கேக் வேண்டும்") == "ta"


def test_sinhala_script_detected():
    assert quick_detect("මට කේක් එකක් ඕනේ") == "si"


@pytest.mark.parametrize("text", [
    "vanakkam machan enna venum",
    "enakku oru cake venum",
])
def test_romanized_tamil(text):
    assert quick_detect(text) == "ta-rom"


@pytest.mark.parametrize("text", [
    "kohomada mama",
    "mata cake ekak one",
])
def test_romanized_sinhala(text):
    assert quick_detect(text) == "si-rom"


def test_ambiguous_ascii_defers_to_classifier():
    """Unknown ASCII words (no markers, not all common English) → None (Gemini)."""
    assert quick_detect("zxcv qwerty lkjh") is None


def test_language_directive_per_lang():
    # Script langs must instruct replying in that script.
    assert "Tamil script" in language_directive("ta")
    assert "Sinhala script" in language_directive("si")
    # Romanized variants must forbid switching to script.
    assert "Do NOT use Tamil script" in language_directive("ta-rom")
    assert "Do NOT use Sinhala script" in language_directive("si-rom")
    # Unknown code falls back to the English directive.
    assert language_directive("xx") == language_directive("en")


def test_lang_labels_complete():
    for code in ("en", "ta", "si", "ta-rom", "si-rom"):
        assert code in LANG_LABELS
