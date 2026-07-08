# Ethics, Bias, and Human Oversight

NAMMA KSP is an investigative decision-support prototype. It should assist
trained personnel; it must not replace lawful investigation, supervisory review,
or evidence-based decision making.

## Bias Risks

Risk scoring and hotspot analytics can encode bias even when they look
mathematical:

- Geographic signals can become proxies for socioeconomic status, caste,
  community, migration status, housing instability, or policing intensity.
- Prior FIR counts can reflect historical enforcement patterns as much as actual
  offending behavior.
- District-level indicators can overgeneralize individuals who live in or move
  through high-risk areas.
- Victim/offender demographic fields may be incomplete, inconsistent, or
  misclassified.
- AI summaries can overstate confidence if retrieved evidence is sparse.

The current dataset is synthetic, so these risks are demonstrated rather than
measured against real Karnataka policing data.

## Current Mitigations

- Risk scoring is explainable and based on visible factors: previous FIR count,
  active FIR count, and configured risk category.
- AI answers are instructed to cite retrieved evidence for numeric claims.
- The app includes audit logging for sensitive views, report generation, and
  administrative actions.
- Cloud LLM and voice calls pass through a PII redaction layer before provider
  requests where text is sent.
- A visible synthetic-data notice prevents demo outputs from being mistaken for
  live KSP/CCTNS records.

## Planned Mitigations Before Production

- Validate scoring against real outcomes with false-positive and false-negative
  analysis by district, age band, gender, and other legally approved fairness
  slices.
- Add model cards for every scoring, forecasting, and classification component.
- Require supervisor review for high-risk labels, early-warning alerts, and
  recommended investigative actions.
- Track overrides: when investigators reject or modify an AI recommendation, the
  reason should be captured for audit and future calibration.
- Separate "area risk" from "person risk" clearly in the UI to avoid assigning
  neighborhood-level patterns to individuals.
- Conduct periodic legal, operational, and civil-rights review before expanding
  data sources.

## Data Retention Policy

For the prototype:

- Demo CSV data and generated reports may be reset or deleted at any time.
- No real KSP records should be uploaded to this repository.
- API keys and credentials must remain outside Git history.

For production:

- Retention periods must be approved by the responsible law-enforcement and
  data-protection authority.
- Offender profiles, generated reports, voice transcripts, audit logs, and
  exported PDFs need separate retention schedules.
- Access to retained data should be role-based, logged, and reviewable.
- Deletion, archival, and legal-hold workflows must be defined before live data
  onboarding.

## Human-In-The-Loop Statement

Any AI-flagged high-risk designation, hotspot warning, offender profile, or
investigative recommendation is an intelligence aid, not a finding of guilt and
not an instruction to act. A trained investigator or supervisor must review the
underlying evidence, consider alternative explanations, check legal thresholds,
and approve any operational action.

The system should show why a risk or alert was generated, what data was used,
what is missing, and how confident the analysis is. When evidence is weak, the
UI and reports should say so plainly.
