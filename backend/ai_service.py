"""
ai_service.py — NAMMA KSP
──────────────────────────────
Conversational crime intelligence powered by Groq with model failover.
Every AI response includes reasoning, evidence, and data citations.
"""

import os
import logging
import re
import ast
import operator
from collections import OrderedDict
from typing import AsyncGenerator

from groq import Groq
from dotenv import load_dotenv
from pii_redaction import PiiRedactor

from database import fetch_all, fetch_dataframe, get_fir_by_id, search_offenders
from analytics import (
    search_firs, get_fir_detail, get_related_cases,
    get_district_stats, get_offender_profile, get_high_risk_offenders
)
from sarvam_service import (
    SarvamError,
    is_sarvam_configured,
    translate_text,
    transcribe_audio as sarvam_transcribe_audio,
)
from catalyst_runtime import cache_get_json, cache_put_json

load_dotenv()
logger = logging.getLogger(__name__)

# ─── Client Setup ─────────────────────────────────────────────────────────────
LLM_PROVIDER_MODE = os.getenv("LLM_PROVIDER_MODE", "cloud").strip().lower()
if LLM_PROVIDER_MODE not in {"cloud", "local"}:
    raise RuntimeError("LLM_PROVIDER_MODE must be 'cloud' or 'local'")

_groq_client: Groq | None = None
if LLM_PROVIDER_MODE == "local":
    MODEL = os.getenv("LOCAL_LLM_MODEL", "llama3.1:8b")
else:
    MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

GROQ_FALLBACK_MODELS = tuple(
    model.strip()
    for model in os.getenv(
        "GROQ_FALLBACK_MODELS",
        "qwen/qwen3.6-27b,openai/gpt-oss-20b,groq/compound-mini",
    ).split(",")
    if model.strip()
)
_active_model = MODEL


def _get_groq_client() -> Groq:
    """Create the provider client only when an AI request needs it."""
    global _groq_client
    if _groq_client is not None:
        return _groq_client

    if LLM_PROVIDER_MODE == "local":
        _groq_client = Groq(
            api_key=os.getenv("LOCAL_LLM_API_KEY", "local-development-key"),
            base_url=os.getenv("LOCAL_LLM_BASE_URL", "http://127.0.0.1:11434/v1"),
        )
    else:
        api_key = os.getenv("GROQ_API_KEY") or os.getenv("GROQ_RUNTIME_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not configured")
        _groq_client = Groq(api_key=api_key)
    return _groq_client


def _safe_chat_completion(messages: list[dict], **kwargs):
    """Redact outbound text, fail over retired models, and restore output locally."""
    global _active_model
    redactor = PiiRedactor()
    redacted_messages = redactor.redact_messages(messages)
    candidates = list(dict.fromkeys((_active_model, MODEL, *GROQ_FALLBACK_MODELS)))
    last_error: Exception | None = None

    for model in candidates:
        try:
            response = _get_groq_client().chat.completions.create(
                model=model,
                messages=redacted_messages,
                **kwargs,
            )
            _active_model = model
            content = redactor.restore(response.choices[0].message.content or "")
            return response, content
        except Exception as exc:
            status_code = getattr(exc, "status_code", None)
            body = getattr(exc, "body", None) or {}
            error = body.get("error", body) if isinstance(body, dict) else {}
            error_code = str(error.get("code", "")) if isinstance(error, dict) else ""
            message = str(error.get("message", exc)) if isinstance(error, dict) else str(exc)
            unavailable = status_code == 404 or error_code in {"model_not_found", "model_decommissioned"} or "does not exist" in message.lower()
            if not unavailable:
                raise
            last_error = exc
            logger.warning("Groq model %s is unavailable; trying the next configured model", model)

    raise RuntimeError("No configured Groq chat model is currently available") from last_error

# ─── Conversation History Store (in-memory per session) ──────────────────────
_sessions: dict[str, list[dict]] = {}
_response_cache: OrderedDict[str, dict] = OrderedDict()
_RESPONSE_CACHE_LIMIT = int(os.getenv("LLM_RESPONSE_CACHE_SIZE", "100"))


def _role_system_policy(user: dict | None) -> str:
    role = str((user or {}).get("role") or "Investigator")
    disclosure = str((user or {}).get("disclosure_mode") or "case-scoped-pii")
    return (
        f"Authenticated role: {role}. Disclosure mode: {disclosure}. "
        "Never reveal information beyond this disclosure mode. "
        "For aggregate-only or administrative-metadata users, refuse requests for "
        "case identities, offender identities, victim identities, addresses, or contact data."
    )


async def _load_session(session_id: str, runtime_request=None) -> list[dict]:
    if session_id in _sessions:
        return _sessions[session_id]
    if runtime_request is not None:
        managed = await cache_get_json(runtime_request, f"chat-session:{session_id}")
        if managed["used"] and isinstance(managed.get("data"), list):
            _sessions[session_id] = managed["data"]
            return _sessions[session_id]
    _sessions[session_id] = [{"role": "system", "content": SYSTEM_PROMPT}]
    return _sessions[session_id]


async def _persist_session(session_id: str, runtime_request=None) -> None:
    history = _sessions.get(session_id, [])
    if len(history) > 42:
        history = [history[0]] + history[-40:]
        _sessions[session_id] = history
    if runtime_request is not None:
        managed = await cache_put_json(
            runtime_request, f"chat-session:{session_id}", history, expiry_hours=24
        )
        if not managed["used"]:
            logger.warning("Catalyst chat-session cache unavailable: %s", managed.get("error"))


def _query_pattern(message: str, language: str) -> str:
    normalized = re.sub(r"\b(?:fir|off)\d+\b", "<record_id>", message.lower())
    normalized = re.sub(r"\b\d+\b", "<number>", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return f"{language}:{normalized}"


def _cache_response(key: str, payload: dict) -> None:
    _response_cache[key] = payload
    _response_cache.move_to_end(key)
    while len(_response_cache) > _RESPONSE_CACHE_LIMIT:
        _response_cache.popitem(last=False)


def _cached_response(key: str) -> dict | None:
    payload = _response_cache.get(key)
    if payload:
        _response_cache.move_to_end(key)
        return dict(payload)
    return None

SYSTEM_PROMPT = """You are NAMMA KSP, an expert crime intelligence analyst for Karnataka Police.
You have access to a database of 5,000 FIR records, 2,000 offenders, 3,000 victims, 100 locations, and 5,000 criminal relationships.

Your role:
- Answer questions about crime patterns, offenders, victims, districts, and case details.
- Provide evidence-based analysis grounded in the provided data context.
- Suggest investigation leads and related cases.
- Identify patterns and anomalies.
- Explain your reasoning step by step (Explainable AI) with confidence scores.
- ALWAYS reply in the language selected by the user (English or Kannada). If the selected language is Kannada, answer in clear Kannada. If English, answer in English.

Response behavior:
- Match the depth of the answer to the user's request.
- For greetings, thanks, confirmations, or casual conversation, reply naturally in one or two short sentences without database statistics or formal sections.
- For simple factual questions, give the direct answer first and include only the evidence needed to support it.
- Use the full structured format below only for requests that explicitly ask for analysis, investigation, comparison, recommendations, profiling, forecasting, or evidence.
- Resolve follow-up references such as "that district", "those cases", and "the second offender" from conversation history.

Analytical response format (only when warranted):
**1. DIRECT ANSWER / ನೇರ ಉತ್ತರ**
Provide a concise and direct answer to the query.

**2. REASONING / ವಿಶ್ಲೇಷಣೆ**
Explain step-by-step how you arrived at the conclusion.

**3. EVIDENCE & DATA SOURCES / ಪುರಾವೆ ಮತ್ತು ಮಾಹಿತಿ ಮೂಲಗಳು**
Cite specific database points (FIR IDs, offender IDs, districts, crime types) used.

**4. RECOMMENDATIONS / ಶಿಫಾರಸುಗಳು**
Provide actionable next steps for investigators.

**5. CONFIDENCE SCORE / ವಿಶ್ವಾಸಾರ್ಹತೆ ಸ್ಕೋರ್**
State the confidence score (0-100%) and explain the reasoning behind this score based on data completeness and risk factors.

Always be professional, precise, and factual. Never speculate beyond the data provided.
Districts covered: Bengaluru Urban, Bengaluru Rural, Mysuru, Mangaluru, Hubballi-Dharwad, Belagavi, Kalaburagi, Shivamogga, Tumakuru, Ballari, Vijayapura, Davanagere, Hassan, Udupi, Chikkamagaluru.
Crime types: Theft, Robbery, Burglary, Assault, Cyber Crime, Fraud, Drug Offense, Vehicle Theft, Domestic Violence, Murder, Kidnapping, Financial Fraud."""

MISSING_ENTITY_GUARDRAIL = """CRITICAL: The user is asking about an entity or case file that is completely missing from the verified official police database. You must explicitly inform the user that this specific record was not found in the verified ledger, and you must refuse to hallucinate any fictional details about it. Do not infer identity, allegations, location, status, associates, or history for a missing record. You may only suggest verifying the identifier or searching with known factual filters."""

_ENTITY_PATTERNS = {
    "fir": re.compile(r"\bFIR[\s-]?(\d{1,10})\b", re.IGNORECASE),
    "offender": re.compile(r"\b(?:OFF|SUSPECT)[\s-]?(\d{1,10})\b", re.IGNORECASE),
}


def _extract_entity_references(text: str) -> dict[str, list[str]]:
    """Extract and canonicalize explicit FIR/offender identifiers."""
    references: dict[str, list[str]] = {"fir": [], "offender": []}
    for entity_type, pattern in _ENTITY_PATTERNS.items():
        prefix = "FIR" if entity_type == "fir" else "OFF"
        for digits in pattern.findall(text):
            canonical = f"{prefix}{digits.zfill(5)}"
            if canonical not in references[entity_type]:
                references[entity_type].append(canonical)
    return references


async def _verify_entity_references(text: str) -> dict[str, list[str]]:
    """Verify explicit identifiers against the managed/local repository adapter."""
    references = _extract_entity_references(text)
    verified: list[str] = []
    missing: list[str] = []

    for fir_id in references["fir"][:5]:
        try:
            record = await get_fir_by_id(fir_id)
        except Exception as exc:
            logger.exception("FIR verification failed for %s: %s", fir_id, exc)
            record = None
        (verified if record else missing).append(fir_id)

    for offender_id in references["offender"][:5]:
        try:
            records = await search_offenders({"offender_id": offender_id, "limit": 1})
        except Exception as exc:
            logger.exception("Offender verification failed for %s: %s", offender_id, exc)
            records = []
        (verified if records else missing).append(offender_id)

    return {"verified": verified, "missing": missing}


QUERY_REWRITE_PROMPT = """You are a crime intelligence search query translator and analyzer.
Your task is to convert the user's input message into a single standalone database search query in English.
You must:
1. Translate any Kannada text or Kannada keywords (e.g., district names like ಮೈಸೂರು to Mysuru, crime types like ಕನ್ನಗಳ್ಳತನ to Burglary) into standard English database terms.
2. If there is conversation history, combine the user's follow-up message with the previous context so that the search query contains all necessary filters (e.g., specific FIR IDs, offender names/IDs, districts, or crime types).
3. Output ONLY the standalone search query in English. Do NOT include any explanations, greetings, introduction, or conversational filler.

Examples:
Conversation History:
User: Show burglary cases in Mysuru.
Assistant: Here are the burglary cases in Mysuru.
Follow-up User Query: Which offenders are involved most frequently?
Output Standalone English Search Query: Which offenders are involved most frequently in burglary cases in Mysuru?

Conversation History:
User: Show details for FIR00123.
Assistant: FIR00123 is a theft case in Bengaluru Urban.
Follow-up User Query: Who is the victim?
Output Standalone English Search Query: Who is the victim in FIR00123?

Conversation History:
(Empty)
User Query: ಮೈಸೂರಿನಲ್ಲಿ ಕನ್ನಗಳ್ಳತನ ಪ್ರಕರಣಗಳನ್ನು ತೋರಿಸಿ.
Output Standalone English Search Query: Show burglary cases in Mysuru.
"""

async def _rewrite_query(session_id: str, user_message: str) -> str:
    """
    Use Groq to rewrite the user message into a standalone English query,
    incorporating conversational history and translating Kannada keywords.
    """
    if session_id not in _sessions or len(_sessions[session_id]) <= 1:
        # No history
        history_context = "No previous history."
    else:
        # Extract last 4 turns of history to keep context clean
        history_turns = []
        for turn in _sessions[session_id][1:-1][-4:]:
            role = "User" if turn["role"] == "user" else "Assistant"
            content = turn["content"]
            # If the user message was augmented, strip the context block
            if role == "User" and "--- Relevant Database Context ---" in content:
                content = content.split("--- Relevant Database Context ---")[0].replace("User Query:", "").strip()
            history_turns.append(f"{role}: {content}")
        history_context = "\n".join(history_turns)

    prompt = f"""{QUERY_REWRITE_PROMPT}

Conversation History:
{history_context}

Follow-up User Query: {user_message}
Output Standalone English Search Query:"""

    try:
        response, rewritten = _safe_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.1,  # deterministic
        )
        rewritten = rewritten.strip()
        logger.info("Rewritten query for session %s: '%s' -> '%s'", session_id, user_message, rewritten)
        return rewritten
    except Exception as e:
        logger.error("Query rewrite error: %s. Using original message.", e)
        return user_message


# ─── Context Fetcher ──────────────────────────────────────────────────────────

async def _fetch_relevant_context(user_query: str) -> str:
    """
    Pull relevant data from the DB based on query keywords
    and format as a concise context block for the LLM.
    """
    q = user_query.lower()
    context_parts = []

    # District query
    districts_mentioned = [
        d for d in [
            "bengaluru", "mysuru", "mangaluru", "hubballi", "belagavi",
            "kalaburagi", "shivamogga", "tumakuru", "ballari",
            "vijayapura", "davanagere", "hassan", "udupi", "chikkamagaluru"
        ] if d in q
    ]

    # Crime type query
    crime_types_mentioned = [
        ct for ct in [
            "theft", "robbery", "burglary", "assault", "cyber", "fraud",
            "drug", "vehicle", "domestic", "murder", "kidnapping", "financial"
        ] if ct in q
    ]

    # FIR ID mentioned
    import re
    fir_ids = re.findall(r'FIR\d{5}', user_query.upper())

    # Offender ID mentioned
    offender_ids = re.findall(r'OFF\d{5}', user_query.upper())

    # Fetch FIR detail if specific FIR mentioned
    for fid in fir_ids[:2]:
        detail = await get_fir_detail(fid)
        if detail:
            context_parts.append(f"FIR Detail [{fid}]: {detail}")
            related = await get_related_cases(fid)
            if related:
                context_parts.append(f"Related Cases for {fid}: {related[:5]}")

    # Fetch offender profile if mentioned
    for oid in offender_ids[:2]:
        profile = await get_offender_profile(oid)
        if profile:
            context_parts.append(f"Offender Profile [{oid}]: {profile}")

    # District-specific crime stats
    if districts_mentioned:
        for d_key in districts_mentioned[:2]:
            rows = await fetch_all("""
                SELECT crime_type, COUNT(*) as count, status
                FROM firs
                WHERE LOWER(district) LIKE ?
                GROUP BY crime_type, status
                ORDER BY count DESC
                LIMIT 10
            """, (f"%{d_key}%",))
            if rows:
                context_parts.append(f"Crime stats for district matching '{d_key}': {rows}")

    # Crime type stats
    if crime_types_mentioned:
        for ct in crime_types_mentioned[:2]:
            rows = await fetch_all("""
                SELECT district, COUNT(*) as count,
                       SUM(CASE WHEN status='Open' THEN 1 ELSE 0 END) as open_cases
                FROM firs
                WHERE LOWER(crime_type) LIKE ?
                GROUP BY district
                ORDER BY count DESC
                LIMIT 8
            """, (f"%{ct}%",))
            if rows:
                context_parts.append(f"District breakdown for '{ct}': {rows}")

    # High risk offenders query
    if any(w in q for w in ["high risk", "dangerous", "repeat", "wanted", "worst"]):
        offenders = await get_high_risk_offenders(limit=10)
        context_parts.append(f"Top high-risk offenders: {offenders}")

    # General stats if overview question
    if any(w in q for w in ["total", "overview", "summary", "how many", "statistics", "stats"]):
        rows = await fetch_all("""
            SELECT crime_type, COUNT(*) as count,
                   SUM(CASE WHEN status='Open' THEN 1 ELSE 0 END) as open
            FROM firs GROUP BY crime_type ORDER BY count DESC
        """)
        context_parts.append(f"Overall crime type distribution: {rows}")

        district_rows = await fetch_all("""
            SELECT district, COUNT(*) as total
            FROM firs GROUP BY district ORDER BY total DESC LIMIT 5
        """)
        context_parts.append(f"Top 5 districts by FIR count: {district_rows}")

    # Recent cases
    if any(w in q for w in ["recent", "latest", "new", "last"]):
        rows = await fetch_all("""
            SELECT fir_id, crime_type, date, district, status
            FROM firs ORDER BY date DESC LIMIT 10
        """)
        context_parts.append(f"Most recent 10 FIRs: {rows}")

    if not context_parts:
        # Default: provide general overview
        rows = await fetch_all("""
            SELECT crime_type, COUNT(*) as count
            FROM firs GROUP BY crime_type ORDER BY count DESC LIMIT 6
        """)
        context_parts.append(f"General crime overview: {rows}")

    return "\n\n".join(context_parts) if context_parts else "No specific data context retrieved."


# ─── Main Chat Function ───────────────────────────────────────────────────────

def _response_profile(message: str, has_history: bool) -> dict:
    """Select answer depth from user intent while preserving follow-up context."""
    q = message.lower().strip()
    deep_terms = (
        "deep analysis", "investigate", "investigation plan", "profile", "forecast",
        "predict", "network", "relationship", "modus operandi", "root cause",
        "strategic", "comprehensive", "detailed report", "explain everything",
    )
    analytical_terms = (
        "analyze", "analyse", "compare", "pattern", "trend", "why", "risk",
        "recommend", "evidence", "hotspot", "repeat offender", "similar cases",
        "correlation", "how has", "what changed", "identify links",
    )
    factual_starters = (
        "who ", "what ", "when ", "where ", "which ", "how many", "show ",
        "list ", "find ", "give me", "status of", "details of",
    )
    follow_up_terms = ("that ", "those ", "them", "it ", "same ", "second ", "first ", "previous ", "more ")

    if any(term in q for term in deep_terms):
        return {
            "name": "deep-investigation", "max_tokens": 1500,
            "instruction": "Provide a comprehensive investigation-grade analysis with direct findings, relationship and pattern reasoning, specific evidence, alternative interpretations, prioritized actions, limitations, and a calibrated confidence assessment.",
        }
    if any(term in q for term in analytical_terms) or (has_history and any(term in q for term in follow_up_terms)):
        return {
            "name": "analytical", "max_tokens": 1100,
            "instruction": "Provide a focused analytical answer: lead with the finding, explain the important reasoning, cite relevant evidence, and give actionable implications. Include only sections that add value.",
        }
    if q.startswith(factual_starters) or len(q.split()) <= 12:
        return {
            "name": "factual", "max_tokens": 500,
            "instruction": "Answer directly and precisely. Include the minimum supporting evidence needed, usually in one to three short paragraphs or a compact list.",
        }
    return {
        "name": "standard", "max_tokens": 800,
        "instruction": "Give a balanced answer with a clear conclusion, relevant evidence, and concise interpretation. Expand only where the question benefits from it.",
    }


KSP_DOMAIN_TERMS = {
    "ksp", "police", "karnataka police", "crime", "criminal", "case", "fir",
    "offender", "accused", "victim", "suspect", "investigation", "investigator",
    "station", "police station", "district", "hotspot", "network", "relationship",
    "repeat offender", "risk", "evidence", "modus", "fraud", "theft", "robbery",
    "burglary", "assault", "cyber", "drug", "vehicle theft", "domestic violence",
    "murder", "kidnapping", "financial fraud", "forecast", "early warning",
    "profile", "timeline", "status", "report", "audit", "analytics", "pattern",
    "trend", "bengaluru", "mysuru", "mangaluru", "hubballi", "belagavi",
    "kalaburagi", "shivamogga", "tumakuru", "ballari", "vijayapura",
    "davanagere", "hassan", "udupi", "chikkamagaluru",
    "ಅಪರಾಧ", "ಪೊಲೀಸ್", "ಪ್ರಕರಣ", "ಎಫ್‌ಐಆರ್", "ಎಫ್ಐಆರ್", "ಆರೋಪಿ",
    "ಬಲಿ", "ತನಿಖೆ", "ಜಿಲ್ಲೆ", "ಕಳ್ಳತನ", "ದರೋಡೆ", "ಕೊಲೆ", "ಸೈಬರ್",
}

FOLLOW_UP_TERMS = {
    "that", "those", "them", "it", "same", "previous", "above", "second", "first",
    "more", "details", "explain", "compare", "why", "how", "ಇದು", "ಅದು", "ಅವರ",
}

_ARITHMETIC_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}


def _try_safe_arithmetic(message: str) -> int | float | None:
    """Evaluate a small numeric expression without exposing Python eval."""
    expression = message.strip().replace("×", "*").replace("÷", "/").replace("^", "**")
    expression = re.sub(r"^(?:what is|calculate|compute)\s+", "", expression, flags=re.IGNORECASE)
    expression = expression.rstrip(" ?=")
    if not expression or len(expression) > 80 or not re.fullmatch(r"[\d\s+\-*/%.()]+", expression):
        return None

    try:
        tree = ast.parse(expression, mode="eval")
    except (SyntaxError, ValueError):
        return None

    node_count = 0

    def evaluate(node):
        nonlocal node_count
        node_count += 1
        if node_count > 40:
            raise ValueError("expression is too complex")
        if isinstance(node, ast.Expression):
            return evaluate(node.body)
        if isinstance(node, ast.Constant) and type(node.value) in {int, float}:
            if abs(node.value) > 1_000_000_000:
                raise ValueError("operand is too large")
            return node.value
        if isinstance(node, ast.UnaryOp) and type(node.op) in _ARITHMETIC_OPERATORS:
            return _ARITHMETIC_OPERATORS[type(node.op)](evaluate(node.operand))
        if isinstance(node, ast.BinOp) and type(node.op) in _ARITHMETIC_OPERATORS:
            left = evaluate(node.left)
            right = evaluate(node.right)
            if isinstance(node.op, ast.Pow) and (abs(right) > 8 or abs(left) > 1_000_000):
                raise ValueError("power operation is too large")
            result = _ARITHMETIC_OPERATORS[type(node.op)](left, right)
            if abs(result) > 1_000_000_000_000:
                raise ValueError("result is too large")
            return result
        raise ValueError("unsupported expression")

    try:
        result = evaluate(tree)
    except (ArithmeticError, TypeError, ValueError, OverflowError):
        return None
    return int(result) if isinstance(result, float) and result.is_integer() else result


def _is_ksp_domain_query(message: str, has_history: bool) -> bool:
    """Allow only Karnataka Police/crime-intelligence questions into the LLM path."""
    q = message.lower().strip()
    if not q:
        return False
    if any(term in q for term in KSP_DOMAIN_TERMS):
        return True

    import re
    if re.search(r"\b(fir|off)\d{5}\b", q):
        return True

    words = set(re.findall(r"[\w\u0c80-\u0cff]+", q))
    if has_history and words & FOLLOW_UP_TERMS:
        return True
    return False


def _domain_refusal(language: str) -> str:
    if language == "kn-IN":
        return "ನಾನು NAMMA KSP ಪೊಲೀಸ್ ಮತ್ತು ಅಪರಾಧ ಬುದ್ಧಿಮತ್ತೆ ವಿಷಯಗಳಿಗೆ ಮಾತ್ರ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ದಯವಿಟ್ಟು FIR, ಪ್ರಕರಣ, ಅಪರಾಧ ಮಾದರಿ, offender, ಜಿಲ್ಲೆ, hotspot, report ಅಥವಾ ತನಿಖೆಗೆ ಸಂಬಂಧಿಸಿದ ಪ್ರಶ್ನೆ ಕೇಳಿ."
    return "I can only help with NAMMA KSP police and crime-intelligence topics. Please ask about FIRs, cases, crime patterns, offenders, districts, hotspots, reports, or investigation support."

async def chat(
    session_id: str,
    user_message: str,
    language: str = "en-US",
    runtime_request=None,
    user: dict | None = None,
) -> dict:
    """
    Process a chat message and return AI response with reasoning.

    Returns:
      {
        "response": str,       # Main AI answer
        "evidence": str,       # Data used
        "session_id": str,
        "model": str
      }
    """
    clean_message = user_message.strip()
    history = await _load_session(session_id, runtime_request)
    history[0] = {
        "role": "system",
        "content": f"{SYSTEM_PROMPT}\n\n{_role_system_policy(user)}",
    }

    arithmetic_result = _try_safe_arithmetic(clean_message)
    if arithmetic_result is not None:
        ai_reply = str(arithmetic_result)
        history.extend([
            {"role": "user", "content": clean_message},
            {"role": "assistant", "content": ai_reply},
        ])
        await _persist_session(session_id, runtime_request)
        return {
            "response": ai_reply,
            "evidence": "Deterministic arithmetic evaluator",
            "sources": [],
            "cached": False,
            "session_id": session_id,
            "model": "deterministic-calculator",
            "tokens_used": 0,
        }

    # Handle conversational turns without inventing crime analysis.
    normalized = clean_message.lower().strip(" .,!?")
    greetings = {"hi", "hello", "hey", "hii", "good morning", "good afternoon", "good evening", "ನಮಸ್ಕಾರ", "ಹಾಯ್"}
    thanks = {"thanks", "thank you", "thankyou", "ok thanks", "ಧನ್ಯವಾದ", "ಧನ್ಯವಾದಗಳು"}
    if normalized in greetings or normalized in thanks:
        if normalized in thanks:
            ai_reply = "ಸ್ವಾಗತ. ಇನ್ನೇನಾದರೂ ತನಿಖಾ ಸಹಾಯ ಬೇಕಿದ್ದರೆ ಕೇಳಿ." if language == "kn-IN" else "You're welcome. Ask whenever you need more investigative support."
        else:
            ai_reply = "ನಮಸ್ಕಾರ. ಇಂದು ಯಾವ ಪ್ರಕರಣ ಅಥವಾ ಅಪರಾಧ ಮಾದರಿಯನ್ನು ಪರಿಶೀಲಿಸಬೇಕು?" if language == "kn-IN" else "Hello. What case, offender, location, or crime pattern would you like to investigate?"
        history.extend([
            {"role": "user", "content": clean_message},
            {"role": "assistant", "content": ai_reply},
        ])
        await _persist_session(session_id, runtime_request)
        return {"response": ai_reply, "evidence": "", "sources": [], "cached": False, "session_id": session_id, "model": "conversation-router", "tokens_used": 0}
    if not _is_ksp_domain_query(clean_message, len(history) > 1):
        ai_reply = _domain_refusal(language)
        history.extend([
            {"role": "user", "content": clean_message},
            {"role": "assistant", "content": ai_reply},
        ])
        await _persist_session(session_id, runtime_request)
        return {
            "response": ai_reply,
            "evidence": "",
            "sources": [],
            "cached": False,
            "session_id": session_id,
            "model": "domain-router",
            "tokens_used": 0,
        }

    profile = _response_profile(clean_message, len(history) > 1)

    # Resolve context using query rewrite helper (translates and merges history)
    rewritten_query = await _rewrite_query(session_id, user_message)

    entity_status = await _verify_entity_references(f"{clean_message}\n{rewritten_query}")

    # Missing explicit IDs must never be replaced with unrelated overview data.
    if entity_status["missing"]:
        missing_text = ", ".join(entity_status["missing"])
        context = f"Verified ledger lookup: no record exists for {missing_text}."
    else:
        context = await _fetch_relevant_context(rewritten_query)
    logger.info("Context fetched for session %s: %d chars", session_id, len(context))

    target_lang_instruction = "English" if language == "en-US" else "Kannada"
    sources = [{
        "id": "S1",
        "title": "NAMMA KSP database retrieval",
        "query": rewritten_query,
        "evidence_excerpt": context[:500] + ("..." if len(context) > 500 else ""),
    }]
    cache_key = _query_pattern(rewritten_query, language)

    # Augment user message with context (saving original message text for history clean-up)
    augmented_message = f"""User Query: {user_message}

--- Relevant Database Context ---
{context}
--- End Context ---

Response depth: {profile['name']}.
{profile['instruction']}
Answer only what the user asked. Do not add unrelated statistics or force every analytical section into the response.
Every numeric claim derived from the database context must include the citation [S1]. Do not cite general advice or non-numeric interpretation.
IMPORTANT: You MUST write your entire response in {target_lang_instruction} language only.
If the selected language is Kannada, write in clean, grammatically correct Kannada script."""

    history.append({"role": "user", "content": augmented_message})

    # Call Groq API
    try:
        completion_messages = history
        if entity_status["missing"]:
            completion_messages = [
                history[0],
                {
                    "role": "system",
                    "content": (
                        f"{MISSING_ENTITY_GUARDRAIL}\n"
                        f"Missing verified identifiers: {', '.join(entity_status['missing'])}."
                    ),
                },
                *history[1:],
            ]
        response, ai_reply = _safe_chat_completion(
            messages=completion_messages,
            max_tokens=profile["max_tokens"],
            temperature=0.3,
            top_p=0.9,
        )
    except Exception as exc:
        cached = _cached_response(cache_key)
        if cached:
            logger.warning("LLM unavailable for %s; returning cached response: %s", cache_key, exc)
            history.pop()
            return {
                **cached,
                "session_id": session_id,
                "cached": True,
                "warning": "AI unavailable, showing cached data",
            }
        raise

    # Check if we requested Kannada but response has no Kannada characters
    if language == "kn-IN" and not any('\u0c80' <= c <= '\u0cff' for c in ai_reply):
        logger.info("Response was in English but Kannada was requested. Translating response with Sarvam...")
        try:
            if is_sarvam_configured():
                ai_reply = await translate_text(ai_reply, target_language_code="kn-IN", source_language_code="en-IN")
            else:
                translation_prompt = f"Translate the following English text to clean, natural, grammatically correct Kannada script. Return ONLY the translated Kannada text, preserving the sections and markdown formatting. Do not include any explanations.\n\nText:\n{ai_reply}"
                translation_response, ai_reply = _safe_chat_completion(
                    messages=[{"role": "user", "content": translation_prompt}],
                    max_tokens=2000,
                    temperature=0.2,
                )
        except Exception as te:
            logger.error("Failed to translate English response to Kannada: %s", te)

    # Store assistant response (clean, without augmented context)
    history.append({"role": "assistant", "content": ai_reply})

    await _persist_session(session_id, runtime_request)

    result = {
        "response":   ai_reply,
        "evidence":   context[:500] + "..." if len(context) > 500 else context,
        "sources":    sources,
        "cached":     False,
        "session_id": session_id,
        "model":      _active_model,
        "response_depth": profile["name"],
        "tokens_used": response.usage.total_tokens if response.usage else 0
    }
    _cache_response(cache_key, {key: value for key, value in result.items() if key != "session_id"})
    return result


# ─── Case Summary Generator ───────────────────────────────────────────────────

async def generate_case_summary(fir_id: str) -> dict:
    """
    Generate an AI-powered investigation summary for a specific FIR.
    Includes case facts, risk assessment, and recommended actions.
    """
    detail = await get_fir_detail(fir_id)
    if not detail:
        return {"error": f"FIR {fir_id} not found"}

    related = await get_related_cases(fir_id)
    offender_profile = await get_offender_profile(detail.get("offender_id", ""))

    context = f"""
FIR Details:
- FIR ID: {detail.get('fir_id')}
- Crime Type: {detail.get('crime_type')}
- Date: {detail.get('date')}
- District: {detail.get('district')}
- Police Station: {detail.get('police_station')}
- Status: {detail.get('status')}
- Offender: {detail.get('offender_name')} (ID: {detail.get('offender_id')})
  - Age: {detail.get('offender_age')}, Gender: {detail.get('offender_gender')}
  - Risk Category: {detail.get('risk_category')}
  - Previous FIRs: {detail.get('previous_firs')}
- Victim: {detail.get('victim_name')} (ID: {detail.get('victim_id')})
  - Age: {detail.get('victim_age')}, Gender: {detail.get('victim_gender')}
- Location: Lat {detail.get('latitude')}, Lon {detail.get('longitude')}

Related Cases ({len(related)} found):
{chr(10).join([f"  - {r['fir_id']}: {r['crime_type']} in {r['district']} ({r['relation']})" for r in related[:5]])}

Offender Risk Factors: {offender_profile.get('risk_factors', []) if offender_profile else 'N/A'}
"""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": f"""Generate a professional investigation summary report for this case:

{context}

Structure your response as:
1. CASE OVERVIEW
2. OFFENDER ASSESSMENT
3. RELATED CASES & PATTERNS
4. RISK EVALUATION
5. INVESTIGATION RECOMMENDATIONS
6. PRIORITY ACTIONS"""}
    ]

    response, summary = _safe_chat_completion(
        messages=messages,
        max_tokens=1200,
        temperature=0.2,
    )

    return {
        "fir_id":    fir_id,
        "summary":   summary,
        "fir_data":  detail,
        "related":   related,
        "model":     _active_model
    }


# ─── Investigation Recommendations ───────────────────────────────────────────

async def get_investigation_recommendations(district: str = None, crime_type: str = None) -> dict:
    """
    AI-generated proactive crime prevention and investigation recommendations
    based on current crime patterns in the database.
    """
    conditions = []
    params = []
    if district:
        conditions.append("district = ?")
        params.append(district)
    if crime_type:
        conditions.append("crime_type = ?")
        params.append(crime_type)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    stats = await fetch_all(f"""
        SELECT crime_type, district, COUNT(*) as count,
               SUM(CASE WHEN status='Open' THEN 1 ELSE 0 END) as open_cases
        FROM firs {where}
        GROUP BY crime_type, district
        ORDER BY count DESC
        LIMIT 15
    """, tuple(params))

    high_risk = await get_high_risk_offenders(limit=5)

    context = f"""
Crime Pattern Data{' for ' + district if district else ''}{' - ' + crime_type if crime_type else ''}:
{stats}

Top High-Risk Offenders:
{high_risk}
"""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": f"""Based on the following crime pattern data, provide strategic investigation recommendations and proactive crime prevention strategies:

{context}

Provide:
1. KEY PATTERN INSIGHTS
2. HIGH-PRIORITY AREAS
3. RESOURCE ALLOCATION RECOMMENDATIONS
4. PROACTIVE PREVENTION STRATEGIES
5. INTER-DISTRICT COORDINATION NEEDS"""}
    ]

    response, recommendations = _safe_chat_completion(
        messages=messages,
        max_tokens=1000,
        temperature=0.3,
    )

    return {
        "recommendations": recommendations,
        "data_context": stats[:5],
        "model": _active_model
    }


# ─── Session Management ───────────────────────────────────────────────────────

def clear_session(session_id: str) -> bool:
    """Clear conversation history for a session."""
    if session_id in _sessions:
        del _sessions[session_id]
        return True
    return False


def get_session_history(session_id: str) -> list[dict]:
    """Get conversation turns for a session (excluding system prompt)."""
    history = _sessions.get(session_id, [])
    return [h for h in history if h["role"] != "system"]


async def transcribing_audio(content: bytes, filename: str, language: str = None) -> str:
    """
    Transcribe audio bytes using Sarvam Saaras, with Groq Whisper as fallback.
    """
    import asyncio
    from functools import partial
    from typing import Optional

    try:
        if is_sarvam_configured():
            return await sarvam_transcribe_audio(content, filename, language)

        if os.getenv("ALLOW_CLOUD_AUDIO", "false").strip().lower() != "true":
            raise SarvamError("Cloud audio processing is disabled")

        ext = filename.split(".")[-1].lower() if "." in filename else "webm"
        content_type = f"audio/{ext}" if ext in ["webm", "mp3", "wav", "m4a", "ogg"] else "audio/webm"
        
        kwargs = {
            "file": (filename, content, content_type),
            "model": "whisper-large-v3",
            "response_format": "json"
        }
        if language:
            kwargs["language"] = language
            
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(
            None,
            partial(_get_groq_client().audio.transcriptions.create, **kwargs)
        )
        return response.text.strip()
    except Exception as e:
        logger.error("Audio transcription failed: %s", e)
        raise e

