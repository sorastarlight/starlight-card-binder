# V87.5 Shared UI Cleanup & Error Handling

- Added a shared themed toast system for routine success/error feedback.
- Added a shared accessible confirmation dialog with keyboard focus trapping.
- Replaced high-risk native confirmation prompts in Card Management, staff management, moderation, and trade acceptance.
- Converted Binder import alerts to themed notifications.
- Automatically removes retired localStorage keys from legacy Starlight Mode, holographic, reveal-cache, and old catalog systems.
- Hides routine "loaded/completed/confirmed" status text after presenting it as a short toast; actual errors remain visible.
- Added reusable loading/error/empty-state markup helpers.
- Added visible global focus styling and reduced-motion support.
- Updated the unified shell build ID to 87.5.0 to invalidate stale embedded-page caches.
- Added a read-only current schema/recovery inventory SQL file.
