# NAMMA KSP Challenge Coverage

This document maps the ten challenge capabilities to demonstrable product evidence. The live authenticated source of truth is `GET /api/submission/readiness`.

| # | Capability | Status | Demonstration evidence |
|---|---|---|---|
| 1 | Conversational crime intelligence | Implemented | Context-aware English/Kannada chat, Sarvam language ID, translation, speech-to-text, text-to-speech, and conversation PDF export. |
| 2 | Criminal network analysis | Implemented | Interactive FIR-offender-victim-location graph, focused offender networks, centrality, communities, and repeat links. |
| 3 | Pattern and trend analytics | Implemented | Monthly/yearly trends, crime mix, district comparison, hotspots, density, and emerging clusters. |
| 4 | Sociological insights | Prototype | District crime-demographic analysis joined to sourced literacy and population-density indicators. Missing source fields remain visibly incomplete. |
| 5 | Offender profiling | Implemented | Repeat-offender detection, transparent risk scoring, behavioral factors, linked cases, and dossier PDF. |
| 6 | Investigator decision support | Implemented | Case summaries, related cases, available FIR chronology, recommendations, and report exports. |
| 7 | Financial link analysis | Prototype | Suspicious account graph and FIR linkage using explicitly labelled synthetic AML-style demonstration transactions. |
| 8 | Forecasting and early warning | Prototype | Explainable moving-average forecasts, district deviations, persistent alerts, and scheduled-refresh-compatible endpoint. |
| 9 | Explainable AI | Implemented | Evidence trails, source tables, transparent risk factors, confidence guidance, and auditable sensitive actions. |
| 10 | Access and governance | Prototype | Automatic role detection, protected APIs, admin/investigator permissions, persistent audit logs, and report archive. |

## Dataset Evidence

- 5,000 FIR records
- 2,000 offender records
- 3,000 victim records
- 100 location records
- 5,000 relationship records
- 20 synthetic AML-style transaction examples linked to FIR evidence
- 15 district socio-economic rows with sourced literacy and population density

## Honest Deployment Boundary

NAMMA KSP is a datathon prototype, not a production police records system. Live bank feeds, official census/economic APIs, production identity federation, retention controls, and a validated forecasting model require governed source systems and operational validation outside this repository. The architecture provides integration points without presenting synthetic or incomplete data as official evidence.
