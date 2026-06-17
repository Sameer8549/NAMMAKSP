"""
analytics.py — NAMMA KSP
────────────────────────────
Crime analytics engine: computes all statistics for the dashboard,
hotspot analysis, offender profiling, and trend detection.
"""

import logging

from database import fetch_all

logger = logging.getLogger(__name__)


# ─── Dashboard Overview Stats ─────────────────────────────────────────────────

async def get_overview_stats() -> dict:
    """Total FIRs, crimes, open cases, districts covered."""
    rows = await fetch_all("""
        SELECT
            COUNT(*)                                        AS total_firs,
            COUNT(DISTINCT crime_type)                      AS total_crime_types,
            SUM(CASE WHEN status='Open' THEN 1 ELSE 0 END) AS open_cases,
            SUM(CASE WHEN status='Closed' THEN 1 ELSE 0 END) AS closed_cases,
            SUM(CASE WHEN status='Under Investigation' THEN 1 ELSE 0 END) AS under_investigation,
            COUNT(DISTINCT district)                        AS districts_covered
        FROM firs
    """)
    stats = rows[0] if rows else {}

    offender_rows = await fetch_all("SELECT COUNT(*) AS total FROM offenders")
    victim_rows   = await fetch_all("SELECT COUNT(*) AS total FROM victims")
    stats["total_offenders"] = offender_rows[0]["total"] if offender_rows else 0
    stats["total_victims"]   = victim_rows[0]["total"]   if victim_rows   else 0
    return stats


# ─── Crime Type Distribution ──────────────────────────────────────────────────

async def get_crime_type_distribution() -> list[dict]:
    """Count of FIRs per crime type, sorted descending."""
    return await fetch_all("""
        SELECT crime_type, COUNT(*) AS count
        FROM firs
        GROUP BY crime_type
        ORDER BY count DESC
    """)


# ─── Monthly Crime Trends ─────────────────────────────────────────────────────

async def get_monthly_trends() -> list[dict]:
    """Monthly FIR counts for trend chart (2022-2025)."""
    return await fetch_all("""
        SELECT
            strftime('%Y-%m', date) AS month,
            COUNT(*)                AS count
        FROM firs
        WHERE date IS NOT NULL
        GROUP BY month
        ORDER BY month ASC
    """)


# ─── District-wise Statistics ─────────────────────────────────────────────────

async def get_district_stats() -> list[dict]:
    """Total crimes, open cases, and top crime per district."""
    return await fetch_all("""
        SELECT
            district,
            COUNT(*)                                        AS total_crimes,
            SUM(CASE WHEN status='Open' THEN 1 ELSE 0 END) AS open_cases,
            SUM(CASE WHEN status='Closed' THEN 1 ELSE 0 END) AS closed_cases
        FROM firs
        GROUP BY district
        ORDER BY total_crimes DESC
    """)


async def get_district_top_crime() -> list[dict]:
    """Most frequent crime type per district."""
    return await fetch_all("""
        SELECT district, crime_type, COUNT(*) AS count
        FROM firs
        GROUP BY district, crime_type
        HAVING COUNT(*) = (
            SELECT MAX(cnt) FROM (
                SELECT district AS d, COUNT(*) AS cnt
                FROM firs f2
                WHERE f2.district = firs.district
                GROUP BY crime_type
            )
        )
        ORDER BY district
    """)


# ─── Crime Hotspot Analysis ───────────────────────────────────────────────────

def normalize_district_name(search: str) -> str:
    """Helper to map common spelling typos / historic names to DB districts."""
    if not search:
        return ""
    search_lower = search.lower().strip()
    
    # Typos & alternates for Bengaluru
    if any(alias in search_lower for alias in ["bengl", "bengal", "bangal", "blur", "blr"]):
        return "Bengaluru"
    if any(alias in search_lower for alias in ["mys", "mysu"]):
        return "Mysuru"
    if any(alias in search_lower for alias in ["hub", "dhar"]):
        return "Hubballi"
    if any(alias in search_lower for alias in ["mang", "mng"]):
        return "Mangaluru"
    if any(alias in search_lower for alias in ["belag", "belga"]):
        return "Belagavi"
    if any(alias in search_lower for alias in ["kalab", "gulb"]):
        return "Kalaburagi"
    if any(alias in search_lower for alias in ["shiva", "shim"]):
        return "Shivamogga"
    if any(alias in search_lower for alias in ["tuma", "tumk"]):
        return "Tumakuru"
    if any(alias in search_lower for alias in ["balla", "bell"]):
        return "Ballari"
    if any(alias in search_lower for alias in ["vijay", "bijap"]):
        return "Vijayapura"
    if any(alias in search_lower for alias in ["davan", "davn"]):
        return "Davanagere"
    return search


async def get_hotspot_data(
    district: str = None,
    crime_type: str = None,
    from_date: str = None,
    to_date: str = None
) -> list[dict]:
    """Returns lat/lon points with crime count per location for heatmap with optional filters."""
    conditions = []
    params = []

    if district:
        norm_dist = normalize_district_name(district)
        conditions.append("l.district LIKE ?")
        params.append(f"%{norm_dist}%")
    if crime_type:
        conditions.append("f.crime_type = ?")
        params.append(crime_type)
    if from_date:
        conditions.append("f.date >= ?")
        params.append(from_date)
    if to_date:
        conditions.append("f.date <= ?")
        params.append(to_date)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    query = f"""
        SELECT
            l.latitude,
            l.longitude,
            l.district,
            l.police_station,
            COUNT(f.fir_id) AS crime_count
        FROM locations l
        JOIN firs f ON l.location_id = f.location_id
        {where}
        GROUP BY l.location_id
        ORDER BY crime_count DESC
    """
    return await fetch_all(query, tuple(params))


async def get_district_crime_density(
    district: str = None,
    crime_type: str = None,
    from_date: str = None,
    to_date: str = None
) -> list[dict]:
    """Crime counts per district with coordinates for choropleth with optional filters."""
    conditions = []
    params = []

    if district:
        norm_dist = normalize_district_name(district)
        conditions.append("f.district LIKE ?")
        params.append(f"%{norm_dist}%")
    if crime_type:
        conditions.append("f.crime_type = ?")
        params.append(crime_type)
    if from_date:
        conditions.append("f.date >= ?")
        params.append(from_date)
    if to_date:
        conditions.append("f.date <= ?")
        params.append(to_date)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    query = f"""
        SELECT
            f.district,
            COUNT(*) AS crime_count,
            AVG(l.latitude) AS avg_lat,
            AVG(l.longitude) AS avg_lon
        FROM firs f
        JOIN locations l ON f.location_id = l.location_id
        {where}
        GROUP BY f.district
        ORDER BY crime_count DESC
    """
    return await fetch_all(query, tuple(params))


# ─── Offender Profiling ───────────────────────────────────────────────────────

async def get_offender_profile(offender_id: str) -> dict | None:
    """Full profile for a single offender including their FIR history."""
    offender = await fetch_all(
        "SELECT * FROM offenders WHERE offender_id = ?", (offender_id,)
    )
    if not offender:
        return None

    profile = dict(offender[0])

    firs = await fetch_all("""
        SELECT f.fir_id, f.crime_type, f.date, f.district, f.status, v.name AS victim_name
        FROM firs f
        LEFT JOIN victims v ON f.victim_id = v.victim_id
        WHERE f.offender_id = ?
        ORDER BY f.date DESC
    """, (offender_id,))

    profile["fir_history"] = firs
    profile["total_firs_filed"] = len(firs)
    profile["risk_score"] = _compute_risk_score(profile)
    profile["risk_factors"] = _explain_risk_factors(profile)
    return profile


async def get_high_risk_offenders(limit: int = 20, search: str = None) -> list[dict]:
    """Top offenders by risk — repeat offenders with high risk category with optional search."""
    conditions = []
    params = []
    
    if search:
        conditions.append("(o.name LIKE ? OR o.offender_id LIKE ?)")
        params.append(f"%{search}%")
        params.append(f"%{search}%")
        
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    
    query = f"""
        SELECT
            o.offender_id,
            o.name,
            o.age,
            o.gender,
            o.district,
            o.previous_firs,
            o.risk_category,
            COUNT(f.fir_id) AS active_firs
        FROM offenders o
        LEFT JOIN firs f ON o.offender_id = f.offender_id AND f.status != 'Closed'
        {where}
        GROUP BY o.offender_id
        ORDER BY o.previous_firs DESC, active_firs DESC
        LIMIT ?
    """
    params.append(limit)
    rows = await fetch_all(query, tuple(params))

    for row in rows:
        row["risk_score"] = _compute_risk_score(row)
    return rows


async def get_repeat_offenders() -> list[dict]:
    """Offenders with more than 1 FIR filed against them."""
    return await fetch_all("""
        SELECT
            o.offender_id,
            o.name,
            o.age,
            o.gender,
            o.district,
            o.risk_category,
            o.previous_firs,
            COUNT(f.fir_id) AS fir_count
        FROM offenders o
        JOIN firs f ON o.offender_id = f.offender_id
        GROUP BY o.offender_id
        HAVING fir_count > 1
        ORDER BY fir_count DESC, o.previous_firs DESC
        LIMIT 50
    """)


def _compute_risk_score(offender: dict) -> int:
    """
    Simple explainable risk scoring (0-100).
    Factors: previous FIRs, risk category, age.
    """
    score = 0
    prev = offender.get("previous_firs", 0) or 0
    cat  = offender.get("risk_category", "Low")
    age  = offender.get("age", 30) or 30

    # Previous FIRs contribute up to 50 points
    score += min(prev * 4, 50)

    # Risk category
    score += {"Low": 0, "Medium": 20, "High": 40}.get(cat, 0)

    # Active FIRs
    score += min(offender.get("active_firs", 0) * 2, 10)

    return min(score, 100)


def _explain_risk_factors(offender: dict) -> list[str]:
    """Human-readable explanation of risk score components."""
    factors = []
    prev = offender.get("previous_firs", 0) or 0
    cat  = offender.get("risk_category", "Low")
    total = offender.get("total_firs_filed", 0) or 0

    if prev >= 10:
        factors.append(f"Very high prior FIR count ({prev} previous FIRs)")
    elif prev >= 5:
        factors.append(f"High prior FIR count ({prev} previous FIRs)")
    elif prev > 0:
        factors.append(f"{prev} previous FIR(s) on record")

    if cat == "High":
        factors.append("Classified as High Risk offender")
    elif cat == "Medium":
        factors.append("Classified as Medium Risk offender")

    if total > 3:
        factors.append(f"Repeat offender — {total} FIRs filed in this database")

    if not factors:
        factors.append("No significant risk indicators found")

    return factors


# ─── FIR Search & Case Details ────────────────────────────────────────────────

async def search_firs(
    crime_type: str = None,
    district: str   = None,
    status: str     = None,
    from_date: str  = None,
    to_date: str    = None,
    limit: int      = 50
) -> list[dict]:
    """Flexible FIR search with optional filters."""
    conditions = []
    params = []

    if crime_type:
        conditions.append("f.crime_type LIKE ?")
        params.append(f"%{crime_type}%")
    if district:
        conditions.append("f.district LIKE ?")
        params.append(f"%{district}%")
    if status:
        conditions.append("f.status = ?")
        params.append(status)
    if from_date:
        conditions.append("f.date >= ?")
        params.append(from_date)
    if to_date:
        conditions.append("f.date <= ?")
        params.append(to_date)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    query = f"""
        SELECT
            f.fir_id, f.crime_type, f.date, f.district, f.police_station,
            f.status, f.offender_id, f.victim_id,
            o.name AS offender_name, o.risk_category,
            v.name AS victim_name
        FROM firs f
        LEFT JOIN offenders o ON f.offender_id = o.offender_id
        LEFT JOIN victims   v ON f.victim_id   = v.victim_id
        {where}
        ORDER BY f.date DESC
        LIMIT ?
    """
    params.append(limit)
    return await fetch_all(query, tuple(params))


async def get_fir_detail(fir_id: str) -> dict | None:
    """Full detail for a single FIR with offender, victim, and location."""
    rows = await fetch_all("""
        SELECT
            f.*,
            o.name AS offender_name, o.age AS offender_age,
            o.gender AS offender_gender, o.risk_category,
            o.previous_firs,
            v.name AS victim_name, v.age AS victim_age,
            v.gender AS victim_gender,
            l.latitude, l.longitude, l.police_station AS loc_station
        FROM firs f
        LEFT JOIN offenders o ON f.offender_id = o.offender_id
        LEFT JOIN victims   v ON f.victim_id   = v.victim_id
        LEFT JOIN locations l ON f.location_id = l.location_id
        WHERE f.fir_id = ?
    """, (fir_id,))
    return rows[0] if rows else None


async def get_related_cases(fir_id: str) -> list[dict]:
    """Find related cases — same offender, same district, or same crime type."""
    base = await get_fir_detail(fir_id)
    if not base:
        return []

    return await fetch_all("""
        SELECT
            f.fir_id, f.crime_type, f.date, f.district, f.status,
            o.name AS offender_name,
            CASE
                WHEN f.offender_id = ? THEN 'Same Offender'
                WHEN f.district = ? AND f.crime_type = ? THEN 'Same District & Crime'
                WHEN f.district = ? THEN 'Same District'
                ELSE 'Same Crime Type'
            END AS relation
        FROM firs f
        LEFT JOIN offenders o ON f.offender_id = o.offender_id
        WHERE f.fir_id != ?
          AND (
              f.offender_id = ?
              OR (f.district = ? AND f.crime_type = ?)
              OR f.crime_type = ?
          )
        ORDER BY f.date DESC
        LIMIT 10
    """, (
        base["offender_id"],
        base["district"], base["crime_type"],
        base["district"],
        fir_id,
        base["offender_id"],
        base["district"], base["crime_type"],
        base["crime_type"]
    ))


# ─── Police Station Stats ─────────────────────────────────────────────────────

async def get_police_station_stats() -> list[dict]:
    """Crime load per police station."""
    return await fetch_all("""
        SELECT
            police_station,
            district,
            COUNT(*) AS total_cases,
            SUM(CASE WHEN status='Open' THEN 1 ELSE 0 END) AS open_cases
        FROM firs
        GROUP BY police_station, district
        ORDER BY total_cases DESC
        LIMIT 20
    """)


# ─── Year-over-Year Analysis ──────────────────────────────────────────────────

async def get_yearly_comparison() -> list[dict]:
    """Annual crime counts broken down by crime type."""
    return await fetch_all("""
        SELECT
            strftime('%Y', date) AS year,
            crime_type,
            COUNT(*) AS count
        FROM firs
        GROUP BY year, crime_type
        ORDER BY year, count DESC
    """)
