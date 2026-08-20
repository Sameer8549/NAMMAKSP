"""Request-scoped Zoho Catalyst runtime adapters with explicit fallbacks."""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any


FALSE_VALUES = {"", "0", "false", "no", "off"}


def enabled(name: str) -> bool:
    return os.getenv(name, "").strip().casefold() not in FALSE_VALUES


def _app(request=None):
    import zcatalyst_sdk
    return zcatalyst_sdk.initialize(req=request) if request is not None else zcatalyst_sdk.initialize()


def _result(provider: str, used: bool, data: Any = None, error: str = "") -> dict:
    return {"provider": provider, "used": used, "data": data, "error": error}


async def datastore_probe(request=None) -> dict:
    table_name = os.getenv("CATALYST_DATASTORE_TABLE_FIRS", "").strip()
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
    segment_id = os.getenv("CATALYST_CACHE_SEGMENT", "").strip()
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
    segment_id = os.getenv("CATALYST_CACHE_SEGMENT", "").strip()
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
    bucket_name = os.getenv("CATALYST_STRATUS_BUCKET", "").strip()
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


async def quickml_predict(request, features: dict[str, int | float]) -> dict:
    endpoint_key = os.getenv("NAMMAKSP_QUICKML_ENDPOINT_KEY", "").strip()
    if not enabled("NAMMAKSP_QUICKML_ENABLED") or not endpoint_key:
        return _result("local-analytics", False, error="QuickML endpoint key is not configured")
    try:
        data = await asyncio.to_thread(_app(request).quick_ml().predict, endpoint_key, features)
        return _result("catalyst-quickml", True, data)
    except Exception as exc:
        return _result("local-analytics", False, error=str(exc))
