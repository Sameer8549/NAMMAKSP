"""
sarvam_service.py — Sarvam AI language services for NAMMA KSP.

Keeps STT, TTS, translation, and language identification behind one small
interface so route handlers and chat logic do not depend on raw HTTP details.
"""

from __future__ import annotations

import base64
import logging
import os
import re
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

SARVAM_BASE_URL = os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai").rstrip("/")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_STT_MODEL = os.getenv("SARVAM_STT_MODEL", "saaras:v3")
SARVAM_TTS_MODEL = os.getenv("SARVAM_TTS_MODEL", "bulbul:v3")
SARVAM_TRANSLATE_MODEL = os.getenv("SARVAM_TRANSLATE_MODEL", "mayura:v1")
SARVAM_TTS_SPEAKER = os.getenv("SARVAM_TTS_SPEAKER", "shubh")

# Reuse TLS connections across STT, translation, and TTS requests.
_sarvam_client = httpx.AsyncClient(
    timeout=httpx.Timeout(45.0, connect=8.0),
    limits=httpx.Limits(max_connections=20, max_keepalive_connections=10, keepalive_expiry=60.0),
)


class SarvamError(RuntimeError):
    """Raised when Sarvam is not configured or returns an error."""


def is_sarvam_configured() -> bool:
    return bool(SARVAM_API_KEY)


def _headers() -> dict[str, str]:
    if not SARVAM_API_KEY:
        raise SarvamError("SARVAM_API_KEY is not configured")
    return {"api-subscription-key": SARVAM_API_KEY}


def normalize_language_code(language: Optional[str], *, default: str = "en-IN") -> str:
    value = (language or default).strip()
    mapping = {
        "en": "en-IN",
        "en-us": "en-IN",
        "en-in": "en-IN",
        "kn": "kn-IN",
        "kn-in": "kn-IN",
        "kannada": "kn-IN",
        "english": "en-IN",
        "unknown": "unknown",
        "auto": "auto",
    }
    return mapping.get(value.lower(), value)


def strip_markup_for_speech(text: str, max_chars: int = 2200) -> str:
    clean = text or ""
    clean = re.sub(r"\*\*(.+?)\*\*", r"\1", clean)
    clean = re.sub(r"\*(.+?)\*", r"\1", clean)
    clean = re.sub(r"#+\s*", "", clean)
    clean = re.sub(r"[-•]\s+", "", clean)
    clean = re.sub(r"<[^>]+>", "", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    if len(clean) > max_chars:
        clean = clean[:max_chars].rstrip() + "..."
    return clean


async def detect_language(text: str) -> dict:
    if not text.strip():
        return {"language_code": None, "script_code": None}
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f"{SARVAM_BASE_URL}/text-lid",
            headers=_headers(),
            json={"input": text[:1000]},
        )
    if response.status_code >= 400:
        raise SarvamError(_error_message(response, "Sarvam language detection failed"))
    return response.json()


async def translate_text(
    text: str,
    target_language_code: str,
    source_language_code: str = "auto",
    mode: str = "formal",
) -> str:
    if not text.strip():
        return ""
    target = normalize_language_code(target_language_code)
    source = normalize_language_code(source_language_code, default="auto")
    chunks = _chunk_text(text, 950 if SARVAM_TRANSLATE_MODEL == "mayura:v1" else 1900)
    translated: list[str] = []
    async with httpx.AsyncClient(timeout=40) as client:
        for chunk in chunks:
            payload = {
                "input": chunk,
                "source_language_code": source,
                "target_language_code": target,
                "speaker_gender": "Male",
                "mode": mode,
                "model": SARVAM_TRANSLATE_MODEL,
                "numerals_format": "international",
            }
            response = await client.post(
                f"{SARVAM_BASE_URL}/translate",
                headers=_headers(),
                json=payload,
            )
            if response.status_code >= 400:
                raise SarvamError(_error_message(response, "Sarvam translation failed"))
            translated.append(response.json().get("translated_text", ""))
    return "\n".join(part for part in translated if part).strip()


async def transcribe_audio(content: bytes, filename: str, language: Optional[str] = None) -> str:
    if not content:
        raise SarvamError("Empty audio file")
    language_code = normalize_language_code(language or "unknown", default="unknown")
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "webm"
    content_type = f"audio/{ext}" if ext in {"webm", "mp3", "wav", "m4a", "ogg", "flac", "aac"} else "audio/webm"
    data = {
        "model": SARVAM_STT_MODEL,
        "mode": "transcribe",
        "language_code": language_code,
    }
    files = {"file": (filename or "audio.webm", content, content_type)}
    response = await _sarvam_client.post(
        f"{SARVAM_BASE_URL}/speech-to-text",
        headers=_headers(),
        data=data,
        files=files,
    )
    if response.status_code >= 400:
        raise SarvamError(_error_message(response, "Sarvam speech-to-text failed"))
    return response.json().get("transcript", "").strip()


async def synthesize_speech(text: str, language: Optional[str] = "en") -> tuple[bytes, str]:
    clean = strip_markup_for_speech(text)
    if not clean:
        raise SarvamError("No text to speak")
    target = normalize_language_code(language)
    payload = {
        "text": clean,
        "target_language_code": target,
        "speaker": SARVAM_TTS_SPEAKER,
        "pace": 1.15,
        "speech_sample_rate": 24000,
        "model": SARVAM_TTS_MODEL,
        "output_audio_codec": "mp3",
        "temperature": 0.45,
    }
    response = await _sarvam_client.post(
        f"{SARVAM_BASE_URL}/text-to-speech",
        headers=_headers(),
        json=payload,
    )
    if response.status_code >= 400:
        raise SarvamError(_error_message(response, "Sarvam text-to-speech failed"))
    audios = response.json().get("audios") or []
    if not audios:
        raise SarvamError("Sarvam returned no audio")
    return base64.b64decode(audios[0]), "audio/mpeg"


def _chunk_text(text: str, max_chars: int) -> list[str]:
    text = text.strip()
    if len(text) <= max_chars:
        return [text]
    chunks: list[str] = []
    while text:
        cut = text.rfind("\n", 0, max_chars)
        if cut < max_chars * 0.5:
            cut = text.rfind(". ", 0, max_chars)
        if cut < max_chars * 0.5:
            cut = max_chars
        chunks.append(text[:cut].strip())
        text = text[cut:].strip()
    return chunks


def _error_message(response: httpx.Response, fallback: str) -> str:
    try:
        payload = response.json()
        detail = payload.get("error") or payload.get("detail") or payload
        if isinstance(detail, dict):
            return detail.get("message") or detail.get("code") or str(detail)
        return str(detail)
    except Exception:
        return f"{fallback}: HTTP {response.status_code}"
