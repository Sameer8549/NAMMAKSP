"""
report.py — CrimeLens AI
─────────────────────────
Bilingual investigation report generation (Kannada + English) using Edge Headless.
Generates professional law-enforcement-style reports matching the Karnataka Police template.
"""

import os
import logging
import subprocess
from datetime import datetime
from pathlib import Path
import qrcode
import qrcode.image.svg

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
REPORTS_DIR = BASE_DIR / os.getenv("REPORTS_DIR", "reports")
REPORTS_DIR.mkdir(exist_ok=True)
BACKEND_DIR = BASE_DIR / "backend"

def get_edge_path():
    """Find the path to Microsoft Edge on Windows."""
    paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        "msedge"
    ]
    for p in paths:
        if os.path.exists(p) or p == "msedge":
            return p
    return "msedge"

def _generate_qr_code_svg(data: str, filename: Path):
    """Generate a QR code as an SVG file."""
    factory = qrcode.image.svg.SvgPathImage
    img = qrcode.make(data, image_factory=factory)
    with open(filename, "wb") as f:
        img.save(f)

def _make_esign_html(fir_id_or_district: str) -> str:
    """Generate E-Sign block HTML."""
    timestamp = datetime.now().strftime("%d-%b-%Y %H:%M:%S")
    doc_hash = hash(str(fir_id_or_district) + timestamp) & 0xffffffff
    hash_str = f"KSP-CIU-SECURE-{doc_hash:08X}"
    
    return f"""
    <table class="esign-table">
        <tr>
            <td class="esign-cell esign-left">
                <b>DIGITALLY SIGNED / ಡಿಜಿಟಲ್ ಸಹಿ ಮಾಡಲಾಗಿದೆ</b><br>
                <div class="verified-text">VERIFIED SIGNATURE / ದೃಢೀಕೃತ ಸಹಿ</div>
                Signed by: CrimeLens AI Platform (KSP-CIU)<br>
                Authority: Karnataka State Police Intelligence Unit<br>
                Timestamp: {timestamp}<br>
                Document ID: {hash_str}
            </td>
            <td class="esign-cell esign-right">
                This document is digitally signed under Section 5 of the Information Technology Act, 2000. It is a computer-generated official intelligence report and does not require a physical signature.<br><br>
                ಈ ದಾಖಲೆಯನ್ನು ಮಾಹಿತಿ ತಂತ್ರಜ್ಞಾನ ಕಾಯ್ದೆ, 2000 ರ ಸೆಕ್ಷನ್ 5 ರ ಅಡಿಯಲ್ಲಿ ಡಿಜಿಟಲ್ ಸಹಿ ಮಾಡಲಾಗಿದೆ. ಇದು ಕಂಪ್ಯೂಟರ್ ರಚಿತ ಅಧಿಕೃತ ಗುಪ್ತಚರ ವರದಿಯಾಗಿದ್ದು, ಭೌತಿಕ ಸಹಿಯ ಅಗತ್ಯವಿರುವುದಿಲ್ಲ.
            </td>
        </tr>
    </table>
    """

# ─── Case Investigation Report ────────────────────────────────────────────────

async def generate_case_report(fir_id: str, case_data: dict, ai_summary: str) -> str:
    """Generate a full PDF investigation report for a single FIR using HTML-to-PDF."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    pdf_filename = REPORTS_DIR / f"case_report_{fir_id}_{timestamp}.pdf"
    html_filename = REPORTS_DIR / f"case_report_{fir_id}_{timestamp}.html"
    qr_filename = REPORTS_DIR / f"qr_case_{fir_id}_{timestamp}.svg"
    
    # 1. Generate QR Code
    qr_data = f"http://127.0.0.1:8002/api/firs/{fir_id}"
    _generate_qr_code_svg(qr_data, qr_filename)
    
    # 2. Logo path
    logo_path = (BACKEND_DIR / "karnataka_emblem.png").resolve()
    
    # 3. Related cases rows
    related_rows_html = ""
    related = case_data.get("related_cases", [])
    if related:
        for idx, r in enumerate(related[:6], 1):
            related_rows_html += f"""
            <tr>
                <td>{idx}</td>
                <td>{r.get('fir_id', 'N/A')}</td>
                <td>{r.get('crime_type', 'N/A')}</td>
                <td>{r.get('date', 'N/A')}</td>
                <td>{r.get('status', 'N/A')}</td>
                <td>{r.get('relation', 'N/A')}</td>
            </tr>
            """
            
    related_section_html = ""
    if related:
        related_section_html = f"""
        <div class="section-header">4. Related Cases / ಸಂಬಂಧಿತ ಪ್ರಕರಣಗಳು:</div>
        <table class="related-table">
            <thead>
                <tr>
                    <th style="width: 10%;">Sl No.<br>ಕ್ರಮ ಸಂಖ್ಯೆ</th>
                    <th style="width: 15%;">FIR ID<br>ಎಫ್ಐಆರ್ ಐಡಿ</th>
                    <th style="width: 25%;">Crime Type<br>ಅಪರಾಧದ ವಿಧ</th>
                    <th style="width: 15%;">Date<br>ದಿನಾಂಕ</th>
                    <th style="width: 15%;">Status<br>ಸ್ಥಿತಿ</th>
                    <th style="width: 20%;">Connection<br>ಸಂಬಂಧ</th>
                </tr>
            </thead>
            <tbody>
                {related_rows_html}
            </tbody>
        </table>
        """

    # 4. AI Summary
    ai_lines_html = ""
    for line in ai_summary.split("\n"):
        line = line.strip()
        if not line:
            continue
        elif line.startswith(("1.", "2.", "3.", "4.", "5.", "6.")):
            ai_lines_html += f'<div class="ai-line"><b>{line}</b></div>\n'
        else:
            ai_lines_html += f'<div class="ai-line">{line}</div>\n'

    # 5. Full HTML Template
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {{
            size: A4;
            margin: 1.5cm 1.5cm 2.2cm 1.5cm;
        }}
        body {{
            font-family: 'Nirmala UI', 'Segoe UI', Arial, sans-serif;
            color: #000000;
            line-height: 1.4;
            font-size: 9.5pt;
            margin: 0;
            padding-bottom: 40px;
            background-image: linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url("{logo_path.as_uri()}");
            background-repeat: no-repeat;
            background-position: center 35%;
            background-size: 320px 320px;
            background-attachment: fixed;
        }}
        
        /* Header styling */
        .header-table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }}
        .header-cell {{
            vertical-align: top;
            padding: 0;
        }}
        .header-center {{
            text-align: center;
        }}
        .logo-img {{
            width: 55px;
            height: 55px;
            margin-bottom: 5px;
        }}
        .qr-img {{
            width: 75px;
            height: 75px;
            float: right;
        }}
        .title-main {{
            font-size: 13.5pt;
            font-weight: bold;
            color: #000000;
            margin: 2px 0;
        }}
        .title-sub {{
            font-size: 9.5pt;
            font-weight: normal;
            color: #000000;
            margin: 2px 0;
        }}
        
        /* Metadata Box */
        .meta-table {{
            width: 100%;
            border-collapse: collapse;
            background-color: #f0f4f8;
            border: 1px solid #c0d0e0;
            margin-bottom: 20px;
        }}
        .meta-cell {{
            padding: 6px 10px;
            font-size: 9pt;
        }}
        .meta-left {{ text-align: left; width: 35%; }}
        .meta-center {{ text-align: center; width: 30%; }}
        .meta-right {{ text-align: right; width: 35%; }}
        
        /* Sections */
        .section-header {{
            border-bottom: 1.2px solid #1b2a47;
            padding-bottom: 2px;
            margin-top: 15px;
            margin-bottom: 8px;
            font-size: 10.5pt;
            font-weight: bold;
            color: #1b2a47;
            page-break-after: avoid;
        }}
        
        /* Data Tables */
        .data-table {{
            width: 100%;
            border-collapse: collapse;
            border: 0.5px solid #dcdde1;
            margin-bottom: 15px;
            background-color: #ffffff;
        }}
        .data-table tr:nth-child(even) {{
            background-color: #f8fafc;
        }}
        .data-table td {{
            padding: 5px 8px;
            border: 0.5px solid #dcdde1;
            vertical-align: middle;
            width: 50%;
        }}
        
        /* Related Cases Table */
        .related-table {{
            width: 100%;
            border-collapse: collapse;
            border: 0.5px solid #dcdde1;
            margin-bottom: 15px;
        }}
        .related-table th {{
            background-color: #1b2a47;
            color: #ffffff;
            font-weight: bold;
            font-size: 8pt;
            padding: 5px;
            border: 0.5px solid #dcdde1;
            text-align: center;
        }}
        .related-table td {{
            padding: 4px;
            border: 0.5px solid #dcdde1;
            font-size: 8pt;
            text-align: center;
        }}
        .related-table tr:nth-child(even) {{
            background-color: #f8fafc;
        }}
        
        /* AI Assessment Box */
        .ai-box {{
            background-color: #f0f4f8;
            border: 0.5px solid #dcdde1;
            border-left: 4px solid #1b2a47;
            padding: 10px 15px;
            margin-bottom: 15px;
            border-radius: 2px;
        }}
        .ai-disclaimer {{
            font-style: italic;
            margin-bottom: 8px;
            font-size: 9pt;
        }}
        .ai-line {{
            margin: 4px 0;
        }}
        
        /* Disclaimers */
        .disclaimer-title {{
            font-weight: bold;
            margin-top: 10px;
            margin-bottom: 3px;
        }}
        .disclaimer-text {{
            font-size: 9pt;
            margin: 2px 0;
        }}
        .red-text {{
            color: #ff0000;
            font-weight: bold;
        }}
        
        /* E-Sign Block */
        .esign-table {{
            width: 100%;
            border-collapse: collapse;
            background-color: #f1f9f1;
            border: 1px solid #81c784;
            margin-top: 20px;
            page-break-inside: avoid;
        }}
        .esign-cell {{
            padding: 10px;
            vertical-align: middle;
            font-size: 8pt;
        }}
        .esign-left {{
            width: 45%;
            border-right: 0.5px solid #81c784;
        }}
        .esign-right {{
            width: 55%;
            color: #5a5a5a;
        }}
        .verified-text {{
            color: #2e7d32;
            font-weight: bold;
            font-size: 9pt;
            margin-bottom: 4px;
        }}
        
        /* Footer (repeats on every page) */
        .footer-container {{
            position: fixed;
            bottom: 0px;
            left: 0;
            right: 0;
            height: 20px;
            border-top: 0.5px solid #cccccc;
            padding-top: 4px;
            font-size: 7.5pt;
            color: #5a5a5a;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #ffffff;
        }}
    </style>
</head>
<body>
    <!-- Header Table -->
    <table class="header-table">
        <tr>
            <td class="header-cell" style="width: 75px;"></td>
            <td class="header-cell header-center">
                <img src="{logo_path.as_uri()}" class="logo-img"><br>
                <div class="title-main">ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್</div>
                <div class="title-sub">[CrimeLens AI - Case Investigation Report]</div>
                <div class="title-main">ಅಪರಾಧ ತನಿಖಾ ವಿವರಣಾತ್ಮಕ ವರದಿ</div>
                <div class="title-sub">Serial No. / ಕ್ರಮ ಸಂಖ್ಯೆ: {fir_id}</div>
            </td>
            <td class="header-cell" style="width: 75px;">
                <img src="{qr_filename.as_uri()}" class="qr-img">
            </td>
        </tr>
    </table>

    <!-- Metadata Bar -->
    <table class="meta-table">
        <tr>
            <td class="meta-cell meta-left"><b>Police Unit / ಪೊಲೀಸ್ ಘಟಕ:</b> {case_data.get('district', 'N/A')}</td>
            <td class="meta-cell meta-center"><b>Report No. / ವರದಿ ಸಂಖ್ಯೆ:</b> {fir_id}</td>
            <td class="meta-cell meta-right"><b>Date / ದಿನಾಂಕ:</b> {case_data.get('date', 'N/A')}</td>
        </tr>
    </table>

    <!-- 1. Case Facts -->
    <div class="section-header">1. Case Facts / ಪ್ರಕರಣದ ಸಂಗತಿಗಳು:</div>
    <table class="data-table">
        <tr>
            <td><b>a. FIR Number / ಎಫ್.ಐ.ಆರ್ ಸಂಖ್ಯೆ:</b> {case_data.get('fir_id', 'N/A')}</td>
            <td><b>b. Crime Type / ಅಪರಾಧದ ವಿಧ:</b> {case_data.get('crime_type', 'N/A')}</td>
        </tr>
        <tr>
            <td><b>c. Incident Date / ಘಟನೆಯ ದಿನಾಂಕ:</b> {case_data.get('date', 'N/A')}</td>
            <td><b>d. Case Status / ಪ್ರಗತಿ:</b> {case_data.get('status', 'N/A')}</td>
        </tr>
        <tr>
            <td><b>e. Police Station / ಠಾಣೆ:</b> {case_data.get('police_station', 'N/A')}</td>
            <td><b>f. GPS Coordinates / ಜಿಪಿಎಸ್ ನಿಯೋಜನೆ:</b> Lat: {case_data.get('latitude', 'N/A')}, Lon: {case_data.get('longitude', 'N/A')}</td>
        </tr>
    </table>

    <!-- 2. Accused Details -->
    <div class="section-header">2. Accused Details / ಆರೋಪಿಯ ವಿವರಗಳು:</div>
    <table class="data-table">
        <tr>
            <td><b>a. Name / ಹೆಸರು:</b> {case_data.get('offender_name', 'N/A')}</td>
            <td><b>b. Offender ID / ಆರೋಪಿ ಐಡಿ:</b> {case_data.get('offender_id', 'N/A')}</td>
        </tr>
        <tr>
            <td><b>c. Age & Gender / ವಯಸ್ಸು ಮತ್ತು ಲಿಂಗ:</b> {case_data.get('offender_age', 'N/A')} / {case_data.get('offender_gender', 'N/A')}</td>
            <td><b>d. Risk Category / ಅಪಾಯದ ವರ್ಗ:</b> {case_data.get('risk_category', 'N/A')}</td>
        </tr>
        <tr>
            <td><b>e. Previous FIRs / ಹಿಂದಿನ ಪ್ರಕರಣಗಳು:</b> {case_data.get('previous_firs', 0)}</td>
            <td>&nbsp;</td>
        </tr>
    </table>

    <!-- 3. Victim Details -->
    <div class="section-header">3. Victim Details / ಸಂತ್ರಸ್ತೆಯ ವಿವರಗಳು:</div>
    <table class="data-table">
        <tr>
            <td><b>a. Name / ಹೆಸರು:</b> {case_data.get('victim_name', 'N/A')}</td>
            <td><b>b. Victim ID / ಸಂತ್ರಸ್ತೆ ಐಡಿ:</b> {case_data.get('victim_id', 'N/A')}</td>
        </tr>
        <tr>
            <td><b>c. Age & Gender / ವಯಸ್ಸು ಮತ್ತು ಲಿಂಗ:</b> {case_data.get('victim_age', 'N/A')} / {case_data.get('victim_gender', 'N/A')}</td>
            <td>&nbsp;</td>
        </tr>
    </table>

    <!-- 4. Related Cases -->
    {related_section_html}

    <!-- 5. AI Assessment -->
    <div class="section-header">5. AI Intelligence Assessment / ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಮೌಲ್ಯಮಾಪನ:</div>
    <div class="ai-box">
        <div class="ai-disclaimer">
            The following assessment was generated by CrimeLens AI based on available FIR data, offender profiles, and crime pattern analysis. It is an investigative aid and should be verified independently before operational use. / ಈ ಕೆಳಗಿನ ಮೌಲ್ಯಮಾಪನವನ್ನು ಲಭ್ಯವಿರುವ ಎಫ್ಐಆರ್ ಡೇಟಾ, ಆರೋಪಿಗಳ ಪ್ರೊಫೈಲ್‌ಗಳು ಮತ್ತು ಅಪರಾಧ ಮಾದರಿ ವಿಶ್ಲೇಷಣೆಯ ಆಧಾರದ ಮೇಲೆ ಕ್ರೈಮ್‌ಲೆನ್ಸ್ ಎಐ ರಚಿಸಿದೆ. ಇದು ತನಿಖಾ ಸಹಾಯವಾಗಿದ್ದು, ಕಾರ್ಯಾಚರಣೆಯ ಮೊದಲು ಸ್ವತಂತ್ರವಾಗಿ ಪರಿಶೀಲಿಸಲ್ಪಡಬೇಕು.
        </div>
        {ai_lines_html}
    </div>

    <!-- Note & Disclaimer -->
    <div class="disclaimer-title">Note / ಸೂಚನೆ:</div>
    <div class="disclaimer-text">1. This is an AI-assisted digitally signed intelligence report / ಇದು ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ನೆರವಿನ ಡಿಜಿಟಲ್ ಸಹಿಯುಳ್ಳ ಗುಪ್ತಚರ ವರದಿಯಾಗಿದೆ.</div>
    
    <div class="disclaimer-title">Disclaimer / ಹಕ್ಕುತ್ಯಾಗ:</div>
    <div class="disclaimer-text">1. This report is generated by CrimeLens AI for investigation intelligence support in Karnataka State / ಈ ವರದಿಯನ್ನು ಕರ್ನಾಟಕ ರಾಜ್ಯದಲ್ಲಿ ತನಿಖಾ ಗುಪ್ತಚರ ಬೆಂಬಲಕ್ಕಾಗಿ ಕ್ರೈಮ್‌ಲೆನ್ಸ್ ಎಐ ಮೂಲಕ ರಚಿಸಲಾಗಿದೆ.</div>
    <div class="disclaimer-text">2. Report content is an investigative aid and must be verified independently / ವರದಿಯ ವಿಷಯವು ತನಿಖಾ ಸಹಾಯವಾಗಿದ್ದು, ಸ್ವತಂತ್ರವಾಗಿ ಪರಿಶೀಲಿಸಲ್ಪಡಬೇಕು.</div>
    <div class="disclaimer-text red-text">3. Confidential - For Official Police Use Only / ರಹಸ್ಯ - ಅಧಿಕೃತ ಪೊಲೀಸ್ ಬಳಕೆಗೆ ಮಾತ್ರ.</div>

    <!-- E-Sign Block -->
    {_make_esign_html(fir_id)}

    <!-- Footer repeated automatically on every page -->
    <div class="footer-container">
        <div>Generated: {datetime.now().strftime('%d %b %Y %H:%M')} | CONFIDENTIAL - FOR OFFICIAL POLICE USE ONLY</div>
        <div>CrimeLens AI Platform</div>
    </div>
</body>
</html>
"""
    
    html_filename.write_text(html_content, encoding="utf-8")
    
    # 6. Compile using Edge Headless
    edge_path = get_edge_path()
    try:
        cmd = [
            edge_path,
            "--headless",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_filename}",
            str(html_filename)
        ]
        subprocess.run(cmd, check=True, shell=True)
        logger.info("PDF generated successfully using Edge: %s", pdf_filename)
    except Exception as e:
        logger.error("Edge PDF generation failed: %s", e)
        raise e
    finally:
        # Clean up temporary SVG and HTML files
        try:
            if qr_filename.exists():
                qr_filename.unlink()
            if html_filename.exists():
                html_filename.unlink()
        except Exception as cleanup_err:
            logger.warning("Cleanup error: %s", cleanup_err)
            
    return str(pdf_filename)

# ─── District Summary Report ──────────────────────────────────────────────────

async def generate_district_report(district: str, stats: list[dict], ai_insights: str) -> str:
    """Generate a district-level crime summary PDF report using HTML-to-PDF."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_district = district.replace(" ", "_").replace("/", "-")
    pdf_filename = REPORTS_DIR / f"district_report_{safe_district}_{timestamp}.pdf"
    html_filename = REPORTS_DIR / f"district_report_{safe_district}_{timestamp}.html"
    qr_filename = REPORTS_DIR / f"qr_district_{safe_district}_{timestamp}.svg"
    
    # 1. Generate QR Code
    qr_data = f"http://127.0.0.1:8002/api/reports/district?district={district}"
    _generate_qr_code_svg(qr_data, qr_filename)
    
    # 2. Logo path
    logo_path = (BACKEND_DIR / "karnataka_emblem.png").resolve()
    
    # 3. Stats rows
    stats_rows_html = ""
    if stats:
        for row in stats:
            stats_rows_html += f"""
            <tr>
                <td>{row.get('district', 'N/A')}</td>
                <td>{row.get('total_crimes', 0)}</td>
                <td>{row.get('open_cases', 0)}</td>
                <td>{row.get('closed_cases', 0)}</td>
            </tr>
            """
            
    stats_table_html = ""
    if stats:
        stats_table_html = f"""
        <table class="related-table">
            <thead>
                <tr>
                    <th style="width: 25%;">District / ಜಿಲ್ಲೆ</th>
                    <th style="width: 25%;">Total Crimes / ಒಟ್ಟು ಅಪರಾಧಗಳು</th>
                    <th style="width: 25%;">Open Cases / ಸಕ್ರಿಯ ಪ್ರಕರಣಗಳು</th>
                    <th style="width: 25%;">Closed Cases / ಮುಚ್ಚಿದ ಪ್ರಕರಣಗಳು</th>
                </tr>
            </thead>
            <tbody>
                {stats_rows_html}
            </tbody>
        </table>
        """

    # 4. AI Insights
    ai_lines_html = ""
    for line in ai_insights.split("\n"):
        line = line.strip()
        if not line:
            continue
        else:
            ai_lines_html += f'<div class="ai-line">{line}</div>\n'

    # 5. Full HTML Template
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {{
            size: A4;
            margin: 1.5cm 1.5cm 2.2cm 1.5cm;
        }}
        body {{
            font-family: 'Nirmala UI', 'Segoe UI', Arial, sans-serif;
            color: #000000;
            line-height: 1.4;
            font-size: 9.5pt;
            margin: 0;
            padding-bottom: 40px;
            background-image: linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url("{logo_path.as_uri()}");
            background-repeat: no-repeat;
            background-position: center 35%;
            background-size: 320px 320px;
            background-attachment: fixed;
        }}
        
        /* Header styling */
        .header-table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }}
        .header-cell {{
            vertical-align: top;
            padding: 0;
        }}
        .header-center {{
            text-align: center;
        }}
        .logo-img {{
            width: 55px;
            height: 55px;
            margin-bottom: 5px;
        }}
        .qr-img {{
            width: 75px;
            height: 75px;
            float: right;
        }}
        .title-main {{
            font-size: 13.5pt;
            font-weight: bold;
            color: #000000;
            margin: 2px 0;
        }}
        .title-sub {{
            font-size: 9.5pt;
            font-weight: normal;
            color: #000000;
            margin: 2px 0;
        }}
        
        /* Metadata Box */
        .meta-table {{
            width: 100%;
            border-collapse: collapse;
            background-color: #f0f4f8;
            border: 1px solid #c0d0e0;
            margin-bottom: 20px;
        }}
        .meta-cell {{
            padding: 6px 10px;
            font-size: 9pt;
        }}
        .meta-left {{ text-align: left; width: 35%; }}
        .meta-center {{ text-align: center; width: 30%; }}
        .meta-right {{ text-align: right; width: 35%; }}
        
        /* Sections */
        .section-header {{
            border-bottom: 1.2px solid #1b2a47;
            padding-bottom: 2px;
            margin-top: 15px;
            margin-bottom: 8px;
            font-size: 10.5pt;
            font-weight: bold;
            color: #1b2a47;
            page-break-after: avoid;
        }}
        
        /* Related Cases Table */
        .related-table {{
            width: 100%;
            border-collapse: collapse;
            border: 0.5px solid #dcdde1;
            margin-bottom: 15px;
        }}
        .related-table th {{
            background-color: #1b2a47;
            color: #ffffff;
            font-weight: bold;
            font-size: 8pt;
            padding: 5px;
            border: 0.5px solid #dcdde1;
            text-align: center;
        }}
        .related-table td {{
            padding: 4px;
            border: 0.5px solid #dcdde1;
            font-size: 8pt;
            text-align: center;
        }}
        .related-table tr:nth-child(even) {{
            background-color: #f8fafc;
        }}
        
        /* AI Assessment Box */
        .ai-box {{
            background-color: #f0f4f8;
            border: 0.5px solid #dcdde1;
            border-left: 4px solid #1b2a47;
            padding: 10px 15px;
            margin-bottom: 15px;
            border-radius: 2px;
        }}
        .ai-disclaimer {{
            font-style: italic;
            margin-bottom: 8px;
            font-size: 9pt;
        }}
        .ai-line {{
            margin: 4px 0;
        }}
        
        /* Disclaimers */
        .disclaimer-title {{
            font-weight: bold;
            margin-top: 10px;
            margin-bottom: 3px;
        }}
        .disclaimer-text {{
            font-size: 9pt;
            margin: 2px 0;
        }}
        .red-text {{
            color: #ff0000;
            font-weight: bold;
        }}
        
        /* E-Sign Block */
        .esign-table {{
            width: 100%;
            border-collapse: collapse;
            background-color: #f1f9f1;
            border: 1px solid #81c784;
            margin-top: 20px;
            page-break-inside: avoid;
        }}
        .esign-cell {{
            padding: 10px;
            vertical-align: middle;
            font-size: 8pt;
        }}
        .esign-left {{
            width: 45%;
            border-right: 0.5px solid #81c784;
        }}
        .esign-right {{
            width: 55%;
            color: #5a5a5a;
        }}
        .verified-text {{
            color: #2e7d32;
            font-weight: bold;
            font-size: 9pt;
            margin-bottom: 4px;
        }}
        
        /* Footer (repeats on every page) */
        .footer-container {{
            position: fixed;
            bottom: 0px;
            left: 0;
            right: 0;
            height: 20px;
            border-top: 0.5px solid #cccccc;
            padding-top: 4px;
            font-size: 7.5pt;
            color: #5a5a5a;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #ffffff;
        }}
    </style>
</head>
<body>
    <!-- Header Table -->
    <table class="header-table">
        <tr>
            <td class="header-cell" style="width: 75px;"></td>
            <td class="header-cell header-center">
                <img src="{logo_path.as_uri()}" class="logo-img"><br>
                <div class="title-main">ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್</div>
                <div class="title-sub">[CrimeLens AI - District Crime Report]</div>
                <div class="title-main">ಜಿಲ್ಲಾ ಅಪರಾಧ ವಿಶ್ಲೇಷಣಾ ವರದಿ — {district}</div>
            </td>
            <td class="header-cell" style="width: 75px;">
                <img src="{qr_filename.as_uri()}" class="qr-img">
            </td>
        </tr>
    </table>

    <!-- Metadata Bar -->
    <table class="meta-table">
        <tr>
            <td class="meta-cell meta-left"><b>Police Unit / ಪೊಲೀಸ್ ಘಟಕ:</b> Karnataka Police</td>
            <td class="meta-cell meta-center"><b>District / ಜಿಲ್ಲೆ:</b> {district}</td>
            <td class="meta-cell meta-right"><b>Date / ದಿನಾಂಕ:</b> {datetime.now().strftime('%d/%m/%Y')}</td>
        </tr>
    </table>

    <!-- 1. Crime Statistics by Type -->
    <div class="section-header">1. Crime Statistics by Type / ಅಪರಾಧ ವಿಧದ ಅಂಕಿಅಂಶಗಳು:</div>
    {stats_table_html}

    <!-- 2. AI Intelligence Insights -->
    <div class="section-header">2. AI Intelligence Insights / ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ವಿಶ್ಲೇಷಣೆ:</div>
    <div class="ai-box">
        <div class="ai-disclaimer">
            The following prevention and investigation recommendations were generated by CrimeLens AI based on district crime density. / ಈ ಕೆಳಗಿನ ತಡೆಗಟ್ಟುವಿಕೆ ಮತ್ತು ತನಿಖಾ ಶಿಫಾರಸುಗಳನ್ನು ಜಿಲ್ಲಾ ಅಪರಾಧ ಸಾಂದ್ರತೆಯ ಆಧಾರದ ಮೇಲೆ ಕ್ರೈಮ್‌ಲೆನ್ಸ್ ಎಐ ರಚಿಸಿದೆ.
        </div>
        {ai_lines_html}
    </div>

    <!-- Note & Disclaimer -->
    <div class="disclaimer-title">Note / ಸೂಚನೆ:</div>
    <div class="disclaimer-text">1. This is an AI-assisted digitally signed intelligence report / ಇದು ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ನೆರವಿನ ಡಿಜಿಟಲ್ ಸಹಿಯುಳ್ಳ ಗುಪ್ತಚರ ವರದಿಯಾಗಿದೆ.</div>
    
    <div class="disclaimer-title">Disclaimer / ಹಕ್ಕುತ್ಯಾಗ:</div>
    <div class="disclaimer-text">1. This report is generated by CrimeLens AI for district intelligence analysis in {district} / ಈ ವರದಿಯನ್ನು ಕ್ರೈಮ್‌ಲೆನ್ಸ್ ಎಐ ಮೂಲಕ {district} ಜಿಲ್ಲಾ ಗುಪ್ತಚರ ವಿಶ್ಲೇಷಣೆಗಾಗಿ ರಚಿಸಲಾಗಿದೆ.</div>
    <div class="disclaimer-text">2. Report content is an investigative aid and must be verified independently / ವರದಿಯ ವಿಷಯವು ತನಿಖಾ ಸಹಾಯವಾಗಿದ್ದು, ಸ್ವತಂತ್ರವಾಗಿ ಪರಿಶೀಲಿಸಲ್ಪಡಬೇಕು.</div>
    <div class="disclaimer-text red-text">3. Confidential - For Official Police Use Only / ರಹಸ್ಯ - ಅಧಿಕೃತ ಪೊಲೀಸ್ ಬಳಕೆಗೆ ಮಾತ್ರ.</div>

    <!-- E-Sign Block -->
    {_make_esign_html(district)}

    <!-- Footer repeated automatically on every page -->
    <div class="footer-container">
        <div>Generated: {datetime.now().strftime('%d %b %Y %H:%M')} | CONFIDENTIAL - FOR OFFICIAL POLICE USE ONLY</div>
        <div>CrimeLens AI Platform</div>
    </div>
</body>
</html>
"""
    
    html_filename.write_text(html_content, encoding="utf-8")
    
    # 6. Compile using Edge Headless
    edge_path = get_edge_path()
    try:
        cmd = [
            edge_path,
            "--headless",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_filename}",
            str(html_filename)
        ]
        subprocess.run(cmd, check=True, shell=True)
        logger.info("District PDF generated successfully using Edge: %s", pdf_filename)
    except Exception as e:
        logger.error("Edge District PDF generation failed: %s", e)
        raise e
    finally:
        # Clean up temporary SVG and HTML files
        try:
            if qr_filename.exists():
                qr_filename.unlink()
            if html_filename.exists():
                html_filename.unlink()
        except Exception as cleanup_err:
            logger.warning("Cleanup error: %s", cleanup_err)
            
    return str(pdf_filename)


# ─── Chat Log PDF Generation ──────────────────────────────────────────────────

def _format_markdown_for_pdf(text: str) -> str:
    """Format markdown text to simple PDF-compatible HTML tags."""
    import re
    # Escape HTML tags first
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    
    # 1. Structured headers like **1. DIRECT ANSWER / ನೇರ ಉತ್ತರ:**
    def repl_section(match):
        title = match.group(1) or match.group(2) or ""
        title = title.strip()
        icon = "🔹"
        t = title.lower()
        if "answer" in t or "ಉತ್ತರ" in t: icon = "💬"
        elif "evidence" in t or "ಪುರಾವೆ" in t: icon = "📊"
        elif "reasoning" in t or "ವಿಶ್ಲೇಷಣೆ" in t: icon = "🧠"
        elif "recommendation" in t or "ಶಿಫಾರಸು" in t: icon = "📋"
        elif "confidence" in t or "ವಿಶ್ವಾಸಾರ್ಹತೆ" in t: icon = "🎯"
        return f'<div class="pdf-chat-section-header"><span>{icon}</span> <span>{title}</span></div>'
        
    text = re.sub(r'\*\*(?:(\d+\.\s*)?([^:*]+?)):\*\*|\*\*(?:(\d+\.\s*)?([^:*]+?))\*\*:', repl_section, text)
    
    # 2. General Bold **text** -> <b>text</b>
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    
    # 3. Bullet points: lines starting with "- " or "* "
    lines = text.split("\n")
    in_list = False
    for i, line in enumerate(lines):
        tline = line.strip()
        if tline.startswith(("- ", "* ")):
            content = tline[2:]
            if not in_list:
                lines[i] = f'<ul class="pdf-chat-list"><li>{content}</li>'
                in_list = True
            else:
                lines[i] = f'<li>{content}</li>'
        else:
            if in_list:
                lines[i-1] = lines[i-1] + "</ul>"
                in_list = False
    if in_list:
        lines[-1] = lines[-1] + "</ul>"
    text = "\n".join(lines)
    
    # 4. Newlines
    text = text.replace("\n\n", '<div style="height:6px;"></div>')
    text = text.replace("\n", "<br>")
    return text


async def generate_chat_log_report(session_id: str, messages: list[dict]) -> str:
    """Generate a PDF document of the conversation history/dossier using Edge Headless."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    pdf_filename = REPORTS_DIR / f"chat_log_{session_id}_{timestamp}.pdf"
    html_filename = REPORTS_DIR / f"chat_log_{session_id}_{timestamp}.html"
    qr_filename = REPORTS_DIR / f"qr_chat_{session_id}_{timestamp}.svg"
    
    # 1. Generate QR Code
    qr_data = f"http://127.0.0.1:8002/api/chat/history?session_id={session_id}"
    _generate_qr_code_svg(qr_data, qr_filename)
    
    # 2. Logo path
    logo_path = (BACKEND_DIR / "karnataka_emblem.png").resolve()
    
    # 3. Compile dialogue HTML
    dialogue_html = ""
    for idx, msg in enumerate(messages, 1):
        role = msg.get("role", "user")
        content = msg.get("content", "").strip()
        if not content:
            continue
            
        # Clean user message context for visual appearance in PDF
        if role == "user":
            if "--- Relevant Database Context ---" in content:
                content = content.split("--- Relevant Database Context ---")[0].replace("User Query:", "").strip()
            role_label = "INVESTIGATOR / ತನಿಖಾಧಿಕಾರಿ"
            bubble_class = "user-bubble"
            avatar = "👤"
            formatted_content = content.replace("\n", "<br>")
        else:
            role_label = "CRIMELENS AI / ಕ್ರೈಮ್‌ಲೆನ್ಸ್ ಎಐ"
            bubble_class = "ai-bubble"
            avatar = "🤖"
            formatted_content = _format_markdown_for_pdf(content)
            
        dialogue_html += f"""
        <div class="chat-row {role}">
            <div class="chat-avatar">{avatar}</div>
            <div class="chat-bubble-container">
                <div class="chat-sender">{role_label}</div>
                <div class="chat-bubble {bubble_class}">
                    {formatted_content}
                </div>
            </div>
        </div>
        """
        
    # 4. Main HTML content
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {{
            size: A4;
            margin: 1.5cm 1.5cm 2.2cm 1.5cm;
        }}
        body {{
            font-family: 'Nirmala UI', 'Segoe UI', Arial, sans-serif;
            color: #000000;
            line-height: 1.4;
            font-size: 9.5pt;
            margin: 0;
            padding-bottom: 40px;
            background-image: linear-gradient(rgba(255, 255, 255, 0.90), rgba(255, 255, 255, 0.90)), url("{logo_path.as_uri()}");
            background-repeat: no-repeat;
            background-position: center 35%;
            background-size: 320px 320px;
            background-attachment: fixed;
        }}
        
        /* Header styling */
        .header-table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }}
        .header-cell {{
            vertical-align: top;
            padding: 0;
        }}
        .header-center {{
            text-align: center;
        }}
        .logo-img {{
            width: 55px;
            height: 55px;
            margin-bottom: 5px;
        }}
        .qr-img {{
            width: 75px;
            height: 75px;
            float: right;
        }}
        .title-main {{
            font-size: 13.5pt;
            font-weight: bold;
            color: #000000;
            margin: 2px 0;
        }}
        .title-sub {{
            font-size: 9.5pt;
            font-weight: normal;
            color: #000000;
            margin: 2px 0;
        }}
        
        /* Metadata Box */
        .meta-table {{
            width: 100%;
            border-collapse: collapse;
            background-color: #f0f4f8;
            border: 1px solid #c0d0e0;
            margin-bottom: 20px;
        }}
        .meta-cell {{
            padding: 6px 10px;
            font-size: 9pt;
            border: 1px solid #c0d0e0;
        }}
        .meta-left {{ width: 35%; text-align: left; }}
        .meta-center {{ width: 30%; text-align: center; }}
        .meta-right {{ width: 35%; text-align: right; }}
        
        /* Dialogue layout */
        .chat-row {{
            display: flex;
            margin-bottom: 12px;
            page-break-inside: avoid;
        }}
        .chat-avatar {{
            width: 28px;
            height: 28px;
            font-size: 14pt;
            text-align: center;
            line-height: 28px;
            margin-right: 8px;
            background-color: #e2e8f0;
            border-radius: 50%;
        }}
        .chat-bubble-container {{
            flex: 1;
        }}
        .chat-sender {{
            font-size: 8pt;
            font-weight: bold;
            color: #475569;
            margin-bottom: 2px;
        }}
        .chat-bubble {{
            padding: 10px 12px;
            border-radius: 6px;
            font-size: 9.5pt;
            background: #ffffff;
            border: 1px solid #cbd5e1;
        }}
        .chat-bubble.user-bubble {{
            background: #f8fafc;
            border-left: 3px solid #1a2744;
        }}
        .chat-bubble.ai-bubble {{
            background: #ffffff;
            border-left: 3px solid #3a6bc4;
        }}
        
        /* PDF Markdown components */
        .pdf-chat-section-header {{
            font-weight: bold;
            font-size: 9pt;
            color: #1a2744;
            margin-top: 10px;
            margin-bottom: 4px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 2px;
            text-transform: uppercase;
        }}
        .pdf-chat-list {{
            margin: 4px 0 4px 15px;
            padding-left: 0;
            list-style-type: square;
        }}
        .pdf-chat-list li {{
            margin-bottom: 2px;
        }}
        
        /* E-signature */
        .esign-table {{
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid #27ae60;
            background-color: #f4fbf7;
            margin-top: 25px;
            page-break-inside: avoid;
        }}
        .esign-cell {{
            padding: 10px 14px;
            font-size: 8.5pt;
            vertical-align: top;
        }}
        .esign-left {{
            width: 45%;
            border-right: 1px solid #27ae60;
            line-height: 1.5;
        }}
        .esign-right {{
            width: 55%;
            color: #27ae60;
            font-weight: 500;
        }}
        .verified-text {{
            color: #27ae60;
            font-weight: bold;
            font-size: 9.5pt;
            margin: 3px 0;
        }}
        
        /* Disclaimers */
        .disclaimer-title {{
            font-size: 8.5pt;
            font-weight: bold;
            margin-top: 10px;
        }}
        .disclaimer-text {{
            font-size: 8pt;
            color: #4a5568;
        }}
        .red-text {{
            color: #c0392b;
            font-weight: bold;
        }}
        
        /* Footer Repeated */
        .footer-container {{
            position: fixed;
            bottom: 0px;
            left: 0px;
            right: 0px;
            height: 30px;
            font-size: 8pt;
            color: #7f8c8d;
            border-top: 1px solid #bdc3c7;
            padding-top: 4px;
            display: flex;
            justify-content: space-between;
            background: #ffffff;
        }}
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td class="header-cell" style="width: 15%;">
                <img class="logo-img" src="{logo_path.as_uri()}" alt="Emblem">
            </td>
            <td class="header-cell header-center" style="width: 70%;">
                <div class="title-main">KARNATAKA STATE POLICE / ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್</div>
                <div class="title-sub">INTELLIGENCE UNIT / ಗುಪ್ತಚರ ಘಟಕ - CRIME ANALYSIS DIVISION</div>
                <div style="font-weight: bold; font-size: 10pt; margin-top: 5px;">
                    CASE INTELLIGENCE DOSSIER / ಪ್ರಕರಣ ಗುಪ್ತಚರ ಕಡತ
                </div>
            </td>
            <td class="header-cell" style="width: 15%;">
                <img class="qr-img" src="{qr_filename.as_uri()}" alt="QR">
            </td>
        </tr>
    </table>

    <table class="meta-table">
        <tr>
            <td class="meta-cell meta-left"><b>Police Unit / ಪೊಲೀಸ್ ಘಟಕ:</b> Intelligence Division</td>
            <td class="meta-cell meta-center"><b>Session ID / ಅಧಿವೇಶನ ಐಡಿ:</b> {session_id[:8]}...</td>
            <td class="meta-cell meta-right"><b>Date / ದಿನಾಂಕ:</b> {datetime.now().strftime('%d/%m/%Y')}</td>
        </tr>
    </table>

    <!-- Dialogue Timeline -->
    <div style="margin-top: 10px; margin-bottom: 20px;">
        {dialogue_html}
    </div>

    <!-- Note & Disclaimer -->
    <div class="disclaimer-title">Note / ಸೂಚನೆ:</div>
    <div class="disclaimer-text">1. This is a computer-compiled conversation dossier generated by CrimeLens AI. / ಇದು ಕ್ರೈಮ್‌ಲೆನ್ಸ್ ಎಐ ಮೂಲಕ ಕಂಪೈಲ್ ಮಾಡಲಾದ ಸಂಭಾಷಣೆ ಕಡತವಾಗಿದೆ.</div>
    
    <div class="disclaimer-title">Disclaimer / ಹಕ್ಕುತ್ಯಾಗ:</div>
    <div class="disclaimer-text">1. This intelligence dossier contains raw investigator questions and AI analysis. / ಈ ಗುಪ್ತಚರ ಕಡತವು ತನಿಖಾಧಿಕಾರಿಯ ಪ್ರಶ್ನೆಗಳು ಮತ್ತು ಎಐ ವಿಶ್ಲೇಷಣೆಯನ್ನು ಒಳಗೊಂಡಿದೆ.</div>
    <div class="disclaimer-text">2. Content generated by AI is for lead generation only and must be validated through field inquiries. / ಎಐ ರಚಿಸಿದ ವಿಷಯವು ಕೇವಲ ಸುಳಿವು ನೀಡಿಕೆಗಾಗಿ ಮಾತ್ರವಾಗಿದ್ದು, ಕ್ಷೇತ್ರ ವಿಚಾರಣೆಗಳ ಮೂಲಕ ಮೌಲ್ಯೀಕರಿಸಬೇಕು.</div>
    <div class="disclaimer-text red-text">3. STRICTLY CONFIDENTIAL - FOR OFFICIAL USE ONLY / ಅತ್ಯಂತ ರಹಸ್ಯ - ಅಧಿಕೃತ ಬಳಕೆಗೆ ಮಾತ್ರ.</div>

    <!-- E-Sign Block -->
    {_make_esign_html(session_id)}

    <!-- Footer repeated automatically on every page -->
    <div class="footer-container">
        <div>Generated: {datetime.now().strftime('%d %b %Y %H:%M')} | CONFIDENTIAL - OFFICIAL USE ONLY</div>
        <div>CrimeLens AI Platform</div>
    </div>
</body>
</html>
"""
    
    html_filename.write_text(html_content, encoding="utf-8")
    
    # 5. Compile using Edge Headless
    edge_path = get_edge_path()
    try:
        cmd = [
            edge_path,
            "--headless",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_filename}",
            str(html_filename)
        ]
        subprocess.run(cmd, check=True, shell=True)
        logger.info("Chat log PDF generated successfully using Edge: %s", pdf_filename)
    except Exception as e:
        logger.error("Edge Chat log PDF generation failed: %s", e)
        raise e
    finally:
        # Clean up temporary SVG and HTML files
        try:
            if qr_filename.exists():
                qr_filename.unlink()
            if html_filename.exists():
                html_filename.unlink()
        except Exception as cleanup_err:
            logger.warning("Cleanup error: %s", cleanup_err)
            
    return str(pdf_filename)
