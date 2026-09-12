# Lottivexa

Completion checkpoint 5 adds the physical printing runtime: tested raw TCP and Linux
device transports, ESC/POS edge worker, branch-scoped job claims, heartbeat/status,
one-shot physical test printing, retry acknowledgement, Docker packaging, and a
connected 58/80 mm ticket/receipt designer with live preview.

Completion checkpoint 4 replaces the Merchant Web placeholder with a connected,
touch-friendly POS. It supports merchant-only login, live dashboard, fast ticket
sale, ticket lookup and validation, guarded cancellation with ledger reversal,
duplicate-safe payout, cash shifts, printer/template selection, durable print jobs,
history, connectivity status, refresh-token rotation and forced password replacement.

Completion checkpoint 3 adds the real permission-aware Tenant Admin console for
branches, merchants, users, games, draws, tickets, finance, cash-session oversight,
devices, printers, reports, branding, custom domains and audit logs. It also wires
rotating refresh tokens and mandatory first-login password replacement. Merchant
self-registration remains intentionally absent.

Production-oriented lottery/bolet POS SaaS monorepo. The current implementation includes the Phase 1 foundation plus Phase 2 billing/subscription services: configurable plans and feature flags, monthly/yearly subscriptions, manual activation, suspension/reactivation, payment verification, invoices and immutable subscription event history.

Subscription lifecycle operations include audited extension and immediate plan upgrade/downgrade. Extensions renew from the later of the current expiry or the current time, use calendar-safe UTC billing periods, create a real manual payment record, and reactivate the tenant. Plan changes validate the target plan's merchant, branch, device, ticket and multi-branch limits before committing; concurrent platform actions are serialized with a tenant-scoped PostgreSQL advisory lock.

Phase 3 adds tenant-scoped user and role management, custom permission sets, branches, plan-limit enforcement, admin-created merchant accounts, forced password changes, immediate session revocation and audited disable operations. Merchant self-registration is intentionally absent.

Tenant user editing supports identity and role replacement with tenant-owned role validation, session revocation and full audit history. Merchant-linked users use the dedicated merchant workflow, and the last active `TENANT_OWNER` cannot be demoted or disabled.

Merchant administration also includes audited identity and branch editing. Username, email and phone are valid login identifiers; changing any login identity revokes active sessions, while branch moves atomically move assigned devices to preserve assignment integrity.

Phase 4 adds a configurable lottery domain: games, markets, bet types, game schedules, draws, odds, jurisdiction rules and hierarchical betting limits. Draw changes use an explicit state machine and optimistic concurrency protection; cutoff and selection validation live in pure, tested policy functions.

Phase 5 adds atomic ticket creation, exact-decimal pricing, ticket lines/events, barcode and QR lookup identifiers, result processing, winner detection and duplicate-safe payouts. Ticket sales and payouts create balanced double-entry ledger records in the same serializable transaction.

Phase 6 expands finance with a chart of accounts, journal validation, trial balance, audited adjustments, effective-dated commission rules, commission transaction storage, cash sessions, idempotent cash movements and concurrency-safe closing summaries.

Phase 7 adds a brand-neutral printer SDK, ESC/POS renderer, Bluetooth/USB/network/lottery-machine adapters, printer and template persistence, durable print jobs, atomic worker leasing, retry backoff and PRINTED/REPRINTED event history.

Phase 8 adds approved device registration, AES-GCM encrypted Flutter outbox storage, SQLite WAL queues, UUIDv7 mutations, bounded batch sync, canonical request hashing, idempotent replay, payload-mismatch conflicts and complete server-side ticket revalidation.

Device administration includes tenant-isolated registration, approval, blocking, capacity-checked unblocking, rename and validated branch/merchant reassignment. Each state or assignment change is audited and exposed through permission-protected Tenant Web and Mobile Admin controls.

Phase 9 adds the connected Flutter POS application: secure persisted sessions and refresh, forced temporary-password replacement, merchant login without self-registration, live dashboard, ticket creation/search/validation, winner payout, cash-session controls, device/printer status, connectivity feedback and role-protected API operations.

The Flutter client also provides a permission-aware Tenant Mobile Admin surface backed by the live reports, merchants, branches, users, devices, printers, finance and notifications APIs. Device approval/block controls call the same audited backend endpoints used by Tenant Web; direct-route access remains protected by both mobile routing and server authorization.

Phase 10 adds tenant and platform reporting, paginated audit inspection, persisted multi-channel notification preferences/inbox, automatic winner notifications, and connected mobile report and notification screens.

Phase 11 adds audited tenant branding/settings, custom-domain lifecycle with DNS ownership verification, public host-to-brand resolution, plan-feature enforcement, wildcard/custom-host Nginx routing and an installable tenant PWA with an offline application shell.

Phase 12 adds refresh-token rotation and session revocation, standardized API errors, structured request logging, dependency readiness/metrics, reverse-proxy abuse controls, hardened production containers, CI verification, executable deployed acceptance checks, and checksum-verified backup/restore procedures.

Post-Phase-12 completion work removes 2FA, Excel and CSV from the requested acceptance scope and adds PostgreSQL-leased background automation, automatic draw transitions, subscription grace/suspension, stale-device tracking, retrying notification provider delivery, and direct Flutter encrypted-outbox integration with connectivity-triggered synchronization.

The final authentication audit adds enumeration-resistant password recovery with hashed, single-use, 30-minute reset tokens, provider-adapter email delivery, atomic password replacement, refresh-session revocation, audit events, a real public reset page, and recovery entry points from every login surface.

Completion checkpoint 2 replaces the Master Admin placeholder with an authenticated API console for live platform metrics, configurable plans, tenant provisioning, suspension/activation, subscriptions, payment verification, invoice generation, reports and health. It also adds audited owner-password reset, plan update/archive, and platform-wide audit/device/domain/failure inspection APIs.

## Phase 12 security and operations

- `GET /api/v1/auth/sessions`
- `DELETE /api/v1/auth/sessions/:id`
- `POST /api/v1/auth/logout-all`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `/api/v1/health`, `/api/v1/ready`, `/api/v1/metrics`
- `docker-compose.production.yml` and production Dockerfiles
- `.github/workflows/ci.yml`
- `infrastructure/scripts/backup.sh`, `verify-backup.sh`, `restore.sh`, and `deploy.sh`

## Applications

| Surface | Port | Purpose |
|---|---:|---|
| Master Admin | 3000 | Platform operators |
| Tenant Web | 3001 | Tenant administration |
| Merchant Web | 3002 | Merchant login-only POS |
| Public Site | 3003 | Marketing and onboarding |
| API | 4000 | Shared NestJS REST API + Swagger |

## Phase 2 API

- `GET/POST /api/v1/plans`
- `PATCH /api/v1/plans/:id/features/:key`
- `GET /api/v1/subscriptions`
- `POST /api/v1/subscriptions/activate`
- `POST /api/v1/subscriptions/:id/extend`
- `POST /api/v1/subscriptions/:id/change-plan`
- `POST /api/v1/subscriptions/:id/suspend`
- `POST /api/v1/subscriptions/:id/reactivate`
- `GET /api/v1/billing/payments`
- `POST /api/v1/billing/payments/:id/verify`
- `GET /api/v1/billing/invoices`
- `POST /api/v1/billing/subscriptions/:id/invoice`

## Phase 3 API

- `GET/POST /api/v1/users`
- `PATCH /api/v1/users/:id/disable`
- `POST /api/v1/users/me/change-password`
- `GET/POST /api/v1/roles`
- `GET/POST/PATCH /api/v1/branches`
- `GET/POST /api/v1/merchants`
- `PATCH /api/v1/merchants/:id/disable`

## Phase 4 API

- `GET/POST /api/v1/lottery/games`
- `POST /api/v1/lottery/markets`
- `POST /api/v1/lottery/schedules`
- `POST /api/v1/lottery/bet-types`
- `POST /api/v1/lottery/games/:gameId/bet-types/:betTypeId`
- `GET/POST /api/v1/lottery/draws`
- `POST /api/v1/lottery/draws/:id/transition`
- `POST /api/v1/lottery/odds`
- `POST /api/v1/lottery/limits`
- `POST /api/v1/lottery/rules`

## Phase 5 API

- `POST /api/v1/tickets`
- `GET /api/v1/tickets/:ticketNumberOrBarcodeOrQr`
- `GET /api/v1/tickets?status=&drawId=`
- `POST /api/v1/results/draws/:drawId/publish`
- `POST /api/v1/payouts`

## Phase 6 API

- `GET /api/v1/finance/accounts`
- `GET /api/v1/finance/ledger`
- `GET /api/v1/finance/trial-balance`
- `POST /api/v1/finance/adjustments`
- `GET/POST /api/v1/commissions/rules`
- `GET /api/v1/commissions/transactions`
- `POST /api/v1/commissions/tickets/:ticketId/apply`
- `GET /api/v1/cash/session/current`
- `POST /api/v1/cash/session/open`
- `POST /api/v1/cash/session/:id/movements`
- `POST /api/v1/cash/session/:id/close`

## Phase 7 API

- `GET/POST /api/v1/printing/printers`
- `POST /api/v1/printing/templates`
- `POST /api/v1/printing/jobs`
- `POST /api/v1/printing/jobs/claim`
- `POST /api/v1/printing/jobs/:id/complete`
- `POST /api/v1/printing/jobs/:id/fail`

## Phase 8 API

- `GET/POST /api/v1/devices`
- `POST /api/v1/devices/:id/approve`
- `POST /api/v1/devices/:id/block`
- `POST /api/v1/sync/batch`

## Phase 9 mobile workflows

- Secure tenant + merchant login and access-token refresh
- Mandatory password change after first login
- Live ticket and cash-session dashboard
- Ticket creation, search, validation and atomic payout
- Cash session open/close
- Registered device, printer and connectivity status
- Android/iOS API URL configuration with `--dart-define=API_URL=...`

## Phase 10 API

- `GET /api/v1/reports/sales?from=&to=`
- `GET /api/v1/reports/sales.pdf?from=&to=`
- `GET /api/v1/master/reports`
- `GET /api/v1/audit?action=&entityType=&cursor=&limit=`
- `GET /api/v1/notifications?unread=true`
- `PATCH /api/v1/notifications/:id/read`
- `GET/PUT /api/v1/notifications/preferences`

## Phase 11 API

- `GET/PUT /api/v1/settings`
- `PUT /api/v1/settings/branding`
- `GET/POST /api/v1/domains`
- `POST /api/v1/domains/:id/verify`
- `PATCH /api/v1/domains/:id/primary`
- `GET /api/v1/domains/resolve/current` using the request host

## Non-negotiable invariants

- Money uses PostgreSQL `NUMERIC(19,4)`, never floating point.
- UTC is used for persisted timestamps.
- Tenant identifiers come from authenticated context.
- Tenant-owned records receive application filtering plus PostgreSQL RLS.
- Financial records will be evented/voided, never physically deleted.
- All write APIs require permission and active subscription checks.

See [development setup](docs/deployment/development.md), [tenant isolation](docs/architecture/tenant-isolation.md), and [security baseline](docs/security/security.md).
