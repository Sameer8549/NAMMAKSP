# NAMMA KSP 🔍
### Karnataka Police Intelligence Platform

An intelligent crime analytics and investigation support platform powered by AI.

---

## Features

| Module | Description |
|---|---|
| 📊 **Dashboard** | KPI overview, crime type charts, monthly trends, district statistics |
| 🤖 **AI Chatbot** | Natural language crime intelligence powered by Groq + Mistral |
| 📁 **FIR Records** | Search, filter, and explore 5,000 crime records |
| 🗺️ **Crime Hotspots** | Leaflet.js heatmap with Karnataka crime density |
| 🕸️ **Criminal Network** | Cytoscape.js offender-victim-FIR relationship graph |
| 👤 **Offender Profiles** | Risk scoring, repeat offender identification, FIR history |
| 📄 **PDF Reports** | ReportLab-generated professional investigation reports |

---

## Tech Stack

**Backend:** Python FastAPI · SQLite · Pandas · NetworkX · Scikit-Learn · ReportLab  
**Frontend:** HTML · CSS · JavaScript · Chart.js · Leaflet.js · Cytoscape.js  
**AI:** Groq API · Mistral (mistral-saba-24b)

---

## Setup

### 1. Install Dependencies
```bash
py -3.11 -m pip install -r requirements.txt
```

### 2. Configure Environment
```bash
copy .env.example .env
# Edit .env and add your API keys
```

### 3. Run the Server
```bash
py -3.11 backend/main.py
```

The app will be available at: **http://127.0.0.1:8000**

---

## Dataset

Generated using `generate_data.py` with Karnataka-specific data:

| File | Records | Description |
|---|---|---|
| `firs.csv` | 5,000 | Crime FIR records (2022-2025) |
| `offenders.csv` | 2,000 | Accused persons |
| `victims.csv` | 3,000 | Victims |
| `locations.csv` | 100 | Locations with GPS coordinates |
| `relationships.csv` | 5,000 | Criminal network edges |

**15 Karnataka Districts** · **12 Crime Types** · **8 Police Station Types**

---

## Project Structure

```
crime-lens-ai/
├── backend/
│   ├── main.py          # FastAPI application
│   ├── database.py      # SQLite + CSV ingestion
│   ├── analytics.py     # Crime statistics engine
│   ├── network.py       # Criminal network (NetworkX)
│   ├── ai_service.py    # Groq + Mistral chatbot
│   └── report.py        # PDF generation (ReportLab)
├── frontend/
│   ├── index.html       # SPA dashboard
│   ├── style.css        # Professional UI
│   └── app.js           # All frontend logic
├── data/                # CSV datasets
├── reports/             # Generated PDFs
├── .env                 # API keys (never commit!)
├── .env.example         # Template
└── requirements.txt
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | System health check |
| GET | `/api/analytics/overview` | Dashboard KPIs |
| GET | `/api/analytics/crime-types` | Crime type distribution |
| GET | `/api/analytics/monthly-trends` | Monthly trends |
| GET | `/api/analytics/districts` | District statistics |
| GET | `/api/firs` | Search FIRs (filterable) |
| GET | `/api/firs/{fir_id}` | FIR detail |
| GET | `/api/firs/{fir_id}/related` | Related cases |
| GET | `/api/offenders/high-risk` | High-risk offenders |
| GET | `/api/offenders/{id}` | Offender profile |
| GET | `/api/network` | Criminal network graph |
| GET | `/api/hotspots` | Crime heatmap data |
| POST | `/api/chat` | AI chatbot |
| GET | `/api/ai/case-summary/{fir_id}` | AI case analysis |
| GET | `/api/ai/recommendations` | Investigation recommendations |
| POST | `/api/reports/case` | Generate case PDF |
| POST | `/api/reports/district` | Generate district PDF |
| GET | `/api/docs` | Interactive API docs |

---

*Built for datathon — Karnataka Crime Intelligence Platform*
