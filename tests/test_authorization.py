import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from authorization import (
    ROLES, canonical_role, enrich_identity, has_capability,
    project_case_payload, stable_alias, workspace_for,
)


class AuthorizationTests(unittest.TestCase):
    def test_all_five_roles_have_distinct_workspaces(self):
        workspace_ids = {
            workspace_for({"role": role, "username": role})["workspace_id"]
            for role in ROLES
        }
        self.assertEqual(len(workspace_ids), 5)

    def test_admin_alias_normalizes_without_investigation_pii(self):
        user = enrich_identity({"role": "Admin", "username": "admin"})
        self.assertEqual(user["role"], "Administrator")
        self.assertTrue(has_capability(user, "platform:admin"))
        self.assertFalse(has_capability(user, "entity:read_case_pii"))

    def test_policymaker_is_aggregate_only(self):
        user = enrich_identity({"role": "Policymaker", "username": "policy"})
        self.assertEqual(user["disclosure_mode"], "aggregate-only")
        self.assertTrue(has_capability(user, "policy:read_aggregate"))
        self.assertFalse(has_capability(user, "case:read_assigned"))

    def test_scope_values_are_normalized(self):
        workspace = workspace_for({
            "role": "Supervisor",
            "district_scope": "Mysuru, Bengaluru Urban, Mysuru",
            "command_scope": ["South", "South"],
        })
        self.assertEqual(workspace["district_scope"], ["Bengaluru Urban", "Mysuru"])
        self.assertEqual(workspace["command_scope"], ["South"])

    def test_unknown_role_is_closed_denied(self):
        with self.assertRaises(ValueError):
            canonical_role("App User")

    def test_analyst_projection_masks_direct_identifiers(self):
        payload = {
            "fir_id": "FIR-12", "offender_id": "OFF-9",
            "name": "Test Subject", "district": "Mysuru",
        }
        projected = project_case_payload(payload, {"role": "Analyst"})
        self.assertEqual(projected["fir_id"], "FIR-12")
        self.assertEqual(projected["district"], "Mysuru")
        self.assertTrue(projected["offender_id"].startswith("ENTITY-"))
        self.assertTrue(projected["name"].startswith("SUBJECT-"))
        self.assertNotIn("Test Subject", str(projected))

    def test_aggregate_and_admin_roles_cannot_project_cases(self):
        for role in ("Policymaker", "Administrator"):
            with self.assertRaises(PermissionError):
                project_case_payload({"fir_id": "FIR-12"}, {"role": role})

    def test_stable_alias_matches_projected_offender_identifier(self):
        projected = project_case_payload(
            {"offender_id": "OFF00001"}, {"role": "Analyst"}
        )
        self.assertEqual(projected["offender_id"], stable_alias("OFF00001"))


if __name__ == "__main__":
    unittest.main()
