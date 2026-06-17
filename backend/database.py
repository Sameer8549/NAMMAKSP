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
# pyrefly: ignore [missing-import]
import aiosqlite
import pandas as pd
from pathlib import Path
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent.parent
DATA_DIR   = BASE_DIR / os.getenv("DATA_DIR", "data")
DB_PATH    = BASE_DIR / "crime_lens.db"

# ─── CSV file map ─────────────────────────────────────────────────────────────
CSV_FILES = {
    "firs":          DATA_DIR / "firs.csv",
    "offenders":     DATA_DIR / "offenders.csv",
    "victims":       DATA_DIR / "victims.csv",
    "locations":     DATA_DIR / "locations.csv",
    "relationships": DATA_DIR / "relationships.csv",
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

-- Users table for RBAC
CREATE TABLE IF NOT EXISTS users (
    username      TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL -- 'Admin' or 'Investigator'
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
            await db.commit()
            logger.info("Schema created / verified.")

            # Seed default users if users table is empty
            async with db.execute("SELECT COUNT(*) FROM users") as cur:
                user_count = (await cur.fetchone())[0]
            if user_count == 0:
                logger.info("Seeding default users...")
                admin_hash = hash_password("admin123")
                officer_hash = hash_password("officer123")
                await db.execute(
                    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                    ("admin", admin_hash, "Admin")
                )
                await db.execute(
                    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                    ("officer", officer_hash, "Investigator")
                )
                await db.commit()
                logger.info("Default users seeded.")

            # Check if data already loaded
            async with db.execute("SELECT COUNT(*) FROM firs") as cur:
                count = (await cur.fetchone())[0]

            if count == 0:
                logger.info("Database is empty — loading CSVs...")
                await _ingest_csvs(db)
                logger.info("CSV ingestion complete.")
            else:
                logger.info("Database already populated (%d FIR records).", count)
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
        "INSERT OR IGNORE INTO firs VALUES (?,?,?,?,?,?,?,?,?)",
        fdf[["fir_id","crime_type","date","district","police_station",
             "location_id","status","offender_id","victim_id"]].values.tolist()
    )

    # 5. Relationships
    rdf = pd.read_csv(CSV_FILES["relationships"])
    rdf.columns = [c.lower() for c in rdf.columns]
    await db.executemany(
        "INSERT OR IGNORE INTO relationships (offender_id, victim_id, fir_id, relationship_type) VALUES (?,?,?,?)",
        rdf[["offender_id","victim_id","fir_id","relationship_type"]].values.tolist()
    )

    await db.commit()


# ─── Query Helpers ────────────────────────────────────────────────────────────

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


# ─── Quick Stats Helper ───────────────────────────────────────────────────────

async def get_db_stats() -> dict:
    """Return row counts for all tables — used for health check."""
    stats = {}
    tables = ["firs", "offenders", "victims", "locations", "relationships"]
    for table in tables:
        row = await fetch_one(f"SELECT COUNT(*) as cnt FROM {table}")
        stats[table] = row["cnt"] if row else 0
    return stats


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
