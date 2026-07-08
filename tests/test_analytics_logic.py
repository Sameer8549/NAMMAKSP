import asyncio
import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import analytics


class AnalyticsLogicTests(unittest.TestCase):
    def test_risk_score_uses_prior_firs_category_and_active_cases(self):
        offender = {
            "previous_firs": 15,
            "risk_category": "High",
            "active_firs": 8,
        }
        self.assertEqual(analytics._compute_risk_score(offender), 100)

        low_risk = {"previous_firs": 1, "risk_category": "Low", "active_firs": 0}
        self.assertEqual(analytics._compute_risk_score(low_risk), 4)

    def test_risk_factor_explanations_are_human_readable(self):
        factors = analytics._explain_risk_factors({
            "previous_firs": 7,
            "risk_category": "Medium",
            "total_firs_filed": 4,
        })
        self.assertIn("High prior FIR count (7 previous FIRs)", factors)
        self.assertIn("Classified as Medium Risk offender", factors)
        normalized = [f.replace("\u2014", "-") for f in factors]
        self.assertIn("Repeat offender - 4 FIRs filed in this database", normalized)

    def test_search_firs_uses_parameterized_filters(self):
        mock_fetch = AsyncMock(return_value=[])
        with patch.object(analytics, "fetch_all", mock_fetch):
            asyncio.run(analytics.search_firs(
                crime_type="Theft",
                district="Mysuru",
                status="Open",
                from_date="2026-01-01",
                to_date="2026-12-31",
                limit=25,
            ))

        query, params = mock_fetch.call_args.args
        self.assertIn("f.crime_type LIKE ?", query)
        self.assertIn("f.district LIKE ?", query)
        self.assertIn("f.status = ?", query)
        self.assertEqual(params, ("%Theft%", "%Mysuru%", "Open", "2026-01-01", "2026-12-31", 25))

    def test_search_firs_treats_injection_text_as_parameter(self):
        mock_fetch = AsyncMock(return_value=[])
        attack = "Mysuru%' OR 1=1 --"
        with patch.object(analytics, "fetch_all", mock_fetch):
            asyncio.run(analytics.search_firs(district=attack, limit=10))

        query, params = mock_fetch.call_args.args
        self.assertNotIn(attack, query)
        self.assertEqual(params, (f"%{attack}%", 10))


if __name__ == "__main__":
    unittest.main()
