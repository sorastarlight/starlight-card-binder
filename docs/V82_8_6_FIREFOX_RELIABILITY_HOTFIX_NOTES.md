# V82.8.6 Firefox Reliability Hotfix

- Adds a shell/view readiness handshake for all embedded views.
- Automatically retries an embedded page once if it does not initialize.
- Adds a visible loading and retry state instead of leaving blank content.
- Cache-busts embedded pages per navigation to prevent stale Firefox iframe documents.
- Reinitializes embedded views restored from Firefox's back-forward cache.
- Uses automatic iframe height reporting so the unified page has one main scrollbar.
- Removes inner iframe scrolling in embedded mode.
- Adds Booster Shop-specific recovery and a real content-ready signal after its Supabase balance loads.
