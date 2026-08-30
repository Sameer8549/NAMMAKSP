from __future__ import annotations

from pathlib import Path
from textwrap import wrap

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Flowable,
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)

LIVE_APP = "https://nammaksp-60074625517.development.catalystserverless.in/app/index.html"
BACKEND = "https://namma-ksp-50043229029.development.catalystappsail.in"

NAVY = colors.HexColor("#0b1730")
BLUE = colors.HexColor("#1f5fbf")
TEAL = colors.HexColor("#0f8b8d")
SAFFRON = colors.HexColor("#d97706")
RED = colors.HexColor("#dc2626")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#56657f")
LINE = colors.HexColor("#d9e2ef")
BG = colors.HexColor("#f6f8fc")


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=28,
            textColor=NAVY,
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=MUTED,
            spaceAfter=16,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=NAVY,
            spaceBefore=8,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12.5,
            leading=16,
            textColor=BLUE,
            spaceBefore=8,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.3,
            leading=13.2,
            textColor=INK,
            spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=MUTED,
        ),
        "callout": ParagraphStyle(
            "callout",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=14,
            textColor=NAVY,
            borderColor=LINE,
            borderWidth=0.75,
            borderPadding=8,
            backColor=colors.white,
            spaceAfter=10,
        ),
        "center": ParagraphStyle(
            "center",
            parent=base["BodyText"],
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=NAVY,
        ),
    }


S = styles()


class Rule(Flowable):
    def __init__(self, color=LINE, height=1):
        super().__init__()
        self.color = color
        self.height = height

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.height)
        self.canv.line(0, 0, self.width, 0)


def p(text: str, style: str = "body") -> Paragraph:
    return Paragraph(text.replace("&", "&amp;"), S[style])


def bullet(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item), leftIndent=10) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=14,
        bulletFontSize=6,
    )


def tag_table(rows: list[list[str]], widths: list[float] | None = None) -> Table:
    data = [[p(str(cell), "small") for cell in row] for row in rows]
    table = Table(data, colWidths=widths, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.35, LINE),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def page_header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, A4[1] - 0.42 * inch, A4[0], 0.42 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(0.55 * inch, A4[1] - 0.27 * inch, "NAMMA KSP - Intelligent Crime Analytics Platform")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(A4[0] - 0.55 * inch, A4[1] - 0.27 * inch, "Karnataka State Police Datathon 2026")
    canvas.setStrokeColor(LINE)
    canvas.line(0.55 * inch, 0.42 * inch, A4[0] - 0.55 * inch, 0.42 * inch)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(0.55 * inch, 0.26 * inch, "Synthetic prototype data only. AI output requires officer review before operational use.")
    canvas.drawRightString(A4[0] - 0.55 * inch, 0.26 * inch, f"Page {doc.page}")
    canvas.restoreState()


def doc_template(path: Path) -> SimpleDocTemplate:
    return SimpleDocTemplate(
        str(path),
        pagesize=A4,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.6 * inch,
    )


def cover(title: str, subtitle: str) -> list:
    flow = [Spacer(1, 0.15 * inch)]
    logo = ROOT / "backend" / "karnataka_emblem.png"
    if logo.exists():
        flow.append(Image(str(logo), width=0.62 * inch, height=0.62 * inch, hAlign="LEFT"))
        flow.append(Spacer(1, 0.08 * inch))
    flow.extend(
        [
            p(title, "title"),
            p(subtitle, "subtitle"),
            Rule(SAFFRON, 2),
            Spacer(1, 0.16 * inch),
        ]
    )
    return flow


def build_demo_script(path: Path):
    flow = cover(
        "5-Minute Video Demo Script",
        "A precise voiceover and click-path script for presenting NAMMA KSP as a role-based crime intelligence platform.",
    )
    flow.append(p("Demo Objective", "h1"))
    flow.append(
        p(
            "Show that NAMMA KSP is not a static dashboard: it is a deployed Catalyst-backed police workspace where each role sees useful evidence, analytics, AI assistance, network context, map intelligence, and report generation.",
            "callout",
        )
    )

    timeline = [
        [
            "Time",
            "Screen / Action",
            "Voiceover Script",
        ],
        [
            "0:00-0:30",
            "Open live app, show login, sign in as Analyst.",
            "This is NAMMA KSP, an intelligent conversational AI and crime analytics platform for Karnataka Police. It connects FIRs, accused/offender records, victims, locations, socio-economic indicators, financial signals, and relationship data into one investigation workspace. The deployed build is running on Zoho Catalyst Web Client Hosting and AppSail.",
        ],
        [
            "0:30-1:05",
            "Show role-based landing and analytics overview.",
            "The system detects the user role and loads only the workspace relevant to that role. Analysts see pseudonymized statewide patterns, investigators see case-level leads, supervisors see command queues, policymakers see aggregate planning views, and administrators see governance and system controls.",
        ],
        [
            "1:05-1:45",
            "Open charts and drilldowns for monthly trend / district / crime type.",
            "Here the platform moves beyond retrieval. It identifies dominant crime types, district pressure, status backlog, active case volume, seasonal movement, and evidence-backed drilldowns. Each analytical claim can be traced back to source FIR counts and related entities.",
        ],
        [
            "1:45-2:20",
            "Open Heatmap / district view.",
            "The map gives spatial intelligence across Karnataka. Investigators and analysts can identify hotspots, compare districts, and move from geographic signals to supporting records. This supports proactive prevention and district-level planning.",
        ],
        [
            "2:20-3:05",
            "Open Network Analysis, select an individual suspect, click a node/edge.",
            "The criminal network view links accused, victims, FIRs, locations, and financial signals. In individual mode, clicking a node opens verified details for that exact entity, and clicking an edge explains the relationship evidence. This helps reveal repeat offenders, shared victims, case clusters, and possible organized crime links.",
        ],
        [
            "3:05-3:45",
            "Open AI assistant and ask a focused KSP query.",
            "The assistant answers only within the NAMMA KSP police intelligence domain. It uses the verified dataset context, respects role disclosure rules, gives concise answers for simple questions, and expands only when the question requires deeper reasoning. It supports English and Kannada, speech-to-text, text-to-speech, and conversation export.",
        ],
        [
            "3:45-4:25",
            "Open reports and generate/download a case or district report.",
            "The reporting layer turns analysis into reviewable output: case reports, district reports, offender dossiers, network reports, and recommendation briefs. Reports include evidence context and are archived for governance.",
        ],
        [
            "4:25-4:50",
            "Show Administrator or Supervisor governance view.",
            "For governance, NAMMA KSP includes role-based permissions, audit logs, system health, Catalyst service checks, alert workflows, and deployment evidence. Administrators can inspect identity coverage and service status while supervisors handle alerts and command review.",
        ],
        [
            "4:50-5:00",
            "Close on readiness / submission value.",
            "NAMMA KSP is built for the challenge: conversational crime intelligence, network analysis, criminology-based profiling, socio-demographic insight, forecasting, explainability, governance, and Catalyst-backed deployment in one working prototype.",
        ],
    ]
    flow.append(PageBreak())
    flow.append(p("Five-Minute Timeline", "h1"))
    flow.append(tag_table(timeline, [0.8 * inch, 1.65 * inch, 4.0 * inch]))

    flow.append(PageBreak())
    flow.append(p("Recording Runbook - Exact Click Path", "h1"))
    flow.append(p("Use this page while recording. Keep the browser at 100 percent zoom, open only the live NAMMA KSP tab, and complete the actions in order.", "body"))
    runbook = [
        ["Step", "Open / Click", "What should appear"],
        ["1", f"Open {LIVE_APP}", "NAMMA KSP login screen with role-aware sign-in."],
        ["2", "Username: analyst / Password: analyst123 / Sign in", "Analyst workspace loads with analytics navigation."],
        ["3", "Dashboard -> monthly trend or category chart", "Chart tooltip or drilldown reveals the supporting crime records."],
        ["4", "Dashboard -> district overview -> choose Hubballi-Dharwad", "District metrics, pressure indicators, and related evidence appear."],
        ["5", "Heatmap -> select a hotspot or district", "Map selection opens district-level crime concentration details."],
        ["6", "Network -> Individual view -> click a person node", "The selected entity and its verified FIR relationships are shown."],
        ["7", "Click a relationship edge", "Evidence for that relationship is shown, including the connected case/entity."],
        ["8", "Chat -> ask: Explain forecast and early warning signals for Hubballi-Dharwad", "Focused answer with verified context and evidence references."],
        ["9", "Reports -> choose a district or case report -> Generate", "A reviewable PDF/report preview is produced for download."],
        ["10", "Switch to Administrator or Supervisor only if time allows", "Governance, audit, health, alerts, and command review surfaces appear."],
    ]
    flow.append(tag_table(runbook, [0.45 * inch, 3.15 * inch, 2.85 * inch]))
    flow.append(p("Presenter wording for the evidence transition", "h2"))
    flow.append(p("This is the core workflow: a signal is discovered in analytics, located geographically, connected to related entities, questioned through the assistant, and converted into a reviewable report. Every step is intended to end in evidence, not a decorative screen.", "callout"))
    flow.append(p("Do not claim", "h2"))
    flow.append(bullet(["Do not describe synthetic demo records as real police data.", "Do not present an AI suggestion as a confirmed fact or operational instruction.", "Do not expose API keys, environment variables, or production credentials on camera."]))

    flow.append(PageBreak())
    flow.append(p("Presenter Checklist", "h1"))
    flow.append(
        bullet(
            [
                f"Open live frontend: {LIVE_APP}",
                "Use Analyst login for statewide analytics and network demonstration.",
                "Use Investigator or Supervisor login if showing case-scoped PII and command actions.",
                "Click at least one chart/drilldown, one map district, one network node, one network edge, and one report action.",
                "Keep AI prompt specific: 'Explain forecast and early warning signals for Hubballi-Dharwad' or 'Summarize FIR00001 with evidence trail.'",
                "Mention that all demo/test records are synthetic and all AI output needs officer review.",
            ]
        )
    )

    flow.append(p("Recommended Demo Credentials", "h1"))
    flow.append(
        tag_table(
            [
                ["Role", "Username", "Password", "Best demo use"],
                ["Administrator", "admin", "admin123", "Governance, users, audit, service health"],
                ["Investigator", "officer", "officer123", "Assigned FIRs, case leads, timelines, reports"],
                ["Analyst", "analyst", "analyst123", "Trends, hotspots, network analysis, explainability"],
                ["Supervisor", "supervisor", "supervisor123", "Command queue, alerts, aging cases, approvals"],
                ["Policymaker", "policymaker", "policy123", "Aggregate trends, prevention, resource priorities"],
            ],
            [1.15 * inch, 1.0 * inch, 1.0 * inch, 3.25 * inch],
        )
    )

    flow.append(p("Backup Lines If Network Is Slow", "h1"))
    flow.append(
        bullet(
            [
                "The backend health endpoint confirms the dataset is loaded and the deployment is alive.",
                "The frontend is hosted separately from the backend, so the UI can still load while AppSail cold-starts.",
                "The system falls back to local synthetic data for continuity when a managed Catalyst service is unavailable.",
            ]
        )
    )

    doc_template(path).build(flow, onFirstPage=page_header_footer, onLaterPages=page_header_footer)


def build_system_details(path: Path):
    flow = cover(
        "Full System Details",
        "Architecture, role design, data model, AI controls, Catalyst services, APIs, deployment evidence, and submission readiness for NAMMA KSP.",
    )
    flow.append(p("Executive Summary", "h1"))
    flow.append(
        p(
            "NAMMA KSP is a working police-intelligence prototype for the Karnataka State Police Datathon 2026 challenge. It combines role-based dashboards, conversational AI, crime analytics, hotspot maps, individual criminal network inspection, offender profiling, report generation, audit trails, and Catalyst deployment.",
            "body",
        )
    )
    flow.append(
        tag_table(
            [
                ["Metric / Evidence", "Current deployed value"],
                ["Live frontend", LIVE_APP],
                ["AppSail backend", BACKEND],
                ["Loaded FIR records", "5,000 synthetic FIRs"],
                ["Offenders / victims / relationships", "2,000 offenders / 3,000 victims / 5,000 relationships"],
                ["Enrichment data", "20 financial transactions, 15 socio-economic district records"],
                ["Verified live smoke", "Login, bootstrap, individual network evidence click, map canvas"],
            ],
            [2.0 * inch, 4.5 * inch],
        )
    )

    flow.append(p("Problem Statement Coverage", "h1"))
    flow.append(
        tag_table(
            [
                ["Challenge area", "NAMMA KSP implementation"],
                ["Conversational Crime Intelligence", "English/Kannada chat, role-scoped responses, voice interaction, report export"],
                ["Criminal Network Analysis", "Accused, victim, FIR, district, station and financial-link graph with evidence inspector"],
                ["Crime Pattern and Trend Analytics", "Monthly trends, category mix, district pressure, case status and drilldowns"],
                ["Sociological Insights", "District social indicators and risk correlation views"],
                ["Offender Profiling", "Repeat offender flags, prior FIR count, risk category and dossier report"],
                ["Decision Support", "Case summary, similar cases, leads, timelines, forecast and alert queues"],
                ["Financial Link Analysis", "Uploaded financial transaction file joined to FIR/offender context"],
                ["Forecasting and Early Warning", "Moving-average signals, alert workflow, Cron refresh, supervisor review"],
                ["Explainable AI", "Source rows, verified entity checks, evidence trail and audit logs"],
                ["Secure Governance", "Catalyst/demo auth modes, five role contracts, server-enforced capability checks"],
            ],
            [2.1 * inch, 4.35 * inch],
        )
    )

    flow.append(PageBreak())
    flow.append(p("Role-Based Workspaces", "h1"))
    flow.append(
        tag_table(
            [
                ["Role", "Disclosure", "Primary modules", "Operational purpose"],
                ["Investigator", "Case-scoped PII", "Assigned cases, FIR search, suspect networks, similar cases, leads, financial leads, timeline", "Solve assigned cases with evidence and report outputs"],
                ["Analyst", "Pseudonymized", "Crime trends, hotspots, demographics, network, MO, seasonal, socio-economic, financial, forecast, explainability", "Find statewide/district patterns without exposing direct identifiers"],
                ["Supervisor", "Command-scoped PII", "Workload, station performance, aging cases, delay tracker, officer review, alerts, forecast review, command audit", "Coordinate command action and accountability"],
                ["Policymaker", "Aggregate only", "State overview, district comparison, trends, hotspots, demographics, prevention, resources", "Plan prevention policy without case-level exposure"],
                ["Administrator", "Administrative metadata", "Users, access grants, audit integrity, service health, model/deployment status", "Manage platform governance and operational readiness"],
            ],
            [0.95 * inch, 1.05 * inch, 2.65 * inch, 1.9 * inch],
        )
    )

    flow.append(p("Architecture", "h1"))
    arch_rows = [
        ["Layer", "Components"],
        ["Frontend", "React/Vite client served through Catalyst Web Client Hosting; role-aware navigation and interactive dashboards"],
        ["Backend", "FastAPI on Catalyst AppSail with Python 3.12 runtime and bundled dependencies"],
        ["Data", "SQLite continuity store seeded from synthetic CSVs, with Catalyst Data Store/NoSQL adapter paths"],
        ["Analytics", "Pandas/SQL aggregations, cached overview, network graph, forecast, sociological and financial analysis"],
        ["AI", "Groq model routing with deterministic entity validation guardrails; QuickML prediction endpoint integration"],
        ["Voice", "Sarvam STT, TTS and translation configuration through Catalyst environment variables"],
        ["Reports", "ReportLab PDFs for case, district, offender, network, recommendations and chat exports"],
        ["Governance", "RBAC, audit logs, report archive, alert lifecycle, service evidence matrix"],
    ]
    flow.append(tag_table(arch_rows, [1.35 * inch, 5.15 * inch]))

    flow.append(PageBreak())
    flow.append(p("Catalyst Service Usage", "h1"))
    catalyst_rows = [
        ["Service", "Use in NAMMA KSP"],
        ["AppSail", "Managed FastAPI runtime for backend APIs"],
        ["Web Client Hosting / Slate", "Hosted frontend application"],
        ["Authentication", "Role identity source, with demo fallback enabled for judging continuity"],
        ["API Gateway", "Configured routing/security evidence for API access"],
        ["Data Store", "Managed table probes and event metadata paths"],
        ["NoSQL", "Evidence/audit append path for semi-structured intelligence events"],
        ["Stratus", "Report object persistence path for generated PDFs"],
        ["Cache", "Analytics and network payload caching strategy"],
        ["QuickML", "Published endpoint configuration for predictive scoring"],
        ["Cron / Job Scheduling", "Daily intelligence refresh and operational job ledger"],
        ["Signals", "Early-warning event publisher/rule integration"],
        ["Zia Services", "Configured evidence for text/AI service usage; voice handled via Sarvam"],
        ["SmartBrowz", "Report/browser automation verification pathway"],
        ["Mail / Push", "Notification endpoint scaffolding and audit events"],
        ["Pipelines", "Submission CI/CD evidence flag and deployment workflow"],
    ]
    flow.append(tag_table(catalyst_rows, [1.55 * inch, 4.95 * inch]))

    flow.append(p("Key API Surface", "h1"))
    api_rows = [
        ["Endpoint", "Purpose"],
        ["/api/health", "Runtime, dataset and ER schema health"],
        ["/api/frontend/bootstrap", "Complete authenticated role workspace contract"],
        ["/api/analytics/*", "Overview, trends, districts, sociological, financial, forecast, explainability"],
        ["/api/analytics/drilldown", "Role-safe evidence-backed drilldowns"],
        ["/api/firs and /api/firs/{id}", "FIR search and detail"],
        ["/api/offenders/{id}", "Offender profile"],
        ["/api/network", "Criminal network graph data"],
        ["/api/chat", "Conversational crime intelligence"],
        ["/api/tts, /api/audio-transcribe, /api/translate", "Voice and bilingual support"],
        ["/api/reports/*", "PDF generation, archive, downloads and QR report access"],
        ["/api/users, /api/audit/logs, /api/system/status", "Admin/governance operations"],
    ]
    flow.append(tag_table(api_rows, [2.05 * inch, 4.45 * inch]))

    flow.append(PageBreak())
    flow.append(p("Data Model and Evidence", "h1"))
    flow.append(
        bullet(
            [
                "FIR records carry crime type, date, district, police station, status, offender reference, victim reference and location reference.",
                "Offender profiles carry age, gender, district, previous FIR count and risk category.",
                "Victim and relationship tables connect the case graph for network analysis.",
                "Location data supplies district, station and coordinates for hotspot intelligence.",
                "Financial transactions add sender/receiver accounts, amount, channel, risk flag and FIR linkage.",
                "Socio-economic indicators support district-level correlation with urbanization, migration, unemployment, literacy, income and density.",
            ]
        )
    )

    flow.append(p("AI Reliability Controls", "h1"))
    flow.append(
        bullet(
            [
                "Domain guardrails keep AI responses inside KSP/crime-intelligence scope.",
                "Intent parser extracts FIR IDs and entity-like references before LLM calls.",
                "Verified record lookup prevents hallucinated details for missing FIRs or suspects.",
                "Response-depth routing keeps simple questions concise and expands only for analytical questions.",
                "Role and disclosure mode are part of the backend workspace contract, not just frontend display logic.",
                "AI output remains advisory and must be reviewed before operational use.",
            ]
        )
    )

    flow.append(p("Deployment Verification", "h1"))
    flow.append(
        tag_table(
            [
                ["Check", "Result"],
                ["AppSail health", "OK, 5,000 FIRs and complete synthetic data loaded"],
                ["OpenAPI route", "/api/frontend/bootstrap present"],
                ["Frontend smoke", "Login, workspace load, network node click, edge data and map canvas passed"],
                ["Reports API", "Returns 200; archive empty until reports are generated"],
                ["Startup issue fixed", "FIR seed now uses explicit column insert for clean AppSail containers"],
            ],
            [1.65 * inch, 4.85 * inch],
        )
    )

    flow.append(p("Operational Notes", "h1"))
    flow.append(
        bullet(
            [
                "The prototype uses synthetic data and should not be connected to real police records without a formal data-protection review.",
                "For production, keep Catalyst native authentication and role mapping enabled, disable public demo credentials, and require official KSP account provisioning.",
                "Store keys only in Catalyst environment variables or a secure secret manager; never commit API keys to GitHub.",
                "For evaluation, demo mode is enabled to avoid login failures during judging while preserving server-side roles.",
            ]
        )
    )

    doc_template(path).build(flow, onFirstPage=page_header_footer, onLaterPages=page_header_footer)


def main():
    demo = OUT / "NAMMA_KSP_5_Minute_Video_Demo_Script.pdf"
    details = OUT / "NAMMA_KSP_Full_System_Details.pdf"
    build_demo_script(demo)
    build_system_details(details)
    print(demo)
    print(details)


if __name__ == "__main__":
    main()
