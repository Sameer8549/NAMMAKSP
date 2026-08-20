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
| Catalyst QuickML | Published model endpoint and tested adapter | Pipeline/model/endpoint IDs plus `/api/quickml/predict` | Keep the endpoint key server-side |
| Police FIR ER database | Implemented for synthetic demo | Complete schema, deterministic seeder, FK/cardinality validation, live health evidence | Keep the normalized ER store authoritative for analytics |

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

## Synthetic ER Migration Rules

- Existing FIR, offender, victim, location, district, station, status, and crime
  labels are preserved from the bundled synthetic CSVs.
- `SourceOffenderID` and `SourceVictimID` are NAMMA KSP provenance extensions
  that preserve repeat-person links across case-scoped ER records.
- Courts, officers, KGIDs, crime numbers, and case numbers are deterministic
  synthetic placeholders and are visibly labelled synthetic.
- No arrest, complainant, chargesheet, religion, caste, occupation, or official
  legal-section fact is inferred when the source CSV does not provide it.
- A `DEMO/UNSPECIFIED` legal association records that the legal act/section is
  absent from the source instead of inventing an IPC/BNS provision.

## ER-Backed Intelligence

- FIR detail responses include a labelled ER evidence block with CaseMaster,
  status/category/gravity, crime heads, station/district, occurrence, accused,
  victim, and legal-association records.
- AI context receives the same ER evidence whenever a FIR identifier is queried.
- Criminal-network edges are built from CaseMaster-Accused and
  CaseMaster-Victim relationships while source IDs preserve repeat-person links.
- Case and investigation reports inherit this evidence through the shared FIR
  detail contract.
