import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from fastapi import HTTPException


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from catalyst_auth import _get_current_catalyst_user_sync, normalize_catalyst_user


class CatalystAuthTests(unittest.TestCase):
    def test_active_investigator_is_normalized(self):
        user = normalize_catalyst_user({
            "status": "ACTIVE",
            "user_id": "123",
            "email_id": "officer@example.invalid",
            "first_name": "Demo",
            "last_name": "Officer",
            "role_details": {"role_name": "Investigator"},
        })
        self.assertEqual(user["user_id"], "123")
        self.assertEqual(user["role"], "Investigator")
        self.assertEqual(user["auth_provider"], "catalyst")

    def test_unknown_role_is_denied(self):
        with self.assertRaises(HTTPException) as raised:
            normalize_catalyst_user({
                "status": "ACTIVE",
                "role_details": {"role_name": "App User"},
            })
        self.assertEqual(raised.exception.status_code, 403)

    def test_disabled_user_is_denied(self):
        with self.assertRaises(HTTPException) as raised:
            normalize_catalyst_user({
                "status": "DISABLED",
                "role_details": {"role_name": "Investigator"},
            })
        self.assertEqual(raised.exception.status_code, 403)

    @patch("zcatalyst_sdk.initialize")
    def test_request_context_is_passed_to_catalyst_sdk(self, initialize):
        request = Mock()
        authentication = initialize.return_value.authentication.return_value
        authentication.get_current_user.return_value = {
            "status": "ACTIVE",
            "user_id": "456",
            "first_name": "Test",
            "last_name": "Investigator",
            "role_details": {"role_name": "Investigator"},
        }

        user = _get_current_catalyst_user_sync(request)

        initialize.assert_called_once_with(req=request)
        self.assertEqual(user["user_id"], "456")


if __name__ == "__main__":
    unittest.main()
