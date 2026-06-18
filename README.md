# NAMMA KSP

**Karnataka Police Intelligence Platform**

NAMMA KSP is an AI-powered crime intelligence and investigation support platform built for Karnataka State Police workflows. It combines FIR analytics, offender profiling, crime hotspot mapping, criminal network analysis, bilingual assistance, and official PDF report generation in one secure web application.

**Live Catalyst Deployment:**  
https://nammaksp-60074625517.development.catalystserverless.in/app/index.html

---

## Problem Statement

Police investigation data is often distributed across FIR records, offender histories, victim details, locations, and case notes. This makes it difficult for officers to quickly identify repeat offenders, high-risk cases, crime hotspots, and hidden links between incidents.

NAMMA KSP addresses this by turning structured crime data into a usable intelligence platform for faster, more informed, and more coordinated investigation decisions.

---

## Key Features

| Module | What It Does |
|---|---|
| Intelligence Dashboard | Shows total FIRs, active cases, repeat offenders, active districts, trends, and crime distribution. |
| AI Chat Assistant | Answers investigation questions, summarizes patterns, and supports English/Kannada workflows. |
| FIR Search | Searches and filters thousands of FIR records with case-level details. |
| Crime Heatmap | Visualizes geographic crime density and district-level hotspots across Karnataka. |
| Criminal Network Graph | Maps relationships between offenders, victims, FIRs, and locations. |
| Offender Profiles | Displays offender identity, risk category, prior FIRs, crime history, and risk indicators. |
| PDF Reports | Generates professional bilingual reports for cases, districts, offenders, recommendations, and networks. |
| Role-Based Access | Supports Admin and Investigator roles for controlled access. |
| Speech Support | Reads AI responses aloud and supports instant stop/start behavior. |

---

## Demo Login

Use these credentials for prototype evaluation:

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Investigator | `officer` | `officer123` |

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Backend | Python, FastAPI, SQLite, Pandas, NetworkX, Scikit-Learn, ReportLab |
| Frontend | HTML, CSS, JavaScript |
| Visualization | Chart.js, Leaflet.js, Cytoscape.js |
| AI | Groq API |
| Reports | ReportLab with bilingual English/Kannada PDF support |
| Deployment | Zoho Catalyst AppSail and Catalyst Web Client Hosting |

---

## Dataset

The prototype uses generated Karnataka-specific investigation data.

| File | Records | Description |
|---|---:|---|
| `firs.csv` | 5,000 | FIR records from 2022-2025 |
| `offenders.csv` | 2,000 | Accused/offender profiles |
| `victims.csv` | 3,000 | Victim records |
| `locations.csv` | 100 | Crime locations with GPS coordinates |
| `relationships.csv` | 5,000 | Offender-victim-FIR network relationships |

Coverage includes Karnataka districts, multiple crime categories, police stations, FIR statuses, and offender risk signals.

---

## Project Structure

```text
NAMMAKSP/
├── backend/
│   ├── main.py          # FastAPI app and API routes
│   ├── database.py      # SQLite setup and CSV ingestion
│   ├── analytics.py     # Dashboard and crime analytics
│   ├── network.py       # Criminal network graph data
│   ├── ai_service.py    # AI chat and investigation assistance
│   ├── report.py        # PDF report generation
│   └── fonts/           # Kannada-capable PDF fonts
├── data/                # CSV datasets
├── frontend/
│   ├── index.html       # Login page
│   ├── dashboard.html   # Intelligence dashboard
│   ├── chat.html        # AI assistant
│   ├── heatmap.html     # Crime heatmap
│   ├── network.html     # Criminal network graph
│   ├── offenders.html   # Offender profiles
│   ├── reports.html     # Report generation and archive
│   ├── users.html       # User management
│   ├── app.js           # Frontend logic
│   └── style.css        # UI styling
├── reports/             # Generated PDFs
├── requirements.txt
├── app-config.json      # Catalyst AppSail configuration
└── README.md
```

---

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Sameer8549/NAMMAKSP.git
cd NAMMAKSP
```

### 2. Create a Virtual Environment

```bash
python -m venv .venv
```

Activate it:

```bash
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file from the example:

```bash
copy .env.example .env
```

Add the required API keys:

```env
GROQ_API_KEY=your_groq_api_key_here
MISTRAL_API_KEY=your_mistral_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

Never commit real API keys to GitHub.

### 5. Run Locally

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open:

```text
http://127.0.0.1:8000/
```

---

## Catalyst Deployment

This prototype is deployed on Zoho Catalyst:

| Component | Catalyst Service |
|---|---|
| Backend API | AppSail |
| Frontend | Catalyst Web Client Hosting |
| Runtime | Python 3.12 |

Deployed frontend:

```text
https://nammaksp-60074625517.development.catalystserverless.in/app/index.html
```

Backend health endpoint:

```text
https://namma-ksp-50043229029.development.catalystappsail.in/api/health
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check and database summary |
| `POST` | `/api/auth/login` | User login |
| `GET` | `/api/analytics/overview` | Dashboard KPIs |
| `GET` | `/api/analytics/crime-types` | Crime type distribution |
| `GET` | `/api/analytics/monthly-trends` | Monthly trends |
| `GET` | `/api/analytics/districts` | District statistics |
| `GET` | `/api/firs` | FIR search and filters |
| `GET` | `/api/firs/{fir_id}` | FIR details |
| `GET` | `/api/offenders/{offender_id}` | Offender profile |
| `GET` | `/api/network` | Criminal network graph |
| `GET` | `/api/hotspots` | Crime hotspot data |
| `POST` | `/api/chat` | AI chat assistant |
| `POST` | `/api/tts` | Text-to-speech audio |
| `POST` | `/api/reports/case` | Case PDF report |
| `POST` | `/api/reports/district` | District PDF report |
| `POST` | `/api/reports/offender` | Offender PDF dossier |
| `POST` | `/api/reports/network` | Network PDF report |
| `GET` | `/api/reports/list` | Generated report archive |
| `GET` | `/api/docs` | FastAPI Swagger documentation |

---

## Prototype Impact

NAMMA KSP helps investigation teams:

1. Reduce time spent manually searching crime records.
2. Identify repeat offenders and high-risk profiles faster.
3. Understand district-wise crime trends and hotspots.
4. Discover hidden offender-victim-FIR relationships.
5. Generate structured bilingual reports for official workflows.
6. Use AI assistance for summaries, recommendations, and investigation planning.

---

## Notes

- This is a prototype built for evaluation and demonstration.
- Generated data is synthetic and Karnataka-specific.
- AI-generated outputs should be verified before operational or legal use.
- API keys must be configured securely through environment variables or Catalyst environment settings.

---

## License

This project is intended for prototype and hackathon/datathon evaluation use.
