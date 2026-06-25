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
from pathlib import Path
from datetime import datetime
from typing import Optional
from urllib.parse import quote

import uvicorn
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Depends, Header, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
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
    get_advanced_intelligence_summary
)
from network   import get_network_data, get_shared_offender_network
from ai_service import chat, generate_case_summary, get_investigation_recommendations, clear_session
from report    import (
    generate_case_report, generate_district_report, generate_chat_log_report,
    generate_recommendations_report, generate_investigation_dossier
)

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# ─── App Setup ────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
REPORTS_DIR  = BASE_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_REPORT_BASE_URL = os.getenv(
    "PUBLIC_REPORT_BASE_URL",
    "https://namma-ksp-50043229029.development.catalystappsail.in"
).rstrip("/")

app = FastAPI(
    title="NAMMA KSP",
    description="Intelligent Crime Analytics & Investigation Support Platform — Karnataka Police",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

ALLOWED_ORIGINS = [
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "https://nammaksp-60074625517.development.catalystserverless.in",
    "https://namma-ksp-50043229029.development.catalystappsail.in",
]

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
        return response

app.add_middleware(NoCacheMiddleware)


# ─── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    logger.info("NAMMA KSP starting up...")
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    await init_db()
    logger.info("Database ready. API is live.")


# ─── Pydantic Models ──────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message:    str
    session_id: Optional[str] = None
    language:   Optional[str] = "en-US"

class ClearSessionRequest(BaseModel):
    session_id: str

class ReportRequest(BaseModel):
    fir_id: str

class DistrictReportRequest(BaseModel):
    district: str

class OffenderReportRequest(BaseModel):
    offender_id: str

class NetworkReportRequest(BaseModel):
    image_data: str
    district: Optional[str] = "All Districts"
    crime_type: Optional[str] = "All Crimes"

class RecommendationsReportRequest(BaseModel):
    district: Optional[str] = None
    crime_type: Optional[str] = None

class DossierReportRequest(BaseModel):
    fir_id: Optional[str] = None
    offender_id: Optional[str] = None
    district: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: str  # 'Admin' or 'Investigator'

class ChatMessage(BaseModel):
    role: str
    content: str

class ExportChatRequest(BaseModel):
    session_id: str
    messages: list[ChatMessage]

class TTSRequest(BaseModel):
    text: str
    language: Optional[str] = "en"  # "en" or "kn"


# ─── Auth Session Registry & Dependencies ─────────────────────────────────────
ACTIVE_SESSIONS = {}

PUBLIC_API_PATHS = {"/api/health", "/api/auth/login"}
PUBLIC_API_PREFIXES = ("/api/reports/qr/",)

@app.middleware("http")
async def require_authenticated_api_session(request: Request, call_next):
    """Reject access to crime data APIs before route handlers are reached."""
    path = request.url.path.rstrip("/") or "/"
    if (
        request.method != "OPTIONS"
        and path.startswith("/api/")
        and path not in PUBLIC_API_PATHS
        and not any(path.startswith(prefix) for prefix in PUBLIC_API_PREFIXES)
    ):
        authorization = request.headers.get("authorization", "")
        token = authorization[7:].strip() if authorization.startswith("Bearer ") else ""
        if not token or token not in ACTIVE_SESSIONS:
            return JSONResponse(
                status_code=401,
                content={"detail": "Authentication required or session expired"},
                headers={"Cache-Control": "no-store"},
            )
    return await call_next(request)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization token required")
    token = authorization.split(" ")[1]
    if token not in ACTIVE_SESSIONS:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return ACTIVE_SESSIONS[token]

async def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
    return user


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


async def _build_workspace_brief(
    fir_id: Optional[str] = None,
    offender_id: Optional[str] = None,
    district: Optional[str] = None
) -> dict:
    """Assemble the full investigation workspace context for a case/offender/district."""
    fir = None
    offender = None
    related_cases = []
    normalized_fir = fir_id.upper().strip() if fir_id else ""
    normalized_offender = offender_id.upper().strip() if offender_id else ""

    if normalized_fir:
        fir = await get_fir_detail(normalized_fir)
        if not fir:
            raise HTTPException(status_code=404, detail=f"FIR {normalized_fir} not found")
        related_cases = await get_related_cases(normalized_fir)
        if not normalized_offender:
            normalized_offender = fir.get("offender_id") or ""
        if not district:
            district = fir.get("district")

    if normalized_offender:
        offender = await get_offender_profile(normalized_offender)
        if not offender:
            raise HTTPException(status_code=404, detail=f"Offender {normalized_offender} not found")
        if not district:
            district = offender.get("district")
        if not fir and offender.get("fir_history"):
            normalized_fir = offender["fir_history"][0].get("fir_id", "")
            if normalized_fir:
                fir = await get_fir_detail(normalized_fir)
                related_cases = await get_related_cases(normalized_fir)

    if not fir and not offender and district:
        district_firs = await search_firs(district=district, limit=1)
        if district_firs:
            normalized_fir = district_firs[0]["fir_id"]
            fir = await get_fir_detail(normalized_fir)
            related_cases = await get_related_cases(normalized_fir)
            normalized_offender = fir.get("offender_id") if fir else ""
            offender = await get_offender_profile(normalized_offender) if normalized_offender else None

    if not fir and not offender:
        sample = await search_firs(limit=1)
        if not sample:
            raise HTTPException(status_code=404, detail="No case records available")
        normalized_fir = sample[0]["fir_id"]
        fir = await get_fir_detail(normalized_fir)
        related_cases = await get_related_cases(normalized_fir)
        normalized_offender = fir.get("offender_id") if fir else ""
        offender = await get_offender_profile(normalized_offender) if normalized_offender else None
        district = fir.get("district") if fir else district

    case_summary = {}
    try:
        if normalized_fir:
            case_summary = await generate_case_summary(normalized_fir)
    except Exception:
        case_summary = {"summary": "AI case summary unavailable for this workspace."}

    recommendations = {}
    try:
        recommendations = await get_investigation_recommendations(
            district=district,
            crime_type=fir.get("crime_type") if fir else None
        )
    except Exception:
        recommendations = {"recommendations": "Recommendations unavailable."}

    network = {}
    if normalized_offender:
        try:
            network = await get_shared_offender_network(normalized_offender)
        except Exception:
            network = {}

    financial = []
    if normalized_fir:
        financial = await fetch_all(
            """
            SELECT transaction_id, amount, channel, district, risk_flag,
                   sender_account, receiver_account, transaction_date
            FROM financial_transactions
            WHERE fir_id = ?
            ORDER BY amount DESC
            LIMIT 8
            """,
            (normalized_fir,)
        )

    alerts = await list_alert_events(5)
    explanation = await get_explainable_intelligence()

    timeline = []
    if offender and offender.get("fir_history"):
        timeline = sorted(offender["fir_history"], key=lambda x: x.get("date") or "")[:12]
    elif fir:
        timeline = [{"fir_id": fir.get("fir_id"), "date": fir.get("date"), "crime_type": fir.get("crime_type"), "status": fir.get("status")}]

    evidence_refs = []
    if fir:
        evidence_refs.extend([
            {"type": "FIR", "id": fir.get("fir_id"), "label": fir.get("crime_type"), "source": "firs"},
            {"type": "Location", "id": fir.get("location_id"), "label": f"{fir.get('district')} / {fir.get('police_station')}", "source": "locations"},
        ])
    if offender:
        evidence_refs.append({"type": "Offender", "id": offender.get("offender_id"), "label": offender.get("name"), "source": "offenders"})
    for item in related_cases[:5]:
        evidence_refs.append({"type": "Related FIR", "id": item.get("fir_id"), "label": item.get("relation"), "source": "relationships"})
    for item in financial[:5]:
        evidence_refs.append({"type": "Financial", "id": item.get("transaction_id"), "label": item.get("risk_flag"), "source": "financial_transactions"})

    confidence = {
        "overall": 92 if financial else 84,
        "basis": [
            {"label": "FIR dataset", "status": "verified", "score": 100},
            {"label": "Offender/victim linkage", "status": "verified" if offender else "partial", "score": 90 if offender else 55},
            {"label": "Financial evidence", "status": "uploaded" if financial else "not linked to selected FIR", "score": 92 if financial else 45},
            {"label": "AI inference", "status": "explainable", "score": 78},
        ]
    }

    leads = []
    if related_cases:
        leads.append({"priority": "High", "action": "Review related FIR cluster", "reason": f"{len(related_cases)} related case links found"})
    if offender and offender.get("risk_category") in ("High", "Medium"):
        leads.append({"priority": offender.get("risk_category"), "action": "Prioritize offender activity review", "reason": f"Risk score {offender.get('risk_score', 'N/A')}/100"})
    if financial:
        leads.append({"priority": "High", "action": "Trace suspicious transaction accounts", "reason": f"{len(financial)} linked financial records"})
    if district:
        leads.append({"priority": "Medium", "action": "Compare district hotspot pattern", "reason": f"District focus: {district}"})
    leads.append({"priority": "Medium", "action": "Generate dossier and share with supervisor", "reason": "Consolidates evidence, AI reasoning, and recommended next steps"})

    return {
        "workspace": {
            "title": f"Investigation Workspace {normalized_fir or normalized_offender or district or ''}".strip(),
            "fir_id": normalized_fir,
            "offender_id": normalized_offender,
            "district": district,
            "generated_at": datetime.now().isoformat(timespec="seconds"),
        },
        "case": fir,
        "offender": offender,
        "timeline": timeline,
        "related_cases": related_cases,
        "network": {
            "metrics": network.get("metrics", {}),
            "nodes": len(network.get("graph", {}).get("nodes", [])) if isinstance(network.get("graph"), dict) else 0,
            "edges": len(network.get("graph", {}).get("edges", [])) if isinstance(network.get("graph"), dict) else 0,
        },
        "financial_links": financial,
        "alerts": alerts,
        "ai_summary": case_summary.get("summary") or case_summary.get("analysis") or "No AI summary available.",
        "recommendations": recommendations.get("recommendations", ""),
        "evidence_refs": evidence_refs,
        "confidence": confidence,
        "leads": leads,
        "explainability": explanation.get("evidence_trails", []),
        "demo_script": [
            "Open Command Center and load a FIR/offender.",
            "Show case board, evidence trail, network metrics, timeline, confidence score and leads.",
            "Ask voice/AI query using the selected case context.",
            "Generate the one-click investigation dossier PDF with QR.",
            "Open audit/system pages to show governance and Catalyst deployment readiness.",
        ]
    }


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
        }
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
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/login")
async def login_endpoint(request: LoginRequest, http_request: Request):
    from database import fetch_one, hash_password
    pw_hash = hash_password(request.password)
    user = await fetch_one(
        "SELECT username, role FROM users WHERE LOWER(username) = ? AND password_hash = ?",
        (request.username.lower(), pw_hash)
    )
    if not user:
        await log_audit(request.username, None, "LOGIN_FAILED", "auth", "Invalid username or password", http_request.client.host if http_request.client else "")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = str(uuid.uuid4())
    ACTIVE_SESSIONS[token] = {"username": user["username"], "role": user["role"]}
    await log_audit(user["username"], user["role"], "LOGIN_SUCCESS", "auth", "User signed in", http_request.client.host if http_request.client else "")
    return {
        "token": token,
        "username": user["username"],
        "role": user["role"]
    }


@app.post("/api/auth/logout")
async def logout_endpoint(http_request: Request, authorization: Optional[str] = Header(None)):
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
async def list_users(admin_user: dict = Depends(require_admin)):
    from database import fetch_all
    return await fetch_all("SELECT username, role FROM users ORDER BY username ASC")


@app.get("/api/audit/logs")
async def list_audit_logs(limit: int = Query(100, ge=1, le=500), admin_user: dict = Depends(require_admin)):
    from database import fetch_all
    return await fetch_all("""
        SELECT id, timestamp, username, role, action, resource, detail, ip_address
        FROM audit_logs
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))


@app.post("/api/users")
async def create_user(request: UserCreate, admin_user: dict = Depends(require_admin)):
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
    await log_audit(admin_user.get("username"), admin_user.get("role"), "USER_CREATE", "users", f"Created {username} as {request.role}", "")
    return {"username": username, "role": request.role}


@app.delete("/api/users/{username}")
async def delete_user(username: str, admin_user: dict = Depends(require_admin)):
    from database import execute_write
    u = username.strip().lower()
    if u == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete default admin account")
    if u == admin_user["username"].lower():
        raise HTTPException(status_code=400, detail="Cannot delete your own active account")
    
    await execute_write("DELETE FROM users WHERE LOWER(username) = ?", (u,))
    await log_audit(admin_user.get("username"), admin_user.get("role"), "USER_DELETE", "users", f"Deleted {u}", "")
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
    return await search_firs(crime_type, district, status, from_date, to_date, limit)


@app.get("/api/firs/{fir_id}")
async def get_fir(fir_id: str):
    """Get full details for a single FIR."""
    data = await get_fir_detail(fir_id.upper())
    if not data:
        raise HTTPException(status_code=404, detail=f"FIR {fir_id} not found")
    return data


@app.get("/api/firs/{fir_id}/related")
async def fir_related_cases(fir_id: str):
    """Get related cases for a FIR."""
    return await get_related_cases(fir_id.upper())


# ═══════════════════════════════════════════════════════════════════════════════
# OFFENDER ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/offenders/high-risk")
async def high_risk_offenders(
    limit: int = Query(20, le=100),
    search: Optional[str] = Query(None)
):
    """Top high-risk offenders with risk scores."""
    return await get_high_risk_offenders(limit, search)


@app.get("/api/offenders/repeat")
async def repeat_offenders():
    """Repeat offenders with multiple FIRs."""
    return await get_repeat_offenders()


@app.get("/api/offenders/{offender_id}")
async def get_offender(offender_id: str):
    """Full offender profile with FIR history and risk score."""
    profile = await get_offender_profile(offender_id.upper())
    if not profile:
        raise HTTPException(status_code=404, detail=f"Offender {offender_id} not found")
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
    return await get_network_data(district=district, crime_type=crime_type, limit=limit)


@app.get("/api/network/offender/{offender_id}")
async def offender_network(offender_id: str):
    """Focused sub-network around a specific offender."""
    return await get_shared_offender_network(offender_id.upper())


# ═══════════════════════════════════════════════════════════════════════════════
# INVESTIGATION COMMAND CENTER
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/workspace/brief")
async def workspace_brief(
    fir_id: Optional[str] = Query(None),
    offender_id: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    http_request: Request = None,
    user: dict = Depends(get_current_user)
):
    """Complete investigation workspace payload for a FIR/offender/district."""
    brief = await _build_workspace_brief(fir_id, offender_id, district)
    await log_audit(
        user.get("username"), user.get("role"),
        "WORKSPACE_VIEW", "command-center",
        f"Viewed workspace FIR={brief['workspace'].get('fir_id')} offender={brief['workspace'].get('offender_id')}",
        _client_ip(http_request) if http_request else ""
    )
    return brief


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
    Convert text to speech using Google TTS (gTTS).
    Returns an MP3 audio stream.
    Supports English (en) and Kannada (kn).
    """
    try:
        from gtts import gTTS
        import io

        # Map language codes
        lang_map = {
            "en": "en",
            "en-US": "en",
            "kn": "kn",
            "kn-IN": "kn",
        }
        lang = lang_map.get(request.language, "en")

        # Clean text: strip markdown and keep only readable characters
        import re
        clean_text = request.text
        clean_text = re.sub(r'\*\*(.+?)\*\*', r'\1', clean_text)   # bold
        clean_text = re.sub(r'\*(.+?)\*', r'\1', clean_text)        # italic
        clean_text = re.sub(r'#+\s*', '', clean_text)                # headings
        clean_text = re.sub(r'[-•]\s+', '', clean_text)             # bullets
        clean_text = re.sub(r'<[^>]+>', '', clean_text)             # html tags
        clean_text = clean_text.strip()

        if not clean_text:
            raise HTTPException(status_code=400, detail="No text to speak")

        # Keep fallback TTS snappy; the browser handles instant long-form speech.
        if len(clean_text) > 1200:
            clean_text = clean_text[:1200] + "..."

        # Generate TTS audio in memory
        tts = gTTS(text=clean_text, lang=lang, slow=False)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)

        from fastapi.responses import StreamingResponse
        return StreamingResponse(
            audio_buffer,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=tts.mp3",
                "Cache-Control": "public, max-age=86400",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("TTS generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


@app.post("/api/audio-transcribe")
async def audio_transcribe_endpoint(
    file: UploadFile = File(...),
    language: Optional[str] = Query(None)
):
    """
    Transcribe recorded audio file via Groq Whisper.
    """
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty audio file")
            
        from ai_service import transcribing_audio
        text = await transcribing_audio(content, file.filename or "audio.webm", language)
        return {"text": text}
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
            _client_ip(http_request)
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
        result = await generate_case_summary(fir_id.upper())
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
    fir_id = request.fir_id.upper()

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
            _client_ip(http_request)
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
            _client_ip(http_request)
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
    offender_id = request.offender_id.upper()
    
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
            _client_ip(http_request)
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
            _client_ip(http_request)
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
            _client_ip(http_request)
        )
    except Exception as e:
        logger.error("Recommendations report PDF generation error: %s", e)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=Path(pdf_path).name
    )


@app.post("/api/reports/dossier")
async def generate_dossier_report_endpoint(
    request: DossierReportRequest,
    http_request: Request,
    metadata: bool = Query(False),
    user: dict = Depends(get_current_user)
):
    """Generate the one-click combined investigation workspace dossier."""
    try:
        workspace = await _build_workspace_brief(request.fir_id, request.offender_id, request.district)
        pdf_path = await generate_investigation_dossier(workspace)
        subject = workspace.get("workspace", {}).get("fir_id") or workspace.get("workspace", {}).get("offender_id") or "workspace"
        await _archive_report(pdf_path, "investigation-dossier", subject, user)
        await log_audit(
            user.get("username"), user.get("role"),
            "REPORT_GENERATE", "reports/dossier",
            f"Investigation dossier {Path(pdf_path).name}",
            _client_ip(http_request)
        )
        filename = Path(pdf_path).name
        report_url = f"{PUBLIC_REPORT_BASE_URL}/api/reports/qr/{quote(filename)}"
        if metadata:
            return {
                "filename": filename,
                "pdf_url": report_url,
                "qr_url": report_url,
                "subject": subject,
                "report_type": "investigation-dossier"
            }
        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=filename
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Investigation dossier generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Dossier generation failed: {e}")


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
    # Sanitize: only allow .pdf filenames with no path traversal
    if "/" in filename or "\\" in filename or not filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    pdf_path = REPORTS_DIR / filename
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail=f"Report '{filename}' not found")
    await log_audit(
        user.get("username"), user.get("role"),
        "REPORT_DOWNLOAD", "reports",
        f"Downloaded {filename}",
        _client_ip(http_request)
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
    if "/" in filename or "\\" in filename or not filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid filename")

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
