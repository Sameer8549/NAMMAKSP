# Zoho Catalyst Services Coverage

NAMMA KSP uses Catalyst Embedded Authentication with server-enforced Admin and Investigator roles. Requested Catalyst capabilities are represented through deployed services, code-level adapters, or console-ready integration points.

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

## Currently Active

| Capability | Catalyst Service | Evidence |
|---|---|---|
| Frontend/static app | Web Client Hosting | Live `/app/index.html` deployment |
| Backend managed runtime | AppSail | `/api/health`, `/api/docs` |
| AppSail custom deployment package | AppSail custom runtime packaging | Linux dependency bundle deployed to AppSail |
| Relational database resource | Data Store | Console table `namma_ksp_firs` |
| Semi-structured resource | NoSQL | Console table `namma_ksp_evidence` |
| Object storage resource | Stratus | Console bucket `namma-ksp-reports` |
| Cache resource | Cache | Console segment `namma_ksp_analytics` |
| Indexed search | Catalyst Search | Indexed columns on `namma_ksp_firs`; SDK adapter pending |
| API routing | API Gateway | Active Web Client Hosting routes under `/app/*` |
| Scheduled job target | Cron | Internal endpoint `/api/internal/cron/daily-intelligence-refresh` |
| Event publisher | Signals | Publisher `namma_ksp_events`, ID `6060000000021078`, event `early_warning_alert` |
| Connection service shell | Connections | Custom service `Sarvam AI` / `sarvam_ai` with API-key header parameter |
| Zia workspace | Zia Services | Zia service shell initialized; OCR/Text Analytics/AutoML menus available |
| SmartBrowz workspace | SmartBrowz | Dashboard initialized with Headless, Browser Logic, PDF & Screenshot, Templates |
| Push notification workspace | Push Notifications | Web Push console active with Catalyst SDK enablement code |
| CI/CD resource | Pipelines | Pipeline `namma_ksp_ci`; GitHub trigger authorization pending |

## Code-Ready / Console-Ready

These services have app features and backend evidence points, but require provisioning inside the Zoho Catalyst console before they can replace local fallbacks:

| Catalyst Service | NAMMA KSP Feature |
|---|---|
| Data Store | FIR/offender/victim/relationship relational tables and full-text search |
| NoSQL | chat/session/evidence payload storage |
| Stratus | generated PDF report archive and QR-linked report downloads |
| Cache | dashboard analytics, forecast, and search response caching |
| QuickML | initialized LLM/RAG and no-code ML pipeline workspace; dataset/model creation requires selected training data and credits |
| Zia AutoML | initialized Zia workspace; offender risk and forecasting model training requires a trained model |
| Zia Services | initialized OCR/text analytics workspace; API adapter can replace local evidence parsing |
| SmartBrowz | initialized browser-rendering workspace; report adapter can replace ReportLab/PDF fallback |
| Connections | custom Sarvam AI API-key service shell; secret value is not stored in code |
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
