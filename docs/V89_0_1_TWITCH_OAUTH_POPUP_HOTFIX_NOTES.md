# V89.0.1 Twitch OAuth Popup Hotfix

- Twitch OAuth is now opened in a separate secure popup instead of inside the Binder iframe.
- Adds `twitch-oauth-complete.html` as the Worker return target.
- Broadcaster and collector linking pages refresh automatically after the popup completes.
- Keeps a top-level redirect fallback for strict popup blockers.
