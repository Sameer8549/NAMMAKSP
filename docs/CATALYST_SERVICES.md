# Zoho Catalyst Services Coverage

NAMMA KSP has a Catalyst Authentication adapter with server-enforced Admin and Investigator roles. The submission deployment currently enables a synthetic demo fallback for cold-start reliability. Requested Catalyst capabilities are classified as runtime-active, configured, fallback, feature-dependent, not required, or externally blocked.

Live evidence endpoint:

```text
GET /api/catalyst/services
```

This endpoint returns the requested Catalyst services, including Authentication:

- service number and capability
- required Catalyst service
- current status
- product feature using it
- evidence endpoint
- environment variables or console setup needed

## Runtime Evidence

| Capability | Catalyst Service | Evidence |
|---|---|---|
| Frontend/static app | Web Client Hosting | Live `/app/index.html` deployment |
| Backend managed runtime | AppSail | `/api/health`, `/api/docs` |
| QuickML model | QuickML | Published FIR-status model/pipeline/endpoint identifiers configured in Development |
| API routing | API Gateway | Active Web Client Hosting routes under `/app/*` |
| Scheduled job target | Cron | Internal endpoint `/api/internal/cron/daily-intelligence-refresh` |
| Event publisher | Signals | Publisher `namma_ksp_events`, ID `6060000000021078`, event `early_warning_alert` |
| CI/CD resource | Pipelines | Pipeline `namma_ksp_ci`; GitHub trigger authorization pending |

Verified Development resources used by the runtime:

- Data Store table `namma_ksp_firs`: `43505000000092002`, populated with synthetic FIR rows.
- Search indexes: `FIR_ID`, `Crime_Type`, `District`, `Police_Station`, and `Status`.
- Cache segment `namma_ksp_analytics`: `43505000000092368`.
- Stratus bucket: `namma-ksp-reports`.

## Code-Ready / Console-Ready

These services have app feature boundaries or console resources, but are not counted as runtime-active until a configured adapter is exercised successfully:

| Catalyst Service | NAMMA KSP Feature |
|---|---|
| Data Store | FIR/offender/victim/relationship relational tables and full-text search |
| NoSQL | Not required for the relational MVP; reserve for a genuine semi-structured evidence workflow |
| Stratus | generated PDF report archive and QR-linked report downloads |
| Cache | dashboard analytics, forecast, and search response caching |
| QuickML | Published tabular FIR-status pipeline; runtime prediction adapter remains to be verified |
| Zia AutoML | Offender risk and forecasting require a trained, validated model before activation |
| Zia Services | initialized OCR/text analytics workspace; API adapter can replace local evidence parsing |
| SmartBrowz | initialized browser-rendering workspace; report adapter can replace ReportLab/PDF fallback |
| Connections | Not required for API-key providers; use only for a genuine OAuth integration |
| Cron / Job Scheduling | daily intelligence refresh endpoint |
| Signals / Event Functions | publisher `namma_ksp_events`, event `early_warning_alert`, and webhook receiver `/api/internal/signals/early-warning` |
| Circuits | app orchestration endpoints are ready; service route currently returns Catalyst 404 in this project console |
| Mail | transactional report and alert delivery after verified sender/domain setup |
| Push Notifications | web push console active; app-side user targeting requires Catalyst-authenticated users |
| Pipelines | automated build and deploy flow |

## Status Meaning

`active` means the live deployment is already using that Catalyst service.

`configured` means the app detects the needed Catalyst environment/resource variable.

`ready` means the app has the endpoint/workflow needed for the Catalyst service to call.

`adapter-ready` means the feature boundary is isolated in code and can be switched to the Catalyst managed service once the resource is provisioned.

`console-created` means the Catalyst resource exists in the project console, but the runtime still uses the current fallback until SDK wiring is enabled.

`console-configured` means the Catalyst console workflow has a matching application endpoint or resource target.

`console-initialized` means the Catalyst service workspace is enabled and ready for dataset/model/endpoint configuration.

`fallback` means the feature currently runs through local/app-level implementation.

`not-configured` means the service needs a verified sender, third-party authorization, domain ownership, mobile/web push credential, or billing/resource selection before it can be safely activated.

`external-prereq` means Catalyst requires an external asset such as a verified sender/domain before the service can be used.

`unavailable-in-console` means the current Catalyst project route returned a Catalyst 404 even after the service was searched/opened.

`not-required` means the corresponding capability is outside the current MVP and is intentionally not manufactured merely to claim a Catalyst service.

`feature-dependent` means the service is appropriate only after the matching product workflow is implemented and provisioned.
