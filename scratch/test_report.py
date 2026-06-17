import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent.parent / "OneDrive" / "Desktop" / "crime-lens-ai" / "backend"))

# pyrefly: ignore [missing-import]
from database import init_db
# pyrefly: ignore [missing-import]
from analytics import get_fir_detail, get_related_cases
# pyrefly: ignore [missing-import]
from report import generate_case_report

async def test():
    print("Initializing DB...")
    await init_db()
    
    fir_id = "FIR00001"
    print(f"Fetching details for {fir_id}...")
    case_data = await get_fir_detail(fir_id)
    if not case_data:
        print("FIR not found in DB! Trying search...")
        # pyrefly: ignore [missing-import]
        from database import fetch_one
        row = await fetch_one("SELECT fir_id FROM firs LIMIT 1")
        if row:
            fir_id = row["fir_id"]
            case_data = await get_fir_detail(fir_id)
            
    if not case_data:
        print("No cases found in DB to test.")
        return
        
    print(f"Generating report for {fir_id}...")
    related = await get_related_cases(fir_id)
    case_data["related_cases"] = related
    
    ai_summary = "1. Executive Summary:\nThis is a mock AI summary.\n2. Key Leads:\nInvestigate further."
    
    try:
        path = await generate_case_report(fir_id, case_data, ai_summary)
        print(f"Success! PDF generated at: {path}")
    except Exception as e:
        print("FAILED to generate PDF:", e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
