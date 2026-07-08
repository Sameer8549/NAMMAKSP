# Security and External AI Data Flow

NAMMA KSP is a synthetic-data demonstration. It must not be connected to live
KSP, CCTNS, FIR, identity, or evidentiary data without a separate security,
privacy, legal, and infrastructure review.

## Provider Modes

`LLM_PROVIDER_MODE` controls text inference:

- `cloud`: sends redacted text to the configured Groq endpoint.
- `local`: sends redacted text to an OpenAI-compatible endpoint configured by
  `LOCAL_LLM_BASE_URL`, `LOCAL_LLM_API_KEY`, and `LOCAL_LLM_MODEL`.

The default is `cloud` for the deployed synthetic demo. Switching to `local`
does not require application code changes.

## Redaction Boundary

Before text leaves the backend, `backend/pii_redaction.py` replaces detected
PII with request-local tokens such as `[[PII_001]]`. The lookup map exists only
in memory for that provider call. Provider responses are rehydrated locally.

The current detector covers:

- Email addresses.
- Indian mobile numbers and common formatted phone numbers.
- Values in labeled name fields, including offender, accused, victim,
  complainant, and witness names.
- Values in labeled address and residence fields.

If a provider changes a token, the value remains redacted. No token map is
logged, stored in the database, or sent to another provider.

## What Leaves the Backend

| Provider | Payload | Purpose | Protection |
|---|---|---|---|
| Groq | System instructions, user query, bounded conversation history, and selected synthetic database context | Query rewriting, chat reasoning, summaries, recommendations, Kannada fallback | Text PII tokenized before transmission; response rehydrated locally |
| Mistral | Nothing in the current implementation | Reserved configuration only | No active call site |
| Sarvam Translate | Text and language codes | English/Kannada translation | Text PII tokenized; translated response rehydrated locally |
| Sarvam Language ID | Up to 1,000 characters | Script/language detection | Text PII tokenized |
| Sarvam TTS | Markup-stripped response text and voice settings | Spoken English/Kannada response | Text PII tokenized; audio cannot be rehydrated, so tokens may be spoken |
| Sarvam STT | Audio bytes, filename, language code | Voice transcription | Allowed only when `ALLOW_CLOUD_AUDIO=true` |
| Groq Whisper fallback | Audio bytes, filename, optional language | STT fallback when Sarvam is unavailable | Allowed only when `ALLOW_CLOUD_AUDIO=true` |

## Raw Audio Exception

PII cannot be reliably removed from audio before transcription. Cloud audio is
therefore disabled by default. `ALLOW_CLOUD_AUDIO=true` is appropriate only
when the operator has authorization and the recording contains synthetic or
otherwise approved data. Production deployments should use an approved local
STT service or a formally governed cloud processor.

## Credentials

Provider keys are read from environment variables or Catalyst runtime settings.
`.env` is ignored by Git. Keys must never appear in source, logs, screenshots,
issues, demo videos, or committed configuration.

## Authentication and Authorization

Production mode uses Catalyst Embedded Authentication. The backend initializes
the Catalyst Python SDK with each incoming request and resolves the active user
through Catalyst Authentication. Only active users assigned to configured
Admin or Investigator roles are accepted. Unknown or disabled roles fail
closed with `403`.

All protected `/api` requests are authenticated before route execution. Admin
operations additionally require the normalized `Admin` role server-side. The
frontend role display is informational and is not an authorization boundary.

Legacy SQLite users, passwords, and bearer sessions are available only when
`DEMO_MODE=true`; the default is `false`. In Catalyst mode, account creation,
deletion, disabling, password reset, and role assignment are managed in the
Catalyst Authentication console.

Audit events store the Catalyst `user_id`, display identity, normalized role,
action, resource, timestamp, detail, and source IP. Offender profile access,
report generation/download, and application admin views/actions are audited.

## Known Limits

Rule-based PII detection is defense in depth, not a formal data-loss-prevention
system. Unlabeled names, unusual address formats, case narrative details, and
PII embedded in images or audio may not be detected. A real deployment requires
schema-aware redaction, DLP scanning, encryption and key management, retention
controls, provider agreements, access reviews, and security monitoring.
