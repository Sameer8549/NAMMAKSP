import asyncio
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
import catalyst_runtime


class CatalystRuntimeTests(unittest.TestCase):
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

    def test_search_failure_falls_back_without_hiding_error(self):
        app = Mock()
        app.search.return_value.execute_search_query.side_effect = RuntimeError("unavailable")
        with patch.dict(os.environ, {"CATALYST_DATASTORE_SEARCH_ENABLED": "true"}, clear=True), \
             patch.object(catalyst_runtime, "_app", return_value=app):
            result = asyncio.run(catalyst_runtime.search(object(), "FIR00001", {"firs": ["fir_id"]}))
        self.assertFalse(result["used"])
        self.assertIn("unavailable", result["error"])


if __name__ == "__main__":
    unittest.main()
