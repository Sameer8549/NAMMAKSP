"""
report.py — CrimeLens AI
─────────────────────────
PDF investigation report generation using ReportLab.
Generates professional law-enforcement-style reports saved to /reports.
"""

import os
import logging
from datetime import datetime
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

BASE_DIR     = Path(__file__).resolve().parent.parent
REPORTS_DIR  = BASE_DIR / os.getenv("REPORTS_DIR", "reports")
REPORTS_DIR.mkdir(exist_ok=True)

# ─── Color Palette (Professional Law Enforcement) ────────────────────────────
DARK_BLUE   = colors.HexColor("#1a2744")
MID_BLUE    = colors.HexColor("#2c4a7c")
LIGHT_BLUE  = colors.HexColor("#e8eef7")
ACCENT_RED  = colors.HexColor("#c0392b")
ACCENT_GOLD = colors.HexColor("#b8860b")
TEXT_DARK   = colors.HexColor("#1c1c1c")
TEXT_GRAY   = colors.HexColor("#5a5a5a")
BORDER      = colors.HexColor("#cccccc")
WHITE       = colors.white


# ─── Style Definitions ────────────────────────────────────────────────────────

def _build_styles():
    base = getSampleStyleSheet()
    styles = {
        "cover_title": ParagraphStyle(
            "cover_title", fontSize=22, fontName="Helvetica-Bold",
            textColor=WHITE, alignment=TA_CENTER, spaceAfter=8
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub", fontSize=12, fontName="Helvetica",
            textColor=LIGHT_BLUE, alignment=TA_CENTER, spaceAfter=4
        ),
        "section_header": ParagraphStyle(
            "section_header", fontSize=13, fontName="Helvetica-Bold",
            textColor=WHITE, backColor=MID_BLUE,
            spaceBefore=12, spaceAfter=6,
            leftIndent=6, rightIndent=6, leading=18
        ),
        "body": ParagraphStyle(
            "body", fontSize=10, fontName="Helvetica",
            textColor=TEXT_DARK, spaceAfter=6, leading=14
        ),
        "body_bold": ParagraphStyle(
            "body_bold", fontSize=10, fontName="Helvetica-Bold",
            textColor=TEXT_DARK, spaceAfter=4
        ),
        "label": ParagraphStyle(
            "label", fontSize=9, fontName="Helvetica-Bold",
            textColor=TEXT_GRAY, spaceAfter=2
        ),
        "small": ParagraphStyle(
            "small", fontSize=8, fontName="Helvetica",
            textColor=TEXT_GRAY
        ),
        "footer": ParagraphStyle(
            "footer", fontSize=8, fontName="Helvetica",
            textColor=TEXT_GRAY, alignment=TA_CENTER
        ),
    }
    return styles


# ─── Page Template ────────────────────────────────────────────────────────────

def _header_footer(canvas, doc):
    """Draw header bar and footer on every page."""
    canvas.saveState()
    w, h = A4

    # Header bar
    canvas.setFillColor(DARK_BLUE)
    canvas.rect(0, h - 2*cm, w, 2*cm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(1.5*cm, h - 1.2*cm, "CRIMELENS AI — KARNATAKA POLICE INTELLIGENCE PLATFORM")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(LIGHT_BLUE)
    canvas.drawRightString(w - 1.5*cm, h - 1.2*cm, f"Page {doc.page}  |  CONFIDENTIAL")

    # Footer line
    canvas.setStrokeColor(BORDER)
    canvas.line(1.5*cm, 1.5*cm, w - 1.5*cm, 1.5*cm)
    canvas.setFillColor(TEXT_GRAY)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(1.5*cm, 0.9*cm, f"Generated: {datetime.now().strftime('%d %b %Y %H:%M')}  |  FOR OFFICIAL USE ONLY")
    canvas.drawRightString(w - 1.5*cm, 0.9*cm, "CrimeLens AI v1.0")

    canvas.restoreState()


# ─── Table Helpers ────────────────────────────────────────────────────────────

def _kv_table(data: list[tuple], styles_dict: dict) -> Table:
    """Two-column key-value table for case facts."""
    table_data = [
        [
            Paragraph(k, styles_dict["label"]),
            Paragraph(str(v), styles_dict["body"])
        ]
        for k, v in data
    ]
    t = Table(table_data, colWidths=[5*cm, 11.5*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (0, -1), LIGHT_BLUE),
        ("GRID",        (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN",      (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, colors.HexColor("#f7f9fc")]),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING",   (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
    ]))
    return t


def _data_table(headers: list, rows: list, styles_dict: dict) -> Table:
    """Multi-column data table with styled header row."""
    col_count = len(headers)
    col_width = 16.5*cm / col_count

    header_row = [Paragraph(h, ParagraphStyle(
        "th", fontSize=9, fontName="Helvetica-Bold",
        textColor=WHITE, alignment=TA_CENTER
    )) for h in headers]

    table_data = [header_row]
    for i, row in enumerate(rows):
        table_data.append([
            Paragraph(str(cell or "—"), styles_dict["small"]) for cell in row
        ])

    t = Table(table_data, colWidths=[col_width]*col_count, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  MID_BLUE),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, LIGHT_BLUE]),
        ("GRID",          (0, 0), (-1, -1), 0.5, BORDER),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


# ─── Case Investigation Report ────────────────────────────────────────────────

async def generate_case_report(fir_id: str, case_data: dict, ai_summary: str) -> str:
    """
    Generate a full PDF investigation report for a single FIR.

    Args:
        fir_id:     The FIR identifier
        case_data:  Dict from get_fir_detail()
        ai_summary: AI-generated investigation summary text

    Returns:
        Absolute path to the saved PDF file.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = REPORTS_DIR / f"case_report_{fir_id}_{timestamp}.pdf"
    styles    = _build_styles()

    doc = SimpleDocTemplate(
        str(filename),
        pagesize=A4,
        topMargin=2.5*cm, bottomMargin=2*cm,
        leftMargin=1.5*cm, rightMargin=1.5*cm
    )

    story = []

    # ── Cover Block ──────────────────────────────────────────────────────────
    cover_data = [[Paragraph(
        f"<b>INVESTIGATION REPORT</b><br/><br/>"
        f"Case Reference: {fir_id}<br/>"
        f"Crime Type: {case_data.get('crime_type', 'N/A')}<br/>"
        f"District: {case_data.get('district', 'N/A')}<br/>"
        f"Report Generated: {datetime.now().strftime('%d %B %Y')}",
        styles["cover_title"]
    )]]
    cover_table = Table(cover_data, colWidths=[16.5*cm])
    cover_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), DARK_BLUE),
        ("ALIGN",      (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 20),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
        ("LEFTPADDING",  (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(cover_table)
    story.append(Spacer(1, 0.5*cm))

    # ── Case Facts ───────────────────────────────────────────────────────────
    story.append(Paragraph("1. CASE FACTS", styles["section_header"]))
    case_facts = [
        ("FIR Number",       case_data.get("fir_id", "N/A")),
        ("Crime Type",       case_data.get("crime_type", "N/A")),
        ("Date of Incident", case_data.get("date", "N/A")),
        ("District",         case_data.get("district", "N/A")),
        ("Police Station",   case_data.get("police_station", "N/A")),
        ("Case Status",      case_data.get("status", "N/A")),
        ("GPS Coordinates",  f"Lat: {case_data.get('latitude', 'N/A')}, Lon: {case_data.get('longitude', 'N/A')}"),
    ]
    story.append(_kv_table(case_facts, styles))
    story.append(Spacer(1, 0.3*cm))

    # ── Offender Profile ─────────────────────────────────────────────────────
    story.append(Paragraph("2. ACCUSED / OFFENDER", styles["section_header"]))
    risk_color = {
        "High": ACCENT_RED, "Medium": ACCENT_GOLD, "Low": colors.HexColor("#27ae60")
    }.get(case_data.get("risk_category", "Low"), TEXT_DARK)

    offender_facts = [
        ("Offender ID",      case_data.get("offender_id", "N/A")),
        ("Full Name",        case_data.get("offender_name", "N/A")),
        ("Age",              str(case_data.get("offender_age", "N/A"))),
        ("Gender",           case_data.get("offender_gender", "N/A")),
        ("Risk Category",    case_data.get("risk_category", "N/A")),
        ("Previous FIRs",    str(case_data.get("previous_firs", 0))),
    ]
    story.append(_kv_table(offender_facts, styles))
    story.append(Spacer(1, 0.3*cm))

    # ── Victim Information ───────────────────────────────────────────────────
    story.append(Paragraph("3. VICTIM INFORMATION", styles["section_header"]))
    victim_facts = [
        ("Victim ID",   case_data.get("victim_id", "N/A")),
        ("Full Name",   case_data.get("victim_name", "N/A")),
        ("Age",         str(case_data.get("victim_age", "N/A"))),
        ("Gender",      case_data.get("victim_gender", "N/A")),
    ]
    story.append(_kv_table(victim_facts, styles))
    story.append(Spacer(1, 0.3*cm))

    # ── Related Cases ────────────────────────────────────────────────────────
    related = case_data.get("related_cases", [])
    if related:
        story.append(Paragraph("4. RELATED CASES", styles["section_header"]))
        headers = ["FIR ID", "Crime Type", "Date", "District", "Status", "Connection"]
        rows    = [
            [r.get("fir_id"), r.get("crime_type"), r.get("date"),
             r.get("district"), r.get("status"), r.get("relation")]
            for r in related[:10]
        ]
        story.append(_data_table(headers, rows, styles))
        story.append(Spacer(1, 0.3*cm))

    # ── AI Investigation Summary ──────────────────────────────────────────────
    story.append(Paragraph("5. AI INTELLIGENCE ASSESSMENT", styles["section_header"]))
    story.append(Paragraph(
        "<i>The following assessment was generated by CrimeLens AI based on available FIR data, "
        "offender profiles, and crime pattern analysis. It is an investigative aid and should be "
        "verified independently before operational use.</i>",
        styles["small"]
    ))
    story.append(Spacer(1, 0.2*cm))

    # Format AI summary into paragraphs
    for line in ai_summary.split("\n"):
        line = line.strip()
        if not line:
            story.append(Spacer(1, 0.15*cm))
        elif line.startswith(("1.", "2.", "3.", "4.", "5.", "6.")):
            story.append(Paragraph(f"<b>{line}</b>", styles["body_bold"]))
        else:
            story.append(Paragraph(line, styles["body"]))

    # ── Footer classification ─────────────────────────────────────────────────
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=DARK_BLUE))
    story.append(Paragraph(
        "CLASSIFICATION: FOR OFFICIAL USE ONLY — KARNATAKA POLICE — CRIMELENS AI INTELLIGENCE PLATFORM",
        styles["footer"]
    ))

    # Build PDF
    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)
    logger.info("Report saved: %s", filename)
    return str(filename)


# ─── District Summary Report ──────────────────────────────────────────────────

async def generate_district_report(district: str, stats: list[dict], ai_insights: str) -> str:
    """Generate a district-level crime summary PDF report."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_district = district.replace(" ", "_").replace("/", "-")
    filename = REPORTS_DIR / f"district_report_{safe_district}_{timestamp}.pdf"
    styles   = _build_styles()

    doc = SimpleDocTemplate(
        str(filename), pagesize=A4,
        topMargin=2.5*cm, bottomMargin=2*cm,
        leftMargin=1.5*cm, rightMargin=1.5*cm
    )
    story = []

    # Cover
    cover_data = [[Paragraph(
        f"<b>DISTRICT CRIME REPORT</b><br/><br/>"
        f"District: {district}<br/>"
        f"Report Date: {datetime.now().strftime('%d %B %Y')}",
        styles["cover_title"]
    )]]
    cover_table = Table(cover_data, colWidths=[16.5*cm])
    cover_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), DARK_BLUE),
        ("ALIGN",      (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 20),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
    ]))
    story.append(cover_table)
    story.append(Spacer(1, 0.5*cm))

    # Stats Table
    story.append(Paragraph("CRIME STATISTICS BY TYPE", styles["section_header"]))
    if stats:
        headers = list(stats[0].keys())
        rows    = [[str(row.get(h, "")) for h in headers] for row in stats]
        story.append(_data_table(headers, rows, styles))

    story.append(Spacer(1, 0.4*cm))

    # AI Insights
    story.append(Paragraph("AI INTELLIGENCE INSIGHTS", styles["section_header"]))
    for line in ai_insights.split("\n"):
        line = line.strip()
        if not line:
            story.append(Spacer(1, 0.1*cm))
        else:
            story.append(Paragraph(line, styles["body"]))

    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=DARK_BLUE))
    story.append(Paragraph(
        "CLASSIFICATION: FOR OFFICIAL USE ONLY — KARNATAKA POLICE — CRIMELENS AI",
        styles["footer"]
    ))

    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)
    logger.info("District report saved: %s", filename)
    return str(filename)
