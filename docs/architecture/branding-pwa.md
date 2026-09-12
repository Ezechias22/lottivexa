# Branding and PWA

Branding and locale settings are tenant-owned, permission protected and audited. URLs must be HTTPS and colors must be valid hexadecimal values. A verified request host resolves to a single active tenant before the web application uses its theme.

The tenant application publishes a web manifest, maskable icon and versioned service worker. The worker caches only the application shell and static assets; authenticated API responses and financial data are never added to Cache Storage. The native mobile SQLite/outbox subsystem remains responsible for supported offline transactions and server revalidation.
