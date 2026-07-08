# AGENTS.md - NAMMA KSP

## Project context
Crime intelligence platform built for the Karnataka State Police Datathon
2026 (Hack2Skill). Stack: Zoho Catalyst (AppSail, QuickML, Cron, Signals),
Groq + Mistral for LLM inference, Sarvam AI for Kannada/English voice.

This is a working hackathon demo. Current focus: hardening it toward
production-grade - data governance, real auth, model reliability, testing.

## Working agreement
- Work one task at a time. Do not expand scope beyond what's asked.
- After every change, summarize the diff and the tradeoff you made in
  plain language before moving on.
- If a task requires a design decision (auth library, DB choice, etc.),
  stop and ask instead of picking silently.
- Never commit real credentials, API keys, or PII to the repo.
- All demo/test data is synthetic - do not treat it as real KSP data.
