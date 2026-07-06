# Zoho Catalyst Services Coverage

NAMMA KSP intentionally keeps the existing prototype login and excludes Catalyst Authentication. All other requested Catalyst capabilities are represented through deployed services, code-level adapters, or console-ready integration points.

Live evidence endpoint:

```text
GET /api/catalyst/services
```

This endpoint returns every requested Catalyst service except Authentication, including:

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
| API routing | API Gateway | Active Web Client Hosting routes under `/app/*` |
| Scheduled job target | Cron | Internal endpoint `/api/internal/cron/daily-intelligence-refresh` |

## Code-Ready / Console-Ready

These services have app features and backend evidence points, but require provisioning inside the Zoho Catalyst console before they can replace local fallbacks:

| Catalyst Service | NAMMA KSP Feature |
|---|---|
| Data Store | FIR/offender/victim/relationship relational tables and full-text search |
| NoSQL | chat/session/evidence payload storage |
| Stratus | generated PDF report archive and QR-linked report downloads |
| Cache | dashboard analytics, forecast, and search response caching |
| QuickML | LLM/RAG and no-code ML pipeline handoff |
| Zia AutoML | offender risk and forecasting model training |
| Zia Services | OCR/text analytics and speech/translation replacement |
| SmartBrowz | browser-rendered PDFs, screenshots, and report captures |
| Connections | OAuth/token management for third-party AI/voice services |
| Cron / Job Scheduling | daily intelligence refresh endpoint |
| Signals / Event Functions | report, alert, audit, and high-risk event publishing |
| Circuits | multi-step report, review, notification, and escalation workflow |
| Mail | transactional report and alert delivery |
| Push Notifications | early-warning and high-risk alert notifications |
| Pipelines | automated build and deploy flow |

## Status Meaning

`active` means the live deployment is already using that Catalyst service.

`configured` means the app detects the needed Catalyst environment/resource variable.

`ready` means the app has the endpoint/workflow needed for the Catalyst service to call.

`adapter-ready` means the feature boundary is isolated in code and can be switched to the Catalyst managed service once the resource is provisioned.

`console-created` means the Catalyst resource exists in the project console, but the runtime still uses the current fallback until SDK wiring is enabled.

`console-configured` means the Catalyst console workflow has a matching application endpoint or resource target.

`fallback` or `not-configured` means the feature currently runs through local/app-level implementation.
