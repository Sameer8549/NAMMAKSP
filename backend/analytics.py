"""
analytics.py — NAMMA KSP
────────────────────────────
Crime analytics engine: computes all statistics for the dashboard,
hotspot analysis, offender profiling, and trend detection.
"""

import logging
from collections import defaultdict
from statistics import mean

from database import fetch_all, fetch_one

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


# ─── Advanced Intelligence Modules ───────────────────────────────────────────

FINANCIAL_CRIME_TYPES = {"Financial Fraud", "Cyber Crime", "Extortion", "Robbery", "Burglary"}


async def get_sociological_insights() -> dict:
    """Socio-demographic crime insights from uploaded offender/victim/FIR data."""
    age_gender = await fetch_all("""
        SELECT
            CASE
                WHEN o.age < 18 THEN 'Under 18'
                WHEN o.age BETWEEN 18 AND 25 THEN '18-25'
                WHEN o.age BETWEEN 26 AND 40 THEN '26-40'
                WHEN o.age BETWEEN 41 AND 60 THEN '41-60'
                ELSE '60+'
            END AS age_band,
            o.gender,
            COUNT(*) AS incidents,
            AVG(o.previous_firs) AS avg_prior_firs
        FROM firs f
        JOIN offenders o ON f.offender_id = o.offender_id
        GROUP BY age_band, o.gender
        ORDER BY incidents DESC
    """)

    official_indicator_count = (await fetch_one("SELECT COUNT(*) AS cnt FROM socio_economic_indicators") or {}).get("cnt", 0)
    indicator_select = """
            sei.urbanization_index,
            sei.migration_index,
            sei.unemployment_rate,
            sei.literacy_rate,
            sei.income_index,
            sei.population_density
    """ if official_indicator_count else ""
    indicator_join = "LEFT JOIN socio_economic_indicators sei ON sei.district = f.district" if official_indicator_count else ""

    district_rows = await fetch_all(f"""
        SELECT
            f.district,
            COUNT(*) AS incidents,
            COUNT(DISTINCT f.crime_type) AS crime_diversity,
            AVG(o.age) AS avg_offender_age,
            AVG(v.age) AS avg_victim_age,
            AVG(o.previous_firs) AS avg_prior_firs,
            SUM(CASE WHEN o.risk_category='High' THEN 1 ELSE 0 END) AS high_risk_count,
            SUM(CASE WHEN o.gender='Female' THEN 1 ELSE 0 END) AS female_offender_cases,
            SUM(CASE WHEN o.gender='Male' THEN 1 ELSE 0 END) AS male_offender_cases,
            SUM(CASE WHEN v.gender='Female' THEN 1 ELSE 0 END) AS female_victim_cases,
            SUM(CASE WHEN v.gender='Male' THEN 1 ELSE 0 END) AS male_victim_cases
            {"," if official_indicator_count else ""} {indicator_select}
        FROM firs f
        JOIN offenders o ON f.offender_id = o.offender_id
        LEFT JOIN victims v ON f.victim_id = v.victim_id
        {indicator_join}
        GROUP BY f.district
        ORDER BY incidents DESC
    """)

    district_insights = []
    for row in district_rows:
        risk_index = round(
            (row["incidents"] * 0.45)
            + (row["crime_diversity"] * 6)
            + ((row["avg_prior_firs"] or 0) * 8)
            + (row["high_risk_count"] * 1.5),
            1
        )
        if official_indicator_count:
            risk_index = round(
                risk_index
                + ((row.get("unemployment_rate") or 0) * 2)
                + ((row.get("migration_index") or 0) * 0.4)
                + ((100 - (row.get("literacy_rate") or 100)) * 0.6),
                1
            )

        interpretation = (
            f"{row['district']} has {row['incidents']} FIRs, {row['crime_diversity']} crime categories, "
            f"average offender age {round(row['avg_offender_age'] or 0, 1)}, and "
            f"{row['high_risk_count']} high-risk offender-linked cases."
        )
        if official_indicator_count:
            interpretation += " Official socio-economic indicators are joined for this district."
        else:
            interpretation += " No official socio-economic indicator CSV is uploaded, so this uses only crime-demographic fields."

        district_insights.append({
            **row,
            "social_risk_index": risk_index,
            "interpretation": interpretation
        })

    top_age = age_gender[0] if age_gender else {}
    return {
        "summary": {
            "dominant_age_band": top_age.get("age_band", "N/A"),
            "dominant_gender": top_age.get("gender", "N/A"),
            "official_socio_economic_dataset": bool(official_indicator_count),
            "evidence_basis": (
                "Derived from uploaded offender age, offender/victim gender, district, prior FIRs, and FIR distribution."
                if not official_indicator_count else
                "Derived from uploaded crime datasets joined with uploaded socio_economic_indicators.csv."
            ),
        },
        "age_gender_distribution": age_gender,
        "district_social_risk": district_insights[:10],
    }


async def get_financial_link_analysis() -> dict:
    """Financial crime link analysis using transaction data when uploaded, otherwise FIR relationship evidence."""
    transaction_count = (await fetch_one("SELECT COUNT(*) AS cnt FROM financial_transactions") or {}).get("cnt", 0)
    if transaction_count:
        rows = await fetch_all("""
            SELECT
                t.transaction_id,
                t.fir_id,
                t.sender_account,
                t.receiver_account,
                t.amount,
                t.transaction_date,
                t.channel,
                t.district,
                t.risk_flag,
                f.crime_type,
                o.offender_id,
                o.name AS offender_name
            FROM financial_transactions t
            LEFT JOIN firs f ON f.fir_id = t.fir_id
            LEFT JOIN offenders o ON o.offender_id = f.offender_id
            ORDER BY t.amount DESC
            LIMIT 300
        """)
        account_map = defaultdict(lambda: {
            "account": "",
            "transaction_ids": [],
            "fir_ids": set(),
            "counterparties": set(),
            "total_amount": 0,
            "districts": set(),
            "risk_flags": set(),
            "offenders": set(),
        })
        for row in rows:
            for account_key, other_key in (("sender_account", "receiver_account"), ("receiver_account", "sender_account")):
                account = row.get(account_key)
                if not account:
                    continue
                item = account_map[account]
                item["account"] = account
                item["transaction_ids"].append(row["transaction_id"])
                if row.get("fir_id"):
                    item["fir_ids"].add(row["fir_id"])
                if row.get(other_key):
                    item["counterparties"].add(row[other_key])
                item["total_amount"] += row.get("amount") or 0
                if row.get("district"):
                    item["districts"].add(row["district"])
                if row.get("risk_flag"):
                    item["risk_flags"].add(row["risk_flag"])
                if row.get("offender_id"):
                    item["offenders"].add(row["offender_id"])

        clusters = []
        for item in account_map.values():
            score = min(
                len(item["transaction_ids"]) * 10
                + len(item["counterparties"]) * 8
                + len(item["fir_ids"]) * 10
                + len(item["risk_flags"]) * 12
                + (20 if item["total_amount"] >= 100000 else 0),
                100
            )
            if score >= 35:
                clusters.append({
                    "account": item["account"],
                    "case_count": len(item["fir_ids"]),
                    "transaction_count": len(item["transaction_ids"]),
                    "counterparty_count": len(item["counterparties"]),
                    "total_amount": round(item["total_amount"], 2),
                    "districts": sorted(item["districts"]),
                    "risk_flags": sorted(item["risk_flags"]),
                    "link_score": score,
                    "evidence": item["transaction_ids"][:8],
                    "recommended_action": "Freeze/check linked accounts, identify counterparties, and compare FIR/device/phone evidence."
                })
        clusters.sort(key=lambda x: x["link_score"], reverse=True)
        return {
            "summary": {
                "data_source": "financial_transactions.csv",
                "transaction_rows": transaction_count,
                "candidate_cases": len(rows),
                "suspicious_clusters": len(clusters),
                "evidence_basis": "Uploaded financial_transactions.csv joined to FIR/offender records.",
            },
            "clusters": clusters[:12],
        }

    placeholders = ",".join("?" for _ in FINANCIAL_CRIME_TYPES)
    rows = await fetch_all(f"""
        SELECT
            f.fir_id,
            f.crime_type,
            f.date,
            f.district,
            f.status,
            o.offender_id,
            o.name AS offender_name,
            o.previous_firs,
            o.risk_category,
            v.victim_id,
            v.name AS victim_name
        FROM firs f
        JOIN offenders o ON f.offender_id = o.offender_id
        LEFT JOIN victims v ON f.victim_id = v.victim_id
        WHERE f.crime_type IN ({placeholders})
        ORDER BY o.previous_firs DESC, f.date DESC
        LIMIT 150
    """, tuple(FINANCIAL_CRIME_TYPES))

    offender_map = defaultdict(lambda: {
        "offender_id": "",
        "offender_name": "",
        "districts": set(),
        "crime_types": set(),
        "fir_ids": [],
        "victims": set(),
        "risk_category": "Low",
        "previous_firs": 0,
    })
    for row in rows:
        item = offender_map[row["offender_id"]]
        item["offender_id"] = row["offender_id"]
        item["offender_name"] = row["offender_name"]
        item["districts"].add(row["district"])
        item["crime_types"].add(row["crime_type"])
        item["fir_ids"].append(row["fir_id"])
        if row.get("victim_name"):
            item["victims"].add(row["victim_name"])
        item["risk_category"] = row["risk_category"]
        item["previous_firs"] = row["previous_firs"] or 0

    suspicious_clusters = []
    for item in offender_map.values():
        score = (
            len(item["fir_ids"]) * 12
            + len(item["districts"]) * 10
            + len(item["crime_types"]) * 8
            + min(item["previous_firs"] * 2, 30)
            + (20 if item["risk_category"] == "High" else 10 if item["risk_category"] == "Medium" else 0)
        )
        if len(item["fir_ids"]) >= 2 or score >= 45:
            suspicious_clusters.append({
                "offender_id": item["offender_id"],
                "offender_name": item["offender_name"],
                "case_count": len(item["fir_ids"]),
                "districts": sorted(item["districts"]),
                "crime_types": sorted(item["crime_types"]),
                "victim_count": len(item["victims"]),
                "risk_category": item["risk_category"],
                "link_score": min(score, 100),
                "evidence": item["fir_ids"][:8],
                "recommended_action": "Check bank accounts, device identifiers, phone numbers, mule accounts, and shared addresses across linked FIRs."
            })

    suspicious_clusters.sort(key=lambda x: x["link_score"], reverse=True)
    return {
        "summary": {
            "data_source": "uploaded FIR/offender/victim/relationship datasets",
            "financial_crime_types": sorted(FINANCIAL_CRIME_TYPES),
            "candidate_cases": len(rows),
            "suspicious_clusters": len(suspicious_clusters),
            "evidence_basis": "No financial_transactions.csv was uploaded, so this uses real uploaded cyber/financial-adjacent FIRs, shared offenders, victims, districts, and repeat history.",
        },
        "clusters": suspicious_clusters[:12],
    }


async def get_crime_forecast() -> dict:
    """Explainable short-term forecast with rolling-origin validation."""
    monthly = await get_monthly_trends()
    district_rows = await fetch_all("""
        SELECT
            district,
            strftime('%Y-%m', date) AS month,
            COUNT(*) AS count
        FROM firs
        GROUP BY district, month
        ORDER BY district, month
    """)

    counts = [r["count"] for r in monthly[-6:]]
    avg_recent = mean(counts) if counts else 0
    previous = mean([r["count"] for r in monthly[-12:-6]]) if len(monthly) >= 12 else avg_recent
    trend_delta = avg_recent - previous
    next_month = max(0, round(avg_recent + trend_delta * 0.35))

    actuals = [float(r["count"]) for r in monthly]
    errors = []
    percentage_errors = []
    for index in range(6, len(actuals)):
        history = actuals[:index]
        recent_window = history[-6:]
        prior_window = history[-12:-6]
        baseline = mean(recent_window)
        prior_mean = mean(prior_window) if prior_window else baseline
        prediction = max(0, baseline + (baseline - prior_mean) * 0.35)
        error = abs(actuals[index] - prediction)
        errors.append(error)
        if actuals[index] > 0:
            percentage_errors.append(error / actuals[index])
    mae = round(mean(errors), 2) if errors else None
    mape = round(mean(percentage_errors) * 100, 2) if percentage_errors else None
    residual_spread = (sum(e * e for e in errors) / len(errors)) ** 0.5 if errors else 0
    prediction_interval = {
        "lower": max(0, round(next_month - 1.96 * residual_spread)),
        "upper": max(0, round(next_month + 1.96 * residual_spread)),
        "confidence": "95% empirical residual interval",
    }

    by_district = defaultdict(list)
    for row in district_rows:
        by_district[row["district"]].append(row["count"])

    warnings = []
    for district, series in by_district.items():
        if len(series) < 4:
            continue
        recent = mean(series[-3:])
        baseline = mean(series[:-3]) if len(series) > 3 else recent
        lift = ((recent - baseline) / baseline * 100) if baseline else 0
        if lift > 8 or recent >= baseline + 5:
            warnings.append({
                "district": district,
                "recent_monthly_avg": round(recent, 1),
                "baseline_monthly_avg": round(baseline, 1),
                "increase_percent": round(lift, 1),
                "alert_level": "High" if lift > 20 else "Medium",
                "recommended_action": "Increase patrol visibility, review repeat-offender activity, and compare hotspot locations for the next 30 days."
            })
    warnings.sort(key=lambda x: (x["alert_level"] != "High", -x["increase_percent"]))

    return {
        "summary": {
            "next_month_forecast": next_month,
            "recent_monthly_average": round(avg_recent, 1),
            "trend_direction": "Rising" if trend_delta > 0 else "Falling" if trend_delta < 0 else "Stable",
            "method": "Explainable six-month moving average with damped trend and rolling-origin backtesting.",
            "validation": {
                "backtest_months": len(errors),
                "mae": mae,
                "mape_percent": mape,
                "prediction_interval": prediction_interval,
                "production_status": "Validated historical prototype; operational calibration is required before deployment decisions.",
            },
        },
        "early_warnings": warnings[:8],
    }


async def get_explainable_intelligence() -> dict:
    """Transparent evidence trails for headline analytics."""
    top_crimes = await fetch_all("""
        SELECT crime_type, COUNT(*) AS count
        FROM firs
        GROUP BY crime_type
        ORDER BY count DESC
        LIMIT 5
    """)
    repeat_evidence = await get_repeat_offenders()
    hotspot_evidence = await fetch_all("""
        SELECT f.district, COUNT(*) AS count, COUNT(DISTINCT f.location_id) AS locations
        FROM firs f
        GROUP BY f.district
        ORDER BY count DESC
        LIMIT 5
    """)

    return {
        "principles": [
            "Every alert is linked to aggregate FIR/offender evidence.",
            "Risk scores use transparent factors: previous FIRs, active cases, and risk category.",
            "Forecasts use moving averages rather than opaque black-box predictions.",
            "Socio-demographic insights use uploaded offender/victim/FIR fields; official socio-economic indicators are used when socio_economic_indicators.csv is uploaded."
        ],
        "evidence_trails": [
            {"claim": "Dominant crime patterns", "data": top_crimes, "source": "firs grouped by crime_type"},
            {"claim": "Repeat offender risk", "data": repeat_evidence[:5], "source": "offenders joined with FIR history"},
            {"claim": "Hotspot concentration", "data": hotspot_evidence, "source": "firs grouped by district and location"},
        ]
    }


async def get_advanced_intelligence_summary() -> dict:
    """Combined response for the dashboard advanced-intelligence panel."""
    socio = await get_sociological_insights()
    financial = await get_financial_link_analysis()
    forecast = await get_crime_forecast()
    explainable = await get_explainable_intelligence()
    return {
        "sociological": socio,
        "financial": financial,
        "forecast": forecast,
        "explainable": explainable,
        "governance": {
            "roles": ["Admin", "Investigator"],
            "audit_status": "Persistent audit log table is enabled for login, logout, user management, reports, and sensitive analytics access.",
            "data_handling": "Uploaded crime datasets are used as source investigation data; generated PDFs are marked as investigative aids."
        }
    }


async def get_submission_readiness() -> dict:
    """Return an evidence-backed assessment of the ten challenge capabilities."""
    counts = {}
    for table in (
        "firs", "offenders", "victims", "locations", "relationships",
        "financial_transactions", "socio_economic_indicators", "audit_logs",
    ):
        row = await fetch_one(f"SELECT COUNT(*) AS cnt FROM {table}")
        counts[table] = int((row or {}).get("cnt", 0))

    socio = await fetch_one("""
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN urbanization_index IS NOT NULL THEN 1 ELSE 0 END) AS urbanization,
               SUM(CASE WHEN migration_index IS NOT NULL THEN 1 ELSE 0 END) AS migration,
               SUM(CASE WHEN unemployment_rate IS NOT NULL THEN 1 ELSE 0 END) AS unemployment,
               SUM(CASE WHEN literacy_rate IS NOT NULL THEN 1 ELSE 0 END) AS literacy,
               SUM(CASE WHEN income_index IS NOT NULL THEN 1 ELSE 0 END) AS income,
               SUM(CASE WHEN population_density IS NOT NULL THEN 1 ELSE 0 END) AS density
        FROM socio_economic_indicators
    """) or {}

    capabilities = [
        (1, "Conversational crime intelligence", "implemented", ["/api/chat", "/api/translate", "/api/audio-transcribe", "/api/tts", "/api/chat/export"]),
        (2, "Criminal network and relationship analysis", "implemented", ["/api/network", "/api/network/offender/{offender_id}"]),
        (3, "Crime pattern and trend analytics", "implemented", ["/api/analytics/monthly-trends", "/api/hotspots", "/api/analytics/yearly"]),
        (4, "Sociological crime insights", "prototype", ["/api/analytics/sociological"]),
        (5, "Criminology-based offender profiling", "implemented", ["/api/offenders/high-risk", "/api/offenders/repeat", "/api/offenders/{offender_id}"]),
        (6, "Investigator decision support", "implemented", ["/api/ai/case-summary/{fir_id}", "/api/ai/recommendations", "/api/firs/{fir_id}/related"]),
        (7, "Financial crime and transaction links", "prototype", ["/api/analytics/financial-links"]),
        (8, "Crime forecasting and early warning", "prototype", ["/api/analytics/forecast", "/api/alerts/early-warning"]),
        (9, "Explainable AI and transparent analytics", "implemented", ["/api/analytics/explainability", "/api/analytics/advanced-intelligence"]),
        (10, "Secure role-based access and governance", "prototype", ["/api/auth/login", "/api/auth/me", "/api/audit/logs"]),
    ]
    return {
        "overall": "challenge-complete prototype",
        "capabilities": [
            {"number": number, "name": name, "status": status, "evidence_endpoints": endpoints}
            for number, name, status, endpoints in capabilities
        ],
        "dataset_evidence": counts,
        "socio_economic_completeness": {key: int(value or 0) for key, value in socio.items()},
        "limitations": [
            "Financial rows are synthetic AML-style demonstration data, not live bank records.",
            "Several socio-economic fields are unavailable in the uploaded district sources.",
            "Forecasting is an explainable moving-average prototype, not a validated production model.",
            "Governance is prototype role-based access and audit logging, not an enterprise police IAM deployment.",
        ],
    }
