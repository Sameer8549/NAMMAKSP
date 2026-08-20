import asyncio
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
import er_queries


class ErQueryTests(unittest.TestCase):
    def test_case_master_id_validation(self):
        self.assertEqual(er_queries.case_master_id("fir00042"), 42)
        with self.assertRaises(ValueError):
            er_queries.case_master_id("../FIR42")

    def test_network_query_uses_normalized_er_relationships(self):
        async def run():
            with patch.object(er_queries, "fetch_all", new=AsyncMock(return_value=[])) as fetch:
                await er_queries.get_er_network_rows("Mysuru", "Theft", 25)
            query = fetch.await_args.args[0]
            self.assertIn("FROM CaseMaster", query)
            self.assertIn("JOIN Accused", query)
            self.assertIn("JOIN Victim", query)
            self.assertEqual(fetch.await_args.args[1], ("Mysuru", "Theft", 25))

        asyncio.run(run())


if __name__ == "__main__":
    unittest.main()
