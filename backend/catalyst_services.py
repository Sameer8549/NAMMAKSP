"""
Catalyst service registry for NAMMA KSP.

This module keeps the Zoho Catalyst service story explicit and inspectable.
Some services are already active because the app is deployed on Catalyst
hosting/AppSail. Others are integration-ready and become active when the
corresponding Catalyst resource and environment variable are configured.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class CatalystService:
    number: int
    capability: str
    service: str
    status: str
    feature: str
    evidence: list[str]
    env: list[str]


def _enabled(*names: str) -> bool:
    return any(bool(os.getenv(name)) for name in names)


def _runtime_is_catalyst() -> bool:
    return bool(os.getenv("X_ZOHO_CATALYST_LISTEN_PORT"))


def _resource(name: str, default: str) -> str:
    return os.getenv(name, default)


def get_catalyst_service_matrix() -> dict:
    """Return all requested Catalyst services except Authentication."""
    runtime_active = _runtime_is_catalyst()

    services = [
        CatalystService(1, "Serverless functions/backend logic", "Catalyst Serverless Functions",
                        "ready", "Daily intelligence refresh endpoint can be invoked by Functions/Event Functions.",
                        ["/api/jobs/daily-intelligence-refresh"], ["CATALYST_FUNCTION_REFRESH_URL"]),
        CatalystService(2, "Docker image deployment", "Catalyst AppSail custom OCI runtime",
                        "active" if runtime_active else "local", "Backend API runs on Catalyst AppSail.",
                        ["/api/health"], ["X_ZOHO_CATALYST_LISTEN_PORT"]),
        CatalystService(3, "Full web app in managed runtime", "Catalyst AppSail managed runtime",
                        "active" if runtime_active else "local", "FastAPI managed runtime serves all investigation APIs.",
                        ["/api/docs", "/api/system/status"], ["X_ZOHO_CATALYST_LISTEN_PORT"]),
        CatalystService(4, "Frontend/static site", "Catalyst Web Client Hosting",
                        "active", "Static frontend is deployed through Catalyst client hosting.",
                        ["/app/index.html", "/app/dashboard.html"], []),
        CatalystService(5, "Custom domain + SSL", "Catalyst Domain Mappings",
                        "configured" if _enabled("CATALYST_CUSTOM_DOMAIN") else "console-required",
                        "Can map the existing Catalyst app to a public SSL domain.",
                        [], ["CATALYST_CUSTOM_DOMAIN"]),
        CatalystService(6, "Relational database", "Catalyst Data Store",
                        "console-created" if _resource("CATALYST_DATASTORE_TABLE_FIRS", "namma_ksp_firs") else "sqlite-fallback",
                        f"Console table `{_resource('CATALYST_DATASTORE_TABLE_FIRS', 'namma_ksp_firs')}` is reserved for FIR relational data; app still uses SQLite fallback until SDK adapter is enabled.",
                        ["/api/health", "/api/analytics/overview"], ["CATALYST_DATASTORE_TABLE_FIRS", "CATALYST_DATASTORE_ENABLED"]),
        CatalystService(7, "Unstructured/semi-structured data", "Catalyst NoSQL",
                        "console-created" if _resource("CATALYST_NOSQL_TABLE_EVIDENCE", "namma_ksp_evidence") else "local-fallback",
                        f"Console NoSQL table `{_resource('CATALYST_NOSQL_TABLE_EVIDENCE', 'namma_ksp_evidence')}` is reserved for chat/evidence payloads.",
                        ["/api/chat", "/api/analytics/explainability"], ["CATALYST_NOSQL_TABLE_EVIDENCE", "CATALYST_NOSQL_ENABLED"]),
        CatalystService(8, "Object/blob storage", "Catalyst Stratus",
                        "console-created" if _resource("CATALYST_STRATUS_BUCKET", "namma-ksp-reports") else "local-fallback",
                        f"Console bucket `{_resource('CATALYST_STRATUS_BUCKET', 'namma-ksp-reports')}` is reserved for generated PDF objects.",
                        ["/api/reports/list", "/api/reports/download/{filename}"], ["CATALYST_STRATUS_BUCKET", "CATALYST_REPORTS_FOLDER_ID"]),
        CatalystService(9, "Cache", "Catalyst Cache",
                        "console-created" if _resource("CATALYST_CACHE_SEGMENT", "namma_ksp_analytics") else "memory-fallback",
                        f"Console cache segment `{_resource('CATALYST_CACHE_SEGMENT', 'namma_ksp_analytics')}` is reserved for analytics summaries.",
                        ["/api/analytics/advanced-intelligence", "/api/system/summary"], ["CATALYST_CACHE_SEGMENT", "CATALYST_CACHE_ENABLED"]),
        CatalystService(10, "Full-text search", "Catalyst Data Store",
                        "adapter-ready" if _enabled("CATALYST_DATASTORE_SEARCH_ENABLED") else "sql-search-fallback",
                        "FIR/offender search endpoints are ready to move to Data Store search.",
                        ["/api/firs", "/api/search/global"], ["CATALYST_DATASTORE_SEARCH_ENABLED"]),
        CatalystService(11, "Text LLMs/RAG/knowledge bases", "Catalyst QuickML",
                        "adapter-ready" if _enabled("CATALYST_QUICKML_ENABLED") else "external-llm-fallback",
                        "AI chat can route through QuickML LLM/RAG when configured.",
                        ["/api/chat"], ["CATALYST_QUICKML_ENABLED"]),
        CatalystService(12, "No-code ML pipelines", "Catalyst QuickML",
                        "adapter-ready" if _enabled("CATALYST_QUICKML_PIPELINE_ID") else "analytics-fallback",
                        "Pattern discovery/forecast workflows can call QuickML pipeline jobs.",
                        ["/api/analytics/forecast"], ["CATALYST_QUICKML_PIPELINE_ID"]),
        CatalystService(13, "Automated tabular training", "Catalyst Zia AutoML",
                        "adapter-ready" if _enabled("CATALYST_ZIA_AUTOML_MODEL_ID") else "rules-fallback",
                        "Offender risk and hotspot training can be routed to Zia AutoML.",
                        ["/api/offenders/high-risk", "/api/analytics/forecast"], ["CATALYST_ZIA_AUTOML_MODEL_ID"]),
        CatalystService(14, "OCR/vision/text analytics/barcode", "Catalyst Zia Services",
                        "adapter-ready" if _enabled("CATALYST_ZIA_SERVICES_ENABLED") else "not-configured",
                        "Report evidence ingestion can use Zia OCR/Text Analytics when enabled.",
                        ["/api/reports/case"], ["CATALYST_ZIA_SERVICES_ENABLED"]),
        CatalystService(15, "Voice/translation", "Catalyst Zia Services",
                        "adapter-ready" if _enabled("CATALYST_ZIA_VOICE_ENABLED") else "sarvam-fallback",
                        "Voice, speech, and translation endpoints are isolated for Zia voice substitution.",
                        ["/api/tts", "/api/translate", "/api/audio-transcribe"], ["CATALYST_ZIA_VOICE_ENABLED"]),
        CatalystService(16, "PDF/image screenshots/headless browser", "Catalyst SmartBrowz",
                        "adapter-ready" if _enabled("CATALYST_SMARTBROWZ_ENABLED") else "reportlab-fallback",
                        "PDF/report rendering can be switched from ReportLab to SmartBrowz screenshots/PDF.",
                        ["/api/reports/case", "/api/reports/district"], ["CATALYST_SMARTBROWZ_ENABLED"]),
        CatalystService(18, "API routing/throttling", "Catalyst API Gateway",
                        "active", "API Gateway serves the Web Client Hosting `/app/*` routes; AppSail APIs use their dedicated Catalyst domain.",
                        ["/app/index.html", "/app/dashboard.html"], ["CATALYST_API_GATEWAY_URL"]),
        CatalystService(19, "OAuth tokens", "Catalyst Connections",
                        "adapter-ready" if _enabled("CATALYST_CONNECTIONS_ENABLED") else "env-token-fallback",
                        "Third-party AI/voice tokens can be moved from env variables to Catalyst Connections.",
                        ["/api/chat", "/api/tts"], ["CATALYST_CONNECTIONS_ENABLED"]),
        CatalystService(20, "Scheduled jobs/cron", "Catalyst Cron / Job Scheduling",
                        "console-configured", "Daily forecast and early-warning refresh has a Catalyst Cron-compatible internal endpoint.",
                        ["/api/internal/cron/daily-intelligence-refresh", "/api/jobs/daily-intelligence-refresh"], ["CATALYST_CRON_KEY", "CATALYST_CRON_ENABLED"]),
        CatalystService(21, "In-project events", "Catalyst Signals + Event Functions",
                        "adapter-ready" if _enabled("CATALYST_SIGNALS_ENABLED") else "audit-table-fallback",
                        "Report generation, alerts, and audit writes can publish Signals.",
                        ["/api/reports/list", "/api/alerts/early-warning"], ["CATALYST_SIGNALS_ENABLED"]),
        CatalystService(22, "Cross-app event bus", "Catalyst Signals",
                        "adapter-ready" if _enabled("CATALYST_SIGNALS_ENABLED") else "not-configured",
                        "High-risk alerts can be published to other apps through Signals.",
                        ["/api/alerts/early-warning"], ["CATALYST_SIGNALS_ENABLED"]),
        CatalystService(23, "Workflow orchestration", "Catalyst Circuits",
                        "adapter-ready" if _enabled("CATALYST_CIRCUITS_ENABLED") else "manual-workflow",
                        "Report generation, review, alerting, and notification steps can be orchestrated.",
                        ["/api/reports/case", "/api/jobs/daily-intelligence-refresh"], ["CATALYST_CIRCUITS_ENABLED"]),
        CatalystService(24, "Transactional email", "Catalyst Mail",
                        "adapter-ready" if _enabled("CATALYST_MAIL_ENABLED") else "not-configured",
                        "Generated reports and alerts can be emailed through Catalyst Mail.",
                        ["/api/reports/list"], ["CATALYST_MAIL_ENABLED"]),
        CatalystService(25, "Push notifications", "Catalyst Push Notifications",
                        "adapter-ready" if _enabled("CATALYST_PUSH_ENABLED") else "not-configured",
                        "Early-warning and high-risk offender alerts can trigger push notifications.",
                        ["/api/alerts/early-warning"], ["CATALYST_PUSH_ENABLED"]),
        CatalystService(26, "CI/CD", "Catalyst Pipelines",
                        "console-required", "CLI deployment is active; Catalyst Pipelines can automate deploys.",
                        [], ["CATALYST_PIPELINE_ENABLED"]),
    ]

    rows = [service.__dict__ for service in services]
    active_like = {"active", "configured", "ready", "adapter-ready", "console-created", "console-configured"}
    return {
        "auth_excluded": True,
        "summary": {
            "total_requested_without_auth": len(rows),
            "active_or_ready": sum(1 for row in rows if row["status"] in active_like),
            "console_required": sum(1 for row in rows if row["status"] == "console-required"),
            "fallback_mode": sum(1 for row in rows if row["status"].endswith("-fallback") or row["status"] == "not-configured"),
        },
        "services": rows,
    }
