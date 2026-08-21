import asyncio
import os
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import ai_service


class AiReliabilityTests(unittest.TestCase):
    def setUp(self):
        ai_service._response_cache.clear()
        ai_service._sessions.clear()

    def test_query_pattern_normalizes_ids_numbers_and_language(self):
        pattern = ai_service._query_pattern("Show FIR00123 and OFF00045 from 2026", "en-US")
        self.assertEqual(pattern, "en-US:show <record_id> and <record_id> from <number>")

    def test_entity_parser_normalizes_hyphenated_references(self):
        refs = ai_service._extract_entity_references("Check FIR-123 and suspect-42")
        self.assertEqual(refs["fir"], ["FIR00123"])
        self.assertEqual(refs["offender"], ["OFF00042"])

    def test_greeting_returns_no_database_sources(self):
        result = asyncio.run(ai_service.chat("unit-greeting", "hi", "en-US"))
        self.assertEqual(result["sources"], [])
        self.assertFalse(result["cached"])
        self.assertEqual(result["model"], "conversation-router")
        self.assertIn("investigate", result["response"].lower())

    def test_unrelated_prompt_is_refused_before_llm(self):
        with patch.object(ai_service, "_safe_chat_completion") as completion:
            result = asyncio.run(ai_service.chat("unit-offtopic", "Write a romantic poem about the moon", "en-US"))

        completion.assert_not_called()
        self.assertEqual(result["sources"], [])
        self.assertEqual(result["model"], "domain-router")
        self.assertIn("only help", result["response"].lower())
        self.assertIn("crime-intelligence", result["response"].lower())

    def test_chat_returns_sources_and_caches_fallback(self):
        completion = SimpleNamespace(usage=SimpleNamespace(total_tokens=42))

        async def fake_rewrite(_session_id, user_message):
            return user_message

        async def fake_context(_query):
            return "Overall crime type distribution: [{'crime_type': 'Theft', 'count': 10}]"

        with patch.object(ai_service, "_rewrite_query", side_effect=fake_rewrite), \
             patch.object(ai_service, "_fetch_relevant_context", side_effect=fake_context), \
             patch.object(ai_service, "_safe_chat_completion", return_value=(completion, "Theft has 10 cases [S1].")):
            first = asyncio.run(ai_service.chat("unit-cache-a", "What is the top crime?", "en-US"))

        self.assertFalse(first["cached"])
        self.assertEqual(first["sources"][0]["id"], "S1")
        self.assertIn("Theft", first["response"])

        with patch.object(ai_service, "_rewrite_query", side_effect=fake_rewrite), \
             patch.object(ai_service, "_fetch_relevant_context", side_effect=fake_context), \
             patch.object(ai_service, "_safe_chat_completion", side_effect=RuntimeError("provider down")):
            second = asyncio.run(ai_service.chat("unit-cache-b", "What is the top crime?", "en-US"))

        self.assertTrue(second["cached"])
        self.assertEqual(second["warning"], "AI unavailable, showing cached data")
        self.assertEqual(second["response"], "Theft has 10 cases [S1].")
        self.assertEqual(second["sources"][0]["id"], "S1")

    def test_missing_fir_injects_deterministic_system_guardrail(self):
        completion = SimpleNamespace(usage=SimpleNamespace(total_tokens=12))
        with patch.object(ai_service, "_rewrite_query", new=AsyncMock(return_value="Show FIR99999")), \
             patch.object(ai_service, "get_fir_by_id", new=AsyncMock(return_value=None)), \
             patch.object(ai_service, "_fetch_relevant_context", new=AsyncMock()) as context_fetch, \
             patch.object(
                 ai_service,
                 "_safe_chat_completion",
                 return_value=(completion, "FIR99999 was not found in the verified ledger."),
             ) as llm:
            result = asyncio.run(ai_service.chat("missing-fir", "Show FIR-99999", "en-US"))

        context_fetch.assert_not_awaited()
        messages = llm.call_args.kwargs["messages"]
        self.assertEqual(messages[1]["role"], "system")
        self.assertIn("refuse to hallucinate", messages[1]["content"])
        self.assertIn("FIR99999", result["evidence"])


if __name__ == "__main__":
    unittest.main()
