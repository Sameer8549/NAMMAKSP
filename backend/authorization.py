"""Server-owned role, capability, scope, and workspace policy for NAMMA KSP."""

from __future__ import annotations

from copy import deepcopy
import hashlib
from typing import Any, Iterable


ROLES = ("Investigator", "Analyst", "Supervisor", "Policymaker", "Administrator")

ROLE_CAPABILITIES: dict[str, frozenset[str]] = {
    "Investigator": frozenset({
        "workspace:investigator", "case:read_assigned", "case:timeline",
        "case:similar", "entity:read_case_pii", "network:read_case",
        "offender:read_case", "ai:case_assist", "report:create_case",
        "report:read_own", "alert:read_assigned",
    }),
    "Analyst": frozenset({
        "workspace:analyst", "analytics:read_pseudonymized", "analytics:export",
        "network:read_analytical", "financial:read_pseudonymized",
        "sociology:read", "forecast:read", "offender:read_pseudonymized",
        "ai:analytical", "report:create_analytical", "report:read_analytical",
        "alert:recommend",
    }),
    "Supervisor": frozenset({
        "workspace:supervisor", "case:read_command", "case:timeline",
        "entity:read_command_pii", "network:read_command", "offender:read_command",
        "analytics:read_command", "ai:supervisory", "report:create_case",
        "report:approve", "report:read_command", "alert:read_command",
        "alert:assign", "alert:resolve", "audit:read_command",
    }),
    "Policymaker": frozenset({
        "workspace:policymaker", "policy:read_aggregate", "policy:export",
        "sociology:read_aggregate", "forecast:read_aggregate",
        "network:read_aggregate", "ai:policy", "report:create_policy",
        "report:read_policy",
    }),
    "Administrator": frozenset({
        "workspace:administrator", "platform:admin", "identity:manage",
        "service:probe", "deployment:manage", "audit:read_all",
        "retention:manage", "model:manage", "report:manage_templates",
    }),
}

ROLE_DISCLOSURE = {
    "Investigator": "case-scoped-pii",
    "Analyst": "pseudonymized",
    "Supervisor": "command-scoped-pii",
    "Policymaker": "aggregate-only",
    "Administrator": "administrative-metadata",
}

WORKSPACE_CONTRACTS: dict[str, dict[str, Any]] = {
    "Investigator": {
        "workspace_id": "investigator-command-desk",
        "title": "Investigator Command Desk",
        "purpose": "Assigned cases, evidence, linked entities and investigative leads",
        "primary_actions": ["Open assigned case", "Ask case AI", "Trace network", "Create case report"],
        "modules": ["assigned_cases", "case_timeline", "evidence_coverage", "linked_entities", "similar_cases", "lead_queue"],
        "navigation": ["dashboard", "chat", "network", "offenders", "reports"],
    },
    "Analyst": {
        "workspace_id": "crime-analysis-workbench",
        "title": "Crime Analysis Workbench",
        "purpose": "Patterns, hotspots, networks, social factors, financial links and forecasts",
        "primary_actions": ["Open pattern drilldown", "Compare districts", "Trace cluster", "Export analysis"],
        "modules": ["trend_analysis", "hotspots", "modus_operandi", "network_communities", "sociological", "financial_links", "forecast_validation"],
        "navigation": ["dashboard", "chat", "network", "heatmap", "offenders", "reports"],
    },
    "Supervisor": {
        "workspace_id": "supervisor-operations-board",
        "title": "Supervisor Operations Board",
        "purpose": "Command workload, ageing, alerts, approvals and accountability",
        "primary_actions": ["Assign alert", "Review ageing cases", "Approve report", "Inspect audit trail"],
        "modules": ["command_pressure", "case_ageing", "high_risk_queue", "alert_inbox", "team_workload", "approval_queue", "audit_exceptions"],
        "navigation": ["dashboard", "chat", "network", "heatmap", "offenders", "reports", "audit"],
    },
    "Policymaker": {
        "workspace_id": "policymaker-intelligence-brief",
        "title": "Policymaker Intelligence Brief",
        "purpose": "Privacy-preserving statewide trends, prevention and resource planning",
        "primary_actions": ["Compare policy indicators", "Review forecast bands", "Generate policy brief"],
        "modules": ["statewide_trends", "district_benchmarks", "social_indicators", "prevention_outcomes", "forecast_bands", "resource_scenarios"],
        "navigation": ["dashboard", "heatmap", "reports"],
    },
    "Administrator": {
        "workspace_id": "administrator-governance-console",
        "title": "Administrator Governance Console",
        "purpose": "Identity, services, audit integrity, models, retention and releases",
        "primary_actions": ["Manage roles", "Probe Catalyst services", "Review audit integrity", "Inspect release health"],
        "modules": ["service_health", "identities", "access_grants", "audit_integrity", "retention_jobs", "model_registry", "deployment_health"],
        "navigation": ["dashboard", "users", "audit"],
    },
}


def canonical_role(role: str) -> str:
    """Return one of the five application roles or raise a closed-deny error."""
    normalized = str(role or "").strip().casefold()
    aliases = {
        "investigator": "Investigator", "officer": "Investigator",
        "analyst": "Analyst", "crime analyst": "Analyst",
        "supervisor": "Supervisor", "police supervisor": "Supervisor",
        "policymaker": "Policymaker", "policy maker": "Policymaker",
        "administrator": "Administrator", "admin": "Administrator",
        "app admin": "Administrator", "app administrator": "Administrator",
    }
    if normalized not in aliases:
        raise ValueError("Role is not authorized for NAMMA KSP")
    return aliases[normalized]


def capabilities_for(role: str) -> frozenset[str]:
    return ROLE_CAPABILITIES[canonical_role(role)]


def has_capability(user: dict[str, Any], capability: str) -> bool:
    return capability in capabilities_for(str(user.get("role") or ""))


def parse_scope_values(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        values: Iterable[Any] = value.split(",")
    elif isinstance(value, (list, tuple, set)):
        values = value
    else:
        values = [value]
    return sorted({str(item).strip() for item in values if str(item).strip()})


def enrich_identity(user: dict[str, Any]) -> dict[str, Any]:
    """Attach immutable server-derived permissions and normalized scopes."""
    enriched = dict(user)
    role = canonical_role(str(user.get("role") or ""))
    enriched["role"] = role
    enriched["capabilities"] = sorted(ROLE_CAPABILITIES[role])
    enriched["disclosure_mode"] = ROLE_DISCLOSURE[role]
    enriched["district_scope"] = parse_scope_values(user.get("district_scope"))
    enriched["command_scope"] = parse_scope_values(user.get("command_scope"))
    return enriched


def workspace_for(user: dict[str, Any]) -> dict[str, Any]:
    enriched = enrich_identity(user)
    contract = deepcopy(WORKSPACE_CONTRACTS[enriched["role"]])
    contract.update({
        "role": enriched["role"],
        "capabilities": enriched["capabilities"],
        "disclosure_mode": enriched["disclosure_mode"],
        "district_scope": enriched["district_scope"],
        "command_scope": enriched["command_scope"],
        "data_classification": "Restricted" if "pii" in enriched["disclosure_mode"] else "Confidential",
    })
    return contract


_DIRECT_IDENTIFIER_KEYS = {
    "name", "full_name", "offender_name", "victim_name", "accused_name",
    "phone", "phone_number", "mobile", "email", "address", "aadhaar",
    "account_number", "bank_account", "upi_id",
}


def _stable_alias(value: Any, prefix: str = "ENTITY") -> str:
    digest = hashlib.sha256(str(value or "unknown").encode("utf-8")).hexdigest()[:10].upper()
    return f"{prefix}-{digest}"


def pseudonymize_record(value: Any) -> Any:
    """Recursively remove direct identifiers while retaining analytical utility."""
    if isinstance(value, list):
        return [pseudonymize_record(item) for item in value]
    if not isinstance(value, dict):
        return value

    projected: dict[str, Any] = {}
    for key, item in value.items():
        normalized = str(key).casefold()
        if normalized in _DIRECT_IDENTIFIER_KEYS:
            projected[key] = _stable_alias(item, "SUBJECT")
        elif normalized in {"offender_id", "victim_id", "accused_id", "suspect_id"}:
            projected[key] = _stable_alias(item)
        else:
            projected[key] = pseudonymize_record(item)
    return projected


def project_case_payload(payload: Any, user: dict[str, Any]) -> Any:
    """Apply the role's disclosure contract to a case-level response."""
    mode = enrich_identity(user)["disclosure_mode"]
    if mode in {"case-scoped-pii", "command-scoped-pii"}:
        return payload
    if mode == "pseudonymized":
        return pseudonymize_record(payload)
    raise PermissionError("This role is not permitted to access case-level records")
