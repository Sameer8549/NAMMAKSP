"""
main.py — NAMMA KSP
────────────────────────
FastAPI application entry point.
All API routes for the NAMMA KSP platform.
"""

import os
import asyncio
import secrets
import sys
import logging
import uuid
import re
import time
import json
import hashlib
from collections import defaultdict
from pathlib import Path
from datetime import datetime, UTC
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Depends, Header, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv

# Add backend dir to path so sibling imports work
sys.path.insert(0, str(Path(__file__).parent))
from frontend_workspace import build_frontend_workspace

load_dotenv(Path(__file__).parent.parent / ".env")

import mimetypes
mimetypes.init()
mimetypes.add_type("application/pdf", ".pdf")

from database  import (
    init_db, get_db_stats, get_er_schema_status, log_audit, fetch_one, fetch_all,
    record_report_archive, list_report_archive, list_audit_events, record_alert_event,
    list_alert_events, transition_alert_event, record_job_run, list_job_runs
)
from analytics import (
    get_overview_stats, get_crime_type_distribution, get_monthly_trends,
    get_district_stats, get_district_top_crime, get_hotspot_data,
    get_district_crime_density, get_offender_profile, get_high_risk_offenders,
    get_repeat_offenders, search_firs, get_fir_detail, get_related_cases,
    get_police_station_stats, get_yearly_comparison, get_sociological_insights,
    get_financial_link_analysis, get_crime_forecast, get_explainable_intelligence,
    get_advanced_intelligence_summary, get_submission_readiness,
    get_cached_analytics_overview, get_cached_network_graph
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
from authorization import (
    ROLES, canonical_role, enrich_identity, has_capability,
    project_case_payload, pseudonymize_record, stable_alias, workspace_for,
)
from catalyst_services import get_catalyst_service_matrix
from catalyst_runtime import (
    cache_get_json, cache_put_json, datastore_probe, quickml_predict,
    search as catalyst_search, upload_report, download_report, list_report_objects,
    nosql_append_evidence, set_request_context, reset_request_context,
    verify_managed_services, zia_text_analysis, smartbrowz_pdf,
    send_catalyst_mail, send_catalyst_push,
)
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


@app.get("/__catalyst/sdk/init.js", include_in_schema=False)
async def local_catalyst_sdk_bootstrap():
    """Provide a harmless SDK bootstrap only when the app runs outside Catalyst hosting."""
    return Response(
        content="window.__NAMMA_CATALYST_LOCAL__=true;",
        media_type="application/javascript",
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


class CatalystRequestContextMiddleware(BaseHTTPMiddleware):
    """Make the current AppSail request available to every Catalyst SDK call."""

    async def dispatch(self, request: StarletteRequest, call_next):
        token = set_request_context(request)
        try:
            return await call_next(request)
        finally:
            reset_request_context(token)


app.add_middleware(CatalystRequestContextMiddleware)


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
OFFENDER_ALIAS_RE = re.compile(r"^ENTITY-[A-F0-9]{10}$")
SESSION_ID_RE = re.compile(r"^[A-Za-z0-9_.:-]{1,80}$")
SAFE_TEXT_RE = re.compile(r"^[\w\s.,:/()&+-]+$", re.UNICODE)
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
VALID_LANGUAGES = {"en-US", "kn-IN", "en", "kn"}
VALID_ROLES = set(ROLES)
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


async def _resolve_offender_id(value: str) -> str:
    """Resolve a role-safe offender reference to its internal registry ID."""
    cleaned = value.strip().upper()
    if OFFENDER_ID_RE.fullmatch(cleaned):
        return cleaned
    if not OFFENDER_ALIAS_RE.fullmatch(cleaned):
        raise HTTPException(
            status_code=422,
            detail="Offender ID must match OFF00000 or ENTITY-XXXXXXXXXX format",
        )

    rows = await fetch_all("SELECT offender_id FROM offenders")
    for row in rows:
        candidate = str(row.get("offender_id", "")).upper()
        if candidate and stable_alias(candidate) == cleaned:
            return candidate
    raise HTTPException(status_code=404, detail=f"Offender {cleaned} not found")


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
    workspace_view: Optional[str] = Field(default=None, max_length=120)

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
        try:
            return canonical_role(value)
        except ValueError as exc:
            raise ValueError(f"role must be one of: {', '.join(ROLES)}") from exc

class UserUpdate(BaseModel):
    role: Optional[str] = None
    active: Optional[bool] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str | None) -> str | None:
        return canonical_role(value) if value is not None else None

class CaseAssignmentRequest(BaseModel):
    assignee: str = Field(min_length=2, max_length=80)
    note: Optional[str] = Field(default=None, max_length=500)

class ForecastReviewRequest(BaseModel):
    decision: str
    note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, value: str) -> str:
        normalized = value.strip().lower().replace(" ", "_")
        if normalized not in {"validated", "disputed", "needs_more_data"}:
            raise ValueError("decision must be validated, disputed, or needs_more_data")
        return normalized

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


class QuickMLPredictionRequest(BaseModel):
    features: dict[str, str | int | float | bool]

    @field_validator("features")
    @classmethod
    def validate_features(cls, value):
        if not value or len(value) > 50:
            raise ValueError("Provide between 1 and 50 QuickML features")
        return value


class ZiaTextRequest(BaseModel):
    documents: list[str]
    keywords: list[str] = Field(default_factory=list)


class CatalystMailRequest(BaseModel):
    recipients: list[str]
    subject: str
    content: str


class CatalystPushRequest(BaseModel):
    recipients: list[str]
    message: str

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


class AlertTransitionRequest(BaseModel):
    assignee: Optional[str] = Field(default=None, max_length=80)
    note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("assignee", "note")
    @classmethod
    def validate_optional_text(cls, value: str | None) -> str | None:
        return _clean_text(value, "alert transition field", max_length=500, required=False)


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
        try:
            request.state.auth_user = enrich_identity(user)
        except ValueError:
            return JSONResponse(status_code=403, content={"detail": "Role is not authorized for NAMMA KSP"})
    return await call_next(request)


async def get_current_user(request: Request, authorization: Optional[str] = Header(None)):
    user = getattr(request.state, "auth_user", None)
    if user:
        return enrich_identity(user)
    if DEMO_MODE:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authorization token required")
        token = authorization.split(" ", 1)[1]
        session = ACTIVE_SESSIONS.get(token)
        if not session or session.get("expires_at", 0) <= time.time():
            ACTIVE_SESSIONS.pop(token, None)
            raise HTTPException(status_code=401, detail="Session expired or invalid")
        return enrich_identity(session)
    return enrich_identity(await get_current_catalyst_user(request))


async def require_admin(user: dict = Depends(get_current_user)):
    if not has_capability(user, "platform:admin"):
        raise HTTPException(status_code=403, detail="Administrator permissions required")
    return user


def require_capability(capability: str):
    async def dependency(user: dict = Depends(get_current_user)):
        if not has_capability(user, capability):
            raise HTTPException(status_code=403, detail=f"Missing required capability: {capability}")
        return user
    return dependency


def require_any_capability(*capabilities: str):
    async def dependency(user: dict = Depends(get_current_user)):
        if not any(has_capability(user, capability) for capability in capabilities):
            raise HTTPException(status_code=403, detail="This role is not permitted to access this resource")
        return user
    return dependency


async def get_offender_route_user(request: Request, authorization: Optional[str] = Header(None)):
    """Alias retained after the proof conversion for a stable route contract."""
    return await get_current_user(request, authorization)


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    stats = await get_db_stats()
    er_schema = await get_er_schema_status()
    return {
        "status": "ok" if er_schema["valid"] else "degraded",
        "database": stats,
        "er_schema": er_schema,
        "version": "1.0.0",
    }


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
    user: dict | None = None,
    request: Request | None = None,
) -> None:
    path = Path(pdf_path)
    size_kb = round(path.stat().st_size / 1024, 1) if path.exists() else 0
    storage = await upload_report(request, pdf_path)
    storage_mode = storage["provider"] if storage["used"] else _report_storage_mode()
    storage_uri = (
        f"stratus://{storage['data']['bucket']}/{storage['data']['object_key']}"
        if storage["used"] else f"/api/reports/download/{path.name}"
    )
    await record_report_archive(
        filename=path.name,
        report_type=report_type,
        subject=subject,
        size_kb=size_kb,
        storage_mode=storage_mode,
        storage_uri=storage_uri,
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
async def analytics_overview(request: Request):
    """Dashboard KPI overview: total FIRs, crimes, offenders, victims."""
    payload = await get_cached_analytics_overview(request)
    return payload["overview"]


@app.get("/api/analytics/cached-overview")
async def analytics_cached_overview(request: Request):
    """Precomputed dashboard overview, distributions, trends, and districts."""
    return await get_cached_analytics_overview(request)


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
async def analytics_sociological(user: dict = Depends(require_any_capability(
    "sociology:read", "sociology:read_aggregate", "analytics:read_command"
))):
    """Socio-demographic crime insights from uploaded datasets."""
    return await get_sociological_insights()


@app.get("/api/analytics/financial-links")
async def analytics_financial_links(user: dict = Depends(require_any_capability(
    "financial:read_case", "financial:read_pseudonymized", "analytics:read_command"
))):
    """Financial transaction analysis when uploaded, otherwise FIR-based financial/cyber link analysis."""
    result = await get_financial_link_analysis()
    return pseudonymize_record(result) if has_capability(user, "financial:read_pseudonymized") else result


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
async def analytics_advanced_intelligence(request: Request, user: dict = Depends(get_current_user)):
    """Combined advanced intelligence summary for dashboard/demo."""
    cached = await cache_get_json(request, "advanced-intelligence-v1")
    if cached["used"] and cached["data"]:
        return {**cached["data"], "cache_provider": cached["provider"]}
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
    await cache_put_json(request, "advanced-intelligence-v1", result, expiry_hours=1)
    result["cache_provider"] = "computed"
    await log_audit(
        user.get("username"), user.get("role"),
        "ADVANCED_INTEL_VIEW", "analytics",
        f"Viewed advanced intelligence with {len(warnings)} warnings", ""
    )
    return result


@app.get("/api/frontend/bootstrap")
async def frontend_bootstrap(user: dict = Depends(get_current_user)):
    """Return the authenticated role's complete React workspace data contract."""
    return await build_frontend_workspace(user)


@app.get("/api/analytics/drilldown")
async def analytics_role_safe_drilldown(
    dimension: str = Query(..., pattern="^(month|crime_type|district)$"),
    value: str = Query(..., min_length=1, max_length=100),
    user: dict = Depends(get_current_user),
):
    """Return role-safe aggregate intelligence with optional case evidence."""
    dimension = str(dimension).strip()
    value = _validate_filter(value, dimension, max_length=100)
    predicates = {
        "month": ("substr(f.date, 1, 7) = ?", value),
        "crime_type": ("f.crime_type = ?", value),
        "district": ("f.district = ?", value),
    }
    where_clause, parameter = predicates[dimension]
    params = (parameter,)

    total_row = await fetch_one(
        f"SELECT COUNT(*) AS count FROM firs f WHERE {where_clause}", params
    )

    async def grouped(column: str) -> list[dict]:
        allowed = {"crime_type", "district", "status"}
        if column not in allowed:
            raise ValueError("Unsupported analytics grouping")
        return await fetch_all(
            f"""
            SELECT f.{column} AS name, COUNT(*) AS count
            FROM firs f
            WHERE {where_clause}
            GROUP BY f.{column}
            ORDER BY count DESC, name ASC
            """,
            params,
        )

    crime_rows, district_rows, status_rows = await asyncio.gather(
        grouped("crime_type"), grouped("district"), grouped("status")
    )
    may_read_cases = any(has_capability(user, capability) for capability in (
        "case:read_assigned", "case:read_command", "analytics:read_pseudonymized"
    ))
    records: list[dict] = []
    if may_read_cases:
        records = await fetch_all(
            f"""
            SELECT f.fir_id, f.crime_type, f.district, f.status, f.date,
                   f.offender_id, f.victim_id
            FROM firs f
            WHERE {where_clause}
            ORDER BY f.date DESC, f.fir_id ASC
            LIMIT 24
            """,
            params,
        )
        records = project_case_payload(records, user)

    return {
        "dimension": dimension,
        "value": value,
        "total": int((total_row or {}).get("count", 0)),
        "crime_rows": crime_rows,
        "district_rows": district_rows,
        "status_rows": status_rows,
        "evidence_records": records,
        "evidence_mode": "case-records" if records else "aggregate-only",
        "disclosure_mode": enrich_identity(user)["disclosure_mode"],
        "source": "Verified synthetic FIR registry",
        "generated_at": datetime.now(UTC).isoformat(),
    }
    return result


@app.get("/api/alerts/early-warning")
async def early_warning_alerts(
    limit: int = Query(25, ge=1, le=100),
    user: dict = Depends(require_any_capability(
        "alert:read_assigned", "alert:read_command", "forecast:read", "forecast:read_aggregate"
    )),
):
    """Persistent early-warning events generated from forecast/advanced intelligence."""
    return await list_alert_events(limit)


async def _apply_alert_transition(
    alert_id: int,
    transition: str,
    payload: AlertTransitionRequest,
    user: dict,
    http_request: Request,
) -> dict:
    assignee = payload.assignee or ""
    if transition == "assign" and not assignee:
        raise HTTPException(status_code=422, detail="assignee is required")
    if transition == "resolve" and not payload.note:
        raise HTTPException(status_code=422, detail="resolution note is required")
    if transition == "acknowledge" and not has_capability(user, "alert:read_command"):
        current = await fetch_one(
            "SELECT assigned_to FROM alert_events WHERE id = ?", (alert_id,)
        )
        if not current:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        if str(current.get("assigned_to") or "").casefold() != str(user.get("username") or "").casefold():
            raise HTTPException(status_code=403, detail="This alert is not assigned to the current user")
    try:
        alert = await transition_alert_event(
            alert_id,
            transition,
            user.get("username", "unknown"),
            assignee=assignee,
            resolution=payload.note or "",
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    await log_audit(
        user.get("username"), user.get("role"),
        f"ALERT_{transition.upper()}", f"alerts/{alert_id}",
        f"Alert {transition}; assignee={assignee or '-'}; note={payload.note or '-'}",
        _client_ip(http_request), user_id=user.get("user_id", ""),
    )
    return alert


@app.post("/api/alerts/{alert_id}/assign")
async def assign_early_warning(
    alert_id: int,
    payload: AlertTransitionRequest,
    http_request: Request,
    user: dict = Depends(require_any_capability("alert:assign")),
):
    return await _apply_alert_transition(alert_id, "assign", payload, user, http_request)


@app.post("/api/alerts/{alert_id}/acknowledge")
async def acknowledge_early_warning(
    alert_id: int,
    payload: AlertTransitionRequest,
    http_request: Request,
    user: dict = Depends(require_any_capability("alert:read_assigned", "alert:read_command")),
):
    return await _apply_alert_transition(alert_id, "acknowledge", payload, user, http_request)


@app.post("/api/alerts/{alert_id}/resolve")
async def resolve_early_warning(
    alert_id: int,
    payload: AlertTransitionRequest,
    http_request: Request,
    user: dict = Depends(require_any_capability("alert:resolve")),
):
    return await _apply_alert_transition(alert_id, "resolve", payload, user, http_request)


@app.post("/api/forecast/{alert_id}/review")
async def review_forecast_signal(
    alert_id: int,
    payload: ForecastReviewRequest,
    http_request: Request,
    user: dict = Depends(require_any_capability("forecast:validate", "forecast:review_command")),
):
    from database import execute_write, fetch_one
    alert = await fetch_one("SELECT id, signal, district FROM alert_events WHERE id = ?", (alert_id,))
    if not alert:
        raise HTTPException(status_code=404, detail="Forecast signal not found")
    review_id = await execute_write(
        "INSERT INTO forecast_reviews (alert_id, reviewer, decision, note) VALUES (?, ?, ?, ?)",
        (alert_id, user.get("username"), payload.decision, payload.note or ""),
    )
    await log_audit(user.get("username"), user.get("role"), "FORECAST_REVIEW", f"alert:{alert_id}", f"{payload.decision}: {payload.note or 'no note'}", _client_ip(http_request))
    return {"id": review_id, "alert_id": alert_id, "decision": payload.decision, "status": "recorded"}


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
    expected = os.getenv("CATALYST_CRON_KEY", "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="Cron URL authentication is not configured")
    if not secrets.compare_digest(key, expected):
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
    expected = os.getenv("CATALYST_SIGNALS_KEY", "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="Signals webhook authentication is not configured")
    if not secrets.compare_digest(key, expected):
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
    er_schema = await get_er_schema_status()
    return {
        "runtime": {
            "platform": "Zoho Catalyst AppSail" if os.getenv("X_ZOHO_CATALYST_LISTEN_PORT") else "Local development",
            "storage_mode": _report_storage_mode(),
            "reports_on_disk": reports_on_disk,
            "report_archive_rows": report_count,
            "catalyst_file_store_configured": bool(os.getenv("CATALYST_REPORTS_FOLDER_ID")),
        },
        "database": stats,
        "er_schema": er_schema,
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


@app.get("/api/admin/intelligence")
async def admin_intelligence(admin_user: dict = Depends(require_admin)):
    """Deterministic governance briefing built from live operational evidence."""
    stats = await get_db_stats()
    er_schema = await get_er_schema_status()
    catalyst = get_catalyst_service_matrix()
    service_summary = catalyst["summary"]

    role_rows = await fetch_all(
        "SELECT role, COUNT(*) AS count FROM users GROUP BY role ORDER BY role"
    )
    failed_logins = await fetch_one("""
        SELECT COUNT(*) AS count FROM audit_logs
        WHERE action = 'LOGIN_FAILED' AND datetime(timestamp) >= datetime('now', '-24 hours')
    """)
    privileged_actions = await fetch_one("""
        SELECT COUNT(*) AS count FROM audit_logs
        WHERE datetime(timestamp) >= datetime('now', '-24 hours')
          AND (action LIKE 'USER_%' OR action LIKE 'CATALYST_%' OR action LIKE 'JOB_%')
    """)
    active_operators = await fetch_one("""
        SELECT COUNT(DISTINCT username) AS count FROM audit_logs
        WHERE datetime(timestamp) >= datetime('now', '-24 hours') AND username IS NOT NULL
    """)
    stale_alerts = await fetch_one("""
        SELECT COUNT(*) AS count FROM alert_events
        WHERE status != 'resolved' AND datetime(created_at) < datetime('now', '-72 hours')
    """)
    open_alerts = await fetch_one(
        "SELECT COUNT(*) AS count FROM alert_events WHERE status != 'resolved'"
    )
    failed_jobs = await fetch_one("""
        SELECT COUNT(*) AS count FROM job_runs
        WHERE lower(status) NOT IN ('success', 'completed')
          AND datetime(started_at) >= datetime('now', '-7 days')
    """)
    latest_job = await fetch_one("""
        SELECT job_name, status, started_at, detail FROM job_runs ORDER BY id DESC LIMIT 1
    """)

    failed_login_count = int((failed_logins or {}).get("count", 0))
    stale_alert_count = int((stale_alerts or {}).get("count", 0))
    failed_job_count = int((failed_jobs or {}).get("count", 0))
    active_services = int(service_summary.get("active_or_ready", 0))
    total_services = max(int(service_summary.get("total_requested", 0)), 1)
    service_score = round((active_services / total_services) * 40)
    identity_score = 20 if len(role_rows) >= len(ROLES) else round((len(role_rows) / len(ROLES)) * 20)
    integrity_score = 15 if er_schema.get("valid") else 0
    security_score = 15 if failed_login_count == 0 else max(3, 15 - min(failed_login_count, 12))
    operations_score = 10 if not failed_job_count and not stale_alert_count else max(2, 10 - failed_job_count * 3 - min(stale_alert_count, 5))
    readiness_score = min(100, service_score + identity_score + integrity_score + security_score + operations_score)

    recommendations = []
    if failed_login_count:
        recommendations.append({"priority": "High", "action": "Review failed sign-ins", "evidence": f"{failed_login_count} failed login attempts in the last 24 hours"})
    if stale_alert_count:
        recommendations.append({"priority": "High", "action": "Escalate ageing warnings", "evidence": f"{stale_alert_count} unresolved alerts are older than 72 hours"})
    if failed_job_count:
        recommendations.append({"priority": "High", "action": "Repair scheduled intelligence jobs", "evidence": f"{failed_job_count} failed jobs recorded in the last seven days"})
    missing_roles = sorted(set(ROLES) - {str(row.get("role")) for row in role_rows})
    if missing_roles:
        recommendations.append({"priority": "Medium", "action": "Complete role coverage", "evidence": f"No account is assigned to: {', '.join(missing_roles)}"})
    if active_services < total_services:
        recommendations.append({"priority": "Medium", "action": "Close Catalyst service gaps", "evidence": f"{active_services} of {total_services} services are active or configured"})
    if not recommendations:
        recommendations.append({"priority": "Normal", "action": "Maintain operational posture", "evidence": "No immediate governance exception was detected"})

    release_gates = [
        {"name": "ER schema integrity", "status": "pass" if er_schema.get("valid") else "fail", "detail": f"Schema {er_schema.get('schema_version', 'unknown')}"},
        {"name": "Role coverage", "status": "pass" if not missing_roles else "attention", "detail": f"{len(role_rows)} of {len(ROLES)} roles represented"},
        {"name": "Scheduled operations", "status": "pass" if not failed_job_count else "fail", "detail": latest_job.get("status", "No run recorded") if latest_job else "No run recorded"},
        {"name": "Alert governance", "status": "pass" if not stale_alert_count else "attention", "detail": f"{stale_alert_count} alerts beyond SLA"},
        {"name": "Catalyst readiness", "status": "pass" if active_services >= 9 else "attention", "detail": f"{active_services} active/configured services"},
    ]

    await log_audit(
        admin_user.get("username"), admin_user.get("role"), "ADMIN_INTELLIGENCE_VIEW",
        "admin/intelligence", "Viewed governance intelligence briefing", "",
    )
    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "readiness": {
            "score": readiness_score,
            "posture": "Operational" if readiness_score >= 80 else "Attention required" if readiness_score >= 60 else "Critical",
            "components": {
                "catalyst_services": service_score,
                "role_coverage": identity_score,
                "data_integrity": integrity_score,
                "security": security_score,
                "operations": operations_score,
            },
        },
        "identity": {"roles": role_rows, "supported_roles": list(ROLES)},
        "security": {
            "failed_logins_24h": failed_login_count,
            "privileged_actions_24h": int((privileged_actions or {}).get("count", 0)),
            "active_operators_24h": int((active_operators or {}).get("count", 0)),
        },
        "operations": {
            "open_alerts": int((open_alerts or {}).get("count", 0)),
            "stale_alerts": stale_alert_count,
            "failed_jobs_7d": failed_job_count,
            "latest_job": latest_job,
            "report_archive": int(stats.get("report_archive", 0)),
        },
        "release_gates": release_gates,
        "recommendations": recommendations[:6],
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


@app.get("/api/catalyst/datastore/status")
async def catalyst_datastore_status(request: Request, user: dict = Depends(require_admin)):
    """Probe the configured Catalyst Data Store table without mutating it."""
    return await datastore_probe(request)


@app.post("/api/catalyst/services/verify")
async def catalyst_services_verify(request: Request, user: dict = Depends(require_admin)):
    """Run live SDK operations; configuration flags alone never count as proof."""
    proofs = await verify_managed_services(request)
    await log_audit(
        user.get("username"), user.get("role"), "CATALYST_SERVICES_VERIFY",
        "catalyst/services", "Executed managed Catalyst service verification", "",
    )
    return {
        "verified": sum(1 for proof in proofs.values() if proof["verified"]),
        "failed": sum(1 for proof in proofs.values() if not proof["verified"]),
        "proofs": proofs,
    }


@app.get("/api/search/global")
async def global_search(request: Request, q: str = Query(..., min_length=2, max_length=120), user: dict = Depends(get_current_user)):
    """Use Catalyst Search when available, otherwise parameterized SQL."""
    term = _validate_filter(q, "q", max_length=120)
    if has_capability(user, "platform:admin"):
        users = await fetch_all("SELECT username, role, COALESCE(active, 1) AS active FROM users WHERE username LIKE ? OR role LIKE ? LIMIT 30", (f"%{term}%", f"%{term}%"))
        return {"provider": "governance-search", "used": True, "data": users, "result_type": "identity-metadata"}
    if has_capability(user, "policy:read_aggregate"):
        rows = await fetch_all("SELECT district, crime_type, COUNT(*) AS count FROM firs WHERE district LIKE ? OR crime_type LIKE ? GROUP BY district, crime_type ORDER BY count DESC LIMIT 30", (f"%{term}%", f"%{term}%"))
        return {"provider": "aggregate-search", "used": True, "data": rows, "result_type": "aggregate"}
    pattern = f"%{term}%"
    assignment_clause = " AND LOWER(assigned_to) = LOWER(?)" if has_capability(user, "case:read_assigned") and not has_capability(user, "case:read_command") else ""
    params = [pattern, pattern, pattern, pattern, pattern]
    if assignment_clause:
        params.append(user.get("username"))
    rows = await fetch_all(
        f"""
        SELECT fir_id, crime_type, date, district, police_station, status,
               offender_id, victim_id, assigned_to, priority
        FROM firs
        WHERE (fir_id LIKE ? OR crime_type LIKE ? OR district LIKE ?
           OR police_station LIKE ? OR status LIKE ?) {assignment_clause}
        ORDER BY date DESC
        LIMIT 50
        """,
        tuple(params),
    )
    projected = pseudonymize_record(rows) if has_capability(user, "analytics:read_pseudonymized") else rows
    return {"provider": "role-scoped-sql", "used": True, "data": projected, "result_type": user.get("disclosure_mode")}


@app.post("/api/quickml/predict")
async def quickml_prediction(body: QuickMLPredictionRequest, request: Request, user: dict = Depends(require_admin)):
    """Invoke the published QuickML model through the Catalyst SDK."""
    result = await quickml_predict(request, body.features)
    if not result["used"]:
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@app.post("/api/zia/text-analysis")
async def catalyst_zia_text_analysis(
    body: ZiaTextRequest, request: Request,
    user: dict = Depends(require_any_capability("ai:analytical", "ai:supervisory")),
):
    documents = [str(value).strip()[:5000] for value in body.documents[:5] if str(value).strip()]
    if not documents:
        raise HTTPException(status_code=400, detail="At least one document is required")
    result = await zia_text_analysis(request, documents, body.keywords[:20] or None)
    if not result["used"]:
        raise HTTPException(status_code=503, detail=result["error"])
    await log_audit(user.get("username"), user.get("role"), "ZIA_TEXT_ANALYSIS", "zia", "Analyzed privacy-reviewed text", "")
    return result


@app.post("/api/smartbrowz/verify")
async def catalyst_smartbrowz_verify(request: Request, user: dict = Depends(require_admin)):
    html = "<html><body><h1>NAMMA KSP</h1><p>SmartBrowz service verification.</p></body></html>"
    result = await smartbrowz_pdf(request, html)
    if not result["used"]:
        raise HTTPException(status_code=503, detail=result["error"])
    return Response(content=result["data"], media_type="application/pdf")


@app.post("/api/notifications/mail")
async def catalyst_mail_send(body: CatalystMailRequest, request: Request, user: dict = Depends(require_admin)):
    result = await send_catalyst_mail(request, body.recipients[:20], body.subject[:200], body.content[:10000])
    if not result["used"]:
        raise HTTPException(status_code=503, detail=result["error"])
    await log_audit(user.get("username"), user.get("role"), "CATALYST_MAIL_SEND", "mail", f"Sent to {len(body.recipients[:20])} recipient(s)", "")
    return result


@app.post("/api/notifications/push")
async def catalyst_push_send(body: CatalystPushRequest, request: Request, user: dict = Depends(require_admin)):
    result = await send_catalyst_push(request, body.recipients[:100], body.message[:500])
    if not result["used"]:
        raise HTTPException(status_code=503, detail=result["error"])
    await log_audit(user.get("username"), user.get("role"), "CATALYST_PUSH_SEND", "push", f"Sent to {len(body.recipients[:100])} user(s)", "")
    return result


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
        "SELECT username, role FROM users WHERE LOWER(username) = ? AND password_hash = ? AND COALESCE(active, 1) = 1",
        (request.username.lower(), pw_hash)
    )
    if not user:
        LOGIN_ATTEMPTS[client_ip].append(now)
        await log_audit(request.username, None, "LOGIN_FAILED", "auth", "Invalid username or password", http_request.client.host if http_request.client else "")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    LOGIN_ATTEMPTS.pop(client_ip, None)
    token = str(uuid.uuid4())
    identity = enrich_identity({
        "username": user["username"], "role": user["role"],
        "issued_at": int(now), "expires_at": int(now + SESSION_TTL_SECONDS),
    })
    ACTIVE_SESSIONS[token] = identity
    await log_audit(identity["username"], identity["role"], "LOGIN_SUCCESS", "auth", "User signed in", http_request.client.host if http_request.client else "")
    return {
        "token": token,
        "username": identity["username"],
        "role": identity["role"],
        "capabilities": identity["capabilities"],
        "disclosure_mode": identity["disclosure_mode"],
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


@app.get("/api/workspace/me")
async def workspace_me(user: dict = Depends(get_current_user)):
    """Return the server-authorized dashboard composition for this identity."""
    return workspace_for(user)


@app.get("/api/workspace/intelligence")
async def workspace_intelligence(request: Request, user: dict = Depends(get_current_user)):
    """Return a fresh, role-specific decision queue built from verified registries."""
    identity = enrich_identity(user)
    role = identity["role"]
    cached = await get_cached_analytics_overview(request)
    overview = cached.get("overview", {})
    districts = cached.get("district_stats", [])
    crime_types = cached.get("crime_type_distribution", [])
    trends = cached.get("monthly_trends", [])
    latest_job = (await list_job_runs(1) or [None])[0]
    alerts = await list_alert_events(50)
    open_alerts = [item for item in alerts if str(item.get("status", "open")).lower() != "resolved"]
    high_alerts = [item for item in open_alerts if str(item.get("severity", "")).lower() in {"critical", "high"}]
    top_district = districts[0] if districts else {}
    top_crime = crime_types[0] if crime_types else {}
    latest_trend = trends[-1] if trends else {}
    previous_trend = trends[-2] if len(trends) > 1 else {}
    trend_delta = 0.0
    if float(previous_trend.get("count") or 0) > 0:
        trend_delta = round(
            ((float(latest_trend.get("count") or 0) - float(previous_trend["count"])) /
             float(previous_trend["count"])) * 100,
            1,
        )

    assigned_cases: list[dict] = []
    assigned_open = 0
    if role == "Investigator":
        assigned_cases = await search_firs(limit=250, assigned_to=identity.get("username"))
        assigned_open = sum(
            1 for item in assigned_cases
            if str(item.get("status", "")).lower() in {"open", "under investigation", "investigating"}
        )

    common = {
        "generated_at": datetime.now(UTC).isoformat(),
        "source": "NAMMA KSP verified synthetic registries",
        "freshness": latest_job.get("started_at") if latest_job else None,
        "decision_policy": "Human review required before operational action",
    }
    queues: dict[str, list[dict]] = {
        "Investigator": [
            {"priority": "Assigned queue", "title": "Review active assigned cases", "value": assigned_open, "evidence": "firs.assigned_to + firs.status", "action": "cases"},
            {"priority": "Case ownership", "title": "Verify assigned evidence records", "value": len(assigned_cases), "evidence": "firs.assigned_to", "action": "cases"},
            {"priority": "Urgent work", "title": "Prioritize high-risk assigned FIRs", "value": sum(1 for item in assigned_cases if item.get("priority") in {"Critical", "High"}), "evidence": "firs.priority", "action": "cases"},
        ],
        "Analyst": [
            {"priority": "Pattern", "title": f"Validate {top_crime.get('crime_type') or 'leading crime'} concentration", "value": int(top_crime.get("count") or 0), "evidence": "firs grouped by crime_type", "action": "pattern"},
            {"priority": "Momentum", "title": "Compare latest recorded month", "value": trend_delta, "unit": "%", "evidence": "monthly FIR series", "action": "trend"},
            {"priority": "Early warning", "title": "Review high-priority signals", "value": len(high_alerts), "evidence": "alert_events ledger", "action": "alerts"},
        ],
        "Supervisor": [
            {"priority": "Command", "title": "Triage unresolved intelligence warnings", "value": len(open_alerts), "evidence": "alert_events.status", "action": "alerts"},
            {"priority": "Workload", "title": "Review active command pressure", "value": int(overview.get("open_cases") or 0), "evidence": "firs.status", "action": "cases"},
            {"priority": "Accountability", "title": "Confirm intelligence refresh health", "value": latest_job.get("status") if latest_job else "Not run", "evidence": "job_runs ledger", "action": "audit"},
        ],
        "Policymaker": [
            {"priority": "State trend", "title": "Review latest statewide movement", "value": trend_delta, "unit": "%", "evidence": "aggregate monthly FIR series", "action": "trend"},
            {"priority": "Resource planning", "title": f"Compare {top_district.get('district') or 'leading district'} workload", "value": int(top_district.get("total_crimes") or 0), "evidence": "aggregate district FIR counts", "action": "district"},
            {"priority": "Prevention", "title": "Assess represented district coverage", "value": int(overview.get("districts_covered") or 0), "unit": "districts", "evidence": "aggregate FIR registry", "action": "districts"},
        ],
        "Administrator": [],
    }
    await log_audit(
        identity.get("username"), role, "WORKSPACE_INTELLIGENCE_VIEW", "workspace/intelligence",
        f"Rendered {len(queues[role])} server-ranked role decisions", _client_ip(request),
        user_id=identity.get("user_id", ""),
    )
    return {**common, "role": role, "items": queues[role]}


# ═══════════════════════════════════════════════════════════════════════════════
# USER MANAGEMENT ENDPOINTS (ADMIN ONLY)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/users")
async def list_users(http_request: Request, admin_user: dict = Depends(require_admin)):
    if not DEMO_MODE:
        users = await get_all_catalyst_users(http_request)
    else:
        from database import fetch_all
        users = await fetch_all("SELECT username, role, COALESCE(active, 1) AS active FROM users ORDER BY username ASC")
    await log_audit(
        admin_user.get("username"), admin_user.get("role"), "USER_LIST_VIEW",
        "users", f"Viewed {len(users)} authorized users", _client_ip(http_request),
        user_id=admin_user.get("user_id", ""),
    )
    return users


@app.get("/api/audit/logs")
async def list_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    user: dict = Depends(require_any_capability("audit:read_command", "audit:read_all")),
):
    events = await list_audit_events(limit)
    if has_capability(user, "audit:read_all"):
        return events
    administrative_actions = {
        "USER_LIST_VIEW", "USER_CREATE", "USER_DELETE", "CATALYST_SERVICES_VIEW",
        "CATALYST_SERVICES_VERIFY", "CATALYST_MAIL_SEND", "CATALYST_PUSH_SEND",
    }
    projected = []
    for event in events:
        if event.get("action") in administrative_actions:
            continue
        safe = dict(event)
        safe.pop("ip_address", None)
        projected.append(safe)
    return projected


@app.post("/api/users")
async def create_user(request: UserCreate, admin_user: dict = Depends(require_admin)):
    if not DEMO_MODE:
        raise HTTPException(status_code=409, detail="Manage users and roles in Catalyst Authentication")
    from database import fetch_one, execute_write, hash_password
    username = request.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    if request.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    
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


@app.patch("/api/users/{username}")
async def update_user(username: str, request: UserUpdate, admin_user: dict = Depends(require_admin)):
    if not DEMO_MODE:
        raise HTTPException(status_code=409, detail="Manage users and roles in Catalyst Authentication")
    from database import execute_write, fetch_one
    target = await fetch_one("SELECT username, role, COALESCE(active, 1) AS active FROM users WHERE LOWER(username) = ?", (username.strip().lower(),))
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["username"].lower() == admin_user["username"].lower() and request.active is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own active account")
    role = request.role or target["role"]
    active = int(request.active if request.active is not None else bool(target["active"]))
    await execute_write("UPDATE users SET role = ?, active = ? WHERE LOWER(username) = ?", (role, active, username.strip().lower()))
    if not active:
        for token, session in list(ACTIVE_SESSIONS.items()):
            if str(session.get("username", "")).lower() == target["username"].lower():
                ACTIVE_SESSIONS.pop(token, None)
    await log_audit(admin_user.get("username"), admin_user.get("role"), "USER_UPDATE", "users", f"Updated {target['username']}: role={role}, active={bool(active)}", "")
    return {"username": target["username"], "role": role, "active": bool(active)}


# ═══════════════════════════════════════════════════════════════════════════════
# HOTSPOT / MAP ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/hotspots")
async def hotspots(
    district: Optional[str] = Query(None),
    crime_type: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    user: dict = Depends(require_any_capability(
        "case:read_assigned", "case:read_command", "analytics:read_pseudonymized", "policy:read_aggregate"
    ))
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
    user: dict = Depends(require_any_capability(
        "case:read_assigned", "case:read_command", "analytics:read_pseudonymized", "policy:read_aggregate"
    ))
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

def _case_is_in_scope(case: dict, user: dict) -> bool:
    if has_capability(user, "case:read_command") or has_capability(user, "analytics:read_pseudonymized"):
        return True
    if has_capability(user, "case:read_assigned"):
        return str(case.get("assigned_to") or "").casefold() == str(user.get("username") or "").casefold()
    return False

@app.get("/api/firs")
async def list_firs(
    crime_type: Optional[str] = Query(None),
    district:   Optional[str] = Query(None),
    status:     Optional[str] = Query(None),
    from_date:  Optional[str] = Query(None),
    to_date:    Optional[str] = Query(None),
    limit:      int           = Query(50, le=200),
    user: dict = Depends(require_any_capability(
        "case:read_assigned", "case:read_command", "analytics:read_pseudonymized"
    )),
):
    """Search FIRs with optional filters."""
    crime_type = _validate_filter(crime_type, "crime_type", max_length=80)
    district = _validate_filter(district, "district", max_length=80)
    if status and status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="status must be Open, Closed, or Under Investigation")
    from_date = _validate_date(from_date, "from_date")
    to_date = _validate_date(to_date, "to_date")
    assigned_to = user.get("username") if has_capability(user, "case:read_assigned") and not has_capability(user, "case:read_command") else None
    result = await search_firs(crime_type, district, status, from_date, to_date, limit, assigned_to)
    return project_case_payload(result, user)


@app.get("/api/firs/{fir_id}")
async def get_fir(
    fir_id: str,
    user: dict = Depends(require_any_capability(
        "case:read_assigned", "case:read_command", "analytics:read_pseudonymized"
    )),
):
    """Get full details for a single FIR."""
    fir_id = _validate_fir_id(fir_id)
    data = await get_fir_detail(fir_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"FIR {fir_id} not found")
    if not _case_is_in_scope(data, user):
        raise HTTPException(status_code=404, detail=f"FIR {fir_id} not found")
    return project_case_payload(data, user)


@app.get("/api/firs/{fir_id}/related")
async def fir_related_cases(
    fir_id: str,
    user: dict = Depends(require_any_capability(
        "case:read_assigned", "case:read_command", "analytics:read_pseudonymized"
    )),
):
    """Get related cases for a FIR."""
    fir_id = _validate_fir_id(fir_id)
    source = await get_fir_detail(fir_id)
    if not source or not _case_is_in_scope(source, user):
        raise HTTPException(status_code=404, detail=f"FIR {fir_id} not found")
    related = await get_related_cases(fir_id)
    scoped = [item for item in related if _case_is_in_scope(item, user)]
    return project_case_payload(scoped, user)


@app.post("/api/firs/{fir_id}/reassign")
async def reassign_fir(
    fir_id: str,
    request: CaseAssignmentRequest,
    http_request: Request,
    user: dict = Depends(require_any_capability("case:reassign_command")),
):
    from database import execute_write, fetch_one
    fir_id = _validate_fir_id(fir_id)
    case = await fetch_one("SELECT fir_id, assigned_to FROM firs WHERE fir_id = ?", (fir_id,))
    if not case:
        raise HTTPException(status_code=404, detail=f"FIR {fir_id} not found")
    assignee = request.assignee.strip()
    await execute_write("UPDATE firs SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE fir_id = ?", (assignee, fir_id))
    await log_audit(user.get("username"), user.get("role"), "CASE_REASSIGN", fir_id, f"Reassigned from {case.get('assigned_to') or 'unassigned'} to {assignee}; {request.note or 'no note'}", _client_ip(http_request))
    return {"fir_id": fir_id, "assigned_to": assignee, "status": "reassigned"}


# ═══════════════════════════════════════════════════════════════════════════════
# OFFENDER ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/offenders/high-risk")
async def high_risk_offenders(
    limit: int = Query(20, le=100),
    search: Optional[str] = Query(None),
    user: dict = Depends(require_any_capability(
        "offender:read_case", "offender:read_command", "offender:read_pseudonymized"
    )),
):
    """Top high-risk offenders with risk scores."""
    search = _validate_filter(search, "search", max_length=80)
    return project_case_payload(await get_high_risk_offenders(limit, search), user)


@app.get("/api/offenders/repeat")
async def repeat_offenders(user: dict = Depends(require_any_capability(
    "offender:read_case", "offender:read_command", "offender:read_pseudonymized"
))):
    """Repeat offenders with multiple FIRs."""
    return project_case_payload(await get_repeat_offenders(), user)


@app.get("/api/offenders/{offender_id}")
async def get_offender(
    offender_id: str,
    http_request: Request,
    user: dict = Depends(require_any_capability(
        "offender:read_case", "offender:read_command", "offender:read_pseudonymized"
    )),
):
    """Full offender profile with FIR history and risk score."""
    offender_id = await _resolve_offender_id(offender_id)
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
    return project_case_payload(profile, user)


# ═══════════════════════════════════════════════════════════════════════════════
# CRIMINAL NETWORK ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/network")
async def criminal_network(
    request: Request,
    district:   Optional[str] = Query(None),
    crime_type: Optional[str] = Query(None),
    limit:      int           = Query(150, le=300),
    user: dict = Depends(require_any_capability(
        "network:read_case", "network:read_analytical", "network:read_command"
    )),
):
    """Criminal network graph data for Cytoscape.js visualization."""
    district = _validate_filter(district, "district", max_length=80)
    crime_type = _validate_filter(crime_type, "crime_type", max_length=80)
    result = await get_cached_network_graph(
        request,
        district=district,
        crime_type=crime_type,
        limit=limit,
    )
    return project_case_payload(result, user)


@app.get("/api/network/offender/{offender_id}")
async def offender_network(
    offender_id: str,
    user: dict = Depends(require_any_capability(
        "network:read_case", "network:read_analytical", "network:read_command"
    )),
):
    """Focused sub-network around a specific offender."""
    result = await get_shared_offender_network(await _resolve_offender_id(offender_id))
    return project_case_payload(result, user)


# ═══════════════════════════════════════════════════════════════════════════════
# AI CHATBOT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/chat")
async def chat_endpoint(
    request: ChatRequest,
    http_request: Request,
    user: dict = Depends(require_any_capability(
        "ai:case_assist", "ai:analytical", "ai:supervisory", "ai:policy", "ai:platform_ops"
    )),
):
    """
    Conversational crime intelligence chatbot.
    Maintains session context across multiple turns.
    """
    session_id = request.session_id or str(uuid.uuid4())
    try:
        result = await chat(
            session_id, request.message, request.language,
            runtime_request=http_request, user=user, workspace_view=request.workspace_view,
        )
        await nosql_append_evidence(http_request, session_id, {
            "created_at": datetime.now(UTC).isoformat(),
            "query_sha256": hashlib.sha256(request.message.encode("utf-8")).hexdigest(),
            "language": request.language,
            "user_id": user.get("user_id", ""),
            "provider": result.get("provider", "") if isinstance(result, dict) else "",
            "response_chars": len(str(result.get("response", ""))) if isinstance(result, dict) else 0,
        })
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
        await _archive_report(pdf_path, "chat", request.session_id, user, http_request)
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
async def ai_case_summary(fir_id: str, http_request: Request, user: dict = Depends(require_any_capability(
    "case:read_assigned", "case:read_command", "analytics:read_pseudonymized"
))):
    """AI-generated investigation summary for a specific FIR."""
    try:
        fir_id = _validate_fir_id(fir_id)
        case_data = await get_fir_detail(fir_id)
        if not case_data or not _case_is_in_scope(case_data, user):
            raise HTTPException(status_code=404, detail=f"FIR {fir_id} not found")
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
    crime_type: Optional[str] = Query(None),
    user: dict = Depends(require_any_capability(
        "ai:case_assist", "ai:analytical", "ai:supervisory", "ai:policy"
    )),
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
async def generate_report(
    request: ReportRequest, http_request: Request,
    user: dict = Depends(require_any_capability("report:create_case")),
):
    """Generate and download a PDF investigation report for a FIR."""
    fir_id = request.fir_id

    case_data = await get_fir_detail(fir_id)
    if not case_data:
        raise HTTPException(status_code=404, detail=f"FIR {fir_id} not found")
    if not _case_is_in_scope(case_data, user):
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
        await _archive_report(pdf_path, "case", fir_id, user, http_request)
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
async def generate_district_report_endpoint(
    request: DistrictReportRequest, http_request: Request,
    user: dict = Depends(require_any_capability(
        "report:create_case", "report:create_analytical", "report:create_policy"
    )),
):
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
        await _archive_report(pdf_path, "district", district, user, http_request)
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
async def generate_offender_report_endpoint(
    request: OffenderReportRequest, http_request: Request,
    user: dict = Depends(require_any_capability("report:create_case")),
):
    """Generate and download a PDF offender profile dossier."""
    offender_id = request.offender_id
    
    from analytics import get_offender_profile
    data = await get_offender_profile(offender_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Offender {offender_id} not found")
        
    try:
        from report import generate_offender_report
        pdf_path = await generate_offender_report(offender_id, data)
        await _archive_report(pdf_path, "offender", offender_id, user, http_request)
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
async def generate_network_report_endpoint(
    request: NetworkReportRequest, http_request: Request,
    user: dict = Depends(require_any_capability(
        "report:create_case", "report:create_analytical"
    )),
):
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
        await _archive_report(pdf_path, "network", subject, user, http_request)
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
async def generate_recommendations_report_endpoint(
    request: RecommendationsReportRequest, http_request: Request,
    user: dict = Depends(require_any_capability(
        "report:create_case", "report:create_analytical", "report:create_policy"
    )),
):
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
        await _archive_report(pdf_path, "recommendations", subject, user, http_request)
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

async def list_reports(
    http_request: Request,
    user: dict = Depends(require_any_capability(
        "report:read_own", "report:read_analytical", "report:read_command",
        "report:read_policy", "report:read_system"
    )),
):
    """List all generated PDF reports."""
    reports = await list_report_archive(100)
    role = user.get("role")
    if role == "Investigator":
        reports = [r for r in reports if r.get("generated_by") == user.get("username")]
    elif role == "Analyst":
        reports = [r for r in reports if r.get("report_type") in {"district", "network", "recommendations"}]
    elif role == "Policymaker":
        reports = [r for r in reports if r.get("report_type") in {"district", "recommendations", "policy"}]
    elif role == "Administrator":
        reports = [r for r in reports if r.get("report_type") in {"system", "governance", "audit"}]
    seen = {r["filename"] for r in reports}
    stratus = await list_report_objects(http_request)
    if stratus["used"] and role == "Supervisor":
        for report in stratus["data"]:
            if report["filename"] not in seen:
                reports.append(report)
                seen.add(report["filename"])
    if REPORTS_DIR.exists() and role == "Supervisor":
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
async def download_report_file(
    filename: str, http_request: Request,
    user: dict = Depends(require_any_capability(
        "report:read_own", "report:read_analytical", "report:read_command",
        "report:read_policy", "report:read_system"
    )),
):
    """
    Serve a generated PDF report file with guaranteed application/pdf content-type
    and Content-Disposition: attachment so browsers download it instead of displaying it.
    """
    filename = _validate_report_filename(filename)
    archives = await list_report_archive(500)
    archive = next((item for item in archives if item.get("filename") == filename), None)
    role = user.get("role")
    allowed_type = {
        "Analyst": {"district", "network", "recommendations"},
        "Policymaker": {"district", "recommendations", "policy"},
        "Administrator": {"system", "governance", "audit"},
    }.get(role)
    if role == "Investigator" and (not archive or archive.get("generated_by") != user.get("username")):
        raise HTTPException(status_code=403, detail="Investigators may download only their own reports")
    if allowed_type is not None and (not archive or archive.get("report_type") not in allowed_type):
        raise HTTPException(status_code=403, detail="This report is outside the role disclosure policy")
    
    pdf_path = REPORTS_DIR / filename
    if not pdf_path.exists():
        archived = await download_report(http_request, filename)
        if not archived["used"]:
            raise HTTPException(status_code=404, detail=f"Report '{filename}' not found")
        await log_audit(
            user.get("username"), user.get("role"), "REPORT_DOWNLOAD", "reports",
            f"Downloaded {filename} from Catalyst Stratus", _client_ip(http_request),
            user_id=user.get("user_id", ""),
        )
        return Response(
            content=archived["data"], media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Cache-Control": "no-cache",
            },
        )
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
async def open_report_from_qr(filename: str, http_request: Request):
    """
    Public QR endpoint for generated PDF reports.
    The QR embedded inside a report opens this URL directly.
    """
    filename = _validate_report_filename(filename)

    pdf_path = REPORTS_DIR / filename
    if not pdf_path.exists():
        archived = await download_report(http_request, filename)
        if not archived["used"]:
            raise HTTPException(status_code=404, detail=f"Report '{filename}' not found")
        return Response(
            content=archived["data"], media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Cache-Control": "public, max-age=86400",
            },
        )

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
