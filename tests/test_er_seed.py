import asyncio
import sys
import tempfile
import unittest
from pathlib import Path

import aiosqlite
import pandas as pd


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from er_schema import ER_CREATE_TABLES_SQL, validate_er_schema
from er_seed import seed_er_model


class ErSeedTests(unittest.TestCase):
    def test_seed_preserves_source_ids_and_integrity(self):
        async def run(data_dir):
            async with aiosqlite.connect(":memory:") as db:
                await db.execute("PRAGMA foreign_keys=ON")
                await db.executescript(ER_CREATE_TABLES_SQL)
                result = await seed_er_model(db, data_dir)
                self.assertEqual(result["cases"], 1)
                integrity = await validate_er_schema(db)
                self.assertTrue(integrity["valid"], integrity)
                async with db.execute("SELECT SourceOffenderID FROM Accused") as cursor:
                    self.assertEqual((await cursor.fetchone())[0], "OFF00001")
                async with db.execute("SELECT SourceVictimID FROM Victim") as cursor:
                    self.assertEqual((await cursor.fetchone())[0], "VIC00001")
                second = await seed_er_model(db, data_dir)
                self.assertFalse(second["seeded"])

        with tempfile.TemporaryDirectory() as directory:
            data_dir = Path(directory)
            pd.DataFrame([{
                "FIR_ID": "FIR00001", "Crime_Type": "Theft", "Date": "2026-01-02",
                "District": "Mysuru", "Police_Station": "Central PS", "Location_ID": "LOC001",
                "Status": "Open", "Offender_ID": "OFF00001", "Victim_ID": "VIC00001",
            }]).to_csv(data_dir / "firs.csv", index=False)
            pd.DataFrame([{
                "Location_ID": "LOC001", "District": "Mysuru", "Police_Station": "Central PS",
                "Latitude": 12.3, "Longitude": 76.6,
            }]).to_csv(data_dir / "locations.csv", index=False)
            pd.DataFrame([{
                "Offender_ID": "OFF00001", "Name": "Synthetic Accused", "Age": 30,
                "Gender": "Male", "District": "Mysuru", "Previous_FIRs": 1, "Risk_Category": "Low",
            }]).to_csv(data_dir / "offenders.csv", index=False)
            pd.DataFrame([{
                "Victim_ID": "VIC00001", "Name": "Synthetic Victim", "Age": 25,
                "Gender": "Female", "District": "Mysuru",
            }]).to_csv(data_dir / "victims.csv", index=False)
            asyncio.run(run(data_dir))


if __name__ == "__main__":
    unittest.main()
