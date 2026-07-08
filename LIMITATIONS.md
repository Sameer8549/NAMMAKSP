# Implementation vs Roadmap

NAMMA KSP is a challenge-complete prototype with several production-hardening
steps already in place. This page frames the remaining gaps as engineering
maturity work for a real law-enforcement deployment.

## Implemented

- Conversational AI for English/Kannada crime intelligence queries.
- Context-aware chat behavior with shorter answers for simple turns and deeper
  analysis for investigative prompts.
- AI response sources for retrieved database context, plus cached fallback when
  the LLM provider is unavailable.
- PII redaction before outbound cloud text requests to Groq/Mistral-compatible
  LLM paths and Sarvam text APIs.
- Catalyst-native authentication integration path with server-side role checks,
  while demo credentials are gated behind `DEMO_MODE=true`.
- Audit logging for sensitive profile views, report generation/downloads, user
  management, advanced intelligence views, and scheduled intelligence jobs.
- FIR search, offender profiling, risk scoring, hotspot analytics, network
  analysis, sociological insight, financial-link analysis, forecasting, and
  explainability endpoints.
- PDF report generation and report archive tracking.
- Synthetic-data disclosure across data views.
- Unit tests for PII redaction, Catalyst auth normalization, model cache/source
  reliability, offender risk scoring, FIR search filtering, and API validation.
- Documentation for security, data provenance, scaling, and ethics.

## Roadmapped Before Production

- Live CCTNS/FIR integration with approved data contracts, field mapping,
  retention rules, and access governance.
- Row-level citations for every AI-generated numeric claim rather than a single
  retrieved-context citation block.
- Production-grade forecasting and scoring validation against real operational
  outcomes.
- Formal bias testing, model cards, approval workflows, and periodic review.
- Fully managed storage for generated reports and large media through Catalyst
  Stratus or an equivalent object store.
- Precomputed graph centrality, daily district aggregates, and cached analytics
  summaries for 10x/100x datasets.
- End-to-end browser tests against a configured Catalyst Authentication tenant.
- Production QuickML/Zia/SmartBrowz provisioning where the service is available
  in the target Catalyst environment.

## Known Prototype Boundaries

- The bundled data is synthetic and should not be treated as official KSP data.
- Financial transaction analysis demonstrates suspicious-link workflows; it is
  not connected to live banking systems.
- Socio-economic analysis uses the uploaded indicator CSV and crime-demographic
  fields; it is not an official census integration.
- Forecasting is explainable and backtested as a prototype, not validated for
  operational deployment decisions.
- Governance and audit features are implemented for demo and hardening, but
  full enterprise compliance requires approved policies, SIEM integration, and
  retention controls.

## Judge-Facing Position

The prototype demonstrates the full intelligence workflow: query, retrieve,
analyze, explain, visualize, report, audit, and improve. The remaining work is
the expected path from hackathon prototype to responsible production system:
connect approved live data, validate models, harden infrastructure, and govern
human decision points.
