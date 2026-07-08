"""
main.py — NAMMA KSP
────────────────────────
FastAPI application entry point.
All API routes for the NAMMA KSP platform.
"""

import os
import sys
import logging
import uuid
import re
import time
import json
from collections import defaultdict
from pathlib import Path
from datetime import datetime, UTC
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Depends, Header, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv

# Add backend dir to path so sibling imports work
sys.path.insert(0, str(Path(__file__).parent))

load_dotenv(Path(__file__).parent.parent / ".env")

import mimetypes
mimetypes.init()
mimetypes.add_type("application/pdf", ".pdf")

from database  import (
    init_db, get_db_stats, log_audit, fetch_one, fetch_all,
    record_report_archive, list_report_archive, record_alert_event,
    list_alert_events, record_job_run, list_job_runs
)
from analytics import (
    get_overview_stats, get_crime_type_distribution, get_monthly_trends,
    get_district_stats, get_district_top_crime, get_hotspot_data,
    get_district_crime_density, get_offender_profile, get_high_risk_offenders,
    get_repeat_offenders, search_firs, get_fir_detail, get_related_cases,
    get_police_station_stats, get_yearly_comparison, get_sociological_insights,
    get_financial_link_analysis, get_crime_forecast, get_explainable_intelligence,
    get_advanced_intelligence_summary, get_submission_readiness
)
from network   import get_network_data, get_shared_offender_network
from ai_service import chat, generate_case_summary, get_investigation_recommendations, clear_session
from sarvam_service import (
    SarvamError,
    detect_language,
    is_sarvam_configured,
    normalize_language_code,
    synthesize_speech,
    translate_text,
)
from catalyst_auth import AUTH_MODE, DEMO_MODE, get_all_catalyst_users, get_current_catalyst_user
from catalyst_services import get_catalyst_service_matrix
from report    import (
    generate_case_report, generate_district_report, generate_chat_log_report,
    generate_recommendations_report
)

class StructuredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    handler = logging.StreamHandler()
    if os.getenv("STRUCTURED_LOGS", "true").strip().lower() == "true":
        handler.setFormatter(StructuredFormatter())
    else:
        handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
    logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)

    sentry_dsn = os.getenv("SENTRY_DSN", "").strip()
    if sentry_dsn:
        try:
            import sentry_sdk
            sentry_sdk.init(dsn=sentry_dsn, traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.05")))
            logging.getLogger(__name__).info("Sentry error reporting enabled")
        except Exception as exc:
            logging.getLogger(__name__).warning("Sentry setup skipped: %s", exc)


configure_logging()
logger = logging.getLogger(__name__)

# ─── App Setup ────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
REPORTS_DIR  = BASE_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="NAMMA KSP",
    description="Intelligent Crime Analytics & Investigation Support Platform — Karnataka Police",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled request failure",
        extra={"path": request.url.path, "method": request.method},
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": request.headers.get("x-request-id", "")},
    )

ALLOWED_ORIGINS = [
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "https://nammaksp-60074625517.development.catalystserverless.in",
    "https://namma-ksp-50043229029.development.catalystappsail.in",
]

# Catalyst's edge gateway supplies CORS in AppSail. Adding it twice causes
# browsers to reject otherwise successful login responses.
if not os.getenv("X_ZOHO_CATALYST_LISTEN_PORT"):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# ─── No-Cache Middleware (dev mode — forces browsers to always get fresh files) ─
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        # Apply no-cache only to HTML, JS, CSS (not API responses or binary files)
        ct = response.headers.get("content-type", "")
        if any(x in ct for x in ("text/html", "javascript", "text/css")):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), geolocation=(), payment=()"
        return response

app.add_middleware(NoCacheMiddleware)


# ─── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    logger.info("NAMMA KSP starting up...")
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    await init_db()
    logger.info("Database ready. API is live.")


# ─── Validation Helpers & Pydantic Models ─────────────────────────────────────
FIR_ID_RE = re.compile(r"^FIR\d{5}$")
OFFENDER_ID_RE = re.compile(r"^OFF\d{5}$")
SESSION_ID_RE = re.compile(r"^[A-Za-z0-9_.:-]{1,80}$")
SAFE_TEXT_RE = re.compile(r"^[\w\s.,:/()&+-]+$", re.UNICODE)
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
VALID_LANGUAGES = {"en-US", "kn-IN", "en", "kn"}
VALID_ROLES = {"Admin", "Investigator"}
VALID_STATUSES = {"Open", "Closed", "Under Investigation"}


def _clean_text(value: str | None, field_name: str, *, max_length: int = 120, required: bool = True) -> str | None:
    if value is None:
        if required:
            raise ValueError(f"{field_name} is required")
        return None
    cleaned = value.strip()
    if required and not cleaned:
        raise ValueError(f"{field_name} cannot be empty")
    if not cleaned:
        return None
    if len(cleaned) > max_length:
        raise ValueError(f"{field_name} is too long")
    if not SAFE_TEXT_RE.match(cleaned):
        raise ValueError(f"{field_name} contains unsupported characters")
    return cleaned


def _validate_fir_id(value: str) -> str:
    cleaned = value.strip().upper()
    if not FIR_ID_RE.match(cleaned):
        raise ValueError("FIR ID must match FIR00000 format")
    return cleaned


def _validate_offender_id(value: str) -> str:
    cleaned = value.strip().upper()
    if not OFFENDER_ID_RE.match(cleaned):
        raise ValueError("Offender ID must match OFF00000 format")
    return cleaned


def _validate_report_filename(filename: str) -> str:
    if "/" in filename or "\\" in filename or not filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not re.match(r"^[A-Za-z0-9_.-]+\.pdf$", filename):
        raise HTTPException(status_code=400, detail="Invalid filename")
    return filename


def _validate_filter(value: str | None, field_name: str, *, max_length: int = 120) -> str | None:
    try:
        return _clean_text(value, field_name, max_length=max_length, required=False)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _validate_date(value: str | None, field_name: str) -> str | None:
    if not value:
        return None
    if not DATE_RE.match(value):
        raise HTTPException(status_code=400, detail=f"{field_name} must use YYYY-MM-DD")
    return value


class ChatRequest(BaseModel):
    message:    str = Field(min_length=1, max_length=4000)
    session_id: Optional[str] = None
    language:   Optional[str] = "en-US"

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("message cannot be empty")
        return cleaned

    @field_validator("session_id")
    @classmethod
    def validate_session_id(cls, value: str | None) -> str | None:
        if not value:
            return None
        if not SESSION_ID_RE.match(value):
            raise ValueError("session_id contains unsupported characters")
        return value

    @field_validator("language")
    @classmethod
    def validate_language(cls, value: str | None) -> str:
        lang = value or "en-US"
        if lang not in VALID_LANGUAGES:
            raise ValueError("unsupported language")
        return "kn-IN" if lang == "kn" else "en-US" if lang == "en" else lang

class ClearSessionRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=80)

    @field_validator("session_id")
    @classmethod
    def validate_session_id(cls, value: str) -> str:
        if not SESSION_ID_RE.match(value):
            raise ValueError("session_id contains unsupported characters")
        return value

class ReportRequest(BaseModel):
    fir_id: str

    @field_validator("fir_id")
    @classmethod
    def validate_fir(cls, value: str) -> str:
        return _validate_fir_id(value)

class DistrictReportRequest(BaseModel):
    district: str

    @field_validator("district")
    @classmethod
    def validate_district(cls, value: str) -> str:
        return _clean_text(value, "district", max_length=80)

class OffenderReportRequest(BaseModel):
    offender_id: str

    @field_validator("offender_id")
    @classmethod
    def validate_offender(cls, value: str) -> str:
        return _validate_offender_id(value)

class NetworkReportRequest(BaseModel):
    image_data: str = Field(min_length=20, max_length=8_000_000)
    district: Optional[str] = "All Districts"
    crime_type: Optional[str] = "All Crimes"

    @field_validator("district", "crime_type")
    @classmethod
    def validate_optional_filter(cls, value: str | None) -> str | None:
        return _clean_text(value, "filter", max_length=80, required=False)

class RecommendationsReportRequest(BaseModel):
    district: Optional[str] = None
    crime_type: Optional[str] = None

    @field_validator("district", "crime_type")
    @classmethod
    def validate_optional_filter(cls, value: str | None) -> str | None:
        return _clean_text(value, "filter", max_length=80, required=False)

class LoginRequest(BaseModel):
    username: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=1, max_length=256)

class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=8, max_length=256)
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in VALID_ROLES:
            raise ValueError("role must be Admin or Investigator")
        return value

class ChatMessage(BaseModel):
    role: str = Field(min_length=1, max_length=20)
    content: str = Field(min_length=1, max_length=8000)

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in {"user", "assistant", "ai", "system"}:
            raise ValueError("unsupported chat role")
        return value

class ExportChatRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=80)
    messages: list[ChatMessage]

    @field_validator("session_id")
    @classmethod
    def validate_session_id(cls, value: str) -> str:
        if not SESSION_ID_RE.match(value):
            raise ValueError("session_id contains unsupported characters")
        return value

class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=3000)
    language: Optional[str] = "en"

    @field_validator("language")
    @classmethod
    def validate_language(cls, value: str | None) -> str:
        lang = value or "en"
        if lang not in VALID_LANGUAGES:
            raise ValueError("unsupported language")
        return lang

class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    target_language: str
    source_language: Optional[str] = "auto"

    @field_validator("target_language")
    @classmethod
    def validate_target_language(cls, value: str) -> str:
        if value not in VALID_LANGUAGES:
            raise ValueError("unsupported target_language")
        return value

class LanguageDetectRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)

class CatalystSignalRequest(BaseModel):
    event: Optional[str] = None
    severity: Optional[str] = "High"
    signal: Optional[str] = "Catalyst Signal"
    district: Optional[str] = ""
    detail: Optional[str] = ""
    payload: Optional[dict] = None

    @field_validator("event", "severity", "signal", "district", "detail")
    @classmethod
    def validate_optional_text(cls, value: str | None) -> str | None:
        return _clean_text(value, "signal field", max_length=500, required=False)


# ─── Auth Session Registry & Dependencies ─────────────────────────────────────
ACTIVE_SESSIONS = {}
LOGIN_ATTEMPTS = defaultdict(list)
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "28800"))
LOGIN_WINDOW_SECONDS = 300
LOGIN_MAX_ATTEMPTS = 5

PUBLIC_API_PATHS = {
    "/api/health",
    "/api/auth/login",
    "/api/auth/config",
    "/api/internal/cron/daily-intelligence-refresh",
    "/api/internal/signals/early-warning",
}
PUBLIC_API_PREFIXES = ("/api/reports/qr/",)

@app.middleware("http")
async def require_authenticated_api_session(request: Request, call_next):
    """Resolve one server-verified identity before protected API handlers."""
    path = request.url.path.rstrip("/") or "/"
    if (
        request.method != "OPTIONS"
        and path.startswith("/api/")
        and path not in PUBLIC_API_PATHS
        and not any(path.startswith(prefix) for prefix in PUBLIC_API_PREFIXES)
    ):
        if DEMO_MODE:
            authorization = request.headers.get("authorization", "")
            token = authorization[7:].strip() if authorization.startswith("Bearer ") else ""
            user = ACTIVE_SESSIONS.get(token)
            if not user or user.get("expires_at", 0) <= time.time():
                if token:
                    ACTIVE_SESSIONS.pop(token, None)
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Authentication required or session expired"},
                    headers={"Cache-Control": "no-store"},
                )
        else:
            try:
                user = await get_current_catalyst_user(request)
            except HTTPException as exc:
                return JSONResponse(
                    status_code=exc.status_code,
                    content={"detail": exc.detail},
                    headers={"Cache-Control": "no-store"},
                )
        request.state.auth_user = user
    return await call_next(request)


async def get_current_user(request: Request, authorization: Optional[str] = Header(None)):
    user = getattr(request.state, "auth_user", None)
    if user:
        return user
    if DEMO_MODE:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authorization token required")
        token = authorization.split(" ", 1)[1]
        session = ACTIVE_SESSIONS.get(token)
        if not session or session.get("expires_at", 0) <= time.time():
            ACTIVE_SESSIONS.pop(token, None)
            raise HTTPException(status_code=401, detail="Session expired or invalid")
        return session
    return await get_current_catalyst_user(request)


async def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
    return user


async def get_offender_route_user(request: Request, authorization: Optional[str] = Header(None)):
    """Alias retained after the proof conversion for a stable route contract."""
    return await get_current_user(request, authorization)


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    stats = await get_db_stats()
    return {"status": "ok", "database": stats, "version": "1.0.0"}


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else ""


def _report_storage_mode() -> str:
    return "catalyst-file-store-ready" if os.getenv("CATALYST_REPORTS_FOLDER_ID") else "local-appsail"


async def _archive_report(
    pdf_path: str,
    report_type: str,
    subject: str,
    user: dict | None = None
) -> None:
    path = Path(pdf_path)
    size_kb = round(path.stat().st_size / 1024, 1) if path.exists() else 0
    await record_report_archive(
        filename=path.name,
        report_type=report_type,
        subject=subject,
        size_kb=size_kb,
        storage_mode=_report_storage_mode(),
        storage_uri=f"/api/reports/download/{path.name}",
        generated_by=(user or {}).get("username", ""),
        status="ready" if path.exists() else "missing"
    )


async def _record_forecast_alerts(user: dict | None = None) -> dict:
    forecast = await get_crime_forecast()
    warnings = forecast.get("early_warnings", [])
    for warning in warnings:
        district = warning.get("district") or warning.get("area") or ""
        signal = warning.get("signal") or warning.get("crime_type") or "Forecast hotspot lift"
        detail = warning.get("detail") or warning.get("recommended_action") or str(warning)
        if warning.get("increase_percent") is not None:
            signal = f"{signal}: {warning.get('increase_percent')}% increase"
        severity = warning.get("severity") or warning.get("alert_level") or "High"
        await record_alert_event(severity, signal, district, detail)
    actor = (user or {}).get("username", "system")
    await record_job_run(
        "daily-intelligence-refresh",
        "success",
        f"Recorded {len(warnings)} early-warning signals",
        actor
    )
    return {"forecast": forecast, "recorded_alerts": len(warnings)}


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYTICS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/analytics/overview")
async def analytics_overview():
    """Dashboard KPI overview: total FIRs, crimes, offenders, victims."""
    return await get_overview_stats()


@app.get("/api/analytics/crime-types")
async def analytics_crime_types():
    """Crime type distribution for pie/bar chart."""
    return await get_crime_type_distribution()


@app.get("/api/analytics/monthly-trends")
async def analytics_monthly_trends():
    """Monthly FIR count trend (2022-2025)."""
    return await get_monthly_trends()


@app.get("/api/analytics/districts")
async def analytics_districts():
    """Crime statistics per district."""
    return await get_district_stats()


@app.get("/api/analytics/district-crime-breakdown")
async def analytics_district_crime_breakdown(district: str):
    """Breakdown of crime types for a given district."""
    from database import fetch_all
    from analytics import normalize_district_name
    district = _validate_filter(district, "district", max_length=80)
    norm_dist = normalize_district_name(district)
    return await fetch_all(
        "SELECT crime_type, COUNT(*) AS count FROM firs WHERE district LIKE ? GROUP BY crime_type ORDER BY count DESC",
        (f"%{norm_dist}%",)
    )


@app.get("/api/analytics/districts/top-crime")
async def analytics_district_top_crime():
    """Most frequent crime type per district."""
    return await get_district_top_crime()


@app.get("/api/analytics/yearly")
async def analytics_yearly():
    """Year-over-year crime comparison by type."""
    return await get_yearly_comparison()


@app.get("/api/analytics/police-stations")
async def analytics_police_stations():
    """Crime load per police station."""
    return await get_police_station_stats()


@app.get("/api/analytics/sociological")
async def analytics_sociological():
    """Socio-demographic crime insights from uploaded datasets."""
    return await get_sociological_insights()


@app.get("/api/analytics/financial-links")
async def analytics_financial_links():
    """Financial transaction analysis when uploaded, otherwise FIR-based financial/cyber link analysis."""
    return await get_financial_link_analysis()


@app.get("/api/analytics/forecast")
async def analytics_forecast(user: dict = Depends(get_current_user)):
    """Explainable crime forecast and early-warning signals."""
    result = await _record_forecast_alerts(user)
    return result["forecast"]


@app.get("/api/analytics/explainability")
async def analytics_explainability():
    """Evidence trails and transparent analytics basis."""
    return await get_explainable_intelligence()


@app.get("/api/analytics/advanced-intelligence")
async def analytics_advanced_intelligence(user: dict = Depends(get_current_user)):
    """Combined advanced intelligence summary for dashboard/demo."""
    result = await get_advanced_intelligence_summary()
    warnings = result.get("forecast", {}).get("early_warnings", [])
    for warning in warnings:
        district = warning.get("district") or warning.get("area") or ""
        signal = warning.get("signal") or warning.get("crime_type") or "Advanced intelligence warning"
        detail = warning.get("detail") or warning.get("recommended_action") or str(warning)
        if warning.get("increase_percent") is not None:
            signal = f"{signal}: {warning.get('increase_percent')}% increase"
        severity = warning.get("severity") or warning.get("alert_level") or "High"
        await record_alert_event(severity, signal, district, detail)
    await log_audit(
        user.get("username"), user.get("role"),
        "ADVANCED_INTEL_VIEW", "analytics",
        f"Viewed advanced intelligence with {len(warnings)} warnings", ""
    )
    return result


@app.get("/api/alerts/early-warning")
async def early_warning_alerts(limit: int = Query(25, ge=1, le=100), user: dict = Depends(get_current_user)):
    """Persistent early-warning events generated from forecast/advanced intelligence."""
    return await list_alert_events(limit)


@app.post("/api/jobs/daily-intelligence-refresh")
async def daily_intelligence_refresh(user: dict = Depends(require_admin)):
    """Manual/Catalyst Cron-compatible refresh for forecast alerts and operational ledger."""
    try:
        result = await _record_forecast_alerts(user)
        await log_audit(
            user.get("username"), user.get("role"),
            "JOB_RUN", "daily-intelligence-refresh",
            f"Recorded {result['recorded_alerts']} early-warning signals", ""
        )
        return {
            "status": "success",
            "job": "daily-intelligence-refresh",
            "recorded_alerts": result["recorded_alerts"],
            "forecast": result["forecast"].get("summary", {})
        }
    except Exception as e:
        await record_job_run("daily-intelligence-refresh", "failed", str(e), user.get("username", ""))
        raise


@app.api_route("/api/internal/cron/daily-intelligence-refresh", methods=["GET", "POST"])
async def cron_daily_intelligence_refresh(key: str = Query("")):
    """Catalyst Cron target protected by a shared cron key."""
    expected = os.getenv("CATALYST_CRON_KEY", "namma-ksp-cron")
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="Invalid cron key")
    cron_user = {"username": "catalyst-cron", "role": "System"}
    result = await _record_forecast_alerts(cron_user)
    await log_audit(
        "catalyst-cron", "System",
        "JOB_RUN", "daily-intelligence-refresh",
        f"Catalyst Cron recorded {result['recorded_alerts']} early-warning signals", ""
    )
    return {
        "status": "success",
        "job": "daily-intelligence-refresh",
        "trigger": "Catalyst Cron",
        "recorded_alerts": result["recorded_alerts"],
        "forecast": result["forecast"].get("summary", {}),
    }


@app.post("/api/internal/signals/early-warning")
async def catalyst_signal_early_warning(payload: CatalystSignalRequest, key: str = Query("")):
    """Catalyst Signals webhook target for early-warning intelligence events."""
    expected = os.getenv("CATALYST_SIGNALS_KEY", "namma-ksp-signals")
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="Invalid signal key")

    raw_payload = payload.payload or {}
    district = payload.district or raw_payload.get("district") or raw_payload.get("area") or ""
    signal = payload.signal or raw_payload.get("signal") or raw_payload.get("crime_type") or "Catalyst Signal"
    payload_dict = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    detail = payload.detail or raw_payload.get("detail") or raw_payload.get("recommended_action") or str(raw_payload or payload_dict)
    severity = payload.severity or raw_payload.get("severity") or raw_payload.get("alert_level") or "High"

    await record_alert_event(severity, signal, district, detail)
    await record_job_run(
        "signals-early-warning",
        "success",
        f"Recorded Catalyst Signal event {payload.event or 'early_warning_alert'}",
        "catalyst-signals"
    )
    await log_audit(
        "catalyst-signals", "System",
        "SIGNAL_RECEIVED", "signals/early-warning",
        f"Recorded {severity} signal for {district or 'statewide'}", ""
    )
    return {
        "status": "success",
        "event": payload.event or "early_warning_alert",
        "recorded": {
            "severity": severity,
            "signal": signal,
            "district": district,
        },
    }


@app.get("/api/system/status")
async def system_status(admin_user: dict = Depends(require_admin)):
    """Admin operations snapshot for Catalyst deployment readiness."""
    stats = await get_db_stats()
    report_count = stats.get("report_archive", 0)
    latest_report = await fetch_one("""
        SELECT filename, report_type, created_at, storage_mode
        FROM report_archive
        ORDER BY id DESC
        LIMIT 1
    """)
    latest_audit = await fetch_one("""
        SELECT timestamp, username, action, resource
        FROM audit_logs
        ORDER BY id DESC
        LIMIT 1
    """)
    open_alert = await fetch_one("SELECT COUNT(*) AS cnt FROM alert_events WHERE status = 'open'")
    latest_job = await fetch_one("""
        SELECT started_at, job_name, status, detail
        FROM job_runs
        ORDER BY id DESC
        LIMIT 1
    """)
    reports_on_disk = len(list(REPORTS_DIR.glob("*.pdf"))) if REPORTS_DIR.exists() else 0
    catalyst = get_catalyst_service_matrix()
    return {
        "runtime": {
            "platform": "Zoho Catalyst AppSail" if os.getenv("X_ZOHO_CATALYST_LISTEN_PORT") else "Local development",
            "storage_mode": _report_storage_mode(),
            "reports_on_disk": reports_on_disk,
            "report_archive_rows": report_count,
            "catalyst_file_store_configured": bool(os.getenv("CATALYST_REPORTS_FOLDER_ID")),
        },
        "database": stats,
        "alerts": {
            "open": open_alert["cnt"] if open_alert else 0,
            "latest": (await list_alert_events(1))[0] if stats.get("alert_events", 0) else None,
        },
        "reports": {
            "latest": latest_report,
        },
        "audit": {
            "latest": latest_audit,
        },
        "jobs": {
            "latest": latest_job,
        },
        "catalyst_services": catalyst,
    }


@app.get("/api/system/summary")
async def system_summary(user: dict = Depends(get_current_user)):
    """Role-safe operations summary for investigator dashboards."""
    stats = await get_db_stats()
    open_alert = await fetch_one("SELECT COUNT(*) AS cnt FROM alert_events WHERE status = 'open'")
    latest_report = await fetch_one("""
        SELECT filename, report_type, created_at, storage_mode
        FROM report_archive
        ORDER BY id DESC
        LIMIT 1
    """)
    latest_job = await fetch_one("""
        SELECT started_at, job_name, status
        FROM job_runs
        ORDER BY id DESC
        LIMIT 1
    """)
    catalyst = get_catalyst_service_matrix()
    return {
        "runtime": {
            "platform": "Zoho Catalyst AppSail" if os.getenv("X_ZOHO_CATALYST_LISTEN_PORT") else "Local development",
            "storage_mode": _report_storage_mode(),
            "reports_on_disk": len(list(REPORTS_DIR.glob("*.pdf"))) if REPORTS_DIR.exists() else 0,
            "report_archive_rows": stats.get("report_archive", 0),
            "catalyst_file_store_configured": bool(os.getenv("CATALYST_REPORTS_FOLDER_ID")),
        },
        "database": {
            "firs": stats.get("firs", 0),
            "financial_transactions": stats.get("financial_transactions", 0),
            "socio_economic_indicators": stats.get("socio_economic_indicators", 0),
            "report_archive": stats.get("report_archive", 0),
            "alert_events": stats.get("alert_events", 0),
        },
        "alerts": {
            "open": open_alert["cnt"] if open_alert else 0,
            "latest": (await list_alert_events(1))[0] if stats.get("alert_events", 0) else None,
        },
        "reports": {
            "latest": latest_report,
        },
        "jobs": {
            "latest": latest_job,
        },
        "catalyst_services": catalyst["summary"],
    }


@app.get("/api/catalyst/services")
async def catalyst_services(user: dict = Depends(get_current_user)):
    """Zoho Catalyst service usage matrix, excluding Catalyst Authentication by request."""
    await log_audit(
        user.get("username"), user.get("role"), "CATALYST_SERVICES_VIEW",
        "catalyst/services", "Viewed Catalyst service usage matrix", "",
    )
    return get_catalyst_service_matrix()


@app.get("/api/submission/readiness")
async def submission_readiness(user: dict = Depends(get_current_user)):
    """Judge-facing evidence matrix generated from the live application database."""
    result = await get_submission_readiness()
    await log_audit(
        user.get("username"), user.get("role"), "SUBMISSION_READINESS_VIEW",
        "submission/readiness", "Viewed challenge evidence matrix", "",
    )
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/auth/config")
async def auth_config():
    return {"mode": "demo" if DEMO_MODE else "catalyst", "demo_mode": DEMO_MODE}

@app.post("/api/auth/login")
async def login_endpoint(request: LoginRequest, http_request: Request):
    if not DEMO_MODE:
        raise HTTPException(status_code=404, detail="Use Catalyst Authentication to sign in")
    from database import fetch_one, hash_password
    client_ip = _client_ip(http_request)
    now = time.time()
    LOGIN_ATTEMPTS[client_ip] = [t for t in LOGIN_ATTEMPTS[client_ip] if now - t < LOGIN_WINDOW_SECONDS]
    if len(LOGIN_ATTEMPTS[client_ip]) >= LOGIN_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in five minutes.")
    pw_hash = hash_password(request.password)
    user = await fetch_one(
        "SELECT username, role FROM users WHERE LOWER(username) = ? AND password_hash = ?",
        (request.username.lower(), pw_hash)
    )
    if not user:
        LOGIN_ATTEMPTS[client_ip].append(now)
        await log_audit(request.username, None, "LOGIN_FAILED", "auth", "Invalid username or password", http_request.client.host if http_request.client else "")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    LOGIN_ATTEMPTS.pop(client_ip, None)
    token = str(uuid.uuid4())
    ACTIVE_SESSIONS[token] = {
        "username": user["username"], "role": user["role"],
        "issued_at": int(now), "expires_at": int(now + SESSION_TTL_SECONDS),
    }
    await log_audit(user["username"], user["role"], "LOGIN_SUCCESS", "auth", "User signed in", http_request.client.host if http_request.client else "")
    return {
        "token": token,
        "username": user["username"],
        "role": user["role"]
    }


@app.post("/api/auth/logout")
async def logout_endpoint(http_request: Request, authorization: Optional[str] = Header(None)):
    if not DEMO_MODE:
        return {"status": "catalyst-managed"}
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        user = ACTIVE_SESSIONS.get(token)
        ACTIVE_SESSIONS.pop(token, None)
        if user:
            await log_audit(user.get("username"), user.get("role"), "LOGOUT", "auth", "User signed out", http_request.client.host if http_request.client else "")
    return {"status": "logged_out"}


@app.get("/api/auth/me")
async def me_endpoint(user: dict = Depends(get_current_user)):
    return user


# ═══════════════════════════════════════════════════════════════════════════════
# USER MANAGEMENT ENDPOINTS (ADMIN ONLY)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/users")
async def list_users(http_request: Request, admin_user: dict = Depends(require_admin)):
    if not DEMO_MODE:
        users = await get_all_catalyst_users(http_request)
    else:
        from database import fetch_all
        users = await fetch_all("SELECT username, role FROM users ORDER BY username ASC")
    await log_audit(
        admin_user.get("username"), admin_user.get("role"), "USER_LIST_VIEW",
        "users", f"Viewed {len(users)} authorized users", _client_ip(http_request),
        user_id=admin_user.get("user_id", ""),
    )
    return users


@app.get("/api/audit/logs")
async def list_audit_logs(limit: int = Query(100, ge=1, le=500), admin_user: dict = Depends(require_admin)):
    from database import fetch_all
    return await fetch_all("""
        SELECT id, timestamp, username, user_id, role, action, resource, detail, ip_address
        FROM audit_logs
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))


@app.post("/api/users")
async def create_user(request: UserCreate, admin_user: dict = Depends(require_admin)):
    if not DEMO_MODE:
        raise HTTPException(status_code=409, detail="Manage users and roles in Catalyst Authentication")
    from database import fetch_one, execute_write, hash_password
    username = request.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    if request.role not in ["Admin", "Investigator"]:
        raise HTTPException(status_code=400, detail="Role must be 'Admin' or 'Investigator'")
    
    # Check if exists
    existing = await fetch_one("SELECT username FROM users WHERE LOWER(username) = ?", (username.lower(),))
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    pw_hash = hash_password(request.password)
    await execute_write(
        "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
        (username, pw_hash, request.role)
    )
    await log_audit(admin_user.get("username"), admin_user.get("role"), "USER_CREATE", "users", f"Created {username} as {request.role}", "", user_id=admin_user.get("user_id", ""))
    return {"username": username, "role": request.role}


@app.delete("/api/users/{username}")
async def delete_user(username: str, admin_user: dict = Depends(require_admin)):
    if not DEMO_MODE:
        raise HTTPException(status_code=409, detail="Manage users and roles in Catalyst Authentication")
    from database import execute_write
    u = username.strip().lower()
    if u == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete default admin account")
    if u == admin_user["username"].lower():
        raise HTTPException(status_code=400, detail="Cannot delete your own active account")
    
    await execute_write("DELETE FROM users WHERE LOWER(username) = ?", (u,))
    await log_audit(admin_user.get("username"), admin_user.get("role"), "USER_DELETE", "users", f"Deleted {u}", "", user_id=admin_user.get("user_id", ""))
    return {"deleted": username}


# ═══════════════════════════════════════════════════════════════════════════════
# HOTSPOT / MAP ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/hotspots")
async def hotspots(
    district: Optional[str] = Query(None),
    crime_type: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    """Lat/lon hotspot data for Leaflet.js heatmap."""
    district = _validate_filter(district, "district", max_length=80)
    crime_type = _validate_filter(crime_type, "crime_type", max_length=80)
    from_date = _validate_date(from_date, "from_date")
    to_date = _validate_date(to_date, "to_date")
    return await get_hotspot_data(district, crime_type, from_date, to_date)


@app.get("/api/hotspots/density")
async def hotspot_density(
    district: Optional[str] = Query(None),
    crime_type: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    """District crime density for choropleth map."""
    district = _validate_filter(district, "district", max_length=80)
    crime_type = _validate_filter(crime_type, "crime_type", max_length=80)
    from_date = _validate_date(from_date, "from_date")
    to_date = _validate_date(to_date, "to_date")
    return await get_district_crime_density(district, crime_type, from_date, to_date)


# ═══════════════════════════════════════════════════════════════════════════════
# FIR / CASE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/firs")
async def list_firs(
    crime_type: Optional[str] = Query(None),
    district:   Optional[str] = Query(None),
    status:     Optional[str] = Query(None),
    from_date:  Optional[str] = Query(None),
    to_date:    Optional[str] = Query(None),
    limit:      int           = Query(50, le=200)
):
    """Search FIRs with optional filters."""
    crime_type = _validate_filter(crime_type, "crime_type", max_length=80)
    district = _validate_filter(district, "district", max_length=80)
    if status and status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="status must be Open, Closed, or Under Investigation")
    from_date = _validate_date(from_date, "from_date")
    to_date = _validate_date(to_date, "to_date")
    return await search_firs(crime_type, district, status, from_date, to_date, limit)


@app.get("/api/firs/{fir_id}")
async def get_fir(fir_id: str):
    """Get full details for a single FIR."""
    fir_id = _validate_fir_id(fir_id)
    data = await get_fir_detail(fir_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"FIR {fir_id} not found")
    return data


@app.get("/api/firs/{fir_id}/related")
async def fir_related_cases(fir_id: str):
    """Get related cases for a FIR."""
    return await get_related_cases(_validate_fir_id(fir_id))


# ═══════════════════════════════════════════════════════════════════════════════
# OFFENDER ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/offenders/high-risk")
async def high_risk_offenders(
    limit: int = Query(20, le=100),
    search: Optional[str] = Query(None)
):
    """Top high-risk offenders with risk scores."""
    search = _validate_filter(search, "search", max_length=80)
    return await get_high_risk_offenders(limit, search)


@app.get("/api/offenders/repeat")
async def repeat_offenders():
    """Repeat offenders with multiple FIRs."""
    return await get_repeat_offenders()


@app.get("/api/offenders/{offender_id}")
async def get_offender(
    offender_id: str,
    http_request: Request,
    user: dict = Depends(get_offender_route_user),
):
    """Full offender profile with FIR history and risk score."""
    offender_id = _validate_offender_id(offender_id)
    profile = await get_offender_profile(offender_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Offender {offender_id} not found")
    await log_audit(
        user.get("username"), user.get("role"), "OFFENDER_PROFILE_VIEW",
        f"offenders/{offender_id}",
        f"Catalyst user {user.get('user_id', '')} viewed offender profile",
        _client_ip(http_request),
        user_id=user.get("user_id", ""),
    )
    return profile


# ═══════════════════════════════════════════════════════════════════════════════
# CRIMINAL NETWORK ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/network")
async def criminal_network(
    district:   Optional[str] = Query(None),
    crime_type: Optional[str] = Query(None),
    limit:      int           = Query(150, le=300)
):
    """Criminal network graph data for Cytoscape.js visualization."""
    district = _validate_filter(district, "district", max_length=80)
    crime_type = _validate_filter(crime_type, "crime_type", max_length=80)
    return await get_network_data(district=district, crime_type=crime_type, limit=limit)


@app.get("/api/network/offender/{offender_id}")
async def offender_network(offender_id: str):
    """Focused sub-network around a specific offender."""
    return await get_shared_offender_network(_validate_offender_id(offender_id))


# ═══════════════════════════════════════════════════════════════════════════════
# AI CHATBOT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, http_request: Request, user: dict = Depends(get_current_user)):
    """
    Conversational crime intelligence chatbot.
    Maintains session context across multiple turns.
    """
    session_id = request.session_id or str(uuid.uuid4())
    try:
        result = await chat(session_id, request.message, request.language)
        await log_audit(
            user.get("username"), user.get("role"),
            "AI_CHAT_QUERY", "chat",
            f"Session {session_id}; language={request.language}; chars={len(request.message)}",
            _client_ip(http_request)
        )
        return result
    except Exception as e:
        logger.error("Chat error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/clear")
async def clear_chat_session(request: ClearSessionRequest):
    """Clear conversation history for a session."""
    cleared = clear_session(request.session_id)
    return {"cleared": cleared, "session_id": request.session_id}


@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using Sarvam AI Bulbul.
    Returns an MP3 audio stream for English/Kannada chat playback.
    """
    try:
        import io
        if not is_sarvam_configured():
            raise HTTPException(status_code=503, detail="Sarvam AI is not configured on the server")

        audio_bytes, media_type = await synthesize_speech(request.text, request.language)
        audio_buffer = io.BytesIO(audio_bytes)
        audio_buffer.seek(0)

        return StreamingResponse(
            audio_buffer,
            media_type=media_type,
            headers={
                "Content-Disposition": "inline; filename=sarvam_tts.mp3",
                "Cache-Control": "public, max-age=86400",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Sarvam TTS generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


@app.post("/api/translate")
async def translate_endpoint(request: TranslateRequest, user: dict = Depends(get_current_user)):
    """Translate text through Sarvam AI Translate."""
    try:
        if not is_sarvam_configured():
            raise HTTPException(status_code=503, detail="Sarvam AI is not configured on the server")
        translated = await translate_text(
            request.text,
            target_language_code=normalize_language_code(request.target_language),
            source_language_code=normalize_language_code(request.source_language, default="auto"),
        )
        return {"translated_text": translated}
    except HTTPException:
        raise
    except SarvamError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error("Sarvam translation endpoint failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/language-detect")
async def language_detect_endpoint(request: LanguageDetectRequest, user: dict = Depends(get_current_user)):
    """Detect text language/script through Sarvam AI Language Identification."""
    try:
        if not is_sarvam_configured():
            raise HTTPException(status_code=503, detail="Sarvam AI is not configured on the server")
        return await detect_language(request.text)
    except HTTPException:
        raise
    except SarvamError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error("Sarvam language detection endpoint failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/audio-transcribe")
async def audio_transcribe_endpoint(
    file: UploadFile = File(...),
    language: Optional[str] = Query(None)
):
    """
    Transcribe recorded audio file via Sarvam AI Saaras.
    """
    try:
        if language and language not in VALID_LANGUAGES:
            raise HTTPException(status_code=400, detail="unsupported language")
        if file.content_type and not file.content_type.startswith("audio/"):
            raise HTTPException(status_code=400, detail="audio file required")
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty audio file")
            
        from ai_service import transcribing_audio
        text = await transcribing_audio(content, file.filename or "audio.webm", language)
        return {"text": text}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Audio transcription endpoint failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/chat/export")
async def export_chat_endpoint(request: ExportChatRequest, http_request: Request, user: dict = Depends(get_current_user)):
    """
    Generate and download a PDF investigation dossier for a chat session.
    """
    if not request.messages:
        raise HTTPException(status_code=400, detail="Cannot export empty conversation history")
    try:
        msg_list = [{"role": m.role, "content": m.content} for m in request.messages]
        pdf_path = await generate_chat_log_report(request.session_id, msg_list)
        await _archive_report(pdf_path, "chat", request.session_id, user)
        await log_audit(
            user.get("username"), user.get("role"),
            "REPORT_GENERATE", "reports/chat",
            f"Chat export {Path(pdf_path).name}",
            _client_ip(http_request), user_id=user.get("user_id", "")
        )
        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=Path(pdf_path).name
        )
    except Exception as e:
        logger.error("Chat log export failed: %s", e)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@app.get("/api/ai/case-summary/{fir_id}")
async def ai_case_summary(fir_id: str, http_request: Request, user: dict = Depends(get_current_user)):
    """AI-generated investigation summary for a specific FIR."""
    try:
        fir_id = _validate_fir_id(fir_id)
        result = await generate_case_summary(fir_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        await log_audit(
            user.get("username"), user.get("role"),
            "AI_CASE_SUMMARY", "ai",
            f"Generated summary for {fir_id.upper()}",
            _client_ip(http_request)
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Case summary error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ai/recommendations")
async def ai_recommendations(
    district:   Optional[str] = Query(None),
    crime_type: Optional[str] = Query(None)
):
    """AI-generated crime prevention and investigation recommendations."""
    try:
        district = _validate_filter(district, "district", max_length=80)
        crime_type = _validate_filter(crime_type, "crime_type", max_length=80)
        return await get_investigation_recommendations(district, crime_type)
    except Exception as e:
        logger.error("Recommendations error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# REPORT GENERATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/reports/case")
async def generate_report(request: ReportRequest, http_request: Request, user: dict = Depends(get_current_user)):
    """Generate and download a PDF investigation report for a FIR."""
    fir_id = request.fir_id

    case_data = await get_fir_detail(fir_id)
    if not case_data:
        raise HTTPException(status_code=404, detail=f"FIR {fir_id} not found")

    related = await get_related_cases(fir_id)
    case_data["related_cases"] = related

    try:
        ai_result  = await generate_case_summary(fir_id)
        ai_summary = ai_result.get("summary", "AI summary unavailable.")
    except Exception:
        ai_summary = "AI summary could not be generated at this time."

    try:
        pdf_path = await generate_case_report(fir_id, case_data, ai_summary)
        await _archive_report(pdf_path, "case", fir_id, user)
        await log_audit(
            user.get("username"), user.get("role"),
            "REPORT_GENERATE", "reports/case",
            f"Case report for {fir_id}: {Path(pdf_path).name}",
            _client_ip(http_request), user_id=user.get("user_id", "")
        )
    except Exception as e:
        logger.error("PDF generation error: %s", e)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=Path(pdf_path).name
    )


@app.post("/api/reports/district")
async def generate_district_report_endpoint(request: DistrictReportRequest, http_request: Request, user: dict = Depends(get_current_user)):
    """Generate and download a PDF district crime report."""
    from analytics import get_district_stats

    district = request.district
    stats = await get_district_stats()
    district_stats = [s for s in stats if district.lower() in s.get("district", "").lower()]

    try:
        ai_result  = await get_investigation_recommendations(district=district)
        ai_insights = ai_result.get("recommendations", "")
    except Exception:
        ai_insights = "AI insights unavailable."

    try:
        pdf_path = await generate_district_report(district, district_stats, ai_insights)
        await _archive_report(pdf_path, "district", district, user)
        await log_audit(
            user.get("username"), user.get("role"),
            "REPORT_GENERATE", "reports/district",
            f"District report for {district}: {Path(pdf_path).name}",
            _client_ip(http_request), user_id=user.get("user_id", "")
        )
    except Exception as e:
        logger.error("District report error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=Path(pdf_path).name
    )


@app.post("/api/reports/offender")
async def generate_offender_report_endpoint(request: OffenderReportRequest, http_request: Request, user: dict = Depends(get_current_user)):
    """Generate and download a PDF offender profile dossier."""
    offender_id = request.offender_id
    
    from analytics import get_offender_profile
    data = await get_offender_profile(offender_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Offender {offender_id} not found")
        
    try:
        from report import generate_offender_report
        pdf_path = await generate_offender_report(offender_id, data)
        await _archive_report(pdf_path, "offender", offender_id, user)
        await log_audit(
            user.get("username"), user.get("role"),
            "REPORT_GENERATE", "reports/offender",
            f"Offender report for {offender_id}: {Path(pdf_path).name}",
            _client_ip(http_request), user_id=user.get("user_id", "")
        )
    except Exception as e:
        logger.error("Offender report generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
        
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=Path(pdf_path).name
    )


@app.post("/api/reports/network")
async def generate_network_report_endpoint(request: NetworkReportRequest, http_request: Request, user: dict = Depends(get_current_user)):
    """Generate and download a PDF report containing the criminal network graph."""
    try:
        import base64
        img_str = request.image_data
        if "," in img_str:
            img_str = img_str.split(",")[1]
        img_bytes = base64.b64decode(img_str)
        
        from report import generate_network_pdf_report
        pdf_path = await generate_network_pdf_report(img_bytes, request.district, request.crime_type)
        subject = " / ".join([v for v in [request.district, request.crime_type] if v]) or "network"
        await _archive_report(pdf_path, "network", subject, user)
        await log_audit(
            user.get("username"), user.get("role"),
            "REPORT_GENERATE", "reports/network",
            f"Network report {Path(pdf_path).name}",
            _client_ip(http_request), user_id=user.get("user_id", "")
        )
        
        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=Path(pdf_path).name
        )
    except Exception as e:
        logger.error("Network report generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/reports/recommendations")
async def generate_recommendations_report_endpoint(request: RecommendationsReportRequest, http_request: Request, user: dict = Depends(get_current_user)):
    """Generate and download a PDF containing AI recommendations."""
    district = request.district
    crime_type = request.crime_type

    try:
        ai_result = await get_investigation_recommendations(district=district, crime_type=crime_type)
        recommendations = ai_result.get("recommendations", "No recommendations available.")
    except Exception as e:
        logger.error("Failed to generate AI recommendations: %s", e)
        recommendations = "AI recommendations could not be generated at this time."

    try:
        pdf_path = await generate_recommendations_report(district, crime_type, recommendations)
        subject = " / ".join([v for v in [district, crime_type] if v]) or "statewide"
        await _archive_report(pdf_path, "recommendations", subject, user)
        await log_audit(
            user.get("username"), user.get("role"),
            "REPORT_GENERATE", "reports/recommendations",
            f"Recommendations report {Path(pdf_path).name}",
            _client_ip(http_request), user_id=user.get("user_id", "")
        )
    except Exception as e:
        logger.error("Recommendations report PDF generation error: %s", e)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=Path(pdf_path).name
    )


@app.get("/api/reports/list")

async def list_reports(user: dict = Depends(get_current_user)):
    """List all generated PDF reports."""
    reports = await list_report_archive(100)
    seen = {r["filename"] for r in reports}
    if REPORTS_DIR.exists():
        for f in sorted(REPORTS_DIR.glob("*.pdf"), reverse=True):
            if f.name not in seen:
                reports.append({
                    "filename": f.name,
                    "report_type": "legacy",
                    "subject": "",
                    "size_kb":  round(f.stat().st_size / 1024, 1),
                    "created":  f.stat().st_mtime,
                    "created_at": None,
                    "storage_mode": "local-appsail",
                    "storage_uri": f"/api/reports/download/{f.name}",
                    "status": "ready",
                })
    return reports


@app.get("/api/reports/download/{filename}")
async def download_report_file(filename: str, http_request: Request, user: dict = Depends(get_current_user)):
    """
    Serve a generated PDF report file with guaranteed application/pdf content-type
    and Content-Disposition: attachment so browsers download it instead of displaying it.
    """
    filename = _validate_report_filename(filename)
    
    pdf_path = REPORTS_DIR / filename
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail=f"Report '{filename}' not found")
    await log_audit(
        user.get("username"), user.get("role"),
        "REPORT_DOWNLOAD", "reports",
        f"Downloaded {filename}",
        _client_ip(http_request), user_id=user.get("user_id", "")
    )

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=filename,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "Cache-Control": "no-cache",
        }
    )


@app.get("/api/reports/qr/{filename}")
async def open_report_from_qr(filename: str):
    """
    Public QR endpoint for generated PDF reports.
    The QR embedded inside a report opens this URL directly.
    """
    filename = _validate_report_filename(filename)

    pdf_path = REPORTS_DIR / filename
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail=f"Report '{filename}' not found")

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=filename,
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Content-Type": "application/pdf",
            "Cache-Control": "public, max-age=86400",
        }
    )


# ─── Serve Reports (must come before frontend mount) ─────────────────────────
app.mount("/reports", StaticFiles(directory=str(REPORTS_DIR)), name="reports")

# ─── Serve Frontend ───────────────────────────────────────────────────────────
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    catalyst_port = os.getenv("X_ZOHO_CATALYST_LISTEN_PORT")
    host = os.getenv("APP_HOST", "0.0.0.0" if catalyst_port else "127.0.0.1")
    port = int(catalyst_port or os.getenv("APP_PORT", 8000))
    reload = False if catalyst_port else True
    uvicorn.run("main:app", host=host, port=port, reload=reload, log_level="info")
