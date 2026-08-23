import asyncio
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
import catalyst_runtime


class CatalystRuntimeTests(unittest.TestCase):
    def test_appsail_safe_names_are_preferred(self):
        with patch.dict(os.environ, {
            "NAMMAKSP_CACHE_ENABLED": "true",
            "NAMMAKSP_CACHE_SEGMENT": "safe-segment",
            "CATALYST_CACHE_SEGMENT": "legacy-segment",
        }, clear=True):
            self.assertTrue(catalyst_runtime.enabled("CATALYST_CACHE_ENABLED"))
            self.assertEqual(catalyst_runtime.config_value("CATALYST_CACHE_SEGMENT"), "safe-segment")

    def test_unconfigured_services_return_explicit_fallbacks(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(asyncio.run(catalyst_runtime.datastore_probe())["used"])
            self.assertEqual(asyncio.run(catalyst_runtime.cache_get_json(None, "k"))["provider"], "memory")
            self.assertEqual(asyncio.run(catalyst_runtime.quickml_predict(None, {"x": 1}))["provider"], "local-analytics")

    def test_quickml_uses_request_scoped_sdk(self):
        app = Mock()
        app.quick_ml.return_value.predict.return_value = {"prediction": "Open"}
        env = {"NAMMAKSP_QUICKML_ENABLED": "true", "NAMMAKSP_QUICKML_ENDPOINT_KEY": "test-key"}
        with patch.dict(os.environ, env, clear=True), patch.object(catalyst_runtime, "_app", return_value=app):
            result = asyncio.run(catalyst_runtime.quickml_predict(object(), {"feature": 1}))
        self.assertTrue(result["used"])
        app.quick_ml.return_value.predict.assert_called_once_with("test-key", {"feature": 1})

    def test_nested_sdk_calls_inherit_active_request_context(self):
        request = object()
        sdk = Mock()
        sdk.initialize.return_value = Mock()
        token = catalyst_runtime.set_request_context(request)
        try:
            with patch.dict(sys.modules, {"zcatalyst_sdk": sdk}):
                catalyst_runtime._app()
        finally:
            catalyst_runtime.reset_request_context(token)
        sdk.initialize.assert_called_once_with(req=request)

    def test_request_context_is_released_after_reset(self):
        sdk = Mock()
        sdk.initialize.return_value = Mock()
        token = catalyst_runtime.set_request_context(object())
        catalyst_runtime.reset_request_context(token)
        with patch.dict(sys.modules, {"zcatalyst_sdk": sdk}):
            catalyst_runtime._app()
        sdk.initialize.assert_called_once_with()

    def test_search_failure_falls_back_without_hiding_error(self):
        app = Mock()
        app.search.return_value.execute_search_query.side_effect = RuntimeError("unavailable")
        with patch.dict(os.environ, {"CATALYST_DATASTORE_SEARCH_ENABLED": "true"}, clear=True), \
             patch.object(catalyst_runtime, "_app", return_value=app):
            result = asyncio.run(catalyst_runtime.search(object(), "FIR00001", {"firs": ["fir_id"]}))
        self.assertFalse(result["used"])
        self.assertIn("unavailable", result["error"])

    def test_nosql_evidence_insert_uses_supported_return_mode(self):
        app = Mock()
        table = app.nosql.return_value.get_table.return_value
        table.insert_items.return_value = {"status": "success"}
        env = {
            "NAMMAKSP_NOSQL_ENABLED": "true",
            "NAMMAKSP_NOSQL_TABLE_EVIDENCE": "evidence-table",
        }
        with patch.dict(os.environ, env, clear=True), patch.object(catalyst_runtime, "_app", return_value=app):
            result = asyncio.run(catalyst_runtime.nosql_append_evidence(
                object(), "session-1", {"event_type": "verification"}
            ))

        self.assertTrue(result["used"])
        payload = table.insert_items.call_args.args[0]
        self.assertEqual(payload["return"], "NULL")
        self.assertEqual(payload["item"]["session_id"], {"S": "session-1"})

    def test_smartbrowz_uses_sdk_component_and_valid_pdf_options(self):
        app = Mock()
        response = Mock(content=b"%PDF-test")
        app.smart_browz.return_value.convert_to_pdf.return_value = response
        with patch.dict(os.environ, {"NAMMAKSP_SMARTBROWZ_ENABLED": "true"}, clear=True), \
             patch.object(catalyst_runtime, "_app", return_value=app):
            result = asyncio.run(catalyst_runtime.smartbrowz_pdf(object(), "<h1>NAMMA KSP</h1>"))

        self.assertTrue(result["used"])
        call = app.smart_browz.return_value.convert_to_pdf.call_args
        self.assertEqual(call.args[0], "<h1>NAMMA KSP</h1>")
        self.assertEqual(call.kwargs["pdf_options"]["format"], "A4")
        self.assertNotIn("margin", call.kwargs["pdf_options"])

    def test_managed_service_verification_records_only_live_results(self):
        ok = {"provider": "catalyst", "used": True, "data": {}, "error": ""}
        failed = {"provider": "fallback", "used": False, "data": None, "error": "down"}
        with patch.object(catalyst_runtime, "datastore_probe", AsyncMock(return_value=ok)), \
             patch.object(catalyst_runtime, "cache_put_json", AsyncMock(return_value=ok)), \
             patch.object(catalyst_runtime, "cache_get_json", AsyncMock(return_value=ok)), \
             patch.object(catalyst_runtime, "search", AsyncMock(return_value=failed)), \
             patch.object(catalyst_runtime, "list_report_objects", AsyncMock(return_value=ok)), \
             patch.object(catalyst_runtime, "nosql_append_evidence", AsyncMock(return_value=ok)), \
             patch.object(catalyst_runtime, "quickml_predict", AsyncMock(return_value=ok)), \
             patch.object(catalyst_runtime, "zia_text_analysis", AsyncMock(return_value=ok)), \
             patch.object(catalyst_runtime, "smartbrowz_pdf", AsyncMock(return_value=ok)), \
             patch.object(catalyst_runtime, "datastore_append_event", AsyncMock(return_value=ok)):
            proofs = asyncio.run(catalyst_runtime.verify_managed_services(object()))
        self.assertTrue(proofs["datastore"]["verified"])
        self.assertFalse(proofs["search"]["verified"])
        self.assertEqual(proofs["search"]["error"], "down")
        self.assertTrue(proofs["quickml"]["verified"])
        self.assertTrue(proofs["zia_text_analytics"]["verified"])
        self.assertTrue(proofs["smartbrowz"]["verified"])


if __name__ == "__main__":
    unittest.main()
