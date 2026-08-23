import sys
import unittest
from pathlib import Path

from reportlab.platypus import Paragraph, Table


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import report


SAMPLE = """**1. CASE OVERVIEW**
- **FIR ID:** FIR00001
- **Crime:** Vehicle Theft

---

**2. RELATED CASES & PATTERNS**
| FIR ID | District | Relevance |
|---|---|---|
| FIR01199 | Kalaburagi | Same district |
| FIR03225 | Ballari | Same crime |
"""


class ReportFormattingTests(unittest.TestCase):
    def test_inline_bold_labels_are_not_promoted_to_sections(self):
        sections = report._parse_ai_summary(SAMPLE)
        self.assertEqual([heading for heading, _ in sections], [
            "CASE OVERVIEW", "RELATED CASES & PATTERNS"
        ])
        self.assertIn("**FIR ID:** FIR00001", sections[0][1])

    def test_markdown_table_becomes_reportlab_table(self):
        styles = report._styles()
        flowables = report._format_chat_message_to_flowables(
            report._parse_ai_summary(SAMPLE)[1][1], styles["ai_text"]
        )
        self.assertTrue(any(isinstance(item, Table) for item in flowables))
        paragraph_text = " ".join(
            item.getPlainText() for item in flowables if isinstance(item, Paragraph)
        )
        self.assertNotIn("|---", paragraph_text)


if __name__ == "__main__":
    unittest.main()
