import subprocess
from pathlib import Path

def test_edge_pdf():
    html_content = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: 'Segoe UI', 'Tunga', 'Nirmala UI', sans-serif;
            margin: 40px;
        }
        h1 {
            color: #1b2a47;
            text-align: center;
        }
        .bilingual {
            font-size: 18px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <h1>ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್</h1>
    <div class="bilingual">
        <strong>ಕನ್ನಡ:</strong> ಅಪರಾಧ ತನಿಖಾ ವಿವರಣಾತ್ಮಕ ವರದಿ<br>
        <strong>English:</strong> Crime Investigation Descriptive Report
    </div>
    <div class="bilingual">
        <strong>ಕನ್ನಡ:</strong> ಪ್ರಕರಣದ ಸಂಗತಿಗಳು<br>
        <strong>English:</strong> Case Facts
    </div>
</body>
</html>
"""
    
    html_path = Path("scratch/test_edge.html").resolve()
    pdf_path = Path("reports/test_edge.pdf").resolve()
    
    html_path.write_text(html_content, encoding="utf-8")
    print(f"HTML written to: {html_path}")
    
    # Try calling Edge headless to print to PDF
    try:
        cmd = [
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            "--headless",
            "--disable-gpu",
            f"--print-to-pdf={pdf_path}",
            str(html_path)
        ]
        print("Running command:", " ".join(cmd))
        subprocess.run(cmd, check=True, shell=True)
        print(f"Success! PDF generated at: {pdf_path}")
    except Exception as e:
        print("Failed to run Edge command:", e)

if __name__ == "__main__":
    test_edge_pdf()
