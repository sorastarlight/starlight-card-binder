# V82.0 Unified Binder Application

- `binder.html` is now the permanent application shell.
- Feature views load inside the shell using `?view=` routes.
- Existing standalone URLs redirect into the shell and remain usable with `?embed=1`.
- Staff navigation appears only for staff accounts.
- No database changes are required.

Routes include: binder, collection, daily, redeem, star-bits, checklist, profile, collector, admin, admin-codes, admin-staff, admin-audit, and admin-moderation.
