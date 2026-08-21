import asyncio
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import database


class DatabaseRepositoryTests(unittest.TestCase):
    def test_get_fir_by_id_normalizes_hyphenated_id(self):
        with patch.object(database, "USE_CATALYST_STORE", False), patch.object(
            database, "fetch_one", new=AsyncMock(return_value={"fir_id": "FIR00001"})
        ) as fetch:
            result = asyncio.run(database.get_fir_by_id("FIR-00001"))
        self.assertEqual(result["fir_id"], "FIR00001")
        self.assertEqual(fetch.await_args.args[1], ("FIR00001",))

    def test_search_offenders_rejects_unknown_filter_columns(self):
        with patch.object(database, "USE_CATALYST_STORE", False), patch.object(
            database, "fetch_all", new=AsyncMock(return_value=[])
        ) as fetch:
            asyncio.run(database.search_offenders({"district": "Mysuru", "unsafe": "x"}))
        query, params = fetch.await_args.args
        self.assertIn("LOWER(district) LIKE ?", query)
        self.assertNotIn("unsafe", query)
        self.assertEqual(params, ("%mysuru%", 50))

    def test_network_edges_use_sqlite_when_managed_table_is_missing(self):
        with patch.dict(database.CATALYST_TABLES, {"relationships": ""}), patch.object(
            database, "fetch_all", new=AsyncMock(return_value=[{"fir_id": "FIR00001"}])
        ):
            result = asyncio.run(database.get_criminal_network_edges())
        self.assertEqual(result[0]["fir_id"], "FIR00001")


if __name__ == "__main__":
    unittest.main()
