# Scalability Notes

This document describes the current scaling posture of the NAMMA KSP prototype.
It intentionally does not refactor the app; it records the first bottlenecks and
the most useful next engineering moves.

## Current Dataset Size

The demo CSV dataset currently contains:

- FIRs: 5,000 rows
- Relationships: 5,000 rows
- Offenders: 2,000 rows
- Victims: 3,000 rows
- Locations: 100 rows
- Financial transactions: 20 rows
- Socio-economic indicators: 15 rows

SQLite loads these CSVs into normalized tables on startup. The current schema
already includes indexes for the common FIR filters: district, crime type, date,
status, offender ID, offender risk category, and financial transaction account
lookups.

## First 10x Bottleneck

At roughly 50,000 FIRs and 50,000 relationships, the first pain point will
likely be the network graph path:

- `backend/network.py` builds an in-memory NetworkX graph for each network API
  call.
- Cytoscape receives the graph in the browser and lays it out client-side.
- Betweenness centrality is still expensive even with the current sampling.

The API currently caps the broad network graph to a few hundred relationships,
which protects the browser during the demo. At 10x scale, the broad "whole
network" view should remain capped, while search/focus routes should become the
primary workflow.

First change at 10x:

1. Keep the UI graph capped to a subgraph selected by district, crime type,
   offender, time range, or connected component.
2. Precompute top offender centrality and community summaries on a scheduled
   job rather than calculating everything during page load.
3. Add explicit indexes on `relationships.offender_id`,
   `relationships.victim_id`, and `relationships.fir_id`.
4. Add paginated FIR search instead of returning up to 200 rows as a single
   table response.

## First 100x Bottleneck

At roughly 500,000 FIRs and 500,000 relationships, SQLite plus per-request graph
construction becomes the larger architectural limit:

- Aggregate dashboard queries will still work for many simple counts if indexed,
  but complex joins and repeated GROUP BY operations will become slower.
- Local PDF generation and report archive storage will need a managed object
  store instead of local AppSail disk.
- Chat grounding will need a retrieval layer that fetches exact rows and
  aggregates without scanning broad tables.
- Browser graph rendering must shift from full graph layouts to server-side
  summarization plus focused neighborhood expansion.

First change at 100x:

1. Move operational tables to Catalyst Data Store or a managed relational
   database with read replicas and migration-managed indexes.
2. Store generated PDFs, report screenshots, and exports in Catalyst Stratus.
3. Materialize daily district/crime/status aggregates for dashboard KPIs,
   forecasting, and early warnings.
4. Move graph analytics to scheduled batch jobs and store centrality,
   communities, and repeat-offender clusters as queryable summary tables.
5. Add a search index for FIR ID, offender ID, district, police station, crime
   type, and text fields used by investigator search.

## Query Notes

Good current patterns:

- FIR search uses parameterized SQL.
- Frequent FIR filters have indexes.
- Network APIs enforce a response-size cap.

Gaps to close before production:

- Relationship table indexes should be added for focused graph expansion.
- Date filters should be paired with district/crime composite indexes if trend
  views become high-traffic.
- Audit logs should be indexed by timestamp, user ID, action, and resource.
- Report archive should be indexed by generated date, report type, and owner.

## Recommended First Engineering Move

The highest-impact next step is not a full rewrite. It is to precompute and
cache intelligence summaries:

- Daily district hotness
- Top repeat offenders
- Network centrality leaders
- Early-warning candidates
- Recent report/audit summary

That keeps the live UI fast, makes Catalyst Cron/Jobs visibly useful, and lets
the AI chat cite stable evidence snapshots instead of triggering expensive work
inside every user request.
