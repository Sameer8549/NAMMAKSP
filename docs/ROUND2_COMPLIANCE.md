# NAMMA KSP Round 2 Compliance Baseline

This baseline maps the strict 26-capability Catalyst checklist and the Police
FIR ER specification to evidence in this repository. It intentionally separates
working runtime integrations from console resources, adapters, fallbacks, and
features that are not required. All bundled records are synthetic demo data.

## Current Position

| Area | Status | Repository evidence | Remaining work |
|---|---|---|---|
| Web frontend | Implemented | `frontend/`, Catalyst client configuration | Final browser regression test |
| Managed Python backend | Implemented | FastAPI AppSail configuration | Final deployed API regression test |
| Conversational intelligence | Implemented | Context-aware KSP-only chat, evidence sources, English/Kannada | Ground retrieval in the ER model |
| Voice and translation | Implemented with Sarvam | STT, TTS, language detection, translation routes | Zia voice is optional unless provisioned |
| Network and offender intelligence | Implemented | FIR/offender/victim graph, risk factors, repeat links | Rebuild edges from ER entities |
| Trends, hotspots, early warning | Implemented prototype | Analytics, explainable forecast, alert/job ledger | Validate through scheduled Catalyst run |
| Reports and QR archive | Implemented locally | ReportLab PDFs, QR links, archive metadata | Use Stratus only when runtime storage is configured |
| Authentication and RBAC | Implemented with demo fallback | Catalyst adapter plus Admin/Investigator checks | Disable `DEMO_MODE` before real-data use |
| Catalyst QuickML | Published model endpoint configured | Pipeline/model/endpoint IDs in runtime configuration | Invoke through a tested adapter |
| Police FIR ER database | Not yet compliant | Current SQLite schema is simplified | Implement and seed the full ER structure |

## ER Source-of-Truth Gaps

The current `firs`, `offenders`, `victims`, `locations`, and `relationships`
tables do not yet represent the supplied CaseMaster-centered ER model. The
required migration must add CaseMaster, ComplainantDetails, Victim, Accused,
ArrestSurrender, Act, Section, ActSectionAssociation, CrimeHead,
CrimeSubHead, CrimeHeadActSection, geography/unit tables, employee lookups,
case lookups, ChargesheetDetails, and explicit FK/cardinality validation.

The two source-document ambiguities are resolved as follows:

1. Incident date/location fields remain on CaseMaster for compatibility, while
   one-to-one `InvOccurrenceTime` is the normalized authoritative entity.
2. ArrestSurrender retains optional `AccusedMasterID` for compatibility, while
   `InvArrestSurrenderAccused` is the authoritative multi-accused junction.

## Catalyst Classification

| Tier | Services | Treatment |
|---|---|---|
| Foundation | Web Client Hosting, AppSail managed runtime, Data Store, Authentication, API Gateway, Pipelines | Required for the corresponding deployed feature |
| Core intelligence | QuickML, Zia AutoML when trained, Zia Services when provisioned, Cron, Signals | Implement only with runtime evidence |
| Workflow | Stratus, Cache, SmartBrowz, Circuits, Mail, Push | Use only when the feature and prerequisites exist |
| Not required for this MVP | Custom OCI/Docker, cross-app Signals, OAuth Connections, NoSQL, custom domain | Do not manufacture a feature solely to claim a service |

## Delivery Sequence

1. Freeze the ER ambiguity resolutions.
2. Add the complete relational schema and integrity tests.
3. Transform and seed synthetic demo data into the ER entities.
4. Add Catalyst Data Store/search/storage/cache/QuickML adapters with explicit fallbacks.
5. Ground chat, network, analytics, and reports in ER-backed evidence.
6. Verify authentication, API Gateway, Cron, Signals, deployment, and judge flows.

No checklist item is considered complete merely because a console resource or
environment variable exists. Completion requires code, runtime configuration,
and a repeatable verification result.
