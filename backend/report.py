"""
report.py — NAMMA KSP
─────────────────────────
Production PDF report generation using ReportLab.
No browser dependency — pure Python.
Generates bilingual (English + Kannada) KSP-style investigation reports.
"""

import os
import io
import logging
from datetime import datetime
from pathlib import Path
import qrcode

from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer,
    HRFlowable, Image as RLImage, KeepTogether
)
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

logger = logging.getLogger(__name__)

BASE_DIR    = Path(__file__).resolve().parent.parent
REPORTS_DIR = BASE_DIR / os.getenv("REPORTS_DIR", "reports")
REPORTS_DIR.mkdir(exist_ok=True)
BACKEND_DIR = BASE_DIR / "backend"
FRONTEND_DIR = BASE_DIR / "frontend"

# ─── Font Registration for Kannada support ─────────────────────────────────
FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

try:
    font_path = os.path.join(os.environ.get('SystemRoot', 'C:/Windows'), 'Fonts', 'Nirmala.ttc')
    if os.path.exists(font_path):
        pdfmetrics.registerFont(TTFont('Nirmala', font_path, subfontIndex=0))
        pdfmetrics.registerFont(TTFont('Nirmala-Bold', font_path, subfontIndex=1))
        addMapping('Nirmala', 0, 0, 'Nirmala')
        addMapping('Nirmala', 1, 0, 'Nirmala-Bold')
        FONT_REGULAR = "Nirmala"
        FONT_BOLD = "Nirmala-Bold"
        logger.info("Nirmala UI font registered successfully for Kannada support.")
    else:
        logger.warning("Nirmala.ttc font not found. Falling back to Helvetica.")
except Exception as e:
    logger.error("Failed to register Nirmala font: %s", e)

# ─── Colors ──────────────────────────────────────────────────────────────────
BLACK = colors.black
WHITE = colors.white
KSP_RED = colors.HexColor("#B91C1C")

# ─── Custom Canvas with two-pass for footer and watermark ───────────────────
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, page_count):
        self.saveState()
        w, h = A4

        # 1. Background Watermark (Karnataka State Emblem)
        emblem_path = FRONTEND_DIR / "assets" / "namma_ksp_logo_light.png"
        if not emblem_path.exists():
            emblem_path = BACKEND_DIR / "karnataka_emblem.png"
        if not emblem_path.exists():
            emblem_path = FRONTEND_DIR / "assets" / "ksp_logo.png"

        if emblem_path.exists():
            self.saveState()
            self.setFillAlpha(0.06)  # Opacity 0.05 - 0.08
            self.setStrokeAlpha(0.06)
            wm_w = 9.0 * cm
            wm_h = 9.0 * cm
            x = (w - wm_w) / 2
            y = (h - wm_h) / 2
            self.drawImage(str(emblem_path), x, y, width=wm_w, height=wm_h, mask='auto')
            self.restoreState()

        # 2. Footer centered showing only "Page X of Y" (no lines, no other text)
        self.setFont(FONT_REGULAR, 9)
        self.setFillColor(BLACK)
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawCentredString(w / 2.0, 0.6 * cm, footer_text)
        self.restoreState()


# ─── Document Template Setup ────────────────────────────────────────────────
def _doc(path: Path, title: str):
    return SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=1.2*cm, rightMargin=1.2*cm,
        topMargin=0.8*cm,  bottomMargin=0.8*cm,
        title=title,
        author="NAMMA KSP — Karnataka State Police",
    )


# ─── Styles Builder ─────────────────────────────────────────────────────────
def _styles():
    s = {}
    def add(name, **kw):
        s[name] = ParagraphStyle(name, **kw)

    add("title",       fontName=FONT_BOLD,   fontSize=11, textColor=BLACK,
                       spaceAfter=1, alignment=TA_CENTER)
    add("subtitle",    fontName=FONT_REGULAR, fontSize=8.5,  textColor=BLACK,
                       spaceAfter=1, alignment=TA_CENTER)
    add("section",     fontName=FONT_BOLD,   fontSize=9, textColor=BLACK,
                       spaceBefore=5, spaceAfter=2)
    add("body",        fontName=FONT_REGULAR, fontSize=8, textColor=BLACK,
                       leading=11)
    add("label",       fontName=FONT_BOLD,   fontSize=8, textColor=BLACK)
    add("value",       fontName=FONT_REGULAR, fontSize=8, textColor=BLACK)
    add("ai_text",     fontName=FONT_REGULAR, fontSize=8, textColor=BLACK,
                       leading=11.5)
    add("disclaimer",  fontName=FONT_REGULAR, fontSize=7.5,   textColor=BLACK,
                       leading=10.5)
    add("red_bold",    fontName=FONT_BOLD,   fontSize=7.5,   textColor=KSP_RED)
    add("meta_l",      fontName=FONT_REGULAR, fontSize=8, textColor=BLACK)
    add("meta_c",      fontName=FONT_BOLD,   fontSize=8, textColor=BLACK, alignment=TA_CENTER)
    add("meta_r",      fontName=FONT_REGULAR, fontSize=8, textColor=BLACK, alignment=TA_RIGHT)
    return s


# ─── QR Code Generator ──────────────────────────────────────────────────────
def _generate_qr_code(data: str) -> RLImage:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=0,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    
    return RLImage(buf, width=2.0*cm, height=2.0*cm)


# ─── Header Block Builder ───────────────────────────────────────────────────
def _header_block(serial_no: str, doc_type_en: str, doc_type_kn: str, sub_title: str = "[NAMMA KSP Intelligence Report]", qr_data: str = None) -> list:
    emblem_path = FRONTEND_DIR / "assets" / "namma_ksp_logo_light.png"
    if not emblem_path.exists():
        emblem_path = BACKEND_DIR / "karnataka_emblem.png"
    if not emblem_path.exists():
        emblem_path = FRONTEND_DIR / "assets" / "ksp_logo.png"

    emblem_img = None
    if emblem_path.exists():
        emblem_img = RLImage(str(emblem_path), width=3.0*cm, height=3.0*cm)
        emblem_img.hAlign = 'CENTER'

    center_content = []
    if emblem_img:
        center_content.append(emblem_img)
        center_content.append(Spacer(1, 2))

    title_kn = Paragraph("ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್", ParagraphStyle("h_kn", fontName=FONT_BOLD, fontSize=10.5, leading=13, alignment=TA_CENTER))
    subtitle_law = Paragraph(sub_title, ParagraphStyle("h_sub", fontName=FONT_BOLD, fontSize=7.5, leading=9, alignment=TA_CENTER))
    doc_title_en = Paragraph(doc_type_en, ParagraphStyle("h_en", fontName=FONT_BOLD, fontSize=11, leading=13, alignment=TA_CENTER))
    doc_title_kn = Paragraph(doc_type_kn, ParagraphStyle("h_title_kn", fontName=FONT_BOLD, fontSize=10, leading=12, alignment=TA_CENTER))
    serial_para = Paragraph(f"Serial No. / ಕ್ರಮ ಸಂಖ್ಯೆ: {serial_no}", ParagraphStyle("h_ser", fontName=FONT_REGULAR, fontSize=8.5, leading=10, alignment=TA_CENTER))

    center_content.extend([title_kn, subtitle_law, doc_title_en, doc_title_kn, serial_para])

    qr_img = None
    if qr_data:
        try:
            qr_img = _generate_qr_code(qr_data)
            qr_img.hAlign = 'RIGHT'
        except Exception as e:
            logger.error("Failed to generate QR code: %s", e)
            qr_img = Spacer(1, 1)
    else:
        qr_img = Spacer(1, 1)

    header_table = Table(
        [["", center_content, qr_img]],
        colWidths=[2.2*cm, 14.2*cm, 2.2*cm]
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("ALIGN", (0,0), (-1,-1), "CENTER"),
        ("BOTTOMPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING", (0,0), (-1,-1), 0),
    ]))

    hr = HRFlowable(width="100%", thickness=0.8, color=colors.black, spaceBefore=4, spaceAfter=2)
    return [header_table, hr]


# ─── Meta Bar Builder ───────────────────────────────────────────────────────
def _meta_bar(styles, left: str, center: str, right: str) -> list:
    t = Table([[
        Paragraph(left,   styles["meta_l"]),
        Paragraph(center, styles["meta_c"]),
        Paragraph(right,  styles["meta_r"]),
    ]], colWidths=[6.2*cm, 6.2*cm, 6.2*cm])
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("BOTTOMPADDING", (0,0), (-1,-1), 2),
        ("TOPPADDING", (0,0), (-1,-1), 2),
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
    ]))
    hr_below = HRFlowable(width="100%", thickness=0.8, color=colors.black, spaceBefore=2, spaceAfter=4)
    return [t, hr_below]


# ─── Section Heading Builder ────────────────────────────────────────────────
def _section(styles, text: str) -> list:
    return [
        Spacer(1, 0.08*cm),
        Paragraph(text, styles["section"]),
        Spacer(1, 0.04*cm),
    ]


# ─── 2-column key-value borderless table builder ────────────────────────────
def _kv_table(rows: list[tuple]) -> Table:
    letters = "abcdefghijklmnopqrstuvwxyz"
    data = []
    for idx in range(0, len(rows), 2):
        row = []
        
        # Left item
        label1, val1 = rows[idx]
        letter1 = letters[idx]
        text1 = f"<b>{letter1}. {label1}:</b> {val1 if val1 is not None else 'N/A'}"
        row.append(Paragraph(text1, ParagraphStyle(
            f"kv_p_{idx}_a", fontName=FONT_REGULAR, fontSize=8, textColor=BLACK, leading=11
        )))
        
        # Right item
        if idx + 1 < len(rows):
            label2, val2 = rows[idx+1]
            letter2 = letters[idx+1]
            text2 = f"<b>{letter2}. {label2}:</b> {val2 if val2 is not None else 'N/A'}"
            row.append(Paragraph(text2, ParagraphStyle(
                f"kv_p_{idx}_b", fontName=FONT_REGULAR, fontSize=8, textColor=BLACK, leading=11
            )))
        else:
            row.append(Paragraph("", ParagraphStyle("empty")))
            
        data.append(row)

    t = Table(data, colWidths=[9.3*cm, 9.3*cm])
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BOTTOMPADDING", (0,0), (-1,-1), 2),
        ("TOPPADDING", (0,0), (-1,-1), 2),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
    ]))
    return t


# ─── Standard Table Builder ─────────────────────────────────────────────────
def _std_table(headers: list, rows: list, col_widths: list = None) -> Table:
    header_row = [Paragraph(f"<b>{h}</b>", ParagraphStyle(
        f"th_{idx}", fontName=FONT_BOLD, fontSize=7.5, textColor=BLACK,
        alignment=TA_LEFT)) for idx, h in enumerate(headers)]

    body_rows = []
    for r_idx, r in enumerate(rows):
        body_rows.append([Paragraph(str(c) if c is not None else "—", ParagraphStyle(
            f"td_{r_idx}_{c_idx}", fontName=FONT_REGULAR, fontSize=7.5, textColor=BLACK,
            alignment=TA_LEFT)) for c_idx, c in enumerate(r)])

    data = [header_row] + body_rows
    cw = col_widths or [18.6*cm / len(headers)] * len(headers)

    t = Table(data, colWidths=cw, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  colors.HexColor("#F3F4F6")),
        ("BOX",           (0,0), (-1,-1), 0.5, colors.black),
        ("INNERGRID",     (0,0), (-1,-1), 0.5, colors.black),
        ("PADDING",       (0,0), (-1,-1), 3),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
    ]))
    return t


import re

def _format_markdown_to_html(text: str) -> str:
    # Replace **text** with <b>text</b>
    parts = text.split("**")
    html_parts = []
    for i, part in enumerate(parts):
        if i % 2 == 1:
            html_parts.append(f"<b>{part}</b>")
        else:
            html_parts.append(part)
    res = "".join(html_parts)
    
    # Replace *text* with <i>text</i>
    parts2 = res.split("*")
    html_parts2 = []
    for i, part in enumerate(parts2):
        if i % 2 == 1:
            html_parts2.append(f"<i>{part}</i>")
        else:
            html_parts2.append(part)
    return "".join(html_parts2)

def _format_chat_message_to_flowables(content: str, style) -> list:
    flowables = []
    lines = content.split("\n")
    
    for idx, line in enumerate(lines):
        line = line.strip()
        if not line:
            flowables.append(Spacer(1, 3))
            continue
            
        # Match bullet points or numbered lists
        is_bullet = line.startswith("•") or line.startswith("-") or line.startswith("* ")
        is_numbered = re.match(r'^\d+\.\s', line) is not None
        
        if is_bullet or is_numbered:
            # Clean list marker
            if is_bullet:
                text_content = line.lstrip("•-* ").strip()
            else:
                text_content = re.sub(r'^\d+\.\s', '', line).strip()
                
            # Escape HTML characters to prevent ReportLab XML errors
            escaped_text = text_content.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            formatted_text = _format_markdown_to_html(escaped_text)
            
            # Create a localized style to indent lists nicely
            bullet_style = ParagraphStyle(
                name=f"bullet_{idx}_{id(content)}",
                parent=style,
                leftIndent=12,
                firstLineIndent=-8,
                spaceAfter=2
            )
            marker = "•" if is_bullet else "1."
            flowables.append(Paragraph(f"{marker} {formatted_text}", bullet_style))
        else:
            escaped_text = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            formatted_text = _format_markdown_to_html(escaped_text)
            flowables.append(Paragraph(formatted_text, style))
            flowables.append(Spacer(1, 2))
            
    return flowables

def _parse_ai_summary(summary: str) -> list:
    # Find all matches of **Heading**
    pattern = r'\*\*([^*]+?)\*\*'
    matches = list(re.finditer(pattern, summary))
    
    if not matches:
        return [("Intro", summary)]
        
    sections = []
    
    # Text before the first heading
    first_start = matches[0].start()
    if first_start > 0:
        intro_text = summary[:first_start].strip()
        if intro_text:
            sections.append(("Intro", intro_text))
            
    for idx, match in enumerate(matches):
        heading = match.group(1).strip()
        start_pos = match.end()
        end_pos = matches[idx+1].start() if idx + 1 < len(matches) else len(summary)
        body = summary[start_pos:end_pos].strip()
        sections.append((heading, body))
        
    return sections

def _ai_box(styles, summary: str) -> Table:
    label = Paragraph(
        "<b>AI Intelligence Assessment / ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಮೌಲ್ಯಮಾಪನ</b>",
        ParagraphStyle("ai_hd", fontName=FONT_BOLD, fontSize=9,
                       textColor=BLACK, spaceAfter=4)
    )
    disclaimer = Paragraph(
        "<i>Generated by NAMMA KSP as an investigative aid. Verify independently before operational use.</i>",
        ParagraphStyle("ai_dis", fontName=FONT_REGULAR, fontSize=7.5,
                       textColor=colors.HexColor("#5A5A5A"), spaceAfter=6)
    )
    
    content = [label, disclaimer]
    
    # Parse summary into sections
    sections = _parse_ai_summary(summary)
    
    for heading, body in sections:
        if heading == "Intro":
            html_body = _format_markdown_to_html(body)
            content.append(Paragraph(html_body, styles["ai_text"]))
            content.append(Spacer(1, 4))
        else:
            # Heading paragraph (bold black text)
            hd_p = Paragraph(f"<b>{heading}</b>", ParagraphStyle(
                f"ai_sec_hd_{re.sub(r'[^a-zA-Z0-9]', '_', heading)[:10]}", fontName=FONT_BOLD, fontSize=8.5, textColor=BLACK,
                spaceBefore=6, spaceAfter=2
            ))
            # Body paragraph with HTML styling
            html_body = _format_markdown_to_html(body)
            body_p = Paragraph(html_body, styles["ai_text"])
            
            content.append(hd_p)
            content.append(body_p)
            content.append(Spacer(1, 4))
            
    t = Table([[content]], colWidths=[18.6*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",  (0,0), (-1,-1), colors.HexColor("#F9FAFB")),
        ("BOX",         (0,0), (-1,-1), 0.5, colors.black),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("RIGHTPADDING",(0,0), (-1,-1), 10),
        ("TOPPADDING",  (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0),(-1,-1), 5),
    ]))
    return t



# ─── Disclaimer Block Builder ───────────────────────────────────────────────
def _disclaimer_block() -> list:
    note_title = Paragraph("<b>Note/ಸೂಚನೆ:</b>", ParagraphStyle("d_note_t", fontName=FONT_BOLD, fontSize=8.5, textColor=BLACK, spaceBefore=10, spaceAfter=2))
    note_val = Paragraph("1. This is digitally signed report / ಇದು ಡಿಜಿಟಲ್ ಸಹಿಯುಳ್ಳ ವರದಿಯಾಗಿದೆ.", ParagraphStyle("d_note_v", fontName=FONT_REGULAR, fontSize=8, textColor=BLACK, leading=11, leftIndent=10))
    
    disc_title = Paragraph("<b>Disclaimer / ಹಕ್ಕುತ್ಯಾಗ:</b>", ParagraphStyle("d_disc_t", fontName=FONT_BOLD, fontSize=8.5, textColor=BLACK, spaceBefore=8, spaceAfter=2))
    disc_val1 = Paragraph("1. This is an AI-generated intelligence report to assist official investigation. / ಇದು ಅಧಿಕೃತ ತನಿಖೆಗೆ ಸಹಾಯ ಮಾಡಲು ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆಯಿಂದ ರಚಿಸಲಾದ ವರದಿಯಾಗಿದೆ.", ParagraphStyle("d_disc_v1", fontName=FONT_REGULAR, fontSize=8, textColor=BLACK, leading=11, leftIndent=10))
    disc_val2 = Paragraph("2. Content must be verified independently before operational or legal use. / ವರದಿಯ ವಿಷಯವನ್ನು ಅಧಿಕೃತ ಅಥವಾ ಕಾನೂನು ಬಳಕೆಗೆ ಮೊದಲು ಸ್ವತಂತ್ರವಾಗಿ ಪರಿಶೀಲಿಸಲ್ಪಡಬೇಕು.", ParagraphStyle("d_disc_v2", fontName=FONT_REGULAR, fontSize=8, textColor=BLACK, leading=11, leftIndent=10))
    disc_val3 = Paragraph("3. Unauthorized sharing or fabrication of this report is a punishable offence / ಈ ವರದಿಯನ್ನು ಅನಧಿಕೃತವಾಗಿ ಹಂಚಿಕೊಳ್ಳುವುದು ಅಥವಾ ನಕಲಿ ಮಾಡುವುದು ಶಿಕ್ಷಾರ್ಹ ಅಪರಾಧವಾಗಿದೆ.", ParagraphStyle("d_disc_v3", fontName=FONT_BOLD, fontSize=8, textColor=KSP_RED, leading=11, leftIndent=10))
    
    return [
        Spacer(1, 0.4*cm),
        note_title,
        note_val,
        Spacer(1, 4),
        disc_title,
        disc_val1,
        disc_val2,
        disc_val3,
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# CASE INVESTIGATION REPORT
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_case_report(fir_id: str, case_data: dict, ai_summary: str) -> str:
    """Generate a PDF case investigation report. Returns path to the PDF file."""
    timestamp    = datetime.now().strftime("%Y%m%d_%H%M%S")
    pdf_path     = REPORTS_DIR / f"case_{fir_id}_{timestamp}.pdf"
    styles       = _styles()

    doc   = _doc(pdf_path, f"Case Investigation Report — {fir_id}")
    story = []

    # ── Header ──────────────────────────────────────────────────────────────
    story += _header_block(
        serial_no=fir_id,
        doc_type_en="Case Investigation Report",
        doc_type_kn="ಅಪರಾಧ ತನಿಖಾ ವರದಿ",
        sub_title="[NAMMA KSP Intelligence Report]",
        qr_data=f"FIR:{fir_id}|District:{case_data.get('district','N/A')}|Date:{case_data.get('date','N/A')}"
    )

    # ── Meta bar ─────────────────────────────────────────────────────────────
    story += _meta_bar(
        styles,
        f"<b>Police Unit:</b> {case_data.get('district','N/A')}",
        f"<b>Report No:</b> {fir_id}",
        f"<b>Date:</b> {case_data.get('date','N/A')}"
    )

    # ── 1. Case Facts ─────────────────────────────────────────────────────────
    story += _section(styles, "1. Case Facts / ಪ್ರಕರಣದ ಸಂಗತಿಗಳು")
    story.append(_kv_table([
        ("FIR Number / ಎಫ್.ಐ.ಆರ್",   case_data.get("fir_id")),
        ("Crime Type / ಅಪರಾಧ",        case_data.get("crime_type")),
        ("Incident Date / ದಿನಾಂಕ",    case_data.get("date")),
        ("Status / ಸ್ಥಿತಿ",          case_data.get("status")),
        ("Police Station / ಠಾಣೆ",    case_data.get("police_station") or case_data.get("loc_station")),
        ("District / ಜಿಲ್ಲೆ",        case_data.get("district")),
        ("Latitude",                   case_data.get("latitude")),
        ("Longitude",                  case_data.get("longitude")),
    ]))

    # ── 2. Accused Details ────────────────────────────────────────────────────
    story += _section(styles, "2. Accused Details / ಆರೋಪಿಯ ವಿವರಗಳು")
    story.append(_kv_table([
        ("Name / ಹೆಸರು",              case_data.get("offender_name")),
        ("Offender ID / ಆರೋಪಿ ID",   case_data.get("offender_id")),
        ("Age / ವಯಸ್ಸು",             case_data.get("offender_age")),
        ("Gender / ಲಿಂಗ",            case_data.get("offender_gender")),
        ("Risk Category / ಅಪಾಯ",     case_data.get("risk_category")),
        ("Previous FIRs / ಹಿಂದಿನ",   case_data.get("previous_firs", 0)),
    ]))

    # ── 3. Victim Details ─────────────────────────────────────────────────────
    story += _section(styles, "3. Victim Details / ಸಂತ್ರಸ್ತರ ವಿವರಗಳು")
    story.append(_kv_table([
        ("Name / ಹೆಸರು",              case_data.get("victim_name")),
        ("Victim ID / ಸಂತ್ರಸ್ತ ID",  case_data.get("victim_id")),
        ("Age / ವಯಸ್ಸು",             case_data.get("victim_age")),
        ("Gender / ಲಿಂಗ",            case_data.get("victim_gender")),
    ]))

    # ── 4. Related Cases ──────────────────────────────────────────────────────
    related = case_data.get("related_cases", [])
    if related:
        story += _section(styles, "4. Related Cases / ಸಂಬಂಧಿತ ಪ್ರಕರಣಗಳು")
        rows = [
            (r.get("fir_id"), r.get("crime_type"), r.get("date"), r.get("status"), r.get("relation"))
            for r in related[:4]
        ]
        story.append(_std_table(
            ["FIR ID", "Crime Type / ಅಪರಾಧ", "Date / ದಿನಾಂಕ", "Status / ಸ್ಥಿತಿ", "Connection / ಸಂಬಂಧ"],
            rows,
            [3.0*cm, 4.5*cm, 2.5*cm, 3.5*cm, 4.5*cm]
        ))

    # ── 5. AI Assessment ─────────────────────────────────────────────────────
    story += _section(styles, "5. AI Intelligence Assessment / ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಮೌಲ್ಯಮಾಪನ")
    story.append(_ai_box(styles, ai_summary))

    # ── Disclaimers ───────────────────────────────────────────────────────────
    story += _disclaimer_block()

    doc.build(story, canvasmaker=NumberedCanvas)
    logger.info("Case report generated: %s", pdf_path)
    return str(pdf_path)


# ═══════════════════════════════════════════════════════════════════════════════
# DISTRICT SUMMARY REPORT
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_district_report(district: str, stats: list[dict], ai_insights: str) -> str:
    """Generate a district-level crime summary PDF. Returns path to PDF."""
    timestamp  = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe       = district.replace(" ", "_").replace("/", "-")
    pdf_path   = REPORTS_DIR / f"district_{safe}_{timestamp}.pdf"
    styles     = _styles()

    doc   = _doc(pdf_path, f"District Crime Report — {district}")
    story = []

    # ── Header ──────────────────────────────────────────────────────────────
    story += _header_block(
        serial_no=f"DIST-{safe}",
        doc_type_en="District Crime Report",
        doc_type_kn="ಜಿಲ್ಲಾ ಅಪರಾಧ ವಿಶ್ಲೇಷಣಾ ವರದಿ",
        sub_title="[NAMMA KSP Intelligence Report]",
        qr_data=f"District:{district}|Date:{datetime.now().strftime('%d/%m/%Y')}"
    )

    # ── Meta bar ─────────────────────────────────────────────────────────────
    story += _meta_bar(
        styles,
        "<b>Police Unit:</b> Karnataka Police",
        f"<b>District:</b> {district}",
        f"<b>Date:</b> {datetime.now().strftime('%d/%m/%Y')}"
    )

    # ── 1. Crime Statistics ───────────────────────────────────────────────────
    story += _section(styles, "1. Crime Statistics by Type / ಅಪರಾಧ ವಿಧದ ಅಂಕಿಅಂಶಗಳು")
    if stats:
        rows = [
            (r.get("district", district), r.get("total_crimes", 0),
             r.get("open_cases", 0), r.get("closed_cases", 0))
            for r in stats[:20]
        ]
        story.append(_std_table(
            ["District / ಜಿಲ್ಲೆ", "Total Crimes / ಒಟ್ಟು", "Open / ಸಕ್ರಿಯ", "Closed / ಮುಚ್ಚಿದ"],
            rows,
            [6.5*cm, 4.0*cm, 3.5*cm, 4.0*cm]
        ))
    else:
        story.append(Paragraph("No crime statistics available for this district.", styles["body"]))

    story.append(Spacer(1, 0.3*cm))

    # ── 2. AI Insights ────────────────────────────────────────────────────────
    story += _section(styles, "2. AI Intelligence Insights / ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ವಿಶ್ಲೇಷಣೆ")
    story.append(_ai_box(styles, ai_insights))

    # ── Disclaimers ───────────────────────────────────────────────────────────
    story += _disclaimer_block()

    doc.build(story, canvasmaker=NumberedCanvas)
    logger.info("District report generated: %s", pdf_path)
    return str(pdf_path)


# ═══════════════════════════════════════════════════════════════════════════════
# CHAT LOG EXPORT REPORT
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_chat_log_report(session_id: str, messages: list[dict]) -> str:
    """Generate a PDF export of an AI chat session. Returns path to PDF."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    pdf_path  = REPORTS_DIR / f"chat_{session_id}_{timestamp}.pdf"
    styles    = _styles()

    doc   = _doc(pdf_path, f"AI Chat Log — {session_id}")
    story = []

    # ── Header ──────────────────────────────────────────────────────────────
    story += _header_block(
        serial_no=session_id,
        doc_type_en="AI Chat Log Export",
        doc_type_kn="ಎಐ ಚಾಟ್ ಲಾಗ್ ರಫ್ತು",
        sub_title="[NAMMA KSP Assistant Log]",
        qr_data=f"Session:{session_id}|Messages:{len(messages)}"
    )

    # ── Meta bar ─────────────────────────────────────────────────────────────
    story += _meta_bar(
        styles,
        f"<b>Session:</b> {session_id}",
        f"<b>Messages:</b> {len(messages)}",
        f"<b>Exported:</b> {datetime.now().strftime('%d/%m/%Y %H:%M')}"
    )

    # ── Conversation Transcript ──────────────────────────────────────────────
    story += _section(styles, "Conversation Transcript / ಸಂವಾದ ಪ್ರತಿಲಿಪಿ")

    user_style = ParagraphStyle("user_msg", fontName=FONT_BOLD, fontSize=8.5,
                                 textColor=BLACK, leading=13)
    ai_style   = ParagraphStyle("ai_msg",   fontName=FONT_REGULAR,       fontSize=8.5,
                                 textColor=BLACK, leading=13)

    for i, msg in enumerate(messages):
        role    = msg.get("role", "user")
        content = msg.get("content", "")
        label   = "You" if role == "user" else "NAMMA KSP"
        bg      = colors.HexColor("#F9FAFB") if role == "user" else colors.HexColor("#FFFFFF")
        st      = user_style if role == "user" else ai_style

        msg_flowables = _format_chat_message_to_flowables(content, st)
        lbl_para = Paragraph(f"<b>{label}</b>", ParagraphStyle(
            f"lbl_{i}", fontName=FONT_BOLD, fontSize=7.5,
            textColor=colors.HexColor("#6B7280")))

        cell = [lbl_para, Spacer(1, 2)] + msg_flowables
        t = Table([[cell]], colWidths=[18.0*cm])
        t.setStyle(TableStyle([
            ("BACKGROUND",  (0,0), (-1,-1), bg),
            ("BOX",         (0,0), (-1,-1), 0.5, colors.black),
            ("PADDING",     (0,0), (-1,-1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.2*cm))

    # ── Disclaimers ───────────────────────────────────────────────────────────
    story += _disclaimer_block()

    doc.build(story, canvasmaker=NumberedCanvas)
    logger.info("Chat log report generated: %s", pdf_path)
    return str(pdf_path)


# ═══════════════════════════════════════════════════════════════════════════════
# OFFENDER PROFILE DOSSIER REPORT
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_offender_report(offender_id: str, data: dict) -> str:
    """Generate a PDF offender dossier report. Returns path to PDF."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    pdf_path  = REPORTS_DIR / f"offender_{offender_id}_{timestamp}.pdf"
    styles    = _styles()

    doc   = _doc(pdf_path, f"Offender Profile Dossier — {offender_id}")
    story = []

    # ── Header ──────────────────────────────────────────────────────────────
    story += _header_block(
        serial_no=offender_id,
        doc_type_en="Offender Profile Dossier",
        doc_type_kn="ಆರೋಪಿ ವಿವರಗಳ ವರದಿ",
        sub_title="[NAMMA KSP Offender Profile]",
        qr_data=f"Offender:{offender_id}|Risk:{data.get('risk_category','N/A')}"
    )

    # ── Meta bar ─────────────────────────────────────────────────────────────
    story += _meta_bar(
        styles,
        f"<b>Offender:</b> {data.get('name','N/A')}",
        f"<b>ID:</b> {offender_id}",
        f"<b>Risk Level:</b> {data.get('risk_category','N/A')}"
    )

    # ── 1. Profile Facts ──────────────────────────────────────────────────────
    story += _section(styles, "1. Profile Facts / ಆರೋಪಿಯ ವಿವರಗಳು")
    story.append(_kv_table([
        ("Name / ಹೆಸರು",              data.get("name")),
        ("Offender ID / ಆರೋಪಿ ID",   offender_id),
        ("Age / ವಯಸ್ಸು",             data.get("age")),
        ("Gender / ಲಿಂಗ",            data.get("gender")),
        ("District / ಜಿಲ್ಲೆ",        data.get("district")),
        ("Risk Score / ಅಪಾಯ ಸ್ಕೋರ್", f"{data.get('risk_score', 0)}/100"),
        ("Risk Category / ವರ್ಗ",     data.get("risk_category")),
        ("Prior FIRs / ಒಟ್ಟು ಪ್ರಕರಣ", data.get("previous_firs", 0)),
    ]))

    # ── 2. Risk Factors ───────────────────────────────────────────────────────
    factors = data.get("risk_factors", [])
    if factors:
        story += _section(styles, "2. AI Risk Explainability / ಅಪಾಯದ ಕಾರಣಗಳು")
        for f in factors:
            story.append(Paragraph(f"• {f}", styles["body"]))
            story.append(Spacer(1, 3))

    # ── 3. FIR History ────────────────────────────────────────────────────────
    firs = data.get("fir_history", [])
    if firs:
        story += _section(styles, "3. Crime Record History / ಅಪರಾಧ ಇತಿಹಾಸ")
        rows = [
            (f.get("fir_id"), f.get("crime_type"), f.get("date"), f.get("status"), f.get("victim_name", "—"))
            for f in firs[:12]
        ]
        story.append(_std_table(
            ["FIR ID", "Crime Type / ಅಪರಾಧ", "Date / ದಿನಾಂಕ", "Status / ಸ್ಥಿತಿ", "Victim / ಸಂತ್ರಸ್ತರು"],
            rows,
            [3.5*cm, 4.0*cm, 2.5*cm, 3.5*cm, 4.5*cm]
        ))

    # ── Disclaimers ───────────────────────────────────────────────────────────
    story += _disclaimer_block()

    doc.build(story, canvasmaker=NumberedCanvas)
    logger.info("Offender report generated: %s", pdf_path)
    return str(pdf_path)


# ═══════════════════════════════════════════════════════════════════════════════
# NETWORK GRAPH EXPORT REPORT
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_network_pdf_report(img_bytes: bytes, district: str, crime_type: str) -> str:
    """Generate a PDF containing the network graph image. Returns path to PDF."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    pdf_path  = REPORTS_DIR / f"network_{timestamp}.pdf"
    styles    = _styles()

    doc   = _doc(pdf_path, f"Criminal Network Dossier — {district or 'All'}")
    story = []

    # ── Header ──────────────────────────────────────────────────────────────
    story += _header_block(
        serial_no="NETWORK-INTEL",
        doc_type_en="Criminal Network Graph",
        doc_type_kn="ಕ್ರಿಮಿನಲ್ ನೆಟ್‌ವರ್ಕ್ ನಕ್ಷೆ",
        sub_title="[NAMMA KSP Network Intelligence]",
        qr_data=f"Network|District:{district or 'All'}|Crime:{crime_type or 'All'}"
    )

    # ── Meta bar ─────────────────────────────────────────────────────────────
    story += _meta_bar(
        styles,
        f"<b>District:</b> {district or 'All Districts'}",
        f"<b>Crime Type:</b> {crime_type or 'All Crimes'}",
        f"<b>Generated:</b> {datetime.now().strftime('%d/%m/%Y')}"
    )

    # ── Network Visualization Graph ───────────────────────────────────────────
    img_data = io.BytesIO(img_bytes)
    rl_img = RLImage(img_data, width=17*cm, height=11*cm)
    story.append(KeepTogether([
        Paragraph("<b>1. Network Visualization Graph / ನೆಟ್‌ವರ್ಕ್ ದೃಶ್ಯೀಕರಣ</b>", styles["section"]),
        Spacer(1, 0.2*cm),
        rl_img,
        Spacer(1, 0.4*cm)
    ]))

    # ── Disclaimers ───────────────────────────────────────────────────────────
    story += _disclaimer_block()

    doc.build(story, canvasmaker=NumberedCanvas)
    logger.info("Network report generated: %s", pdf_path)
    return str(pdf_path)


async def generate_recommendations_report(district: str = None, crime_type: str = None, recommendations: str = "") -> str:
    """Generate a PDF report for AI Investigation Recommendations. Returns path to PDF."""
    from typing import Optional
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_dist = district.replace(" ", "_").replace("/", "-") if district else "All_Districts"
    safe_crime = crime_type.replace(" ", "_").replace("/", "-") if crime_type else "All_Crimes"
    pdf_path  = REPORTS_DIR / f"recommendations_{safe_dist}_{safe_crime}_{timestamp}.pdf"
    styles    = _styles()

    doc   = _doc(pdf_path, f"AI Recommendations Report")
    story = []

    # ── Header ──────────────────────────────────────────────────────────────
    story += _header_block(
        serial_no=f"REC-{safe_dist[:4].upper()}-{safe_crime[:4].upper()}",
        doc_type_en="AI Investigation Recommendations",
        doc_type_kn="ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ತನಿಖಾ ಶಿಫಾರಸುಗಳು",
        sub_title="[NAMMA KSP Strategic Recommendations]",
        qr_data=f"Recs|Dist:{district or 'All'}|Crime:{crime_type or 'All'}|Date:{datetime.now().strftime('%d/%m/%Y')}"
    )

    # ── Meta bar ─────────────────────────────────────────────────────────────
    story += _meta_bar(
        styles,
        f"<b>District:</b> {district or 'All Districts'}",
        f"<b>Crime Type:</b> {crime_type or 'All Crimes'}",
        f"<b>Generated:</b> {datetime.now().strftime('%d/%m/%Y')}"
    )

    # ── 1. Focus Area ────────────────────────────────────────────────────────
    story += _section(styles, "1. Report Focus Scope / ವರದಿಯ ವ್ಯಾಪ್ತಿ")
    scope_text = f"This strategic analysis report provides AI-generated proactive crime prevention and investigation recommendations based on current crime patterns in the database for <b>{district or 'All Districts'}</b> and <b>{crime_type or 'All Crimes'}</b>."
    story.append(Paragraph(scope_text, styles["body"]))
    story.append(Spacer(1, 0.4*cm))

    # ── 2. Strategic Recommendations ─────────────────────────────────────────
    story += _section(styles, "2. AI Investigation & Prevention Recommendations / ತನಿಖಾ ಶಿಫಾರಸುಗಳು")
    story.append(_ai_box(styles, recommendations))

    # ── Disclaimers ───────────────────────────────────────────────────────────
    story += _disclaimer_block()

    doc.build(story, canvasmaker=NumberedCanvas)
    logger.info("AI Recommendations report generated: %s", pdf_path)
    return str(pdf_path)

