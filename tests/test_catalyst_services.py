import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from catalyst_services import get_catalyst_service_matrix


class CatalystServiceMatrixTests(unittest.TestCase):
    def _services(self, env=None):
        with patch.dict(os.environ, env or {}, clear=True):
            return {
                row["number"]: row
                for row in get_catalyst_service_matrix()["services"]
            }

    def test_defaults_do_not_claim_console_resources_are_active(self):
        services = self._services()
        self.assertEqual(services[2]["status"], "not-required")
        self.assertEqual(services[6]["status"], "sqlite-fallback")
        self.assertEqual(services[7]["status"], "not-required")
        self.assertEqual(services[8]["status"], "local-fallback")
        self.assertEqual(services[9]["status"], "memory-fallback")

    def test_false_demo_mode_does_not_enable_demo_fallback(self):
        services = self._services({"DEMO_MODE": "false"})
        self.assertEqual(services[17]["status"], "active")

    def test_explicit_datastore_configuration_is_required(self):
        services = self._services({
            "CATALYST_DATASTORE_ENABLED": "true",
            "CATALYST_DATASTORE_TABLE_FIRS": "namma_ksp_firs",
        })
        self.assertEqual(services[6]["status"], "active")


if __name__ == "__main__":
    unittest.main()
