# NAMMA KSP - Full System Dossier

Date: 5 September 2026  
Project: Intelligent Conversational AI and Crime Analytics Platform  
Event: Karnataka State Police Datathon 2026  
Status: Final-round synthetic-data prototype  

## One-Line Summary

NAMMA KSP is a role-based crime intelligence platform that lets investigators, analysts, supervisors, policymakers and administrators query synthetic FIR data, inspect evidence-linked analytics, discover relationships between FIRs and entities, generate reports, and use governed AI assistance without overstating prototype evidence as production policing proof.

## Problem Statement Fit

The challenge asks for a conversational AI and crime analytics platform that goes beyond simple lookup. NAMMA KSP addresses this through five connected layers:

1. Natural-language crime intelligence for FIRs, accused, victims, locations, statuses and investigation support.
2. Criminal relationship analysis across FIRs, offenders, victims, locations and financial links.
3. Trend, hotspot, seasonal, modus operandi and district analytics.
4. Socio-demographic and socio-economic risk views for policy-level prevention.
5. Secure role-based governance with audit logs, report trails and explainable outputs.

## Core Product Thesis

Police intelligence work fails when information is split across FIR records, people, places, timelines, transactions and manual reports. NAMMA KSP unifies those signals into one operational surface:

- Ask a question.
- Scope the evidence by role and permissions.
- Retrieve verified platform data.
- Analyze patterns, relationships and risk indicators.
- Show the evidence trail.
- Export or act through an audited workflow.

## Verified Dataset Scope

The prototype uses synthetic demonstration data only.

| Dataset | Count | Use |
|---|---:|---|
| FIR records | 5,000 | Case search, trends, maps, reports and AI answers |
| Offender records | 2,000 | Repeat-offender analysis and profiling |
| Victim records | 3,000 | FIR-to-victim network and demographic views |
| Location records | 100 | Hotspots, maps and geographic analysis |
| Relationship records | 5,000 | Entity graph construction |
| Financial transactions | 20 | AML-style demonstration links |
| Socio-economic district rows | 15 | Literacy, density and social-risk comparison |

## User Roles

### Investigator / Officer

Purpose: move from case lookup to investigation support.

Key capabilities:

- FIR search and case detail review.
- Case timelines and investigation status.
- Similar case discovery.
- Offender and victim links.
- Hotspot and location context.
- AI assistant for case summaries, leads and evidence explanation.
- Report export for local case briefings.

Expected outcome:

- Faster understanding of a case.
- Better lead discovery.
- Reduced manual scanning across records.

### Analyst

Purpose: discover patterns behind crime volume and relationships.

Key capabilities:

- Crime trend analytics.
- Hotspot analysis.
- Evidence registry.
- Demographics and socio-economic risk.
- Network analysis from FIR to accused, victim, location and financial account.
- Modus operandi analysis.
- Seasonal pattern analysis.
- Risk and financial intelligence.

Expected outcome:

- Pattern discovery, not just dashboards.
- Explainable analytics tied to FIR evidence.
- Stronger intelligence products for command and policy teams.

### Supervisor

Purpose: manage workload, aging cases, warnings and operational command risk.

Merged workspace structure:

1. Workload and station performance.
2. Case delays and aging.
3. Officer review.
4. Warnings and forecast review.
5. Command audit.

Key capabilities:

- Workload distribution by officer load bands.
- Station case-resolution performance.
- Aging case review.
- Delay triage and solution planning.
- Early-warning queue.
- Forecast review decisions.
- Assign, acknowledge and resolve command warnings.
- Persistent command audit trail.

Expected outcome:

- Supervisors can see where pressure is concentrated.
- Command decisions are linked to evidence.
- Alert actions survive AppSail replacement/restart.

### Policymaker

Purpose: support state-level prevention and resource planning.

Merged workspace structure:

1. State and district overview.
2. Crime and seasonal trends.
3. Hotspots and resource priorities.
4. Demographics and social risk.
5. Forecast and prevention.

Key capabilities:

- State crime trajectory.
- District comparison.
- Crime-family trend mix.
- Hotspot prioritization.
- Demographic and socio-economic indicators.
- Prevention priority ranking.
- Forecast monitor for planning signals.

Expected outcome:

- Better macro-level prevention planning.
- Transparent district evidence.
- Avoids presenting correlation as causation.

### Admin

Purpose: platform governance and operational readiness.

Key capabilities:

- User and role management.
- Security audit.
- System health.
- AI usage tracking.
- Catalyst service status.
- Backend connectivity check.
- Audit trail and report archive visibility.

Expected outcome:

- Judges and operators can see that the platform has governance, not only screens.
- Sensitive actions are visible in audit logs.

## Conversational AI Design

The AI should answer only from platform evidence. It must not invent unavailable data, legal conclusions or unsupported claims.

### AI Input Sources

- FIR records.
- Offender records.
- Victim records.
- Location records.
- Relationship graph.
- Dashboard metrics.
- Filtered workspace scope.
- Command alerts and audit events.
- Report archive metadata.
- Forecast validation metrics.

### AI Behavior Rules

- Use the user's role to decide what data can be answered.
- Normalize rough user language into clear police-intelligence questions.
- Keep follow-up context so users do not repeat district, case or time filters.
- Give direct answers first.
- Attach evidence references where possible.
- State when a conclusion is association evidence, not proof.
- For forecasting, say "planning signal" unless a validated production model exists.
- For socio-economic analysis, say correlation is not causation.

### Supported Interactions

- English chat.
- Kannada chat.
- Voice input and voice output where provider access is available.
- PDF export of conversation history.
- Role-aware suggested questions.
- Data-aware answers based on the platform's current dataset.

## Analytics System

NAMMA KSP analytics are designed around three principles:

1. Evidence first: every chart should connect back to FIR or entity records.
2. Role specificity: each role sees analytics that match their decision authority.
3. Explainability: charts should show what is measured, why it matters and what action follows.

### Analyst Analytics

High-value views:

- Multi-series crime trend area charts.
- District comparison bars.
- Hotspot map with interactive markers.
- FIR-to-victim-to-accused network graph.
- Community detection with association labels.
- Modus operandi pattern clusters.
- Seasonal crime pattern calendar.
- Socio-economic and financial cross-signal charts.

### Supervisor Analytics

High-value views:

- Officer workload distribution.
- Station performance bars.
- Aging case bands.
- Case delay breakdown.
- Warning lifecycle chart.
- Severity mix chart.
- Command queue with real action buttons.
- Audit trail of every assignment, acknowledgement, resolution and forecast decision.

### Policymaker Analytics

High-value views:

- State crime trajectory.
- District burden ranking.
- Category trend mix.
- Hotspot priority matrix.
- Demographic risk comparison.
- Prevention and resource priority board.
- Forecast planning monitor with confidence and validation limits.

### Admin Analytics

High-value views:

- Authentication and role activity.
- Audit event distribution.
- AI usage by role.
- Service health status.
- Report generation activity.
- Security-sensitive action log.

## Network Intelligence

The network module should reveal relationships from FIR outward:

FIR -> accused -> repeat links -> victims -> locations -> financial accounts -> related FIRs

Important design boundary:

- A cluster means repeated association in the dataset.
- It does not mean legal proof of an organized crime group.
- Every network insight must be traceable to FIR/entity evidence.

Useful graph measures:

- Degree centrality for highly connected entities.
- Community detection for grouped associations.
- Repeat offender count.
- Shared location links.
- Victim-offender-location paths.
- Suspicious financial edge count.

## Forecasting And Early Warning

Forecasting exists as an instrumented prototype, not a certified policing model.

Current verified forecast behavior:

- Model selection across baseline methods.
- Rolling-origin backtest.
- Prediction interval.
- Alert generation.
- Supervisor assignment and review.
- Persistent command snapshot recovery.

Current limitation:

- The synthetic dataset produced high MAPE.
- The forecast should be shown as monitor-only and planning-signal-only.
- It must not be described as statistically validated for enforcement decisions.

## Explainability

The platform explains:

- Which records were used.
- Which filters were active.
- Which role was asking.
- Which metric was calculated.
- Which chart mark or case row supports the answer.
- Which actions were written to the audit log.

Explainability should appear as:

- Evidence references.
- Source table names.
- Confidence or limitation notes.
- Risk-factor breakdowns.
- Downloadable reports.
- Audit event IDs for command actions.

## Reports And Downloads

Reports should never be empty. A report export should include:

- Title and role context.
- Date/time.
- Active filters.
- Summary metrics.
- Evidence rows.
- Chart or analysis summary.
- AI conversation when exporting chat.
- Caveats for synthetic data, forecasts and association evidence.

Report types:

- FIR case brief.
- Analyst intelligence summary.
- Offender dossier.
- Supervisor command review.
- Policymaker prevention brief.
- Admin audit/service health report.
- AI conversation history PDF.

## Progressive Web App

NAMMA KSP is also packaged as a Progressive Web App so the prototype can behave like an installable operational tool rather than a browser-only demo.

Implemented PWA elements:

- Web app manifest in `frontend-next/manifest.webmanifest`.
- Karnataka/KSP branded app icons in `frontend-next/pwa-192.png`, `frontend-next/pwa-512.png` and `frontend-next/favicon.png`.
- Workbox service worker in `frontend-next/sw.js`.
- Cached app shell for faster repeat visits.
- Navigation fallback to the React application shell.
- Catalyst Web Client Hosting delivery under `/app/`.
- Mobile layouts for role dashboards, reports and network analysis.

Operational meaning:

- Users can install the app shell on supported browsers.
- Desktop and mobile users can reopen the platform faster.
- Weak connectivity does not immediately break the static interface shell.
- Protected FIR evidence, AI answers, report generation and command actions still require live authenticated backend APIs.

Important boundary:

- The PWA does not make sensitive police evidence available offline.
- It improves access and resilience of the UI shell, while governance stays server-controlled.

## Security And Governance

Implemented for demo:

- Role-based access.
- Server-side capability checks.
- Audit logs.
- Pseudonymized policy analytics.
- Report archive.
- Sensitive command actions tracked.
- Demo accounts retained for judges.

Production requirements:

- KSP identity federation.
- Formal access-control policy.
- Data retention rules.
- PII governance.
- Model acceptance review.
- Security monitoring.
- Legal approval for real-world deployment.

## Catalyst Deployment Architecture

Runtime services:

- Web Client Hosting for the frontend.
- AppSail for backend runtime.
- API Gateway routes for app access.
- Data Store table for synthetic FIR evidence.
- Cache for analytics and search acceleration.
- Stratus bucket for generated reports.
- Cron endpoint for daily intelligence refresh.
- Signals publisher for early-warning events.
- Pipelines configured for CI/CD flow.

Verified service status:

- 9 verified.
- 0 failed in the latest service verification.

Important deployment boundary:

- SQL command state is the mutable runtime source.
- Catalyst Data Store carries command snapshots and restart recovery evidence.
- Multi-instance concurrent AppSail write consistency should not be claimed until tested under concurrent writers.

## Live Demo Flow

Recommended judge path:

1. Login with demo role.
2. Start with Analyst.
3. Ask the AI a data question about FIRs, districts or offenders.
4. Open Crime Trends and change filters.
5. Open Network Analysis and reveal FIR-to-victim-to-accused links.
6. Export a report.
7. Switch to Supervisor.
8. Assign or review a warning.
9. Open Command Audit to show the action trail.
10. Switch to Policymaker.
11. Show district comparison, prevention priorities and forecast caveats.
12. Switch to Admin.
13. Show system health, audit trail and Catalyst services.

## Problem Statement Coverage Matrix

| Requirement | NAMMA KSP coverage | Boundary |
|---|---|---|
| Conversational crime intelligence | English/Kannada chat, evidence-aware answers, voice path, PDF history | Provider keys and availability must be live |
| FIR/offender/victim/location retrieval | Data-aware search and role dashboards | Synthetic data only |
| Context-aware follow-up | Role and scope context | Must avoid hallucinated records |
| Criminal network analysis | FIR/entity graph, centrality, communities | Association evidence only |
| Crime pattern analytics | Trends, hotspots, category mix, MO, seasonality | Event attribution needs event calendar |
| Sociological insights | District socio-economic joins | Correlation only |
| Offender profiling | Repeat offenders, risk factors, dossiers | Heuristic priority, not legal prediction |
| Decision support | Case summaries, similar cases, leads | Investigator must verify |
| Financial crime links | Transaction-linked demonstration graph | No live bank integration |
| Forecasting and warning | Backtested monitor, alerts, supervisor lifecycle | Monitor-only until validated |
| Explainable AI | Evidence trails and source references | Must remain strict |
| Secure role access | RBAC, audit logs, admin governance | Demo auth kept for judges |

## Strongest Final-Round Message

NAMMA KSP is not just a dashboard. It is a governed intelligence workflow: conversation, evidence retrieval, relationship discovery, analytics, command action and audit all operate as one platform.

The strongest differentiator is the role split:

- Investigators act on cases.
- Analysts discover patterns.
- Supervisors manage operational pressure.
- Policymakers plan prevention.
- Admins govern the system.

## What To Avoid Saying

Do not say:

- "This proves organized crime."
- "Forecasting is production validated."
- "This is ready for real police records without governance."
- "The AI can answer anything."
- "Synthetic data represents real KSP evidence."

Say instead:

- "The network shows association evidence."
- "Forecasts are planning signals with visible backtest metrics."
- "The prototype is deployment-ready for final-round evaluation on synthetic data."
- "Production use requires identity, data-governance and model-acceptance gates."

## Final-Round Slide Story

Suggested deck structure:

1. Title and team.
2. Problem: crime intelligence is fragmented.
3. Solution: role-aware conversational intelligence platform.
4. Live system architecture.
5. Data model and evidence graph.
6. Conversational AI workflow.
7. Analyst workspace.
8. Network analysis.
9. Supervisor command workflow.
10. Policymaker prevention intelligence.
11. Admin governance.
12. Reports and evidence export.
13. Catalyst services.
14. Performance and readiness.
15. Honest limitations and production gates.
16. Closing: from FIR records to preventive intelligence.

## Current Honest Readiness

Ready for:

- Final-round prototype demonstration.
- Synthetic-data judging.
- Role-by-role walkthrough.
- Catalyst deployment verification.
- AI and report workflow demonstration.
- Analytics and network evidence demonstration.

Not yet production-certified for:

- Real KSP records.
- Legal automated conclusions.
- Enforcement-grade forecasting.
- Concurrent multi-instance write guarantees.
- Federated production identity.

## One-Minute Pitch

NAMMA KSP converts FIR data into a governed intelligence platform for Karnataka State Police. An investigator can ask natural-language questions, inspect FIRs, view linked accused and victims, and export evidence reports. An analyst can discover trends, hotspots, modus operandi, demographics, financial links and network relationships. A supervisor can monitor aging cases, workload and warnings, then assign or resolve actions with an audit trail. A policymaker can compare districts, understand social-risk signals and plan prevention with transparent forecast limits. An admin can govern roles, audit activity and verify Catalyst services.

The system is built as a final-round synthetic-data prototype: it is live, role-based, evidence-aware, reportable and honest about limits. It does not claim synthetic associations as legal proof, and it treats forecasting as a planning signal until production validation is complete.
