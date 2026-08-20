import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from analytics import get_submission_readiness


class ReadinessEvidenceTests(unittest.TestCase):
    def test_readiness_includes_er_integrity_and_honest_scope(self):
        async def run():
            counts = {"cnt": 1}
            socio = {
                "total": 1,
                "urbanization": 1,
                "migration": 1,
                "unemployment": 1,
                "literacy": 1,
                "income": 1,
                "density": 1,
            }
            er_status = {"valid": True, "schema_version": "1.0"}
            with patch("analytics.fetch_one", new=AsyncMock(side_effect=[counts] * 8 + [socio])), patch(
                "analytics.get_er_schema_status", new=AsyncMock(return_value=er_status)
            ):
                result = await get_submission_readiness()
            self.assertEqual(result["overall"], "challenge-complete synthetic-data prototype")
            self.assertTrue(result["police_fir_er_schema"]["valid"])
            self.assertEqual(len(result["capabilities"]), 10)

        asyncio.run(run())


if __name__ == "__main__":
    unittest.main()
