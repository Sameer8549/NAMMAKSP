import asyncio
import os
import sys
import unittest
from pathlib import Path

import aiosqlite


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from er_schema import ER_CREATE_TABLES_SQL, ER_TABLES, validate_er_schema


class ErSchemaTests(unittest.TestCase):
    def test_complete_er_schema_and_foreign_keys(self):
        async def run():
            async with aiosqlite.connect(":memory:") as db:
                await db.execute("PRAGMA foreign_keys=ON")
                await db.executescript(ER_CREATE_TABLES_SQL)
                result = await validate_er_schema(db)
                self.assertTrue(result["valid"], result)
                self.assertEqual(result["missing_tables"], [])
                self.assertGreaterEqual(len(ER_TABLES), 28)

        asyncio.run(run())

    def test_occurrence_is_one_to_one_and_arrests_support_many_accused(self):
        self.assertIn("CaseMasterID INTEGER PRIMARY KEY", ER_CREATE_TABLES_SQL)
        self.assertIn("InvArrestSurrenderAccused", ER_CREATE_TABLES_SQL)
        self.assertIn("PRIMARY KEY (ArrestSurrenderID, AccusedMasterID)", ER_CREATE_TABLES_SQL)


if __name__ == "__main__":
    unittest.main()
