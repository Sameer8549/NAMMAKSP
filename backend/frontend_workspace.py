"""Role-safe data contract for the React operations workspace."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import UTC, datetime
from typing import Any

from analytics import (
    get_crime_type_distribution,
    get_district_stats,
    get_crime_forecast,
    get_explainable_intelligence,
    get_financial_link_analysis,
    get_hotspot_data,
    get_monthly_trends,
    get_sociological_insights,
)
from authorization import canonical_role, has_capability
from database import fetch_all, fetch_one, get_db_stats
from network import get_network_data


_CATEGORY_MAP = {
    "Cyber Crime": "Cybercrime",
    "Financial Fraud": "Financial Fraud",
    "Fraud": "Financial Fraud",
    "Drug Offense": "Narcotics",
    "Theft": "Property Theft",
    "Burglary": "Property Theft",
    "Vehicle Theft": "Property Theft",
    "Robbery": "Property Theft",
    "Murder": "Violent Crime",
    "Assault": "Violent Crime",
    "Domestic Violence": "Violent Crime",
    "Kidnapping": "Organized Syndicate",
}


def _category(crime_type: str) -> str:
    return _CATEGORY_MAP.get(crime_type, "Public Order")


def _case_status(value: str) -> str:
    return {
        "Open": "OPEN",
        "Under Investigation": "UNDER_INVESTIGATION",
        "Closed": "CLOSED",
    }.get(value, "PENDING_REVIEW")


def _risk_score(value: str) -> int:
    return {"High": 86, "Medium": 58, "Low": 28}.get(value, 40)


def _priority(value: str) -> str:
    return {"High": "HIGH", "Medium": "MEDIUM", "Low": "LOW"}.get(value, "MEDIUM")


def _days_since(value: str) -> int:
    try:
        return max(0, (datetime.now(UTC).date() - datetime.fromisoformat(value).date()).days)
    except (TypeError, ValueError):
        return 0


async def _case_records(user: dict[str, Any]) -> list[dict[str, Any]]:
    role = canonical_role(user.get("role"))
    if role in {"Administrator", "Policymaker"}:
        return []
    where = ""
    params: tuple[Any, ...] = ()
    limit_clause = "LIMIT 300"
    if role == "Investigator":
        where = "WHERE f.assigned_to = ?"
        params = (user.get("username", ""),)
    elif role == "Analyst":
        # Keep the bootstrap bounded while including the source records needed
        # by financial-link drilldowns, even when those FIRs are older.
        where = """
        WHERE f.fir_id IN (
            SELECT fir_id FROM firs ORDER BY date DESC, fir_id ASC LIMIT 300
        ) OR f.fir_id IN (
            SELECT DISTINCT fir_id FROM financial_transactions
        )
        """
        limit_clause = ""
    rows = await fetch_all(
        f"""
        SELECT f.fir_id, f.crime_type, f.date, f.district, f.police_station,
               f.status, f.offender_id, f.victim_id, f.assigned_to, f.priority,
               o.name AS offender_name, o.age AS offender_age,
               o.gender AS offender_gender, o.previous_firs, o.risk_category,
               v.name AS victim_name, v.age AS victim_age, v.gender AS victim_gender,
               l.latitude, l.longitude
        FROM firs f
        LEFT JOIN offenders o ON o.offender_id = f.offender_id
        LEFT JOIN victims v ON v.victim_id = f.victim_id
        LEFT JOIN locations l ON l.location_id = f.location_id
        {where}
        ORDER BY f.date DESC, f.fir_id ASC
        {limit_clause}
        """,
        params,
    )
    mask_names = role == "Analyst"
    records: list[dict[str, Any]] = []
    for row in rows:
        fir_id = str(row.get("fir_id") or "")
        crime_type = str(row.get("crime_type") or "Unclassified")
        date = str(row.get("date") or "")
        offender_id = str(row.get("offender_id") or "")
        victim_id = str(row.get("victim_id") or "")
        offender_name = f"Entity {offender_id[-4:]}" if mask_names else str(row.get("offender_name") or "Not recorded")
        victim_name = f"Victim {victim_id[-4:]}" if mask_names else str(row.get("victim_name") or "Not recorded")
        risk = str(row.get("risk_category") or "Medium")
        records.append({
            "id": fir_id,
            "firNumber": fir_id,
            "title": f"{crime_type} - {row.get('district') or 'District not recorded'}",
            "category": _category(crime_type),
            "ipcSections": [],
            "priority": _priority(risk),
            "status": _case_status(str(row.get("status") or "")),
            "incidentDate": date,
            "filedDate": date,
            "daysAging": _days_since(date),
            "assignedOfficer": {
                "id": str(row.get("assigned_to") or "unassigned"),
                "name": str(row.get("assigned_to") or "Unassigned"),
                "badgeNumber": str(row.get("assigned_to") or "UNASSIGNED").upper(),
                "station": str(row.get("police_station") or "Not recorded"),
            },
            "location": {
                "district": str(row.get("district") or "Not recorded"),
                "subdivision": str(row.get("district") or "Not recorded"),
                "station": str(row.get("police_station") or "Not recorded"),
                "latitude": float(row.get("latitude") or 0),
                "longitude": float(row.get("longitude") or 0),
            },
            "accused": [{
                "id": offender_id,
                "name": offender_name,
                "age": int(row.get("offender_age") or 0),
                "gender": str(row.get("offender_gender") or "Not recorded"),
                "priorOffensesCount": int(row.get("previous_firs") or 0),
                "status": "SUSPECT",
                "riskScore": _risk_score(risk),
            }] if offender_id else [],
            "victim": {
                "id": victim_id,
                "category": "Individual",
                "description": victim_name,
                "injurySeverity": "None",
            },
            "modusOperandi": {
                "primaryMethod": crime_type,
                "toolsUsed": [],
                "targetProfile": "Recorded victim profile",
                "timeWindow": date,
                "uniqueSignature": f"{crime_type}:{row.get('district') or ''}:{row.get('police_station') or ''}",
            },
            "timeline": [{
                "id": f"{fir_id}-filed",
                "timestamp": date,
                "title": "FIR filed",
                "description": f"{crime_type} recorded at {row.get('police_station') or 'the reporting station'}.",
                "actor": str(row.get("assigned_to") or "Registry"),
                "type": "FIR_FILED",
            }],
            "summary": f"Verified {crime_type} FIR from {row.get('district') or 'an unspecified district'}; current status is {row.get('status') or 'not recorded'}.",
            "leadsCount": int(row.get("previous_firs") or 0),
            "similarCasesCount": 0,
        })
    return records


async def _districts() -> list[dict[str, Any]]:
    rows = await get_district_stats()
    dominant_rows = await fetch_all(
        """
        SELECT district, crime_type, COUNT(*) AS count
        FROM firs GROUP BY district, crime_type
        ORDER BY district, count DESC
        """
    )
    dominant: dict[str, str] = {}
    for row in dominant_rows:
        dominant.setdefault(str(row["district"]), str(row["crime_type"]))
    coordinates = await fetch_all(
        "SELECT district, AVG(latitude) AS lat, AVG(longitude) AS lng FROM locations GROUP BY district"
    )
    coordinate_map = {str(row["district"]): row for row in coordinates}
    totals = [int(row.get("total_crimes") or 0) for row in rows]
    high_cut = sorted(totals, reverse=True)[max(0, len(totals) // 3 - 1)] if totals else 0
    moderate_cut = sorted(totals, reverse=True)[max(0, (len(totals) * 2) // 3 - 1)] if totals else 0
    result = []
    for index, row in enumerate(rows):
        name = str(row.get("district") or "")
        total = int(row.get("total_crimes") or 0)
        closed = int(row.get("closed_cases") or 0)
        coord = coordinate_map.get(name, {})
        result.append({
            "id": f"district-{index + 1}",
            "name": name,
            "karnatakaCode": f"KA-{index + 1:02d}",
            "totalCases": total,
            "resolvedCases": closed,
            "pendingCases": max(0, total - closed),
            "clearanceRate": round((closed / total * 100), 1) if total else 0,
            "crimeRatePerLakh": round(total / 5.0, 1),
            "dominantCategory": _category(dominant.get(name, "")),
            "riskStatus": "HIGH_ALERT" if total >= high_cut else "MODERATE" if total >= moderate_cut else "NORMAL",
            "trendPercentage": 0,
            "coordinates": {"lat": float(coord.get("lat") or 0), "lng": float(coord.get("lng") or 0)},
        })
    return result


async def _crime_trends() -> list[dict[str, Any]]:
    totals = await get_monthly_trends()
    breakdown = await fetch_all(
        "SELECT substr(date, 1, 7) AS month, crime_type, COUNT(*) AS count FROM firs GROUP BY month, crime_type"
    )
    by_month: dict[str, Counter[str]] = defaultdict(Counter)
    for row in breakdown:
        by_month[str(row["month"])][str(row["crime_type"])] = int(row["count"])
    result = []
    for row in totals:
        month = str(row.get("month") or "")
        counts = by_month[month]
        result.append({
            "date": month,
            "totalIncidents": int(row.get("count") or 0),
            "cybercrime": counts["Cyber Crime"],
            "propertyTheft": counts["Theft"] + counts["Burglary"] + counts["Vehicle Theft"] + counts["Robbery"],
            "violentCrime": counts["Murder"] + counts["Assault"] + counts["Domestic Violence"],
            "financialFraud": counts["Financial Fraud"] + counts["Fraud"],
            "narcotics": counts["Drug Offense"],
        })
    return result


async def _demographics() -> list[dict[str, Any]]:
    rows = await fetch_all(
        """
        SELECT CASE WHEN age < 26 THEN '18-25' WHEN age < 41 THEN '26-40'
                    WHEN age < 61 THEN '41-60' ELSE '60+' END AS age_group,
               COUNT(*) AS count
        FROM offenders GROUP BY age_group ORDER BY MIN(age)
        """
    )
    victim_rows = await fetch_all(
        """
        SELECT CASE WHEN age < 26 THEN '18-25' WHEN age < 41 THEN '26-40'
                    WHEN age < 61 THEN '41-60' ELSE '60+' END AS age_group,
               COUNT(*) AS count
        FROM victims GROUP BY age_group ORDER BY MIN(age)
        """
    )
    offender_total = sum(int(row["count"]) for row in rows) or 1
    victim_map = {str(row["age_group"]): int(row["count"]) for row in victim_rows}
    victim_total = sum(victim_map.values()) or 1
    return [{
        "ageGroup": str(row["age_group"]),
        "victimPercentage": round(victim_map.get(str(row["age_group"]), 0) / victim_total * 100, 1),
        "accusedPercentage": round(int(row["count"]) / offender_total * 100, 1),
    } for row in rows]


async def _workloads() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    rows = await fetch_all(
        """
        SELECT COALESCE(assigned_to, 'unassigned') AS officer,
               COUNT(*) AS active_cases,
               SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS resolved,
               SUM(CASE WHEN status != 'Closed' AND julianday('now') - julianday(date) > 90 THEN 1 ELSE 0 END) AS aging
        FROM firs GROUP BY COALESCE(assigned_to, 'unassigned') ORDER BY active_cases DESC
        """
    )
    maximum = max((int(row["active_cases"]) for row in rows), default=1)
    workloads = []
    bottlenecks = []
    for index, row in enumerate(rows):
        active = int(row["active_cases"] or 0)
        aging = int(row["aging"] or 0)
        utilization = round(active / maximum * 100)
        officer = str(row["officer"])
        workloads.append({
            "officerId": officer,
            "officerName": officer.replace("_", " ").title(),
            "rank": "Investigator",
            "badgeNumber": officer.upper(),
            "station": "Assigned case pool",
            "activeCasesCount": active,
            "agingCasesCount": aging,
            "resolvedThisMonth": int(row["resolved"] or 0),
            "capacityUtilization": utilization,
            "status": "OVERLOADED" if utilization >= 90 else "UNDER_UTILIZED" if utilization < 45 else "OPTIMAL",
        })
        if aging:
            bottlenecks.append({
                "id": f"bottleneck-{index + 1}",
                "officerId": officer,
                "title": "Ageing case queue",
                "caseCount": aging,
                "severity": "CRITICAL" if aging >= 20 else "WARNING",
                "evidence": f"{aging} open FIRs are older than 90 days",
            })
    return workloads, bottlenecks


async def _network() -> dict[str, Any]:
    raw = await get_network_data(limit=150)
    graph = raw.get("graph", raw)
    raw_nodes = graph.get("nodes", [])
    raw_edges = graph.get("edges", [])
    nodes: list[dict[str, Any]] = []
    for item in raw_nodes[:450]:
        data = item.get("data", item)
        node_type = str(data.get("node_type") or "case").upper()
        nodes.append({
            "id": str(data.get("id") or ""),
            "label": str(data.get("label") or data.get("id") or ""),
            "type": {"OFFENDER": "ACCUSED", "FIR": "CASE", "VICTIM": "VICTIM"}.get(node_type, node_type),
            "subText": str(data.get("district") or data.get("crime_type") or ""),
            "riskLevel": str(data.get("risk") or "NORMAL").upper(),
            "details": {
                "firNumber": str(data.get("id") or "") if node_type == "FIR" else None,
                "district": data.get("district"),
                "crimeType": data.get("crime_type"),
                "location": data.get("location"),
                "station": data.get("police_station") or data.get("station"),
                "filedDate": data.get("date") or data.get("fir_date") or data.get("filed_date"),
                "provenance": "uploaded_relationship_registry",
                "priorOffenses": data.get("previous_firs"),
            },
        })
    edges: list[dict[str, Any]] = []
    for index, item in enumerate(raw_edges[:800]):
        data = item.get("data", item)
        relationship = str(data.get("relationship_type") or data.get("label") or "Verified registry relationship")
        edges.append({
            "id": str(data.get("id") or f"edge-{index + 1}"),
            "source": str(data.get("source") or ""),
            "target": str(data.get("target") or ""),
            "relationType": "CO_ACCUSED",
            "weight": int(data.get("weight") or 1),
            "description": relationship,
            "provenance": "uploaded_relationship_registry",
        })

    # Enrich the topology from uploaded transaction rows. Account labels are masked
    # before disclosure, while full values remain confined to the backend store.
    transactions = await fetch_all(
        """
        SELECT transaction_id, fir_id, sender_account, receiver_account, amount,
               transaction_date, channel, risk_flag
        FROM financial_transactions ORDER BY transaction_date DESC LIMIT 300
        """
    )
    node_ids = {str(node["id"]) for node in nodes}
    transaction_amounts: dict[str, float] = defaultdict(float)

    def masked_account(value: Any) -> str:
        text = str(value or "").strip()
        return f"Account •••• {text[-4:]}" if text else "Masked account"

    for row in transactions:
        fir_id = str(row.get("fir_id") or "").strip()
        sender = str(row.get("sender_account") or "").strip()
        receiver = str(row.get("receiver_account") or "").strip()
        if not fir_id or not sender or not receiver:
            continue
        for account in (sender, receiver):
            account_id = f"ACCOUNT-{account}"
            if account_id not in node_ids:
                nodes.append({
                    "id": account_id,
                    "label": masked_account(account),
                    "type": "BANK_ACCOUNT",
                    "subText": "Uploaded transaction evidence",
                    "riskLevel": "HIGH" if str(row.get("risk_flag") or "").casefold() in {"high", "critical", "suspicious"} else "MEDIUM",
                    "details": {
                        "firNumber": fir_id,
                        "status": "SUSPECT",
                        "filedDate": row.get("transaction_date"),
                        "provenance": "financial_transactions.csv",
                    },
                    "provenance": "financial_transactions.csv",
                })
                node_ids.add(account_id)
        transaction_id = str(row.get("transaction_id") or len(edges) + 1)
        edges.append({
            "id": f"transaction-{transaction_id}",
            "source": f"ACCOUNT-{sender}",
            "target": f"ACCOUNT-{receiver}",
            "relationType": "FINANCIAL_TRANSFER",
            "weight": 8 if str(row.get("risk_flag") or "").casefold() in {"high", "critical", "suspicious"} else 4,
            "description": f"Uploaded {row.get('channel') or 'transaction'} record linked to {fir_id}",
            "firNumber": fir_id,
            "amount": float(row.get("amount") or 0),
            "provenance": "financial_transactions.csv",
        })
        if fir_id in node_ids:
            edges.append({
                "id": f"fir-account-{transaction_id}",
                "source": fir_id,
                "target": f"ACCOUNT-{sender}",
                "relationType": "FINANCIAL_TRANSFER",
                "weight": 7,
                "description": "Transaction account linked to the verified FIR reference",
                "firNumber": fir_id,
                "provenance": "financial_transactions.csv",
            })
        transaction_amounts[fir_id] += float(row.get("amount") or 0)

    # Connected components provide stable case-isolated network IDs expected by
    # the React graph without inventing relationships that are absent from data.
    parent: dict[str, str] = {str(node["id"]): str(node["id"]) for node in nodes}

    def find(value: str) -> str:
        parent.setdefault(value, value)
        while parent[value] != value:
            parent[value] = parent[parent[value]]
            value = parent[value]
        return value

    def union(left: str, right: str) -> None:
        left_root, right_root = find(left), find(right)
        if left_root != right_root:
            parent[right_root] = left_root

    for edge in edges:
        source, target = str(edge.get("source") or ""), str(edge.get("target") or "")
        if source and target:
            union(source, target)

    components: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for node in nodes:
        components[find(str(node["id"]))].append(node)

    networks: list[dict[str, Any]] = []
    node_network: dict[str, str] = {}
    for index, component in enumerate(sorted(components.values(), key=len, reverse=True)):
        network_id = f"NET-{index + 1:04d}"
        for node in component:
            node["networkId"] = network_id
            node_network[str(node["id"])] = network_id
        fir_nodes = [node for node in component if node.get("type") == "CASE"]
        accused_nodes = [node for node in component if node.get("type") == "ACCUSED"]
        reference = str(fir_nodes[0]["id"]) if fir_nodes else ""
        district = next((str(node.get("details", {}).get("district")) for node in component if node.get("details", {}).get("district")), "Karnataka")
        networks.append({
            "id": network_id,
            "name": f"{reference or 'Registry'} relationship network",
            "district": district,
            "category": "Financial link" if any(node.get("type") == "BANK_ACCOUNT" for node in component) else "Entity relationship",
            "threatLevel": "CRITICAL" if len(accused_nodes) >= 5 else "HIGH" if len(accused_nodes) >= 2 else "ELEVATED",
            "briefSummary": f"{len(component)} verified entities and {sum(1 for edge in edges if node_network.get(str(edge.get('source'))) == network_id)} recorded links.",
            "modusOperandi": "Derived from uploaded FIR, relationship, and transaction records",
            "totalFinancialImpact": f"INR {transaction_amounts.get(reference, 0):,.2f}" if transaction_amounts.get(reference) else "No linked transaction amount",
            "primaryAccusedId": str(accused_nodes[0]["id"]) if accused_nodes else str(component[0]["id"]),
            "memberIds": [str(node["id"]) for node in component],
            "provenance": "derived_connected_component",
        })
    for edge in edges:
        edge["networkId"] = node_network.get(str(edge.get("source"))) or node_network.get(str(edge.get("target")))

    return {"networks": networks[:150], "nodes": nodes, "edges": edges}


async def _admin_data() -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    users = await fetch_all(
        """
        SELECT u.username, u.role, u.active, MAX(a.timestamp) AS last_login
        FROM users u LEFT JOIN audit_logs a ON a.username = u.username
        GROUP BY u.username, u.role, u.active ORDER BY u.username
        """
    )
    sessions = [{
        "id": str(index + 1),
        "name": str(row["username"]),
        "badgeNumber": str(row["username"]).upper(),
        "role": "ADMIN" if row["role"] == "Administrator" else str(row["role"]).upper(),
        "rank": str(row["role"]),
        "department": "NAMMA KSP",
        "lastLogin": str(row.get("last_login") or "No recorded sign-in"),
        "ipAddress": "Protected",
        "activeStatus": "ACTIVE" if int(row.get("active") or 0) else "LOGGED_OUT",
    } for index, row in enumerate(users)]
    logs = await fetch_all(
        "SELECT id, timestamp, username, role, action, resource, ip_address FROM audit_logs ORDER BY id DESC LIMIT 250"
    )
    audit = [{
        "id": str(row["id"]),
        "timestamp": str(row["timestamp"]),
        "actor": str(row.get("username") or "System"),
        "actorRole": "ADMIN" if row.get("role") == "Administrator" else str(row.get("role") or "ANALYST").upper(),
        "action": "LOGIN_FAILURE" if row.get("action") == "LOGIN_FAILED" else "SUSPECT_SEARCH" if "SEARCH" in str(row.get("action")) else "API_CONFIG_EDIT",
        "targetResource": str(row.get("resource") or "platform"),
        "ipAddress": str(row.get("ip_address") or "Protected"),
        "severity": "CRITICAL" if row.get("action") == "LOGIN_FAILED" else "INFO",
        "flaggedByAI": row.get("action") == "LOGIN_FAILED",
        "status": "UNREVIEWED" if row.get("action") == "LOGIN_FAILED" else "REVIEWED",
    } for row in logs]
    alerts = [{
        "id": f"security-{row['id']}",
        "timestamp": str(row["timestamp"]),
        "alertType": "MULTIPLE_FAILED_LOGINS",
        "description": f"Failed sign-in recorded for {row.get('username') or 'unknown user'}",
        "userAffected": str(row.get("username") or "Unknown"),
        "ipAddress": str(row.get("ip_address") or "Protected"),
        "severity": "HIGH",
        "recommendedAction": "Review the audit trail and verify account activity.",
    } for row in logs if row.get("action") == "LOGIN_FAILED"]
    return sessions, audit, alerts


async def build_frontend_workspace(user: dict[str, Any]) -> dict[str, Any]:
    role = canonical_role(user.get("role"))
    crime_types = await get_crime_type_distribution()
    districts = await _districts()
    trends = await _crime_trends()
    demographics = await _demographics()
    workloads, bottlenecks = await _workloads() if role in {"Supervisor", "Administrator"} else ([], [])
    cases = await _case_records(user)
    hotspots = await get_hotspot_data()
    forecast = await get_crime_forecast()
    social = await get_sociological_insights() if role in {"Analyst", "Policymaker"} else None
    financial = await get_financial_link_analysis() if role in {"Investigator", "Analyst", "Supervisor"} else None
    explainable = await get_explainable_intelligence() if role in {"Analyst", "Supervisor", "Policymaker"} else None
    network = await _network() if role in {"Investigator", "Analyst", "Supervisor"} else {"networks": [], "nodes": [], "edges": []}
    sessions, audit, security = await _admin_data() if role == "Administrator" else ([], [], [])
    stats = await get_db_stats()
    reports = await fetch_all(
        "SELECT id, filename, report_type, subject, created_at, size_kb, storage_uri, generated_by, status FROM report_archive ORDER BY id DESC LIMIT 100"
    )
    open_cases = sum(1 for case in cases if case["status"] != "CLOSED")
    category_breakdown = [{
        "name": str(row.get("crime_type") or "Unclassified"),
        "value": int(row.get("count") or 0),
        "count": int(row.get("count") or 0),
    } for row in crime_types]
    top_warning = (forecast.get("early_warnings") or [{}])[0]
    insight = {
        "id": f"{role.lower()}-live-insight",
        "role": "ADMIN" if role == "Administrator" else role.upper(),
        "timestamp": datetime.now(UTC).isoformat(),
        "headline": f"{role} operational intelligence",
        "body": f"{stats.get('firs', 0)} verified FIRs are available. {top_warning.get('district', 'No district')} has the leading current early-warning signal.",
        "confidenceScore": 88,
        "evidence": [{
            "id": "registry-summary",
            "type": "FIR_RECORD",
            "title": "Verified FIR registry",
            "referenceCode": "NAMMA-KSP-REGISTRY",
            "snippet": f"{stats.get('firs', 0)} FIRs, {stats.get('offenders', 0)} offenders and {stats.get('relationships', 0)} relationships",
            "timestamp": datetime.now(UTC).isoformat(),
        }],
        "actionItems": [str(item.get("recommended_action")) for item in forecast.get("early_warnings", [])[:3]],
        "severity": "HIGH" if forecast.get("early_warnings") else "INFO",
        "disclaimer": "Decision support only. Operational action requires authorized human review.",
    }
    return {
        "generatedAt": datetime.now(UTC).isoformat(),
        "identity": {**user, "role": role},
        "cases": cases,
        "hotspots": hotspots,
        "districts": districts,
        "crimeTrends": trends,
        "demographics": demographics,
        "categoryBreakdown": category_breakdown,
        "network": network,
        "officerWorkloads": workloads,
        "supervisorBottlenecks": bottlenecks,
        "userSessions": sessions,
        "auditEvents": audit,
        "securityAlerts": security,
        "systemHealth": {
            "databaseLatencyMs": 0,
            "activeUserCount": len(sessions),
            "systemUptimePercentage": 100,
            "aiQueriesLastHour": sum(1 for event in audit if "AI" in event.get("targetResource", "").upper()),
            "catalystConnectionStatus": "LIVE" if stats.get("firs") else "DEGRADED",
            "cpuUtilizationPercent": 0,
            "memoryUsagePercent": 0,
            "storageUsedTB": 0,
            "totalStorageTB": 0,
        },
        "aiInsight": insight,
        "forecast": forecast,
        "sociological": social,
        "financial": financial,
        "explainable": explainable,
        "reports": reports,
        "overview": stats,
    }
