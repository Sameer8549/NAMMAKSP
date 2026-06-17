import os
import subprocess
from datetime import datetime
from pathlib import Path
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics import renderPM

BASE_DIR = Path(__file__).resolve().parent.parent
REPORTS_DIR = BASE_DIR / "reports"
BACKEND_DIR = BASE_DIR / "backend"

def _generate_qr_code(data: str, size: float = 60) -> Drawing:
    d = Drawing(size, size)
    qr = QrCodeWidget(value=data)
    qr.barWidth = size
    qr.barHeight = size
    qr.x = 0
    qr.y = 0
    d.add(qr)
    return d

def test_html_generation():
    fir_id = "FIR04924"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # 1. Generate QR Code SVG using qrcode library
    import qrcode
    import qrcode.image.svg
    qr_data = f"http://127.0.0.1:8002/api/firs/{fir_id}"
    qr_path = BASE_DIR / "scratch" / f"qr_{fir_id}.svg"
    factory = qrcode.image.svg.SvgPathImage
    img = qrcode.make(qr_data, image_factory=factory)
    with open(qr_path, "wb") as f:
        img.save(f)
    
    # 2. Paths to files
    logo_path = (BACKEND_DIR / "karnataka_emblem.png").resolve()
    
    # 3. HTML Content
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
                <img src="{qr_path.as_uri()}" class="qr-img">
            </td>
        </tr>
    </table>

    <!-- Metadata Bar -->
    <table class="meta-table">
        <tr>
            <td class="meta-cell meta-left"><b>Police Unit / ಪೊಲೀಸ್ ಘಟಕ:</b> Hassan</td>
            <td class="meta-cell meta-center"><b>Report No. / ವರದಿ ಸಂಖ್ಯೆ:</b> {fir_id}</td>
            <td class="meta-cell meta-right"><b>Date / ದಿನಾಂಕ:</b> 2025-11-01</td>
        </tr>
    </table>

    <!-- 1. Case Facts -->
    <div class="section-header">1. Case Facts / ಪ್ರಕರಣದ ಸಂಗತಿಗಳು:</div>
    <table class="data-table">
        <tr>
            <td><b>a. FIR Number / ಎಫ್.ಐ.ಆರ್ ಸಂಖ್ಯೆ:</b> {fir_id}</td>
            <td><b>b. Crime Type / ಅಪರಾಧದ ವಿಧ:</b> Kidnapping</td>
        </tr>
        <tr>
            <td><b>c. Incident Date / ಘಟನೆಯ ದಿನಾಂಕ:</b> 2025-11-01</td>
            <td><b>d. Case Status / ಪ್ರಗತಿ:</b> Under Investigation</td>
        </tr>
        <tr>
            <td><b>e. Police Station / ಠಾಣೆ:</b> West PS</td>
            <td><b>f. GPS Coordinates / ಜಿಪಿಎಸ್ ನಿಯೋಜನೆ:</b> Lat: 17.569913, Lon: 74.118975</td>
        </tr>
    </table>

    <!-- 2. Accused Details -->
    <div class="section-header">2. Accused Details / ಆರೋಪಿಯ ವಿವರಗಳು:</div>
    <table class="data-table">
        <tr>
            <td><b>a. Name / ಹೆಸರು:</b> Deepa De</td>
            <td><b>b. Offender ID / ಆರೋಪಿ ಐಡಿ:</b> OFF01223</td>
        </tr>
        <tr>
            <td><b>c. Age & Gender / ವಯಸ್ಸು ಮತ್ತು ಲಿಂಗ:</b> 25 / Female</td>
            <td><b>d. Risk Category / ಅಪಾಯದ ವರ್ಗ:</b> Medium</td>
        </tr>
        <tr>
            <td><b>e. Previous FIRs / ಹಿಂದಿನ ಪ್ರಕರಣಗಳು:</b> 5</td>
            <td>&nbsp;</td>
        </tr>
    </table>

    <!-- 3. Victim Details -->
    <div class="section-header">3. Victim Details / ಸಂತ್ರಸ್ತೆಯ ವಿವರಗಳು:</div>
    <table class="data-table">
        <tr>
            <td><b>a. Name / ಹೆಸರು:</b> Jack Das</td>
            <td><b>b. Victim ID / ಸಂತ್ರಸ್ತೆ ಐಡಿ:</b> VIC00541</td>
        </tr>
        <tr>
            <td><b>c. Age & Gender / ವಯಸ್ಸು ಮತ್ತು ಲಿಂಗ:</b> 21 / Female</td>
            <td>&nbsp;</td>
        </tr>
    </table>

    <!-- 4. Related Cases -->
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
            <tr>
                <td>1</td>
                <td>FIR01199</td>
                <td>Kidnapping</td>
                <td>2025-11-01</td>
                <td>Closed</td>
                <td>Same District</td>
            </tr>
            <tr>
                <td>2</td>
                <td>FIR03225</td>
                <td>Kidnapping</td>
                <td>2025-10-30</td>
                <td>Closed</td>
                <td>Same Crime Type</td>
            </tr>
        </tbody>
    </table>

    <!-- 5. AI Assessment -->
    <div class="section-header">5. AI Intelligence Assessment / ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಮೌಲ್ಯಮಾಪನ:</div>
    <div class="ai-box">
        <div class="ai-disclaimer">
            The following assessment was generated by CrimeLens AI based on available FIR data, offender profiles, and crime pattern analysis. It is an investigative aid and should be verified independently before operational use. / ಈ ಕೆಳಗಿನ ಮೌಲ್ಯಮಾಪನವನ್ನು ಲಭ್ಯವಿರುವ ಎಫ್ಐಆರ್ ಡೇಟಾ, ಆರೋಪಿಗಳ ಪ್ರೊಫೈಲ್‌ಗಳು ಮತ್ತು ಅಪರಾಧ ಮಾದರಿ ವಿಶ್ಲೇಷಣೆಯ ಆಧಾರದ ಮೇಲೆ ಕ್ರೈಮ್‌ಲೆನ್ಸ್ ಎಐ ರಚಿಸಿದೆ. ಇದು ತನಿಖಾ ಸಹಾಯವಾಗಿದ್ದು, ಕಾರ್ಯಾಚರಣೆಯ ಮೊದಲು ಸ್ವತಂತ್ರವಾಗಿ ಪರಿಶೀಲಿಸಲ್ಪಡಬೇಕು.
        </div>
        <div class="ai-line"><b>1. Executive Summary:</b> This is an AI summary generated for FIR04924.</div>
        <div class="ai-line"><b>2. Key Leads:</b> High risk repeat offender suspected in other local cases.</div>
    </div>

    <!-- Note & Disclaimer -->
    <div class="disclaimer-title">Note / ಸೂಚನೆ:</div>
    <div class="disclaimer-text">1. This is an AI-assisted digitally signed intelligence report / ಇದು ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ನೆರವಿನ ಡಿಜಿಟಲ್ ಸಹಿಯುಳ್ಳ ಗುಪ್ತಚರ ವರದಿಯಾಗಿದೆ.</div>
    
    <div class="disclaimer-title">Disclaimer / ಹಕ್ಕುತ್ಯಾಗ:</div>
    <div class="disclaimer-text">1. This report is generated by CrimeLens AI for investigation intelligence support in Karnataka State / ಈ ವರದಿಯನ್ನು ಕರ್ನಾಟಕ ರಾಜ್ಯದಲ್ಲಿ ತನಿಖಾ ಗುಪ್ತಚರ ಬೆಂಬಲಕ್ಕಾಗಿ ಕ್ರೈಮ್‌ಲೆನ್ಸ್ ಎಐ ಮೂಲಕ ರಚಿಸಲಾಗಿದೆ.</div>
    <div class="disclaimer-text">2. Report content is an investigative aid and must be verified independently / ವರದಿಯ ವಿಷಯವು ತನಿಖಾ ಸಹಾಯವಾಗಿದ್ದು, ಸ್ವತಂತ್ರವಾಗಿ ಪರಿಶೀಲಿಸಲ್ಪಡಬೇಕು.</div>
    <div class="disclaimer-text red-text">3. Confidential - For Official Police Use Only / ರಹಸ್ಯ - ಅಧಿಕೃತ ಪೊಲೀಸ್ ಬಳಕೆಗೆ ಮಾತ್ರ.</div>

    <!-- E-Sign Block -->
    <table class="esign-table">
        <tr>
            <td class="esign-cell esign-left">
                <b>DIGITALLY SIGNED / ಡಿಜಿಟಲ್ ಸಹಿ ಮಾಡಲಾಗಿದೆ</b><br>
                <div class="verified-text">VERIFIED SIGNATURE / ದೃಢೀಕೃತ ಸಹಿ</div>
                Signed by: CrimeLens AI Platform (KSP-CIU)<br>
                Authority: Karnataka State Police Intelligence Unit<br>
                Timestamp: {datetime.now().strftime('%d-%b-%Y %H:%M:%S')}<br>
                Document ID: KSP-CIU-SECURE-A1B2C3D4
            </td>
            <td class="esign-cell esign-right">
                This document is digitally signed under Section 5 of the Information Technology Act, 2000. It is a computer-generated official intelligence report and does not require a physical signature.<br><br>
                ಈ ದಾಖಲೆಯನ್ನು ಮಾಹಿತಿ ತಂತ್ರಜ್ಞಾನ ಕಾಯ್ದೆ, 2000 ರ ಸೆಕ್ಷನ್ 5 ರ ಅಡಿಯಲ್ಲಿ ಡಿಜಿಟಲ್ ಸಹಿ ಮಾಡಲಾಗಿದೆ. ಇದು ಕಂಪ್ಯೂಟರ್ ರಚಿತ ಅಧಿಕೃತ ಗುಪ್ತಚರ ವರದಿಯಾಗಿದ್ದು, ಭೌತಿಕ ಸಹಿಯ ಅಗತ್ಯವಿರುವುದಿಲ್ಲ.
            </td>
        </tr>
    </table>
    <!-- Footer repeated automatically on every page -->
    <div class="footer-container">
        <div>Generated: {datetime.now().strftime('%d %b %Y %H:%M')} | CONFIDENTIAL - FOR OFFICIAL POLICE USE ONLY</div>
        <div>CrimeLens AI Platform</div>
    </div>
</body>
</html>
"""
    
    html_path = Path("scratch/test_report.html").resolve()
    pdf_path = Path("reports/test_report_html.pdf").resolve()
    
    html_path.write_text(html_content, encoding="utf-8")
    print(f"HTML written to: {html_path}")
    
    # Compile using Edge headless with no-pdf-header-footer
    try:
        cmd = [
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            "--headless",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_path}",
            str(html_path)
        ]
        print("Running command:", " ".join(cmd))
        subprocess.run(cmd, check=True, shell=True)
        print(f"Success! PDF generated at: {pdf_path}")
    except Exception as e:
        print("Failed to run Edge command:", e)

if __name__ == "__main__":
    test_html_generation()
