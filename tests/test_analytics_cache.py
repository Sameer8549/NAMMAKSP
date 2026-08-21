import asyncio
import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import analytics


class AnalyticsCacheTests(unittest.TestCase):
    def setUp(self):
        analytics._analytics_memory_cache.clear()
        analytics._analytics_cache_locks.clear()

    def test_managed_cache_hit_skips_computation(self):
        producer = AsyncMock(return_value={"source": "computed"})
        managed_payload = {"source": "catalyst"}

        with (
            patch(
                "catalyst_runtime.cache_get_json",
                new=AsyncMock(return_value={"used": True, "data": managed_payload}),
            ),
            patch("catalyst_runtime.cache_put_json", new=AsyncMock()) as cache_put,
        ):
            result = asyncio.run(
                analytics._cached_analytics_payload(None, "overview-test", producer)
            )

        self.assertEqual(result, managed_payload)
        producer.assert_not_awaited()
        cache_put.assert_not_awaited()

    def test_cache_miss_computes_once_and_populates_hot_cache(self):
        producer = AsyncMock(return_value={"total_firs": 42})

        with (
            patch(
                "catalyst_runtime.cache_get_json",
                new=AsyncMock(return_value={"used": False, "data": None}),
            ) as cache_get,
            patch(
                "catalyst_runtime.cache_put_json",
                new=AsyncMock(return_value={"used": True}),
            ) as cache_put,
        ):
            first = asyncio.run(
                analytics._cached_analytics_payload(None, "overview-test", producer)
            )
            second = asyncio.run(
                analytics._cached_analytics_payload(None, "overview-test", producer)
            )

        self.assertEqual(first, {"total_firs": 42})
        self.assertEqual(second, first)
        producer.assert_awaited_once()
        cache_get.assert_awaited_once()
        cache_put.assert_awaited_once_with(
            None,
            "overview-test",
            {"total_firs": 42},
            expiry_hours=1,
        )


if __name__ == "__main__":
    unittest.main()
