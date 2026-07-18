# V92.0.2 — Performance & Viewport Modal Hotfix

No SQL is required.

## Fixes
- Removed the expensive global class-change observer that repeatedly rescanned pages.
- Reduced always-on blur work in the sticky shell.
- Booster purchase and pack-details dialogs are portaled into the parent shell document.
- Dialogs stay centered in the visible browser viewport regardless of page scroll or iframe height.
- Parent-page scrolling is locked only while a dialog is open.

## Suggested commit
`Fix site performance and center shop dialogs in the viewport`
