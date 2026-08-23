"""Catalyst-native identity and role resolution."""

from __future__ import annotations

import asyncio
import os
from typing import Any

from fastapi import HTTPException
from starlette.requests import Request

from authorization import canonical_role, enrich_identity


AUTH_MODE = os.getenv("AUTH_MODE", "catalyst").strip().lower()
DEMO_MODE = os.getenv("DEMO_MODE", "false").strip().lower() == "true"


def _role_names(env_name: str, defaults: str) -> set[str]:
    value = os.getenv(env_name, defaults)
    return {item.strip().casefold() for item in value.split(",") if item.strip()}


ADMIN_ROLES = _role_names("NAMMAKSP_ADMIN_ROLES", "Admin,App Admin,App Administrator")
INVESTIGATOR_ROLES = _role_names("NAMMAKSP_INVESTIGATOR_ROLES", "Investigator")
ANALYST_ROLES = _role_names("NAMMAKSP_ANALYST_ROLES", "Analyst,Crime Analyst")
SUPERVISOR_ROLES = _role_names("NAMMAKSP_SUPERVISOR_ROLES", "Supervisor")
POLICYMAKER_ROLES = _role_names("NAMMAKSP_POLICYMAKER_ROLES", "Policymaker,Policy Maker")


def normalize_catalyst_user(raw: dict[str, Any]) -> dict[str, str]:
    """Convert Catalyst user details to the application's identity contract."""
    if str(raw.get("status", "")).upper() != "ACTIVE":
        raise HTTPException(status_code=403, detail="Catalyst account is not active")

    role_details = raw.get("role_details") or {}
    catalyst_role = str(role_details.get("role_name") or "").strip()
    role_key = catalyst_role.casefold()
    if role_key in ADMIN_ROLES:
        role = "Administrator"
    elif role_key in INVESTIGATOR_ROLES:
        role = "Investigator"
    elif role_key in ANALYST_ROLES:
        role = "Analyst"
    elif role_key in SUPERVISOR_ROLES:
        role = "Supervisor"
    elif role_key in POLICYMAKER_ROLES:
        role = "Policymaker"
    else:
        raise HTTPException(status_code=403, detail="Catalyst role is not authorized for NAMMA KSP")

    email = str(raw.get("email_id") or "").strip()
    display_name = " ".join(
        part for part in [str(raw.get("first_name") or "").strip(), str(raw.get("last_name") or "").strip()]
        if part
    )
    custom = raw.get("custom_attributes") or raw.get("custom_fields") or {}
    return enrich_identity({
        "user_id": str(raw.get("user_id") or raw.get("zuid") or ""),
        "username": display_name or email or "Catalyst User",
        "email": email,
        "role": role,
        "catalyst_role": catalyst_role,
        "auth_provider": "catalyst",
        "district_scope": custom.get("district_scope", ""),
        "command_scope": custom.get("command_scope", ""),
    })


def _get_current_catalyst_user_sync(request: Request) -> dict[str, str]:
    try:
        import zcatalyst_sdk
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="Catalyst authentication SDK is unavailable") from exc

    try:
        app = zcatalyst_sdk.initialize(req=request)
        raw = app.authentication().get_current_user()
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Catalyst authentication required") from exc
    if not raw:
        raise HTTPException(status_code=401, detail="Catalyst authentication required")
    return normalize_catalyst_user(raw)


async def get_current_catalyst_user(request: Request) -> dict[str, str]:
    if AUTH_MODE != "catalyst":
        raise HTTPException(status_code=503, detail="Catalyst authentication mode is not enabled")
    return await asyncio.to_thread(_get_current_catalyst_user_sync, request)


def _get_all_catalyst_users_sync(request: Request) -> list[dict[str, str]]:
    try:
        import zcatalyst_sdk
        raw_users = zcatalyst_sdk.initialize(req=request).authentication().get_all_users()
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Unable to read Catalyst users") from exc

    users = []
    for raw in raw_users or []:
        try:
            users.append(normalize_catalyst_user(raw))
        except HTTPException:
            continue
    return users


async def get_all_catalyst_users(request: Request) -> list[dict[str, str]]:
    return await asyncio.to_thread(_get_all_catalyst_users_sync, request)
