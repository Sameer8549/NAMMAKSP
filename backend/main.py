"""
main.py — CrimeLens AI
────────────────────────
FastAPI application entry point.
All API routes for the CrimeLens AI platform.
"""

import os
import sys
import logging
import uuid
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

# Add backend dir to path so sibling imports work
sys.path.insert(0, str(Path(__file__).parent))

load_dotenv(Path(__file__).parent.parent / ".env")

from database  import init_db, get_db_stats
from analytics import (
    get_overview_stats, get_crime_type_distribution, get_monthly_trends,
    get_district_stats, get_district_top_crime, get_hotspot_data,
    get_district_crime_density, get_offender_profile, get_high_risk_offenders,
    get_repeat_offenders, search_firs, get_fir_detail, get_related_cases,
    get_police_station_stats, get_yearly_comparison
)
from network   import get_network_data, get_shared_offender_network
from ai_service import chat, generate_case_summary, get_investigation_recommendations, clear_session
from report    import generate_case_report, generate_district_report, generate_chat_log_report

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

app = FastAPI(
    title="CrimeLens AI",
    description="Intelligent Crime Analytics & Investigation Support Platform — Karnataka Police",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    logger.info("CrimeLens AI starting up...")
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


# ─── Auth Session Registry & Dependencies ─────────────────────────────────────
ACTIVE_SESSIONS = {}

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


# ═══════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/login")
async def login_endpoint(request: LoginRequest):
    from database import fetch_one, hash_password
    pw_hash = hash_password(request.password)
    user = await fetch_one(
        "SELECT username, role FROM users WHERE LOWER(username) = ? AND password_hash = ?",
        (request.username.lower(), pw_hash)
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = str(uuid.uuid4())
    ACTIVE_SESSIONS[token] = {"username": user["username"], "role": user["role"]}
    return {
        "token": token,
        "username": user["username"],
        "role": user["role"]
    }


@app.post("/api/auth/logout")
async def logout_endpoint(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        ACTIVE_SESSIONS.pop(token, None)
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
    return {"deleted": username}


# ═══════════════════════════════════════════════════════════════════════════════
# HOTSPOT / MAP ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/hotspots")
async def hotspots(user: dict = Depends(get_current_user)):
    """Lat/lon hotspot data for Leaflet.js heatmap."""
    return await get_hotspot_data()


@app.get("/api/hotspots/density")
async def hotspot_density(user: dict = Depends(get_current_user)):
    """District crime density for choropleth map."""
    return await get_district_crime_density()


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
async def high_risk_offenders(limit: int = Query(20, le=100)):
    """Top high-risk offenders with risk scores."""
    return await get_high_risk_offenders(limit)


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
# AI CHATBOT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Conversational crime intelligence chatbot.
    Maintains session context across multiple turns.
    """
    session_id = request.session_id or str(uuid.uuid4())
    try:
        result = await chat(session_id, request.message, request.language)
        return result
    except Exception as e:
        logger.error("Chat error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/clear")
async def clear_chat_session(request: ClearSessionRequest):
    """Clear conversation history for a session."""
    cleared = clear_session(request.session_id)
    return {"cleared": cleared, "session_id": request.session_id}


@app.post("/api/chat/export")
async def export_chat_endpoint(request: ExportChatRequest):
    """
    Generate and download a PDF investigation dossier for a chat session.
    """
    if not request.messages:
        raise HTTPException(status_code=400, detail="Cannot export empty conversation history")
    try:
        msg_list = [{"role": m.role, "content": m.content} for m in request.messages]
        pdf_path = await generate_chat_log_report(request.session_id, msg_list)
        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=Path(pdf_path).name
        )
    except Exception as e:
        logger.error("Chat log export failed: %s", e)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@app.get("/api/ai/case-summary/{fir_id}")
async def ai_case_summary(fir_id: str):
    """AI-generated investigation summary for a specific FIR."""
    try:
        result = await generate_case_summary(fir_id.upper())
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
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
async def generate_report(request: ReportRequest):
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
    except Exception as e:
        logger.error("PDF generation error: %s", e)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=Path(pdf_path).name
    )


@app.post("/api/reports/district")
async def generate_district_report_endpoint(request: DistrictReportRequest):
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
    except Exception as e:
        logger.error("District report error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=Path(pdf_path).name
    )


@app.get("/api/reports/list")
async def list_reports():
    """List all generated PDF reports."""
    reports = []
    if REPORTS_DIR.exists():
        for f in sorted(REPORTS_DIR.glob("*.pdf"), reverse=True):
            reports.append({
                "filename": f.name,
                "size_kb":  round(f.stat().st_size / 1024, 1),
                "created":  f.stat().st_mtime
            })
    return reports


# ─── Serve Frontend ───────────────────────────────────────────────────────────
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    host = os.getenv("APP_HOST", "127.0.0.1")
    port = int(os.getenv("APP_PORT", 8000))
    uvicorn.run("main:app", host=host, port=port, reload=True, log_level="info")
