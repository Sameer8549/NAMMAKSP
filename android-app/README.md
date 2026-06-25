# NAMMA KSP Android App

Native Android client for the NAMMA KSP Crime Intelligence Platform.

## What it does

- Secure login against the deployed Zoho Catalyst AppSail backend.
- Mobile dashboard with FIR, offender, district, hotspot, and risk intelligence.
- Conversational AI screen with English/Kannada language mode.
- Report generation and report archive access.
- Recent audit log view for governance checks.

## Backend

The app is configured to use:

```text
https://namma-ksp-50043229029.development.catalystappsail.in
```

Change `BASE_URL` in:

```text
app/src/main/java/in/nammaksp/mobile/ApiClient.java
```

## Open in Android Studio

1. Open Android Studio.
2. Select `android-app` as the project folder.
3. Let Gradle sync.
4. Run the `app` configuration on an emulator or phone.

The website and existing Catalyst deployment are not changed by this Android project.
