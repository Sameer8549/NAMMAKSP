# NAMMA KSP - PWA PPT Details

Date: 6 September 2026  
Use: Dedicated PPT slide, appendix slide, speaker notes and judge Q&A  
Boundary: PWA improves access and resilience of the app shell; protected live evidence still requires authenticated backend access.

## Slide Title Options

1. Progressive Web App For Field-Ready Access
2. Installable Intelligence Workspace
3. NAMMA KSP As A Mobile-Ready PWA
4. Fast Access, Cached Shell, Secure Evidence
5. From Browser Page To Operational App Shell

## Best Slide Title

Progressive Web App For Field-Ready Access

## One-Line Slide Message

NAMMA KSP is packaged as an installable PWA so investigators, analysts and command users can reopen the platform quickly on desktop or mobile, while sensitive evidence remains protected through live authenticated APIs.

## Why PWA Matters

KSP users may access the platform from laptops, tablets or mobile devices during review, briefing or field-support contexts. A normal website feels temporary. A PWA makes the prototype feel closer to an operational tool:

- Installable from the browser.
- Uses Karnataka/KSP app icons.
- Opens like an app.
- Loads the app shell faster on repeat visits.
- Keeps the interface available during weak connectivity.
- Reconnects to live APIs for protected evidence.

## Current Implementation Evidence

| PWA capability | NAMMA KSP implementation |
|---|---|
| Web app manifest | `frontend-next/manifest.webmanifest` |
| App icons | `frontend-next/pwa-192.png`, `frontend-next/pwa-512.png`, `frontend-next/favicon.png` |
| Service worker | `frontend-next/sw.js` |
| Workbox precache | HTML, JS, CSS, icons and core visual assets are precached |
| Navigation fallback | Service worker routes navigation requests back to `index.html` |
| Catalyst delivery | PWA assets are served through Catalyst Web Client Hosting under `/app/` |
| Mobile support | Role workspaces, network analysis and report views have mobile layouts |

## Recommended PPT Visual

Use a three-part visual:

```text
Install
Browser prompt + KSP icon

Open
App-like full-screen role workspace

Reconnect
Live evidence API + audit/report services
```

Alternative visual:

```text
Mobile user
   ↓
PWA shell cache
   ↓
Authenticated backend APIs
   ↓
Evidence, AI, reports and audit trail
```

## Slide Layout Suggestion

### Left Side

Large mobile mockup or screenshot:

- Login mobile.
- Analyst mobile.
- Network mobile.
- Report mobile.

### Right Side

Four compact cards:

1. Installable
2. Cached shell
3. Mobile responsive
4. Secure live evidence

### Bottom Bar

"Offline shell does not expose protected evidence. Live data still requires authenticated API access."

## Slide Copy

NAMMA KSP is implemented as a Progressive Web App with a manifest, KSP-branded icons and a Workbox service worker. The app shell and static assets are cached for faster repeat access, while FIR evidence, AI responses, reports and command actions continue to come from authenticated backend APIs.

This gives the prototype a field-ready access model without weakening governance: the interface can load quickly, but protected evidence remains server-controlled.

## Short Bullet Version

- Installable app experience for desktop and mobile users.
- KSP-branded PWA icons and app manifest.
- Workbox service worker precaches the app shell.
- Faster repeat visits and resilient navigation fallback.
- Protected FIR evidence still requires live authenticated APIs.
- Served through Zoho Catalyst Web Client Hosting.

## Speaker Notes

The PWA is important because NAMMA KSP should not feel like a static web demo. Police users may need quick access across devices, especially during review or briefing contexts. The service worker caches the shell so the interface can reopen quickly, and the manifest makes it installable with Karnataka/KSP branding. At the same time, we do not cache sensitive evidence for offline use. FIR records, AI answers, report generation and command actions remain controlled by the backend and role-based permissions.

## Judge Q&A

### Does the PWA make police evidence available offline?

No. The PWA caches the application shell and static assets. Protected FIR evidence, AI answers, reports and command actions require live authenticated backend access.

### Why use PWA instead of only a normal website?

A PWA provides faster repeat access, installability and a more app-like experience across desktop and mobile devices. It is useful for field-support and briefing workflows where users reopen the platform frequently.

### Is it mobile-ready?

The prototype includes mobile layouts for role workspaces, network analysis and report views. Mobile readiness should still be tested before production rollout on official device profiles.

### How is it deployed?

The PWA assets are built from the frontend and served through Zoho Catalyst Web Client Hosting under `/app/`, while the backend runs on Catalyst AppSail.

## What Not To Overclaim

Do not say:

- "The full police database works offline."
- "The PWA removes the need for authentication."
- "Offline mode supports investigation decisions."
- "All mobile devices are production-certified."

Say instead:

- "The PWA caches the shell, not protected evidence."
- "Live data remains role-controlled by backend APIs."
- "The installable app shell improves access and repeat-use experience."
- "Production rollout needs official device and security validation."

## Best Final Sentence

The PWA turns NAMMA KSP from a browser-only prototype into an installable, mobile-ready intelligence shell while preserving the rule that protected evidence must come from authenticated live services.

