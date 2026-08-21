"""Request-scoped Zoho Catalyst runtime adapters with explicit fallbacks."""

from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


FALSE_VALUES = {"", "0", "false", "no", "off"}


def config_value(name: str, default: str = "") -> str:
    """Read AppSail-safe names first while retaining local legacy aliases."""
    safe_name = f"NAMMAKSP_{name.removeprefix('CATALYST_')}" if name.startswith("CATALYST_") else name
    return os.getenv(safe_name, os.getenv(name, default))


def enabled(name: str) -> bool:
    return config_value(name).strip().casefold() not in FALSE_VALUES


def _app(request=None):
    import zcatalyst_sdk
    return zcatalyst_sdk.initialize(req=request) if request is not None else zcatalyst_sdk.initialize()


def _result(provider: str, used: bool, data: Any = None, error: str = "") -> dict:
    return {"provider": provider, "used": used, "data": data, "error": error}


async def datastore_probe(request=None) -> dict:
    table_name = config_value("CATALYST_DATASTORE_TABLE_FIRS").strip()
    if not enabled("CATALYST_DATASTORE_ENABLED") or not table_name:
        return _result("sqlite", False, error="Catalyst Data Store is not configured")

    def run():
        table = _app(request).datastore().table(table_name)
        return {
            "table": table_name,
            "columns": table.get_all_columns(),
            "sample_rows": table.get_paged_rows(max_rows=1).get("data", []),
        }

    try:
        return _result("catalyst-datastore", True, await asyncio.to_thread(run))
    except Exception as exc:
        return _result("sqlite", False, error=str(exc))


async def datastore_append_event(event_kind: str, payload: dict[str, Any], request=None) -> dict:
    """Append governance metadata to the durable Catalyst event ledger."""
    table_name = config_value("CATALYST_DATASTORE_TABLE_EVENTS").strip()
    if not enabled("CATALYST_DATASTORE_ENABLED") or not table_name:
        return _result("sqlite", False, error="Catalyst event ledger is not configured")

    def run():
        row = {
            "event_kind": event_kind,
            "event_payload": json.dumps(payload, separators=(",", ":"), default=str),
        }
        return _app(request).datastore().table(table_name).insert_row(row)

    try:
        return _result("catalyst-datastore", True, await asyncio.to_thread(run))
    except Exception as exc:
        return _result("sqlite", False, error=str(exc))


async def datastore_list_events(event_kind: str, limit: int = 100, request=None) -> dict:
    """Read newest matching events from the durable Catalyst event ledger."""
    table_name = config_value("CATALYST_DATASTORE_TABLE_EVENTS").strip()
    if not enabled("CATALYST_DATASTORE_ENABLED") or not table_name:
        return _result("sqlite", False, error="Catalyst event ledger is not configured")

    def run():
        response = _app(request).datastore().table(table_name).get_paged_rows(
            max_rows=min(max(limit * 3, 100), 1000)
        )
        rows = response.get("data", []) if isinstance(response, dict) else []
        matching = [row for row in rows if row.get("event_kind") == event_kind]
        matching.sort(key=lambda row: int(row.get("ROWID") or 0), reverse=True)
        decoded = []
        for row in matching[:limit]:
            try:
                payload = json.loads(row.get("event_payload") or "{}")
            except (TypeError, json.JSONDecodeError):
                continue
            payload.setdefault("id", row.get("ROWID"))
            payload.setdefault("created_at", row.get("CREATEDTIME"))
            if event_kind == "audit":
                payload.setdefault("timestamp", row.get("CREATEDTIME"))
            decoded.append(payload)
        return decoded

    try:
        return _result("catalyst-datastore", True, await asyncio.to_thread(run))
    except Exception as exc:
        return _result("sqlite", False, error=str(exc))


async def nosql_append_evidence(request, session_id: str, payload: dict[str, Any]) -> dict:
    """Persist privacy-minimized AI evidence metadata in Catalyst NoSQL."""
    table_id = config_value("CATALYST_NOSQL_TABLE_EVIDENCE").strip()
    if not enabled("CATALYST_NOSQL_ENABLED") or not table_id:
        return _result("audit-ledger", False, error="Catalyst NoSQL is not configured")

    def run():
        created_at = payload.get("created_at") or datetime.now(timezone.utc).isoformat()
        item = {
            "session_id": {"S": session_id},
            "created_at": {"S": created_at},
            "event_type": {"S": "ai_evidence"},
            "payload": {"S": json.dumps(payload, separators=(",", ":"), default=str)},
        }
        return _app(request).nosql().get_table(table_id).insert_items({"item": item, "return": "NEW"})

    try:
        return _result("catalyst-nosql", True, await asyncio.to_thread(run))
    except Exception as exc:
        return _result("audit-ledger", False, error=str(exc))


async def search(request, term: str, table_columns: dict[str, list[str]]) -> dict:
    if not enabled("CATALYST_DATASTORE_SEARCH_ENABLED"):
        return _result("sql-search", False, error="Catalyst Search is not configured")
    query = {"search": term, "search_table_columns": table_columns}
    try:
        data = await asyncio.to_thread(_app(request).search().execute_search_query, query)
        return _result("catalyst-search", True, data)
    except Exception as exc:
        return _result("sql-search", False, error=str(exc))


async def cache_get_json(request, key: str) -> dict:
    segment_id = config_value("CATALYST_CACHE_SEGMENT").strip()
    if not enabled("CATALYST_CACHE_ENABLED") or not segment_id:
        return _result("memory", False, error="Catalyst Cache is not configured")

    def run():
        value = _app(request).cache().segment(segment_id).get_value(key)
        return json.loads(value) if value else None

    try:
        return _result("catalyst-cache", True, await asyncio.to_thread(run))
    except Exception as exc:
        return _result("memory", False, error=str(exc))


async def cache_put_json(request, key: str, value: Any, expiry_hours: int = 1) -> dict:
    segment_id = config_value("CATALYST_CACHE_SEGMENT").strip()
    if not enabled("CATALYST_CACHE_ENABLED") or not segment_id:
        return _result("memory", False, error="Catalyst Cache is not configured")

    def run():
        segment = _app(request).cache().segment(segment_id)
        payload = json.dumps(value, separators=(",", ":"), default=str)
        try:
            return segment.put(key, payload, expiry_hours)
        except Exception:
            return segment.update(key, payload, expiry_hours)

    try:
        return _result("catalyst-cache", True, await asyncio.to_thread(run))
    except Exception as exc:
        return _result("memory", False, error=str(exc))


async def upload_report(request, pdf_path: str) -> dict:
    bucket_name = config_value("CATALYST_STRATUS_BUCKET").strip()
    if not enabled("CATALYST_STRATUS_ENABLED") or not bucket_name:
        return _result("local-appsail", False, error="Catalyst Stratus is not configured")
    path = Path(pdf_path)
    object_key = f"reports/{path.name}"

    def run():
        uploaded = _app(request).stratus().bucket(bucket_name).put_object(
            object_key,
            path.read_bytes(),
            {"overwrite": "true", "content_type": "application/pdf"},
        )
        return {"bucket": bucket_name, "object_key": object_key, "uploaded": bool(uploaded)}

    try:
        return _result("catalyst-stratus", True, await asyncio.to_thread(run))
    except Exception as exc:
        return _result("local-appsail", False, error=str(exc))


async def download_report(request, filename: str) -> dict:
    """Download a persisted report from Catalyst Stratus."""
    bucket_name = config_value("CATALYST_STRATUS_BUCKET").strip()
    if not enabled("CATALYST_STRATUS_ENABLED") or not bucket_name:
        return _result("local-appsail", False, error="Catalyst Stratus is not configured")

    def run():
        return _app(request).stratus().bucket(bucket_name).get_object(f"reports/{filename}")

    try:
        data = await asyncio.to_thread(run)
        return _result("catalyst-stratus", bool(data), data, "" if data else "Empty Stratus object")
    except Exception as exc:
        return _result("local-appsail", False, error=str(exc))


async def list_report_objects(request=None, limit: int = 1000) -> dict:
    """List persisted PDFs so pre-ledger Stratus reports remain discoverable."""
    bucket_name = config_value("CATALYST_STRATUS_BUCKET").strip()
    if not enabled("CATALYST_STRATUS_ENABLED") or not bucket_name:
        return _result("local-appsail", False, error="Catalyst Stratus is not configured")

    def run():
        response = _app(request).stratus().bucket(bucket_name).list_paged_objects(
            max_keys=min(max(limit, 1), 1000), prefix="reports/", order_by="desc"
        )
        objects = []
        for item in response.get("contents", []):
            details = getattr(item, "object_details", {}) or {}
            key = str(details.get("key") or "")
            filename = key.removeprefix("reports/")
            if filename.endswith(".pdf"):
                objects.append({
                    "filename": filename, "report_type": "archived", "subject": "",
                    "size_kb": round(float(details.get("size") or 0) / 1024, 1),
                    "created_at": details.get("last_modified") or details.get("created_time"),
                    "storage_mode": "catalyst-stratus",
                    "storage_uri": f"stratus://{bucket_name}/{key}", "status": "ready",
                })
        return objects

    try:
        return _result("catalyst-stratus", True, await asyncio.to_thread(run))
    except Exception as exc:
        return _result("local-appsail", False, error=str(exc))


async def quickml_predict(request, features: dict[str, str | int | float | bool]) -> dict:
    endpoint_key = os.getenv("NAMMAKSP_QUICKML_ENDPOINT_KEY", "").strip()
    if not enabled("NAMMAKSP_QUICKML_ENABLED") or not endpoint_key:
        return _result("local-analytics", False, error="QuickML endpoint key is not configured")
    org_id = config_value("CATALYST_ORG_ID").strip()
    if org_id:
        # Catalyst SDK 1.4 reads this runtime variable when building CATALYST-ORG.
        os.environ["X_ZOHO_CATALYST_ORG_ID"] = org_id
    try:
        data = await asyncio.to_thread(_app(request).quick_ml().predict, endpoint_key, features)
        return _result("catalyst-quickml", True, data)
    except Exception as exc:
        return _result("local-analytics", False, error=str(exc))
