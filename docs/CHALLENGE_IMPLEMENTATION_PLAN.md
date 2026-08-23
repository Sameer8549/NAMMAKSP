# NAMMA KSP Challenge Implementation Plan

## Objective

Deliver a verifiable crime-intelligence platform for the ten KSP challenge
capabilities. A capability is complete only when its data path, backend logic,
user workflow, evidence trail, failure behavior, tests, and Catalyst deployment
can all be demonstrated.

## Definition of done

Every capability must satisfy all of these gates:

1. Uses synthetic demo data with explicit provenance and no claim of live KSP data.
2. Exposes a typed backend API with validation and role enforcement.
3. Appears in an investigator-facing workflow, not only a service-status screen.
4. Includes source records, confidence, limitations, and an audit event.
5. Has deterministic tests for core calculations and failure paths.
6. Uses the configured Catalyst service in AppSail; local fallbacks are only for
   development continuity and are visibly reported as fallbacks.
7. Passes desktop/mobile browser verification and PDF layout verification.

## Challenge capability map

| # | Challenge capability | Product workflow | Primary Catalyst services | Completion gate |
|---|---|---|---|---|
| 1 | Conversational crime intelligence | English/Kannada chat, follow-ups, voice, local PDF export | AppSail, Data Store Search, NoSQL evidence, Cache, QuickML, Zia/Sarvam | Entity-grounded answers, citations, context tests, STT/TTS/translation tests |
| 2 | Criminal network analysis | Interactive association graph and offender ego-network | AppSail, Data Store, Cache, Stratus | Accused/victim/location/account/FIR links, community and repeat-network evidence |
| 3 | Crime pattern and trend analytics | State, district, seasonal, event and MO drilldowns | Data Store, Cache, QuickML, Cron | Click-through analytics backed by dated FIR records and cached calculations |
| 4 | Sociological insights | District risk-factor workbench | Data Store, QuickML, NoSQL evidence | Joined demographic and socio-economic indicators with correlation caveats |
| 5 | Offender profiling | Repeat/habitual offender profile and priority score | Data Store, QuickML/Zia AutoML, Cache | Calibrated score, factor contributions, history, MO and investigator-readable limits |
| 6 | Investigator decision support | Case summary, timeline, similar cases and lead queue | AppSail, Search, QuickML, NoSQL, Stratus | Deterministic case facts plus ranked, evidence-linked leads |
| 7 | Financial transaction links | Money-trail graph and suspicious cluster drilldown | Data Store, NoSQL, Cache, Signals | Transaction-to-account-to-entity-to-FIR path with scored reasons |
| 8 | Forecasting and early warning | Forecast validation, hotspot alerts and warning inbox | QuickML, Cache, Cron/Jobs, Signals, Functions | Back-tested forecast metrics, alert lifecycle, scheduled refresh and event evidence |
| 9 | Explainable AI | Evidence drawer, reasoning path and model card | NoSQL, Data Store, QuickML, Stratus | Every analytical claim maps to source IDs, method, confidence and limitations |
| 10 | RBAC and governance | Catalyst identity, role views, audit ledger and exports | Authentication, API Gateway, Data Store, NoSQL, Stratus | Server-enforced roles, immutable-style audit entries, redaction and traceability tests |

## Role-based operational model

Roles are resolved from Catalyst Authentication and enforced in FastAPI before
data is queried. Frontend visibility is secondary and is never treated as the
security boundary.

### Investigator workspace

- Purpose: investigate assigned cases and discover actionable links.
- Default dashboard: assigned/open FIRs, case timelines, similar cases, offender
  history, relationship graph, evidence-linked AI assistant and report actions.
- Allowed detail: assigned-case PII, accused/victim records required for the
  investigation, evidence references, investigation status and lead queue.
- Restricted: statewide policy exports, user administration, model publishing,
  raw audit administration and unassigned sensitive cases unless elevated.
- Scope controls: assigned cases, police station and authorized districts.

### Crime Analyst workspace

- Purpose: identify patterns, networks, hotspots and emerging risks.
- Default dashboard: trends, seasonal/event analysis, MO clusters, network
  communities, socio-demographic factors, financial links and forecast quality.
- Allowed detail: pseudonymized analytical records and drilldown to permitted
  source IDs; aggregate exports with provenance.
- Restricted: unnecessary victim contact details, account administration and
  operational case changes.
- Scope controls: authorized analytical geography and approved datasets.

### Supervisor workspace

- Purpose: supervise investigations, resources, alerts and accountability.
- Default dashboard: case pressure, ageing, high-risk queue, alert inbox,
  investigator workload, SLA breaches, evidence coverage and approval queue.
- Allowed detail: cases and personnel within the command hierarchy, alert
  assignment/acknowledgement, report approval and audit review.
- Restricted: platform configuration and cross-command access without a grant.
- Scope controls: command unit, districts and subordinate teams.

### Policymaker workspace

- Purpose: evaluate statewide trends and prevention policy without operational PII.
- Default dashboard: aggregated district trends, demographic and socio-economic
  patterns, prevention outcomes, forecast bands and resource-planning indicators.
- Allowed detail: de-identified aggregate analytics, methodology, confidence,
  limitations and policy reports.
- Restricted: names, direct identifiers, victim narratives, account numbers,
  investigator identities and case-level evidence unless separately authorized.
- Scope controls: statewide aggregates with minimum-group-size suppression.

### Administrator workspace

- Purpose: govern identity, configuration, service health and audit integrity.
- Default dashboard: Catalyst service probes, users/roles, access grants, audit
  ledger, retention jobs, model registry, deployments and incident diagnostics.
- Allowed detail: identity metadata and platform configuration required for
  administration; security/audit events.
- Restricted: routine investigative content by default. Administrator is not a
  universal investigator role; exceptional access must be purpose-logged.
- Scope controls: platform administration with step-up authorization for
  sensitive evidence access.

## Authorization matrix

| Capability | Investigator | Analyst | Supervisor | Policymaker | Administrator |
|---|---:|---:|---:|---:|---:|
| Assigned FIR detail and timeline | Full | Pseudonymized | Command scope | No | Exceptional access |
| Victim/accused direct identifiers | Case scope | Masked | Command scope | No | No by default |
| Network and financial link drilldown | Case scope | Analytical scope | Command scope | Aggregate | Configuration only |
| State/district trend analytics | District | Authorized scope | Command scope | Aggregate statewide | Service health |
| Offender risk profile | Case scope | Pseudonymized | Command scope | Aggregate | Model diagnostics |
| AI case assistance | Case scope | Analytical | Command review | Aggregate policy | Configuration/testing |
| Create investigation reports | Yes | Analytical reports | Approve/export | Policy reports | Templates only |
| Assign/resolve alerts | Assigned | Recommend | Yes | Read aggregate | Configure routing |
| View operational audit events | Own actions | Dataset lineage | Command scope | Governance aggregate | Full security ledger |
| Manage users, roles and deployment | No | No | No | No | Yes |

Backend permissions will use named capabilities such as `case:read_assigned`,
`analytics:read_pseudonymized`, `alert:assign`, `report:approve`,
`policy:read_aggregate`, and `platform:admin`. This avoids hard-coding role names
through every route and supports future KSP rank/command mappings.

## Five dashboard designs

The application retains one design system and navigation shell, but the landing
workspace, KPIs, alerts, actions and drilldowns are composed from the signed-in
user's server-issued capabilities.

1. Investigator Command Desk: case queue, timeline, evidence coverage, linked
   entities, similar cases and next-best investigative actions.
2. Crime Analysis Workbench: interactive pattern, temporal, hotspot, MO,
   sociological, financial and network analytics with source drilldowns.
3. Supervisor Operations Board: district/team workload, ageing, high-risk cases,
   alert lifecycle, approvals, audit exceptions and deployment of resources.
4. Policymaker Intelligence Brief: privacy-preserving statewide indicators,
   prevention scenarios, forecast uncertainty and policy-impact reports.
5. Administrator Governance Console: Catalyst services, identities, roles,
   retention, data lineage, model versions, audit integrity and release health.

No dashboard will contain placeholder cards. Every displayed metric must include
its timestamp, dataset scope, calculation method and drilldown or evidence link.

## Data protection and law-enforcement governance

### Data classification

- Public: product documentation and synthetic-data disclosure.
- Internal: aggregate operational metrics with no direct identifiers.
- Confidential: case metadata, pseudonymized analytical records and model outputs.
- Restricted: victim/accused PII, financial identifiers, narratives and evidence.

Classification labels travel with API responses and report metadata. Restricted
fields are projected only after authorization; they are not fetched and then
hidden in the browser.

### Privacy and security controls

- TLS through Catalyst hosting/API Gateway; Catalyst-managed encryption at rest.
- Server-side field projection, masking and deterministic pseudonymization.
- Data minimization by role, purpose and geography.
- Minimum cohort thresholds for policymaker demographic views.
- PII redaction before external AI, voice or translation calls.
- No secrets, raw credentials, production PII or generated reports in Git.
- Input validation, parameterized queries, upload limits and MIME validation.
- Rate limits for login, search, chat, report and administrative routes.
- Short-lived sessions, secure cookies, CSRF protection and explicit logout.

### Audit and traceability

Every sensitive action records:

- event ID, timestamp and correlation/request ID;
- Catalyst user ID, role, command scope and purpose;
- action, resource type and resource ID;
- data classification and fields disclosed;
- source IP/device metadata allowed by policy;
- decision/result, fallback provider and error category;
- model/prompt version, evidence IDs and confidence for AI actions;
- report object version and hash for generated artifacts.

Audit records are append-only at the application layer, stored in Catalyst Data
Store/NoSQL, exported to Stratus for retention evidence, and visible only within
the authorized audit scope. Local SQLite remains a development-only continuity
path and is not the deployed source of governance truth.

### Retention and accountability

- Configurable retention classes for chat evidence, reports, alerts and audit logs.
- Scheduled retention review, archival and deletion jobs with dry-run evidence.
- Legal-hold marker that prevents deletion of held records.
- Model cards, dataset versions, validation metrics and approval state.
- Human decision ownership: forecasts and risk scores support, never replace,
  authorized police judgment.
- Visible synthetic-data, limitation and non-production disclaimers for the demo.
- Audit export and incident review workflow for supervisory accountability.

## Catalyst implementation ledger

| # | Catalyst service | Real implementation target | Verification evidence |
|---|---|---|---|
| 1 | Functions | Dashboard refresh, event consumer and scheduled intelligence functions | Function invocation ID and job ledger |
| 2 | AppSail custom OCI | Not selected: managed Python runtime is the safer required architecture | Recorded architecture decision, no false usage claim |
| 3 | AppSail managed runtime | FastAPI APIs and managed SDK request context | Live health/runtime probe |
| 4 | Web Client Hosting/Slate | Existing static operational frontend | Hosted page and asset checks |
| 5 | Domain Mapping | Map only after ownership of a real domain is proven | Catalyst mapping and TLS certificate |
| 6 | Data Store | FIR, entity, event, access and governance tables | Read/write probe and row evidence |
| 7 | NoSQL | AI evidence bundles, lineage and semi-structured model traces | Insert/read evidence ID |
| 8 | Stratus | Versioned PDF/report/audit-manifest objects | Upload/list/download/hash verification |
| 9 | Cache | Analytics/network/forecast payload cache | Cold/hot latency and cache provider |
| 10 | Search | Indexed FIR/entity retrieval for global search and chat grounding | Managed search provider and source IDs |
| 11 | QuickML LLM/RAG | Use only a provisioned RAG/serving endpoint; current external LLM remains separately disclosed | Endpoint invocation and grounded retrieval evaluation |
| 12 | QuickML pipeline | Published FIR-status/forecast comparison pipeline | Pipeline/model/endpoint IDs and prediction |
| 13 | Zia AutoML | Trained, validated tabular model only if service/data supports it | Model ID, validation metrics and model card |
| 14 | Zia Services | Text analytics and approved document OCR workflow | SDK result stored with source hash |
| 15 | Zia voice | Use when Kannada/English voice models are provisioned; otherwise disclose Sarvam | Live STT/TTS/translation provider evidence |
| 16 | SmartBrowz | Managed HTML-to-PDF or screenshot workflow after layout parity | Generated PDF bytes and visual QA |
| 17 | Authentication | Five Catalyst roles/capability claims and scoped sessions | Five test users and route denial tests |
| 18 | API Gateway | Auth, routing, throttling and protected internal routes | Gateway route/rate-limit tests |
| 19 | Connections | Create only for a genuine OAuth provider | Authorized connection and token invocation |
| 20 | Cron/Jobs | Forecast refresh, retention review and evidence manifest jobs | Cron/job IDs and successful runs |
| 21 | Signals/Event Functions | FIR/report/alert events and consumer function | Publisher/event/rule delivery log |
| 22 | Cross-app Signals | Activate only if a second KSP app consumes events | Cross-app publisher/consumer evidence |
| 23 | Circuits | Multi-step report/alert workflow where available in the IN data center | Circuit ID and execution trace; otherwise platform-unavailable evidence |
| 24 | Mail | Approved report/alert email after sender verification | Verified sender and delivery result |
| 25 | Push | Web alerts for opted-in Catalyst users | Permission, recipient and delivery result |
| 26 | Pipelines | Test, package, deploy and smoke-test workflow | Pipeline run and deployed commit |

Services marked “not selected,” unavailable in the project data center, or
blocked by ownership/verification are reported honestly. They are not converted
to “active” through environment flags.

## Catalyst service policy

### Core, must be invoked in the deployed workflow

- AppSail managed runtime
- Web Client Hosting
- Serverless Functions
- Data Store and Search
- NoSQL
- Stratus
- Cache
- QuickML pipeline/model/endpoint
- Authentication
- API Gateway
- Cron or Job Scheduling
- Signals
- Pipelines

### Valuable when provisioned and demonstrable

- Zia AutoML for a separately validated tabular risk model
- Zia OCR/Text Analytics for uploaded case-document extraction
- Zia voice services where the project account exposes suitable language models
- SmartBrowz for managed HTML-to-PDF generation after parity with the existing
  bilingual report layout is proven
- Push Notifications for assigned Catalyst users
- Mail after a sender/domain is verified

### Not forced for a score

- Custom OCI runtime: the managed Python AppSail runtime is the correct fit.
- Custom domain: presentation improvement, not crime-intelligence capability.
- Connections: only needed for a real OAuth provider.
- Cross-app Signals: unnecessary until a second application participates.
- Circuits: use only when the service is enabled and the workflow genuinely
  needs durable multi-step orchestration.

## Delivery sequence

### Phase 1: Managed data and evidence foundation

- Validate request-scoped AppSail SDK initialization.
- Make FIR/offender/network reads prefer Data Store in deployed mode.
- Persist AI evidence and analytical provenance to NoSQL.
- Store generated reports in Stratus and verify download/list/QR flows.
- Use Catalyst Search for global and conversational entity retrieval.
- Add runtime probes and tests that distinguish managed success from fallback.

### Phase 1A: Identity and authorization foundation

- Create Catalyst roles for Investigator, Analyst, Supervisor, Policymaker and
  Administrator, plus synthetic judge accounts.
- Create a server-owned role-to-capability policy and district/command grants.
- Replace broad route checks with capability dependencies and field projections.
- Add role-switch test fixtures, denial tests and audit assertions.
- Build each role's dashboard composition from `/api/workspace/me`.

### Phase 2: Intelligence reliability

- Add a structured intent and entity plan before LLM generation.
- Build an evidence bundle with FIR, offender, victim, relationship, location,
  transaction and socio-economic source identifiers.
- Add deterministic response validation for IDs, arithmetic and unsupported claims.
- Add context-aware bilingual response shaping and latency instrumentation.
- Persist prompt-independent evidence metadata, not sensitive free-form text.

### Phase 3: Advanced analytical workbenches

- Add MO, temporal, seasonal and event pattern analysis.
- Add community detection, centrality, shared-account and repeat-network scoring.
- Add socio-economic correlation with sample size and confounder warnings.
- Add financial path tracing and suspicious-cluster reason codes.
- Add offender factor contributions and similar-case retrieval.
- Add forecast back-testing metrics and QuickML comparison.

### Phase 4: Automation and governance

- Cache expensive overview/network/forecast payloads in Catalyst Cache.
- Refresh forecasts and alerts using Cron/Job Scheduling and Functions.
- Publish and consume early-warning events through Signals.
- Add alert acknowledgement, assignment and resolution audit states.
- Enforce server-side role permissions and PII redaction.
- Produce a submission evidence manifest from live runtime probes.

### Phase 5: Release gate and Catalyst deployment

- Run unit, API, security, analytics and report tests.
- Verify login, chat, keyboard/voice, network, heatmap, offender, reports, QR,
  audit and role workflows in desktop and mobile browsers.
- Deploy AppSail, client, and required functions to Development.
- Invoke every managed-service probe against the deployed runtime.
- Promote only after no critical fallback is used in a judged workflow.

## Approval checkpoints

Implementation proceeds only after approval of this plan, then pauses at these
checkpoints for a concise diff, test result and tradeoff summary:

1. Role/capability model and five dashboard contracts.
2. Managed data/evidence services and migration verification.
3. Intelligence, network, financial, sociological and forecasting upgrades.
4. Automation, notifications and governance controls.
5. Final browser/PDF/security verification and Catalyst deployment.

## Release metrics

- Cached dashboard responses: target under 50 ms at the application layer.
- Chat greetings/simple lookups: concise; analytical requests: evidence structured.
- Unsupported entity hallucination rate in deterministic tests: 0%.
- Forecast output includes validation error and baseline comparison.
- Every report download and QR resolves after an AppSail restart through Stratus.
- Every privileged action emits an actor, role, action, resource and timestamp.
- No credentials, secrets, real PII, or generated reports are committed.
