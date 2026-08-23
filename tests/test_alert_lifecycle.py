import asyncio
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

import aiosqlite


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import database


class AlertLifecycleTests(unittest.TestCase):
    def test_assign_acknowledge_and_resolve(self):
        async def run():
            with tempfile.TemporaryDirectory() as tmp:
                db_path = Path(tmp) / "alerts.db"
                async with aiosqlite.connect(db_path) as db:
                    await db.executescript("""
                        CREATE TABLE alert_events (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TEXT,
                            severity TEXT NOT NULL,
                            district TEXT,
                            signal TEXT NOT NULL,
                            detail TEXT,
                            status TEXT NOT NULL DEFAULT 'open',
                            assigned_to TEXT,
                            assigned_by TEXT,
                            acknowledged_by TEXT,
                            acknowledged_at TEXT,
                            resolved_by TEXT,
                            resolved_at TEXT,
                            resolution TEXT
                        );
                        INSERT INTO alert_events (severity, district, signal)
                        VALUES ('High', 'Mysuru', 'Test warning');
                    """)
                    await db.commit()

                with patch.object(database, "DB_PATH", db_path), patch(
                    "catalyst_runtime.datastore_append_event", new=AsyncMock()
                ) as managed_event:
                    assigned = await database.transition_alert_event(
                        1, "assign", "supervisor", assignee="officer"
                    )
                    self.assertEqual(assigned["status"], "assigned")
                    self.assertEqual(assigned["assigned_to"], "officer")

                    acknowledged = await database.transition_alert_event(
                        1, "acknowledge", "officer"
                    )
                    self.assertEqual(acknowledged["status"], "acknowledged")

                    resolved = await database.transition_alert_event(
                        1, "resolve", "supervisor", resolution="Patrol deployed"
                    )
                    self.assertEqual(resolved["status"], "resolved")
                    self.assertEqual(resolved["resolution"], "Patrol deployed")
                    self.assertEqual(managed_event.await_count, 3)

                    with self.assertRaisesRegex(ValueError, "already resolved"):
                        await database.transition_alert_event(
                            1, "resolve", "supervisor", resolution="Duplicate"
                        )

        asyncio.run(run())

    def test_missing_alert_returns_none(self):
        async def run():
            with tempfile.TemporaryDirectory() as tmp:
                db_path = Path(tmp) / "alerts.db"
                async with aiosqlite.connect(db_path) as db:
                    await db.execute("CREATE TABLE alert_events (id INTEGER PRIMARY KEY, status TEXT)")
                    await db.commit()
                with patch.object(database, "DB_PATH", db_path):
                    self.assertIsNone(
                        await database.transition_alert_event(999, "assign", "supervisor", assignee="officer")
                    )

        asyncio.run(run())


if __name__ == "__main__":
    unittest.main()
