import os
import sys
import unittest

from pydantic import ValidationError
from fastapi import HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import main


class ApiValidationTests(unittest.TestCase):
    def test_report_request_normalizes_and_validates_fir_id(self):
        self.assertEqual(main.ReportRequest(fir_id="fir00001").fir_id, "FIR00001")
        with self.assertRaises(ValidationError):
            main.ReportRequest(fir_id="FIR1 OR 1=1")

    def test_offender_request_normalizes_and_validates_id(self):
        self.assertEqual(main.OffenderReportRequest(offender_id="off00042").offender_id, "OFF00042")
        with self.assertRaises(ValidationError):
            main.OffenderReportRequest(offender_id="../OFF00042")

    def test_chat_request_rejects_empty_and_bad_session(self):
        with self.assertRaises(ValidationError):
            main.ChatRequest(message="   ")
        with self.assertRaises(ValidationError):
            main.ChatRequest(message="hello", session_id="../../x")

    def test_route_filter_validation_blocks_injection_characters(self):
        with self.assertRaises(HTTPException) as ctx:
            main._validate_filter("Mysuru%' OR 1=1 --", "district")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_date_and_filename_validation(self):
        self.assertEqual(main._validate_date("2026-07-08", "from_date"), "2026-07-08")
        with self.assertRaises(HTTPException):
            main._validate_date("08/07/2026", "from_date")
        self.assertEqual(main._validate_report_filename("case_report_FIR00001.pdf"), "case_report_FIR00001.pdf")
        with self.assertRaises(HTTPException):
            main._validate_report_filename("../secret.pdf")


if __name__ == "__main__":
    unittest.main()
