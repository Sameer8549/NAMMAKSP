"""Local PII tokenization for outbound AI-provider payloads."""

from __future__ import annotations

import re
from dataclasses import dataclass, field


_PATTERNS = (
    re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I),
    re.compile(r"(?<!\w)(?:\+91[-\s]?)?[6-9]\d{9}(?!\w)"),
    re.compile(r"\b\d{3}[-\s]\d{3}[-\s]\d{4}\b"),
    re.compile(
        r"(?i)\b(?:name|offender|accused|victim|complainant|witness)\s*[:=]\s*"
        r"(?:[A-Z][A-Za-z.'-]+(?:[ \t]+[A-Z][A-Za-z.'-]+){0,3})"
    ),
    re.compile(
        r"(?i)\b(?:address|residence|residential_address|home_address)\s*[:=]\s*"
        r"[^\n,}]{5,120}"
    ),
)


@dataclass
class PiiRedactor:
    """Replace PII with stable request-local tokens and restore it locally."""

    token_to_value: dict[str, str] = field(default_factory=dict)
    value_to_token: dict[str, str] = field(default_factory=dict)

    def _token(self, value: str) -> str:
        value = value.strip()
        if value in self.value_to_token:
            return self.value_to_token[value]
        token = f"[[PII_{len(self.token_to_value) + 1:03d}]]"
        self.value_to_token[value] = token
        self.token_to_value[token] = value
        return token

    def redact(self, text: str) -> str:
        safe = str(text or "")
        for pattern in _PATTERNS:
            safe = pattern.sub(lambda match: self._redact_match(match.group(0)), safe)
        return safe

    def _redact_match(self, value: str) -> str:
        if ":" in value or "=" in value:
            separator = ":" if ":" in value else "="
            label, pii = value.split(separator, 1)
            return f"{label}{separator} {self._token(pii)}"
        return self._token(value)

    def restore(self, text: str) -> str:
        restored = str(text or "")
        for token, value in sorted(self.token_to_value.items(), key=lambda item: -len(item[0])):
            restored = restored.replace(token, value)
        return restored

    def redact_messages(self, messages: list[dict]) -> list[dict]:
        return [
            {**message, "content": self.redact(message.get("content", ""))}
            for message in messages
        ]
