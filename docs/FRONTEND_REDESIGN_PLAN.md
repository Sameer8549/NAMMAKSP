# NAMMA KSP Frontend Redesign Implementation Plan

## 1. Outcome

Rebuild the existing NAMMA KSP frontend as a live operational product while preserving:

- Existing URLs and page layout: header, sidebar, content area, drawers.
- FastAPI, Catalyst, role/capability, report, PDF, QR, chat, voice and translation APIs.
- Current static deployment compatibility.
- The existing `frontend/` as the release target.

The redesign must remove theory-style summaries, fake controls, generic role relabeling, excessive card walls, broken theme states, horizontal drift and inaccessible dead ends.

## 2. Frontend Architecture

Use compiled React islands inside the current static pages instead of converting the product into a new SPA.

### Toolchain

- Vite: compile versioned browser assets into `frontend/assets/app/`.
- React 19: stateful workspaces, drawers and interconnected actions.
- TanStack Query: request cache, background refresh, stale/error state and request deduplication.
- TanStack Table: headless FIR, audit, user, report and queue behavior with sorting, filtering and pagination.
- Apache ECharts: time series, comparison, distribution, confidence bands and accessible chart/table pairs.
- React Flow: criminal-network and evidence-chain exploration.
- Carbon React: the single visible enterprise UI kit for controls, tables, overlays, status, forms, pagination, skeletons and notifications.
- Zod: validate API payloads before rendering.
- Lucide: consistent interface icons.
- Existing Leaflet map engine: preserve the working geographic implementation.
- Existing CSS tokens: consolidate into one KSP design layer rather than adding another theme.

No operational number, warning, user, FIR, entity or service state may be defined in frontend source. Static copy is limited to labels, help text and empty/error states.

## 3. Shared Product Shell

Keep the current header/sidebar/content geometry, but rebuild behavior as one shared shell.

### Header

- Role-scoped command search.
- Live data freshness indicator with last successful refresh.
- Role-scoped notification inbox with meaningful counts.
- Kannada/English control.
- Light/dark theme with tested contrast.
- User menu and logout.

### Sidebar

- Generated only from `/api/workspace/me` navigation.
- No hidden links and no access-denied destinations.
- Active state based on route and workspace view.
- Mobile bottom navigation for the four most important role actions; remaining items open in the drawer.

### Shared interaction contract

- Selecting a district updates district context across charts, alerts and report actions.
- Selecting an FIR opens an in-place evidence drawer; it never reloads the dashboard.
- Selecting a network node opens the authorized entity record and related FIRs.
- “Ask AI” passes the selected FIR, district, signal or entity reference.
- “Generate report” passes the current filters and evidence scope.
- Browser back/forward restores the selected filter and drawer state.

## 4. Visual System

Direction: a modern police operations console, not a marketing dashboard.

- Command navy shell, evidence-white working area, police blue selection, intelligence teal verified state, Karnataka saffron primary action and threat red only for genuine warnings.
- Dense 12-column desktop grid; 8-column tablet; 4-column mobile.
- Maximum 8px radius for operational surfaces.
- Full-width workbenches and ledgers; cards only for repeated entities or compact metrics.
- No gradients, glass, 3D tilt, WebGL decoration, oversized empty panels or nested cards.
- Charts use consistent category colors and always include a table or textual evidence alternative.
- Skeleton loading, actionable empty states and recovery-oriented errors.
- Motion only for state: 120ms press, 180ms hover, 240ms drawer; reduced-motion support.

## 5. Role Products

### Investigator: Case Desk

First viewport:

1. Pending-action count and next required case action.
2. Assigned-case worklist with priority, status, age and evidence completeness.
3. Scoped alert rail for assigned cases and district.
4. Recent changes timeline: evidence added, status changed, similar case found.

Primary workflow:

`Assigned case -> FIR evidence drawer -> timeline/entities/evidence/similar cases -> Ask AI or trace network -> generate report`

Permitted modules: assigned FIR search, case AI, district context, case network, linked offenders, case financial links, own reports and profile.

### Analyst: Crime Analysis Workbench

First viewport:

1. Filter ribbon: time, district, crime type and modus operandi.
2. Linked trend and crime-comparison charts.
3. Emerging hotspot and forecast-deviation queue.
4. Pseudonymized network-community and financial-pattern summaries.

Primary workflow:

`Pattern selection -> linked district/time/network drilldown -> evidence methodology -> validate/dispute/needs-more-data -> analytical report`

All entity labels come exactly from the pseudonymized backend response.

### Supervisor: Command Operations Board

First viewport:

1. Open backlog, ageing SLA, pending escalations and team closure rate.
2. Workload by officer with backlog and ageing indicators.
3. Escalation/reassignment queue with server-confirmed actions.
4. Evidence-quality exceptions and command warnings.

Primary workflow:

`Exception -> command-scoped case -> evidence quality -> reassign/escalate/acknowledge -> audit confirmation`

### Policymaker: State Intelligence Brief

First viewport:

1. Total FIRs, closure rate, improving districts and safety trend.
2. Aggregate district comparison matrix.
3. Socio-economic correlation and methodology panel.
4. Long-horizon forecast and resource-allocation evidence.

Primary workflow:

`State indicator -> district comparison -> contributing aggregate factors -> policy AI -> strategic report`

No FIR, offender, victim, officer-assignment or transaction-level component is rendered.

### Administrator: Governance Console

First viewport:

1. Active users, API/runtime health, pending access work and data-quality score.
2. Security exceptions: failed auth, anomalous access and stale credentials.
3. Catalyst/integration status with real provider state and last probe.
4. Release gates, job health, audit integrity and governance recommendations.

Primary workflow:

`Exception -> user/service/audit evidence -> confirmed admin action -> refreshed state and audit event`

No crime analytics or person/case records appear in this workspace.

## 6. Page Workbenches

### FIR and case evidence

- TanStack server-backed table.
- Search, status, district, date and priority filters.
- Expandable row for lightweight summary; drawer for full evidence.
- Timeline, linked entities, related cases and report action.
- Supervisor-only reassign/escalate controls rendered from capabilities.

### District intelligence

- Map and ranked table remain synchronized.
- District selection drives trend, crime mix, status, forecast and socio-economic evidence.
- Drawer has one internal scroll container and persistent header; action bar remains in normal document flow.

### Network analysis

- React Flow graph with typed nodes and edges.
- Search, filters, fit-to-view, isolate-neighbors and evidence panel.
- Analyst labels pseudonymized; Investigator/Supervisor labels authorized and scoped.

### AI assistant

- ChatGPT/Gemini-style conversation layout without decorative labels.
- Context chip displays the backend-confirmed FIR/district/entity context.
- Structured response sections render as native blocks, not raw Markdown tables.
- Automatic speech after a user-initiated chat session, with visible stop control.
- Out-of-domain questions receive a concise KSP-scope refusal.

### Reports

- Generator and archive are separate views.
- Job progress, completion, QR and download state come from real endpoints.
- Role tier is visible as metadata and travels with each report.
- Existing PDF generation code is not changed during frontend work.

## 7. Interconnection Model

Create one browser state contract:

```text
role + capabilities + disclosure tier
current district + date range + crime type
selected FIR/entity/signal
source route + return route
```

- URL query parameters hold shareable non-sensitive filters.
- Sensitive selections remain in session state.
- TanStack Query keys include role, scope and filters to prevent cross-role cache leakage.
- Logout clears every query cache, selected entity and audio state.
- Re-authentication rebuilds navigation and data from the backend contract.

## 8. Delivery Phases

### Phase 0: Baseline and safety

- Capture screenshots and automated behavior of every existing page.
- Inventory every API response and action.
- Freeze PDF/report behavior with regression tests.
- Define role-navigation and disclosure assertions.

Exit gate: reproducible baseline and rollback commit.

### Phase 1: Foundation

- Add Vite React-island build without changing URLs.
- Add tokens, Query client, API validation, shared shell and capability rendering.
- Implement theme, focus, mobile navigation, loading and error primitives.

Exit gate: shell works for all roles with no content redesign yet.

### Phase 2: Five role homes

- Build each home independently in this order: Investigator, Analyst, Supervisor, Policymaker, Administrator.
- Connect every metric and queue to existing APIs or add the precise backend aggregation required.
- Do not move to the next role until desktop/mobile/light/dark tests pass.

### Phase 3: Core workbenches

- FIR/evidence drawer.
- District map and analytics.
- Network and offender intelligence.
- Forecast and financial workspaces.
- Admin users, audit and health.

### Phase 4: Chat and reports

- Context-aware chat renderer, voice states and bilingual behavior.
- Role-safe report generator/archive UI.
- PDF/QR/download regression verification.

### Phase 5: Interconnection and hardening

- Cross-workspace context transfer.
- Keyboard controls and back/forward restoration.
- Performance, accessibility and security testing.
- Catalyst deployment and live smoke test.

## 9. Acceptance Gates

Every phase must pass all of the following:

- No hardcoded operational values.
- No inaccessible feature is present in DOM or navigation.
- No cross-role query cache leakage.
- Every visible button causes a real state change, API request, navigation or download.
- No horizontal viewport overflow at 390, 768, 1024 and 1440 pixels.
- Light and dark text contrast meets WCAG AA.
- Keyboard access for navigation, tables, menus, drawers and chat.
- Charts have accessible evidence alternatives.
- Drawer focus is trapped and restored on close.
- API failures preserve the last verified value and show timestamp plus retry.
- Core dashboard cached response is visible within one second locally.
- No console errors or failed requests during the five role walkthroughs.
- Existing PDF, QR, download, translation, STT and TTS tests remain green.

## 10. Definition of Done

The redesign is complete only when all five role walkthroughs can be demonstrated end to end, every visible value traces to an API response, every action is persisted or navigates to a working surface, and Catalyst deployment passes the same browser matrix as local deployment.

## 11. Version 2 Screen-Level Execution Specification

This section removes interpretation from implementation. It defines exactly how the product fills the viewport, stays alive, and connects work between roles.

### 11.1 Density and blank-space policy

"No empty space" means no unexplained blank region, fixed-height placeholder or oversized decorative padding. It does not mean eliminating the spacing needed to scan evidence.

- Desktop content occupancy target: 78-88% of the visible content viewport after the shell.
- Tablet occupancy target: 75-86%.
- Mobile occupancy target: one continuous working column with no empty fixed-height regions.
- Every first viewport contains a command/filter strip, evidence state, primary analytical surface and actionable queue.
- Panels use content-driven height. Fixed heights are permitted only for maps, graphs and virtualized tables with an explicit internal scroll region.
- Empty datasets render a compact state containing scope, last refresh, why no records matched and one valid next action.
- Loading states preserve the final grid using skeleton rows and chart frames.
- Errors preserve the last verified payload, mark it stale, show failure time and provide retry. They never collapse into a blank panel.
- Long pages use sticky filter/tool bars and section navigation; they do not create giant visual gaps between unrelated cards.

### 11.2 Alive-state model

The product must communicate change through evidence, not decorative animation.

- A shared live-data controller owns polling, reconnect and stale state.
- System summary and role notification counts: refresh every 15 seconds while visible.
- Dashboard aggregates: refresh every 60 seconds, immediately on focus only when stale.
- FIR/evidence detail: refresh on explicit action, mutation success or reconnect; no wasteful interval.
- Running report/job: adaptive polling at 2 seconds, then stop at completion/failure.
- Network and district data: refresh when filters change or the user selects refresh.
- Every surface shows `Live`, `Refreshing`, `Updated <time>`, `Stale`, or `Offline`.
- New values cross-fade and briefly mark changed rows; charts interpolate only changed series.
- New alerts enter the role queue and update the count without reloading the page.
- No fake counters, random progress, automatic carousel, 3D tilt, perpetual pulse or decorative live dot.

TanStack Query keys must include:

```text
[role, disclosureMode, districtScope, commandScope, surface, filters]
```

Logout destroys the QueryClient and sensitive session state. A role change is a new authenticated workspace, never a client-side toggle.

### 11.3 Shared desktop frame

Use the existing layout dimensions, rebuilt internally as a 12-column operational grid.

```text
58px header
232px role navigation | flexible command canvas

Row A: page mission + live state + 1-3 primary commands
Row B: sticky query/filter ribbon
Row C: 3-5 compact evidence metrics
Row D: primary workbench (8 columns) | action/exception queue (4 columns)
Row E: full-width evidence ledger or linked analytical surface
```

- Header is never duplicated inside pages.
- Page title is 24px maximum; panel title 16px maximum.
- Primary commands are visible text buttons; utilities are icon buttons with tooltips.
- The filter ribbon is one horizontal system, not separate filter cards.
- Tables receive the maximum available width and use sticky headers.
- Drawers are 520-680px desktop workspaces, not narrow sidebars; complex investigations become a dedicated split view.

### 11.4 Shared mobile frame

```text
54px header
context summary
horizontal filter trigger row
priority metric strip
primary evidence surface
action queue
64px role bottom navigation
```

- Maps/graphs get a fixed 42dvh viewport and a synchronized evidence list beneath.
- Tables switch to two-column record rows only when columns cannot remain meaningful.
- Drawers become full-height sheets with sticky header and one scrolling body.
- No horizontal page scrolling. Intentional horizontal scrolling is limited to filter chips or chart time ranges and is visibly indicated.

## 12. Exact Role Dashboard Blueprints

### 12.1 Investigator Case Desk

First viewport, 12-column desktop:

```text
[Next required action: 4 cols][Assigned active][Overdue][Evidence gaps][Scoped alerts]
[Assigned case ledger: 8 cols                              ][Officer alert queue: 4 cols]
```

Assigned case ledger columns:

- Priority.
- FIR ID.
- Crime type.
- District/station.
- Status.
- Days open derived from FIR date.
- Evidence completeness from real evidence references.
- Last update.
- One `Open case` action.

Selecting a row changes the right rail from alerts to case preview without leaving the dashboard. `Open full evidence` expands a 60/40 split workspace:

```text
[case timeline + evidence chain: 60%][identities + leads + similar cases: 40%]
```

Interconnections:

- Case -> case-context AI.
- Accused -> authorized offender profile.
- Relationship -> scoped network subgraph.
- Financial reference -> case transaction ledger.
- Report -> prefilled case report job.

No statewide trend chart appears on the Investigator home.

### 12.2 Analyst Crime Analysis Workbench

First viewport:

```text
[sticky dependent filters: date -> district -> crime type -> MO]
[Pattern count][New hotspot count][Deviation queue][Networks under review][Validation accuracy]
[Linked temporal explorer: 8 cols                         ][Validation queue: 4 cols]
[Crime comparison: 4][District matrix: 4][MO/seasonality: 4]
```

Temporal explorer:

- Multi-series line/area chart with normalized comparison mode.
- Brush/zoom time range.
- Clicking a point creates a persistent filter token.
- Underlying aggregated table is available in the same panel.

Validation queue:

- Signal, district, observed movement, baseline, confidence and evidence count.
- `Validate`, `Dispute`, `Needs more data` call the existing forecast review endpoint.
- Successful validation removes the item and emits the persisted state returned by the API.

Network, offender and financial drilldowns always render backend pseudonyms.

### 12.3 Supervisor Command Operations Board

First viewport:

```text
[Backlog][SLA breaches][Pending escalation][Closure rate][Evidence quality]
[Officer workload + ageing matrix: 7 cols][Escalation queue: 5 cols]
[District risk table: 5 cols][Command warning timeline: 7 cols]
```

Officer workload matrix:

- Officer.
- Active cases.
- Cases older than SLA.
- Critical/high priority.
- Closure rate.
- Evidence-gap count.
- Capacity state derived from command average.

Selecting an officer filters the case ledger and command audit together. Reassignment requires confirmation, calls the real endpoint, waits for success, invalidates workload/case/audit queries and displays the returned assignee.

### 12.4 Policymaker State Intelligence Brief

First viewport:

```text
[FIR trend][Closure rate][Improving districts][Strategic risk][Data confidence]
[State trend + forecast band: 8 cols                      ][Strategic findings: 4 cols]
[District benchmark matrix: 7 cols][Socio-economic correlation: 5 cols]
```

- District matrix compares normalized rates/indices, not raw case identities.
- Correlation view always shows methodology, sample coverage and confidence.
- Resource scenario compares baseline vs proposed allocation only when a real backend result exists.
- Strategic findings link to aggregate district drilldowns and policy report generation.
- No FIR drawer, network node, offender card or transaction record component is bundled for this role.

### 12.5 Administrator Governance Console

First viewport:

```text
[Active users][API uptime][Access work][Data quality][Release readiness]
[Service dependency matrix: 8 cols                        ][Security queue: 4 cols]
[Identity/role coverage: 5 cols][Audit integrity timeline: 7 cols]
```

Service dependency matrix:

- Service.
- Provider.
- State.
- Last probe.
- Latency.
- Recent failures.
- Required configuration.
- Real verify/action command when authorized.

Security queue:

- Failed login spikes.
- Stale accounts.
- Role coverage gaps.
- Pending access decisions.
- Failed scheduled jobs.

No crime count, district crime ranking, FIR or person-level component is requested or rendered.

## 13. Cross-Role Operational Chain

The dashboards are interconnected through persisted backend events, not through shared unrestricted client data.

```text
Analyst validates emerging signal
  -> forecast review is persisted
  -> Supervisor command warning appears
  -> Supervisor assigns/acknowledges action
  -> Investigator scoped alert/case action appears
  -> Investigator adds evidence/generates report
  -> Supervisor sees report/evidence-quality update
  -> Policymaker receives only refreshed aggregate outcome
  -> Administrator receives audit, job and service events only
```

Required event envelope:

```json
{
  "event_id": "server-generated",
  "event_type": "forecast.validated",
  "occurred_at": "UTC timestamp",
  "actor_role": "Analyst",
  "scope": { "district": "...", "command": "..." },
  "resource_ref": "non-sensitive reference",
  "result": "success"
}
```

Frontend rules:

- The server decides event visibility.
- Each role receives a differently framed queue item from its authorized endpoint.
- Client code never translates an Administrator event into crime intelligence or enriches an Analyst event with identity data.
- Mutations invalidate only affected role/scoped query keys.
- Every completed mutation exposes its audit/event reference in the success confirmation.

## 14. Route and Component Replacement Map

| Existing route | React workbench | Primary kit/components |
|---|---|---|
| `dashboard.html` | Five role home compositions | Carbon grid, tiles, data table, inline notification, skeleton |
| `dashboard.html?view=firs` | FIR search and case evidence | TanStack table model, Carbon toolbar/pagination, split drawer |
| `chat.html` | Context-aware crime assistant | Conversation timeline, context rail, voice session controls |
| `heatmap.html` | District intelligence | Leaflet, ECharts, synchronized evidence table |
| `network.html` | Network/evidence graph | React Flow, Carbon filters and details panel |
| `network.html?view=financial` | Financial link workbench | ECharts Sankey/graph where supported, evidence ledger |
| `offenders.html` | Role-tier offender intelligence | Virtualized result list, behavioral timeline, risk evidence |
| `reports.html` | Report jobs and governed archive | Carbon tabs, progress, data table, download/QR actions |
| `users.html` | Identity and governance | Carbon data table, forms, confirmations and health matrix |

## 15. Backend Gaps to Close Before a Widget Exists

A widget is not built until its API is real. The implementation audit must classify every requirement as `available`, `extend`, or `new`.

Likely explicit aggregations/actions required:

- Investigator assigned-case ageing, evidence completeness and recent changes.
- Supervisor workload by officer, evidence-quality exceptions and report approval queue.
- Policymaker normalized district comparison, improvement count, prevention outcomes and resource scenarios.
- Administrator API latency/error history, access-approval queue and data-quality dimensions.
- Role-scoped notification/event feed for the cross-role chain.

Each new endpoint must enforce capabilities and disclosure before the UI is connected.

## 16. Build Sequence With Visual Gates

1. Baseline every current route at desktop/mobile and both themes.
2. Build the shared compiled shell and Carbon token theme.
3. Build only the Investigator first viewport; verify it before adding its drilldowns.
4. Complete Investigator end-to-end.
5. Repeat the same vertical-slice process for Analyst, Supervisor, Policymaker and Administrator.
6. Replace shared workbenches one at a time.
7. Implement cross-role event invalidation and context transfer.
8. Run complete regression and Catalyst deployment.

For every screen, implementation pauses at these visual gates:

- 1440x900 light.
- 1440x900 dark.
- 768x1024 light/dark.
- 390x844 light/dark.
- Longest real labels and Kannada labels.
- Loading, empty, partial failure, offline and stale states.
- Keyboard-only walkthrough.

No phase is accepted from code inspection alone; screenshots, interaction checks, console logs, request logs and API response evidence are required.

## 17. Production Component Contract

Every component must implement a complete behavior contract before it is allowed into a role workspace:

```text
purpose -> authorized audience -> API/query -> visible states -> user action
-> server result -> cache invalidation -> audit/event reference -> recovery path
```

A component is rejected when it only presents explanatory copy, duplicates another metric, uses a fabricated value, has no response to selection, or cannot identify its data source and refresh time.

### 17.1 Button hierarchy and visibility

- One primary button is permitted per task region. It advances the main workflow.
- Secondary buttons perform valid alternate actions. Tertiary/ghost buttons are reserved for low-emphasis utilities.
- Danger buttons are used only for destructive or difficult-to-reverse actions and require consequence-specific confirmation.
- Labels use a verb plus object: `Open case`, `Trace network`, `Generate report`, `Acknowledge alert`. Generic labels such as `View`, `Go`, `Submit`, `Click here` and `More` are prohibited when the action can be named.
- Icon-only controls are restricted to universally understood utilities such as close, search, refresh and overflow. They require an accessible name and keyboard-visible tooltip.
- Primary task controls target at least 40x40 CSS pixels; compact utilities never fall below the WCAG 24x24 minimum and must retain safe spacing.
- Every control has default, hover, focus-visible, pressed, disabled, loading, success and failure behavior. Focus indicators use a clearly contrasting perimeter at least 2px thick.
- Loading preserves button width, prevents duplicate requests and announces progress. A mutation button remains pending until the server confirms the result.
- Disabled controls include an adjacent reason only when temporarily unavailable. Role-forbidden controls are never rendered.
- Button groups wrap as a unit on narrow screens. Sticky action bars reserve layout space and may not cover records, evidence or scrollable content.
- At most one destructive action appears in a row or footer. Destructive confirmation names both the resource and consequence.

### 17.2 Contrast, status and content visibility

- Light mode uses light working surfaces and dark readable text; dark mode uses dark surfaces and light readable text. A component may not retain colors from the opposite theme.
- Body text and labels meet WCAG AA contrast; controls, boundaries, focus and chart marks meet non-text contrast requirements.
- Color is never the sole signal. Severity includes text plus icon/shape, and the same severity has the same meaning throughout the product.
- Red means confirmed critical/error state, saffron means a primary command or attention state, teal means verified/success, and blue means selection/navigation.
- Text is allowed to wrap where meaning matters. Identifiers remain intact. Truncation is permitted only in dense tables and must expose the full value on focus and hover.
- `Live`, `Stale`, `Offline`, confidence and disclosure labels always include text. Decorative status dots without meaning are prohibited.

### 17.3 Loading, empty, error and partial-data states

- Skeletons mirror the final component geometry and are used for initial retrieval; spinners are limited to short local actions.
- No indefinite loader is allowed. A timed recovery state shows what failed, last verified refresh, retained data status and `Retry`.
- Empty states name the active scope and filters, explain why no records matched, and offer one valid corrective action such as clearing a filter.
- Partial API failure preserves successful sections and labels the failed section. One failed widget must not blank the whole dashboard.
- Optimistic UI is prohibited for case assignment, alert acknowledgement, report completion, role changes and destructive governance actions.

## 18. Drilldown and Context Navigation Contract

Every analytical selection follows three evidence levels:

```text
Level 1: operational overview
Level 2: filtered aggregate evidence and contributing factors
Level 3: authorized FIR/entity/transaction/audit record
```

- A chart point, district, KPI, alert or network node is clickable only when a distinct Level 2 or Level 3 result exists.
- The clicked dimension, date range, district, crime type, role scope and originating surface travel with the drilldown.
- Non-sensitive context is encoded in URL query parameters so refresh and browser history work. Sensitive identifiers remain in authenticated session state.
- Closing a drawer or using browser Back restores the previous filter, selected mark, scroll position and focus target.
- A district selection updates all linked trend, mix, forecast, alert and evidence components. A crime-type selection must not open a generic district panel.
- Drilldowns preserve filter and time context unless the next view explicitly explains a scope change.
- Fast evidence previews use a 520-680px drawer. Multi-step investigation, graph comparison or more than one large table uses a dedicated split workspace.
- Every drilldown header states selection, scope, data freshness and record count. Its body contains evidence, not a repeated summary sentence.
- Every analytical result exposes source records/aggregation, calculation method, confidence/coverage where applicable and valid next actions.
- Requests are cancellable. A newer selection invalidates or ignores an older response so rapid clicking cannot display mismatched evidence.
- Unauthorized depth is removed from the role's response and component tree. It is never represented by an access-denied card.

### 18.1 Chart interaction behavior

- Hover reveals a compact tooltip; click creates a persistent selected state and linked filter token; keyboard focus and activation provide the same result.
- Legends toggle series without changing category meaning. Hidden series are announced in the evidence table state.
- Zoom/brush is used only for time or dense ranges and always has a visible reset command.
- Charts never use fake 3D, WebGL decoration, animation unrelated to new data, or unexplained color palettes.
- Each chart ships with a synchronized accessible table or evidence list using the same filters and values.
- Zero, missing and suppressed values are visually distinct and explained. Empty data never produces an empty chart frame.
- Clicking a chart mark highlights the matching map region/table rows and vice versa when the views share a dataset.

### 18.2 Map and network interaction behavior

- Map selection synchronizes a ranked evidence list; clusters expand into records or aggregate evidence according to role tier.
- Network nodes and edges expose type, confidence, evidence count and source references. Layout position is never presented as analytical evidence.
- `Fit view`, `Reset`, `Isolate neighbors`, search and filters remain visible and keyboard operable.
- Selecting a node opens one authoritative detail surface; it does not redirect through login or reload the workspace.

## 19. Tables, Filters, Tabs and Overlays

### 19.1 Evidence tables

- Use native semantic tables for read-only ledgers and a grid pattern only when cell-level keyboard interaction is genuinely required.
- Every table has a visible title, scope summary, result count and freshness state.
- Toolbar order: search, dependent filters, active-filter count, reset, then role-authorized actions. No more than five top-level toolbar actions.
- Sortable headers use visible direction and `aria-sort`. Server-side sorting/filtering/pagination remain the source of truth for large datasets.
- Pagination sits directly below the table and preserves filters and selection. Page-size changes return to the first valid page.
- Whole-row click is permitted only when the row has one unambiguous destination; otherwise use an explicit `Open case` or overflow action.
- Expandable rows contain short secondary evidence. Full timelines, networks and mutation controls belong in the evidence drawer.
- Column priority is defined per breakpoint; horizontal page overflow is prohibited. Tables may use an explicitly labelled internal horizontal region only when retaining columns is operationally essential.

### 19.2 Filters and search

- Filters form one compact ribbon, not a collection of cards. Dependent options update from the server-derived valid domain.
- Search debounces input, cancels stale requests and supports FIR IDs, authorized names/entities, districts and relevant keywords.
- Applied filters remain visible as removable tokens and survive drilldown/back navigation.
- Each result surface displays the active scope; users must never wonder which district, month or role produced a number.
- Reset returns to the role's authorized default scope, not a statewide unrestricted dataset.

### 19.3 Tabs

- Tabs switch peer views within one workspace; they are not used as disguised navigation between unrelated pages.
- Tabs implement `tablist`, `tab`, `tabpanel`, `aria-selected` and arrow-key behavior.
- Automatic activation is used only when panel content is already available. Remote panels use manual Enter/Space activation to avoid accidental requests.
- Tab labels are short nouns, remain visible in both themes and show counts only when counts carry operational meaning.

### 19.4 Drawers, dialogs and confirmations

- Drawers present contextual evidence while preserving the originating workspace.
- Modal dialogs are limited to blocked decisions, required confirmation or a short focused task. They are not general report/detail containers.
- Dialog focus moves inside on open, is trapped, closes with Escape where safe, and returns to the invoking control.
- Long drawer/dialog content uses one scrolling body, a persistent labelled header and an action footer that never obscures content.
- Destructive confirmation defaults focus to the safe action and states the exact resource and irreversible consequence.

## 20. Notifications and Operational Queues

- Notifications are persisted backend events scoped by role, district/command and disclosure tier. Static notification arrays are prohibited.
- Each item includes event type, severity, occurred time, source, scope, concise consequence, recommended next action and read/acknowledged/resolved state.
- A notification opens the precise evidence context that generated it; it never opens a generic dashboard.
- Actionable notifications persist until the action succeeds or the event is resolved. Informational notices may auto-dismiss only when no decision is required.
- Actionable notification surfaces expose one primary action. Additional operations move to the linked evidence view.
- Toasts report short completion/failure feedback. Inline notifications report local component problems. Callouts explain persistent contextual risk. These patterns are not interchangeable decoration.
- Badge counts reflect unread actionable events and update only from backend state.
- Role mapping:
  - Investigator: assigned-case changes, evidence gaps, scoped alerts and report completion.
  - Analyst: new signals, validation requests, data coverage changes and model drift.
  - Supervisor: escalations, SLA breaches, workload exceptions and evidence quality.
  - Policymaker: material aggregate trend changes and published strategic briefs only.
  - Administrator: auth, service, job, data quality, access and audit integrity events only.

## 21. Static-to-Live Migration Rules

The existing HTML routes remain release entry points while React progressively owns their operational regions.

1. Add a Vite manifest and one versioned bootstrap per route group.
2. Mark each replacement surface with a stable `data-app-root` and server-independent initial skeleton.
3. Mount the shared shell once, then migrate one vertical workflow at a time; remove its legacy handler only after parity tests pass.
4. Centralize API transport, Zod validation, authentication expiry handling, role capabilities, query keys and error normalization.
5. Replace inline `onclick`, duplicated DOM construction and global mutable state with typed React components and explicit mutations.
6. Bundle dependencies locally. No runtime CDN library is permitted in the deployed product.
7. Keep a route manifest and rollback artifact for each migrated slice.
8. Hide incomplete slices behind a build-time feature flag. Never ship `Coming soon`, sample chart values, disabled placeholder actions or synthetic live indicators.

### 21.1 Component admission gate

A component may ship only when all are true:

- Its endpoint/action exists and enforces the required capability.
- Request and response schemas are validated.
- Loading, empty, partial, stale, offline, success and failure states are implemented.
- Its primary pointer and keyboard workflows pass.
- Light/dark and desktop/tablet/mobile screenshots pass.
- It shows real source/freshness metadata where operational data is displayed.
- Its mutations produce a confirmed backend result and audit/event reference.
- There is an automated test proving every visible button performs its stated result.

## 22. Verification Matrix and Zero-Placeholder Gate

### Automated suites

- Playwright role journeys for all five roles, including navigation inventory and absence of forbidden routes.
- Button crawler: enumerate visible enabled controls, activate them in isolated fixtures and assert navigation, request, download or state change.
- API contract tests for every widget across success, empty, partial, malformed, 401, 403, 404, 409, 429 and 500 responses.
- Axe/WCAG checks plus manual keyboard, focus order, focus restoration and 200% zoom checks.
- Visual regression at 1440x900, 1024x768, 768x1024 and 390x844 in light/dark and English/Kannada.
- Drilldown state tests for filter/time preservation, browser Back, scroll restoration, rapid-selection races and stale-request cancellation.
- Mutation tests for duplicate prevention, server rejection, cache invalidation, notification update and audit reference.
- Layout tests fail on document-level horizontal overflow, clipped action bars, overlapping text, nested scroll traps or inaccessible close controls.

### Manual officer acceptance

For each role, an evaluator must complete five realistic tasks without encountering placeholder copy, an access-denied destination, a generic repeated panel or an unexplained number. The walkthrough records:

- Task completion time.
- Click count and navigation reversibility.
- Data source and freshness visibility.
- Whether every decision has supporting evidence.
- Whether failures offer a safe recovery path.
- Whether mobile and keyboard operation preserve the same capability.

Release is blocked by any placeholder value, dead button, fabricated live state, generic drilldown, hidden overflow, unreadable theme state, cross-role data leak or action that claims success before server confirmation.
