# Reporting, notifications and audit

Tenant reports always derive `tenantId` from the authenticated principal and aggregate PostgreSQL `NUMERIC` values without JavaScript floating point. The default reporting window is 30 days; callers can provide UTC ISO dates. The protected PDF endpoint renders tenant branding, currency, report period, sales, payouts, commissions, and status totals into a self-contained PDF download. CSV and Excel exports are intentionally outside the requested product scope.

Platform reporting is protected by both `PlatformOnly` and granular `reports.view` permission. It aggregates subscription revenue and cross-tenant activity without exposing tenant rows.

Notifications are persisted. An inbox item may target one user or all users in a tenant. Delivery channels are adapters represented by `IN_APP`, `PUSH`, `EMAIL`, and `SMS`; user preferences default to in-app enabled and external channels disabled. Result publication creates a winner notification in the same serializable database transaction as winner detection.

Audit listing is tenant-scoped, permission protected, newest-first and cursor paginated. Audit `BigInt` identifiers are serialized as strings at the API boundary.
