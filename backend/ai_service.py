"""
ai_service.py — NAMMA KSP
──────────────────────────────
Conversational crime intelligence powered by Groq (mistral-saba-24b).
Every AI response includes reasoning, evidence, and data citations.
"""

import os
import logging
from typing import AsyncGenerator

from groq import Groq
from dotenv import load_dotenv

from database import fetch_all, fetch_dataframe
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

load_dotenv()
logger = logging.getLogger(__name__)

# ─── Client Setup ─────────────────────────────────────────────────────────────
_groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# ─── Conversation History Store (in-memory per session) ──────────────────────
_sessions: dict[str, list[dict]] = {}

SYSTEM_PROMPT = """You are NAMMA KSP, an expert crime intelligence analyst for Karnataka Police.
You have access to a database of 5,000 FIR records, 2,000 offenders, 3,000 victims, 100 locations, and 5,000 criminal relationships.

Your role:
- Answer questions about crime patterns, offenders, victims, districts, and case details.
- Provide evidence-based analysis grounded in the provided data context.
- Suggest investigation leads and related cases.
- Identify patterns and anomalies.
- Explain your reasoning step by step (Explainable AI) with confidence scores.
- ALWAYS reply in the language selected by the user (English or Kannada). If the selected language is Kannada, answer in clear Kannada. If English, answer in English.

Response format:
Please structure your response with the following sections:
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
        response = _groq_client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.1,  # deterministic
        )
        rewritten = response.choices[0].message.content.strip()
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
    fir_ids = re.findall(r'fir\d{5}', q.upper())

    # Offender ID mentioned
    offender_ids = re.findall(r'off\d{5}', q.upper())

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

async def chat(
    session_id: str,
    user_message: str,
    language: str = "en-US"
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
    # Initialize session
    if session_id not in _sessions:
        _sessions[session_id] = [{"role": "system", "content": SYSTEM_PROMPT}]

    history = _sessions[session_id]

    # Resolve context using query rewrite helper (translates and merges history)
    rewritten_query = await _rewrite_query(session_id, user_message)

    # Fetch relevant data context using the rewritten English query
    context = await _fetch_relevant_context(rewritten_query)
    logger.info("Context fetched for session %s: %d chars", session_id, len(context))

    target_lang_instruction = "English" if language == "en-US" else "Kannada"

    # Augment user message with context (saving original message text for history clean-up)
    augmented_message = f"""User Query: {user_message}

--- Relevant Database Context ---
{context}
--- End Context ---

Please analyze the above data and answer the query.
IMPORTANT: You MUST write your entire response (including all sections like Direct Answer, Reasoning, Evidence, Recommendations, Confidence Score) in {target_lang_instruction} language only.
If the selected language is Kannada, write in clean, grammatically correct Kannada script."""

    history.append({"role": "user", "content": augmented_message})

    # Call Groq API
    response = _groq_client.chat.completions.create(
        model=MODEL,
        messages=history,
        max_tokens=1500,
        temperature=0.3,   # Low temperature for factual responses
        top_p=0.9,
    )

    ai_reply = response.choices[0].message.content

    # Check if we requested Kannada but response has no Kannada characters
    if language == "kn-IN" and not any('\u0c80' <= c <= '\u0cff' for c in ai_reply):
        logger.info("Response was in English but Kannada was requested. Translating response with Sarvam...")
        try:
            if is_sarvam_configured():
                ai_reply = await translate_text(ai_reply, target_language_code="kn-IN", source_language_code="en-IN")
            else:
                translation_prompt = f"Translate the following English text to clean, natural, grammatically correct Kannada script. Return ONLY the translated Kannada text, preserving the sections and markdown formatting. Do not include any explanations.\n\nText:\n{ai_reply}"
                translation_response = _groq_client.chat.completions.create(
                    model=MODEL,
                    messages=[{"role": "user", "content": translation_prompt}],
                    max_tokens=2000,
                    temperature=0.2,
                )
                ai_reply = translation_response.choices[0].message.content
        except Exception as te:
            logger.error("Failed to translate English response to Kannada: %s", te)

    # Store assistant response (clean, without augmented context)
    history.append({"role": "assistant", "content": ai_reply})

    # Keep history bounded (last 20 turns)
    if len(history) > 42:
        _sessions[session_id] = [history[0]] + history[-40:]

    return {
        "response":   ai_reply,
        "evidence":   context[:500] + "..." if len(context) > 500 else context,
        "session_id": session_id,
        "model":      MODEL,
        "tokens_used": response.usage.total_tokens if response.usage else 0
    }


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

    response = _groq_client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=1200,
        temperature=0.2,
    )

    return {
        "fir_id":    fir_id,
        "summary":   response.choices[0].message.content,
        "fir_data":  detail,
        "related":   related,
        "model":     MODEL
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

    response = _groq_client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=1000,
        temperature=0.3,
    )

    return {
        "recommendations": response.choices[0].message.content,
        "data_context": stats[:5],
        "model": MODEL
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
            partial(_groq_client.audio.transcriptions.create, **kwargs)
        )
        return response.text.strip()
    except Exception as e:
        logger.error("Audio transcription failed: %s", e)
        raise e

