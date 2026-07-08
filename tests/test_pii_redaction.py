import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from pii_redaction import PiiRedactor


class PiiRedactorTests(unittest.TestCase):
    def test_redacts_and_restores_contact_details(self):
        original = "Call +91 9876543210 or email officer@example.com"
        redactor = PiiRedactor()
        safe = redactor.redact(original)

        self.assertNotIn("9876543210", safe)
        self.assertNotIn("officer@example.com", safe)
        self.assertEqual(redactor.restore(safe), original)

    def test_labeled_names_and_addresses_are_tokenized(self):
        original = "Offender: Ravi Kumar\nAddress: 14 MG Road Bengaluru"
        redactor = PiiRedactor()
        safe = redactor.redact(original)

        self.assertNotIn("Ravi Kumar", safe)
        self.assertNotIn("14 MG Road Bengaluru", safe)
        self.assertIn("[[PII_001]]", safe)
        self.assertEqual(redactor.restore(safe), original)

    def test_same_value_uses_same_request_local_token(self):
        redactor = PiiRedactor()
        safe = redactor.redact("Victim: Meera Rao\nWitness: Meera Rao")

        self.assertEqual(safe.count("[[PII_001]]"), 2)

    def test_message_roles_and_extra_fields_are_preserved(self):
        redactor = PiiRedactor()
        safe = redactor.redact_messages([
            {"role": "user", "content": "Name: Asha Devi", "metadata": "demo"}
        ])

        self.assertEqual(safe[0]["role"], "user")
        self.assertEqual(safe[0]["metadata"], "demo")
        self.assertNotIn("Asha Devi", safe[0]["content"])


if __name__ == "__main__":
    unittest.main()
