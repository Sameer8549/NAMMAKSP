import os
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4

def test_nirmala():
    pdf_path = "reports/test_nirmala.pdf"
    
    # Register Nirmala.ttc
    try:
        pdfmetrics.registerFont(TTFont("Nirmala", "C:/Windows/Fonts/Nirmala.ttc", subfontIndex=0))
        font_name = "Nirmala"
        print("Successfully registered Nirmala UI font.")
    except Exception as e:
        print("Failed to register Nirmala:", e)
        return

    doc = SimpleDocTemplate(pdf_path, pagesize=A4)
    styles = getSampleStyleSheet()
    
    custom_style = ParagraphStyle(
        "KannadaStyle",
        fontName="Nirmala",
        fontSize=12,
        leading=16
    )
    
    story = [
        Paragraph("<b>ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್</b>", custom_style),
        Spacer(1, 10),
        Paragraph("ಅಪರಾಧ ತನಿಖಾ ವಿವರಣಾತ್ಮಕ ವರದಿ", custom_style),
        Spacer(1, 10),
        Paragraph("ಪ್ರಕರಣದ ಸಂಗತಿಗಳು", custom_style),
    ]
    
    doc.build(story)
    print("PDF generated at:", pdf_path)

if __name__ == "__main__":
    test_nirmala()
