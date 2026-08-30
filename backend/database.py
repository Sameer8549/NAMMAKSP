"""
database.py — NAMMA KSP
──────────────────────────
Handles all database operations:
  - SQLite initialization via aiosqlite (async)
  - CSV ingestion: loads all 5 CSVs into normalized tables
  - Provides async query helpers used by analytics, network, and AI modules
"""

import os
import asyncio
import logging
import hashlib
import time
from typing import Any
# pyrefly: ignore [missing-import]
import aiosqlite
import pandas as pd
from pathlib import Path
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

from er_schema import ER_CREATE_TABLES_SQL, validate_er_schema
from er_seed import seed_er_model

load_dotenv()

logger = logging.getLogger(__name__)

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent.parent
DATA_DIR   = BASE_DIR / os.getenv("DATA_DIR", "data")
DB_PATH    = BASE_DIR / os.getenv("NAMMAKSP_DB_PATH", "namma_ksp.db")

# Catalyst is the primary read store in AppSail. Missing/unavailable managed
# tables transparently fall back to the bundled SQLite snapshot.
USE_CATALYST_STORE = os.getenv("USE_CATALYST_STORE", "true").strip().lower() in {
    "1", "true", "yes", "on"
}
CATALYST_TABLES = {
    "firs": os.getenv("NAMMAKSP_DATASTORE_TABLE_FIRS", "").strip(),
    "offenders": os.getenv("NAMMAKSP_DATASTORE_TABLE_OFFENDERS", "").strip(),
    "relationships": os.getenv("NAMMAKSP_DATASTORE_TABLE_RELATIONSHIPS", "").strip(),
}
_CATALYST_ROWS_TTL_SECONDS = int(os.getenv("CATALYST_ROW_CACHE_TTL_SECONDS", "60"))
_catalyst_rows_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_catalyst_rows_lock = asyncio.Lock()

# ─── CSV file map ─────────────────────────────────────────────────────────────
CSV_FILES = {
    "firs":          DATA_DIR / "firs.csv",
    "offenders":     DATA_DIR / "offenders.csv",
    "victims":       DATA_DIR / "victims.csv",
    "locations":     DATA_DIR / "locations.csv",
    "relationships": DATA_DIR / "relationships.csv",
    "financial_transactions": DATA_DIR / "financial_transactions.csv",
    "socio_economic_indicators": DATA_DIR / "socio_economic_indicators.csv",
}

# ─── DDL: Table Definitions ───────────────────────────────────────────────────
CREATE_TABLES_SQL = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    location_id     TEXT PRIMARY KEY,
    district        TEXT NOT NULL,
    police_station  TEXT NOT NULL,
    latitude        REAL NOT NULL,
    longitude       REAL NOT NULL
);

-- Offenders table
CREATE TABLE IF NOT EXISTS offenders (
    offender_id     TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    age             INTEGER NOT NULL,
    gender          TEXT NOT NULL,
    district        TEXT NOT NULL,
    previous_firs   INTEGER DEFAULT 0,
    risk_category   TEXT NOT NULL
);

-- Victims table
CREATE TABLE IF NOT EXISTS victims (
    victim_id   TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    age         INTEGER NOT NULL,
    gender      TEXT NOT NULL,
    district    TEXT NOT NULL
);

-- FIRs table (core crime records)
CREATE TABLE IF NOT EXISTS firs (
    fir_id          TEXT PRIMARY KEY,
    crime_type      TEXT NOT NULL,
    date            TEXT NOT NULL,
    district        TEXT NOT NULL,
    police_station  TEXT NOT NULL,
    location_id     TEXT,
    status          TEXT NOT NULL,
    offender_id     TEXT,
    victim_id       TEXT,
    FOREIGN KEY (location_id)  REFERENCES locations(location_id),
    FOREIGN KEY (offender_id)  REFERENCES offenders(offender_id),
    FOREIGN KEY (victim_id)    REFERENCES victims(victim_id)
);

-- Relationships table (criminal network edges)
CREATE TABLE IF NOT EXISTS relationships (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    offender_id         TEXT NOT NULL,
    victim_id           TEXT NOT NULL,
    fir_id              TEXT NOT NULL,
    relationship_type   TEXT NOT NULL,
    FOREIGN KEY (offender_id)  REFERENCES offenders(offender_id),
    FOREIGN KEY (victim_id)    REFERENCES victims(victim_id),
    FOREIGN KEY (fir_id)       REFERENCES firs(fir_id)
);

-- Optional financial transaction evidence table.
-- Loaded automatically when data/financial_transactions.csv is present.
CREATE TABLE IF NOT EXISTS financial_transactions (
    transaction_id   TEXT PRIMARY KEY,
    fir_id           TEXT,
    sender_account   TEXT,
    receiver_account TEXT,
    amount           REAL,
    transaction_date TEXT,
    channel          TEXT,
    district         TEXT,
    risk_flag        TEXT,
    FOREIGN KEY (fir_id) REFERENCES firs(fir_id)
);

-- Optional official socio-economic indicator table.
-- Loaded automatically when data/socio_economic_indicators.csv is present.
CREATE TABLE IF NOT EXISTS socio_economic_indicators (
    district            TEXT PRIMARY KEY,
    urbanization_index  REAL,
    migration_index     REAL,
    unemployment_rate   REAL,
    literacy_rate       REAL,
    income_index        REAL,
    population_density  REAL
);

-- Users table for RBAC
CREATE TABLE IF NOT EXISTS users (
    username      TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL,
    active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS forecast_reviews (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id    INTEGER,
    reviewer    TEXT NOT NULL,
    decision    TEXT NOT NULL,
    note        TEXT,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs for governance and traceability
CREATE TABLE IF NOT EXISTS audit_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    username    TEXT,
    user_id     TEXT,
    role        TEXT,
    action      TEXT NOT NULL,
    resource    TEXT,
    detail      TEXT,
    ip_address  TEXT
);

-- Report archive metadata for persistent governance even when PDFs are stored externally.
CREATE TABLE IF NOT EXISTS report_archive (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    filename       TEXT NOT NULL UNIQUE,
    report_type    TEXT NOT NULL,
    subject        TEXT,
    size_kb        REAL,
    storage_mode   TEXT NOT NULL DEFAULT 'local',
    storage_uri    TEXT,
    generated_by   TEXT,
    status         TEXT NOT NULL DEFAULT 'ready'
);

-- Early-warning alert events generated by scheduled or manual intelligence refreshes.
CREATE TABLE IF NOT EXISTS alert_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    severity    TEXT NOT NULL,
    district    TEXT,
    signal      TEXT NOT NULL,
    detail      TEXT,
    status      TEXT NOT NULL DEFAULT 'open',
    assigned_to TEXT,
    assigned_by TEXT,
    acknowledged_by TEXT,
    acknowledged_at TEXT,
    resolved_by TEXT,
    resolved_at TEXT,
    resolution TEXT
);

-- Operational job ledger for Catalyst Cron / manual refresh runs.
CREATE TABLE IF NOT EXISTS job_runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    job_name    TEXT NOT NULL,
    status      TEXT NOT NULL,
    detail      TEXT,
    actor       TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_firs_district    ON firs(district);
CREATE INDEX IF NOT EXISTS idx_firs_crime_type  ON firs(crime_type);
CREATE INDEX IF NOT EXISTS idx_firs_date        ON firs(date);
CREATE INDEX IF NOT EXISTS idx_firs_status      ON firs(status);
CREATE INDEX IF NOT EXISTS idx_firs_offender    ON firs(offender_id);
CREATE INDEX IF NOT EXISTS idx_offenders_risk   ON offenders(risk_category);
CREATE INDEX IF NOT EXISTS idx_rel_offender     ON relationships(offender_id);
CREATE INDEX IF NOT EXISTS idx_rel_fir          ON relationships(fir_id);
CREATE INDEX IF NOT EXISTS idx_txn_fir          ON financial_transactions(fir_id);
CREATE INDEX IF NOT EXISTS idx_txn_sender       ON financial_transactions(sender_account);
CREATE INDEX IF NOT EXISTS idx_txn_receiver     ON financial_transactions(receiver_account);
CREATE INDEX IF NOT EXISTS idx_audit_time       ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_report_created   ON report_archive(created_at);
CREATE INDEX IF NOT EXISTS idx_alert_created    ON alert_events(created_at);
CREATE INDEX IF NOT EXISTS idx_alert_status     ON alert_events(status);
CREATE INDEX IF NOT EXISTS idx_job_started      ON job_runs(started_at);
"""


# ─── Database Initialization ──────────────────────────────────────────────────

async def init_db() -> None:
    """
    Initialize the SQLite database:
      1. Create all tables if they don't exist.
      2. Ingest CSV data if tables are empty.
    """
    logger.info("Initializing database at %s", DB_PATH)

    try:
        async with aiosqlite.connect(DB_PATH) as db:
            # Create schema
            await db.executescript(CREATE_TABLES_SQL)
            await db.executescript(ER_CREATE_TABLES_SQL)
            async with db.execute("PRAGMA table_info(audit_logs)") as cur:
                audit_columns = {row[1] for row in await cur.fetchall()}
            if "user_id" not in audit_columns:
                await db.execute("ALTER TABLE audit_logs ADD COLUMN user_id TEXT")
            async with db.execute("PRAGMA table_info(users)") as cur:
                user_columns = {row[1] for row in await cur.fetchall()}
            if "active" not in user_columns:
                await db.execute("ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1")
            async with db.execute("PRAGMA table_info(firs)") as cur:
                fir_columns = {row[1] for row in await cur.fetchall()}
            fir_migrations = {"assigned_to": "TEXT", "priority": "TEXT", "updated_at": "TEXT"}
            for column, column_type in fir_migrations.items():
                if column not in fir_columns:
                    await db.execute(f"ALTER TABLE firs ADD COLUMN {column} {column_type}")
            await db.execute("""
                UPDATE firs
                SET assigned_to = COALESCE(assigned_to, CASE WHEN CAST(SUBSTR(fir_id, 4) AS INTEGER) % 5 = 0 THEN 'officer' ELSE 'investigator_pool' END),
                    priority = COALESCE(priority, CASE WHEN CAST(SUBSTR(fir_id, 4) AS INTEGER) % 11 = 0 THEN 'Critical' WHEN CAST(SUBSTR(fir_id, 4) AS INTEGER) % 4 = 0 THEN 'High' ELSE 'Normal' END),
                    updated_at = COALESCE(updated_at, date)
            """)
            async with db.execute("PRAGMA table_info(alert_events)") as cur:
                alert_columns = {row[1] for row in await cur.fetchall()}
            alert_migrations = {
                "updated_at": "TEXT",
                "assigned_to": "TEXT",
                "assigned_by": "TEXT",
                "acknowledged_by": "TEXT",
                "acknowledged_at": "TEXT",
                "resolved_by": "TEXT",
                "resolved_at": "TEXT",
                "resolution": "TEXT",
            }
            for column, column_type in alert_migrations.items():
                if column not in alert_columns:
                    await db.execute(f"ALTER TABLE alert_events ADD COLUMN {column} {column_type}")
            await db.execute("UPDATE alert_events SET updated_at = COALESCE(updated_at, created_at)")
            await db.commit()
            logger.info("Schema created / verified.")

            # Seed default users if users table is empty
            async with db.execute("SELECT COUNT(*) FROM users") as cur:
                user_count = (await cur.fetchone())[0]
            demo_mode = os.getenv("DEMO_MODE", "false").strip().lower() == "true"
            if demo_mode:
                logger.info("Ensuring synthetic role demonstration users exist...")
                demo_users = (
                    ("admin", "admin123", "Administrator"),
                    ("officer", "officer123", "Investigator"),
                    ("analyst", "analyst123", "Analyst"),
                    ("supervisor", "supervisor123", "Supervisor"),
                    ("policymaker", "policy123", "Policymaker"),
                )
                for username, password, role in demo_users:
                    await db.execute(
                        "INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                        (username, hash_password(password), role),
                    )
                await db.execute("UPDATE users SET role = 'Administrator' WHERE role = 'Admin'")
                await db.commit()
                logger.info("Synthetic role demonstration users ready.")

            # Check if data already loaded
            async with db.execute("SELECT COUNT(*) FROM firs") as cur:
                count = (await cur.fetchone())[0]

            if count == 0:
                logger.info("Database is empty — loading CSVs...")
                await _ingest_csvs(db)
                logger.info("CSV ingestion complete.")
            else:
                logger.info("Database already populated (%d FIR records).", count)
                await _ingest_optional_csvs(db)
            er_seed_result = await seed_er_model(db, DATA_DIR)
            logger.info("ER model seed status: %s", er_seed_result)
    except Exception as e:
        logger.warning("Database initialization write failed (possibly read-only filesystem): %s. Continuing in read-only mode.", e)


async def _ingest_csvs(db: aiosqlite.Connection) -> None:
    """Load all 5 CSVs into their corresponding SQLite tables."""

    # 1. Locations
    ldf = pd.read_csv(CSV_FILES["locations"])
    ldf.columns = [c.lower() for c in ldf.columns]
    await db.executemany(
        "INSERT OR IGNORE INTO locations VALUES (?,?,?,?,?)",
        ldf[["location_id","district","police_station","latitude","longitude"]].values.tolist()
    )

    # 2. Offenders
    odf = pd.read_csv(CSV_FILES["offenders"])
    odf.columns = [c.lower() for c in odf.columns]
    await db.executemany(
        "INSERT OR IGNORE INTO offenders VALUES (?,?,?,?,?,?,?)",
        odf[["offender_id","name","age","gender","district","previous_firs","risk_category"]].values.tolist()
    )

    # 3. Victims
    vdf = pd.read_csv(CSV_FILES["victims"])
    vdf.columns = [c.lower() for c in vdf.columns]
    await db.executemany(
        "INSERT OR IGNORE INTO victims VALUES (?,?,?,?,?)",
        vdf[["victim_id","name","age","gender","district"]].values.tolist()
    )

    # 4. FIRs
    fdf = pd.read_csv(CSV_FILES["firs"])
    fdf.columns = [c.lower() for c in fdf.columns]
    await db.executemany(
        """
        INSERT OR IGNORE INTO firs (
            fir_id, crime_type, date, district, police_station,
            location_id, status, offender_id, victim_id
        )
        VALUES (?,?,?,?,?,?,?,?,?)
        """,
        fdf[[
            "fir_id", "crime_type", "date", "district", "police_station",
            "location_id", "status", "offender_id", "victim_id"
        ]].values.tolist()
    )

    # 5. Relationships
    rdf = pd.read_csv(CSV_FILES["relationships"])
    rdf.columns = [c.lower() for c in rdf.columns]
    await db.executemany(
        "INSERT OR IGNORE INTO relationships (offender_id, victim_id, fir_id, relationship_type) VALUES (?,?,?,?)",
        rdf[["offender_id","victim_id","fir_id","relationship_type"]].values.tolist()
    )

    await db.commit()
    await _ingest_optional_csvs(db)


async def _ingest_optional_csvs(db: aiosqlite.Connection) -> None:
    """Load optional real-world enrichment CSVs when they are uploaded."""
    if CSV_FILES["financial_transactions"].exists():
        async with db.execute("SELECT COUNT(*) FROM financial_transactions") as cur:
            count = (await cur.fetchone())[0]
        if count == 0:
            tdf = pd.read_csv(CSV_FILES["financial_transactions"])
            tdf.columns = [c.lower() for c in tdf.columns]
            required = [
                "transaction_id", "fir_id", "sender_account", "receiver_account",
                "amount", "transaction_date", "channel", "district", "risk_flag"
            ]
            missing = [c for c in required if c not in tdf.columns]
            if not missing:
                tdf = tdf[required].astype(object).where(pd.notnull(tdf[required]), None)
                await db.executemany(
                    "INSERT OR IGNORE INTO financial_transactions VALUES (?,?,?,?,?,?,?,?,?)",
                    tdf.values.tolist()
                )
                await db.commit()
                logger.info("Loaded optional financial transaction dataset (%d rows).", len(tdf))
            else:
                logger.warning("financial_transactions.csv exists but is missing columns: %s", missing)

    if CSV_FILES["socio_economic_indicators"].exists():
        async with db.execute("SELECT COUNT(*) FROM socio_economic_indicators") as cur:
            count = (await cur.fetchone())[0]
        if count == 0:
            sdf = pd.read_csv(CSV_FILES["socio_economic_indicators"])
            sdf.columns = [c.lower() for c in sdf.columns]
            required = [
                "district", "urbanization_index", "migration_index", "unemployment_rate",
                "literacy_rate", "income_index", "population_density"
            ]
            if "district" in sdf.columns:
                for column in required:
                    if column not in sdf.columns:
                        sdf[column] = None
                sdf = sdf[required].astype(object).where(pd.notnull(sdf[required]), None)
                await db.executemany(
                    "INSERT OR REPLACE INTO socio_economic_indicators VALUES (?,?,?,?,?,?,?)",
                    sdf.values.tolist()
                )
                await db.commit()
                logger.info("Loaded optional socio-economic indicator dataset (%d rows).", len(sdf))
            else:
                logger.warning("socio_economic_indicators.csv exists but is missing required column: district")


# ─── Query Helpers ────────────────────────────────────────────────────────────

def _normalized_managed_row(row: dict[str, Any]) -> dict[str, Any]:
    """Normalize Catalyst column names to the lowercase REST representation."""
    return {
        str(key).lower(): value
        for key, value in row.items()
        if str(key).upper() not in {"CREATORID", "MODIFIEDBY"}
    }


async def _get_catalyst_rows(table_key: str) -> list[dict[str, Any]]:
    """Read a Catalyst Data Store table with a short process-local read cache."""
    table_id = CATALYST_TABLES.get(table_key, "")
    if not USE_CATALYST_STORE or not table_id:
        raise RuntimeError(f"Catalyst table is not configured: {table_key}")

    now = time.monotonic()
    cached = _catalyst_rows_cache.get(table_key)
    if cached and now - cached[0] < _CATALYST_ROWS_TTL_SECONDS:
        return cached[1]

    async with _catalyst_rows_lock:
        cached = _catalyst_rows_cache.get(table_key)
        if cached and time.monotonic() - cached[0] < _CATALYST_ROWS_TTL_SECONDS:
            return cached[1]

        def read_rows() -> list[dict[str, Any]]:
            # zcatalyst_sdk.initialize() obtains AppSail's service credentials;
            # get_paged_rows() reads at most 1,000 rows per SDK request.
            import zcatalyst_sdk

            table = zcatalyst_sdk.initialize().datastore().table(table_id)
            rows: list[dict[str, Any]] = []
            next_token: str | None = None
            while True:
                page = table.get_paged_rows(next_token=next_token, max_rows=1000)
                rows.extend(_normalized_managed_row(row) for row in page.get("data", []))
                next_token = page.get("next_token")
                if not next_token:
                    break
            return rows

        try:
            rows = await asyncio.to_thread(read_rows)
        except Exception as exc:
            logger.warning("Catalyst Data Store read failed for %s: %s", table_key, exc)
            raise RuntimeError(f"Catalyst Data Store read failed for {table_key}") from exc

        _catalyst_rows_cache[table_key] = (time.monotonic(), rows)
        return rows


async def get_fir_by_id(fir_id: str) -> dict[str, Any] | None:
    """Return one verified FIR from Catalyst, with SQLite continuity fallback."""
    normalized_id = fir_id.strip().upper().replace("-", "")
    if USE_CATALYST_STORE and CATALYST_TABLES["firs"]:
        try:
            rows = await _get_catalyst_rows("firs")
            return next(
                (row for row in rows if str(row.get("fir_id", "")).upper().replace("-", "") == normalized_id),
                None,
            )
        except Exception:
            logger.exception("Falling back to SQLite for FIR lookup")
    return await fetch_one(
        "SELECT * FROM firs WHERE UPPER(REPLACE(fir_id, '-', '')) = ? LIMIT 1",
        (normalized_id,),
    )


async def search_offenders(query_dict: dict[str, Any]) -> list[dict[str, Any]]:
    """Search offender attributes using Catalyst or a parameterized SQLite query."""
    allowed = {"offender_id", "name", "district", "gender", "risk_category"}
    filters = {
        key: str(value).strip()
        for key, value in query_dict.items()
        if key in allowed and value is not None and str(value).strip()
    }
    limit = min(max(int(query_dict.get("limit", 50)), 1), 200)

    if USE_CATALYST_STORE and CATALYST_TABLES["offenders"]:
        try:
            rows = await _get_catalyst_rows("offenders")
            return [
                row for row in rows
                if all(value.casefold() in str(row.get(key, "")).casefold() for key, value in filters.items())
            ][:limit]
        except Exception:
            logger.exception("Falling back to SQLite for offender search")

    clauses = [f"LOWER({key}) LIKE ?" for key in filters]
    params = tuple(f"%{value.lower()}%" for value in filters.values())
    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    return await fetch_all(
        f"SELECT * FROM offenders{where} ORDER BY previous_firs DESC LIMIT ?",
        params + (limit,),
    )


async def get_criminal_network_edges() -> list[dict[str, Any]]:
    """Return the verified relationship edge registry from the managed store."""
    if USE_CATALYST_STORE and CATALYST_TABLES["relationships"]:
        try:
            return await _get_catalyst_rows("relationships")
        except Exception:
            logger.exception("Falling back to SQLite for criminal-network edges")
    return await fetch_all(
        """
        SELECT offender_id, victim_id, fir_id, relationship_type
        FROM relationships
        ORDER BY id ASC
        """
    )

async def fetch_all(query: str, params: tuple = ()) -> list[dict]:
    """Execute a SELECT and return list of row dicts."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(query, params) as cur:
            rows = await cur.fetchall()
            return [dict(row) for row in rows]


async def fetch_one(query: str, params: tuple = ()) -> dict | None:
    """Execute a SELECT and return single row dict or None."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(query, params) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def fetch_dataframe(query: str, params: tuple = ()) -> pd.DataFrame:
    """Execute a SELECT and return a pandas DataFrame."""
    rows = await fetch_all(query, params)
    return pd.DataFrame(rows)


async def execute_write(query: str, params: tuple = ()) -> None:
    """Execute an INSERT / UPDATE / DELETE."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(query, params)
        await db.commit()


async def log_audit(
    username: str | None,
    role: str | None,
    action: str,
    resource: str = "",
    detail: str = "",
    ip_address: str = "",
    user_id: str = "",
) -> None:
    """Persist an audit event for governance and traceability."""
    from catalyst_runtime import datastore_append_event

    await datastore_append_event("audit", {
        "username": username or "", "user_id": user_id, "role": role or "",
        "action": action, "resource": resource, "detail": detail,
        "ip_address": ip_address,
    })
    await execute_write(
        """
        INSERT INTO audit_logs (username, user_id, role, action, resource, detail, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (username, user_id, role, action, resource, detail, ip_address)
    )


async def record_report_archive(
    filename: str,
    report_type: str,
    subject: str = "",
    size_kb: float = 0,
    storage_mode: str = "local",
    storage_uri: str = "",
    generated_by: str = "",
    status: str = "ready"
) -> None:
    """Record generated report metadata for archive/governance views."""
    from catalyst_runtime import datastore_append_event

    await datastore_append_event("report", {
        "filename": filename, "report_type": report_type, "subject": subject,
        "size_kb": size_kb, "storage_mode": storage_mode,
        "storage_uri": storage_uri, "generated_by": generated_by, "status": status,
    })
    await execute_write(
        """
        INSERT OR REPLACE INTO report_archive
            (filename, report_type, subject, size_kb, storage_mode, storage_uri, generated_by, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (filename, report_type, subject, size_kb, storage_mode, storage_uri, generated_by, status)
    )


async def list_report_archive(limit: int = 100) -> list[dict]:
    """Return newest report archive metadata."""
    from catalyst_runtime import datastore_list_events

    managed = await datastore_list_events("report", limit)
    if managed["used"]:
        return managed["data"]
    return await fetch_all(
        """
        SELECT id, created_at, filename, report_type, subject, size_kb,
               storage_mode, storage_uri, generated_by, status
        FROM report_archive
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,)
    )


async def list_audit_events(limit: int = 100) -> list[dict]:
    """Return durable Catalyst audit events with a local continuity fallback."""
    from catalyst_runtime import datastore_list_events

    managed = await datastore_list_events("audit", limit)
    if managed["used"]:
        return managed["data"]
    return await fetch_all(
        """
        SELECT id, timestamp, username, user_id, role, action, resource, detail, ip_address
        FROM audit_logs
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,),
    )


async def record_alert_event(
    severity: str,
    signal: str,
    district: str = "",
    detail: str = "",
    status: str = "open"
) -> None:
    """Record an early-warning event, de-duplicated by current day/signal/district."""
    from catalyst_runtime import datastore_append_event

    existing = await fetch_one(
        """
        SELECT id FROM alert_events
        WHERE date(created_at) = date('now')
          AND severity = ? AND COALESCE(district, '') = ? AND signal = ?
        LIMIT 1
        """,
        (severity, district, signal),
    )
    if existing:
        return
    await datastore_append_event("alert", {
        "severity": severity, "signal": signal, "district": district,
        "detail": detail, "status": status,
    })
    await execute_write(
        """
        INSERT INTO alert_events (severity, district, signal, detail, status)
        SELECT ?, ?, ?, ?, ?
        WHERE NOT EXISTS (
            SELECT 1 FROM alert_events
            WHERE date(created_at) = date('now')
              AND severity = ?
              AND COALESCE(district, '') = ?
              AND signal = ?
        )
        """,
        (severity, district, signal, detail, status, severity, district, signal)
    )


async def list_alert_events(limit: int = 50) -> list[dict]:
    """Return newest early-warning events."""
    from catalyst_runtime import datastore_list_events

    managed = await datastore_list_events("alert", limit)
    if managed["used"]:
        return managed["data"]
    return await fetch_all(
        """
        SELECT id, created_at, updated_at, severity, district, signal, detail, status,
               assigned_to, assigned_by, acknowledged_by, acknowledged_at,
               resolved_by, resolved_at, resolution
        FROM alert_events
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,)
    )


async def transition_alert_event(
    alert_id: int,
    transition: str,
    actor: str,
    assignee: str = "",
    resolution: str = "",
) -> dict | None:
    """Apply a validated early-warning lifecycle transition and return the event."""
    current = await fetch_one("SELECT * FROM alert_events WHERE id = ?", (alert_id,))
    if not current:
        return None

    status = str(current.get("status") or "open").lower()
    if transition == "assign":
        if status == "resolved":
            raise ValueError("Resolved alerts cannot be reassigned")
        await execute_write(
            """
            UPDATE alert_events
            SET status = 'assigned', assigned_to = ?, assigned_by = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (assignee, actor, alert_id),
        )
    elif transition == "acknowledge":
        if status not in {"open", "assigned"}:
            raise ValueError("Only open or assigned alerts can be acknowledged")
        await execute_write(
            """
            UPDATE alert_events
            SET status = 'acknowledged', acknowledged_by = ?,
                acknowledged_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (actor, alert_id),
        )
    elif transition == "resolve":
        if status not in {"open", "assigned", "acknowledged"}:
            raise ValueError("Alert is already resolved")
        await execute_write(
            """
            UPDATE alert_events
            SET status = 'resolved', resolved_by = ?, resolved_at = CURRENT_TIMESTAMP,
                resolution = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (actor, resolution, alert_id),
        )
    else:
        raise ValueError("Unsupported alert transition")

    updated = await fetch_one("SELECT * FROM alert_events WHERE id = ?", (alert_id,))
    from catalyst_runtime import datastore_append_event
    await datastore_append_event("alert_transition", {
        "alert_id": alert_id,
        "transition": transition,
        "actor": actor,
        "assignee": assignee,
        "resolution": resolution,
        "status": updated.get("status") if updated else "unknown",
    })
    return updated


async def record_job_run(job_name: str, status: str, detail: str = "", actor: str = "") -> None:
    """Record a Catalyst Cron/manual operational job run."""
    from catalyst_runtime import datastore_append_event

    await datastore_append_event("job", {
        "job_name": job_name, "status": status, "detail": detail, "actor": actor,
    })
    await execute_write(
        "INSERT INTO job_runs (job_name, status, detail, actor) VALUES (?, ?, ?, ?)",
        (job_name, status, detail, actor)
    )


async def list_job_runs(limit: int = 20) -> list[dict]:
    """Return newest operational job runs."""
    from catalyst_runtime import datastore_list_events

    managed = await datastore_list_events("job", limit)
    if managed["used"]:
        return managed["data"]
    return await fetch_all(
        """
        SELECT id, started_at, job_name, status, detail, actor
        FROM job_runs
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,)
    )


# ─── Quick Stats Helper ───────────────────────────────────────────────────────

async def get_db_stats() -> dict:
    """Return row counts for all tables — used for health check."""
    stats = {}
    tables = [
        "firs", "offenders", "victims", "locations", "relationships",
        "financial_transactions", "socio_economic_indicators", "audit_logs",
        "report_archive", "alert_events", "job_runs"
    ]
    for table in tables:
        row = await fetch_one(f"SELECT COUNT(*) as cnt FROM {table}")
        stats[table] = row["cnt"] if row else 0
    return stats


async def get_er_schema_status() -> dict:
    """Return Police FIR ER schema integrity evidence."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA foreign_keys=ON")
        return await validate_er_schema(db)


def hash_password(password: str) -> str:
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


# ─── Standalone test ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(init_db())
    stats = asyncio.run(get_db_stats())
    print("\n[OK] Database ready:")
    for k, v in stats.items():
        print(f"   {k:20s}: {v:,} rows")
