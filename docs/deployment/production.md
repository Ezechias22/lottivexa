# Production deployment

## Host baseline

Use a supported Linux release, Docker Engine with Compose v2, a dedicated firewall, automatic security updates, UTC clock synchronization and encrypted off-host backup storage. Permit inbound 80/443 only; never expose PostgreSQL or Redis publicly.

1. Copy `.env.production.example` to `.env.production` and replace every placeholder with independently generated secrets.
2. Replace `example.com` in the Nginx configuration and mount issued TLS certificates read-only.
3. Run `infrastructure/scripts/deploy.sh`. It builds immutable images, applies migrations once, starts health-checked services and reports container state.
4. Provision platform TLS, then run `infrastructure/scripts/release-gate.sh` with `E2E_PUBLIC_URL`, `E2E_PLATFORM_USERNAME`, and `E2E_PLATFORM_PASSWORD`. This provisions isolated E2E records through the real API and verifies the complete ticket/payout lifecycle, concurrent idempotency, readiness, HTTPS headers, anonymous denial, and Nginx login rate limiting.
5. Keep Swagger disabled publicly. Expose metrics only to the monitoring network at the firewall/reverse-proxy layer.

Containers run as non-root where application images permit it, use read-only filesystems, temporary filesystems for writable caches, and `no-new-privileges`. PostgreSQL and Redis data live on separate persistent volumes. Scale stateless API and web containers behind the reverse proxy; schedule only one migration job per release.

The release gate is staging-only because it creates auditable plans, tenants, tickets, payouts, and ledger entries. Do not point it at a production financial database.

## Release and rollback

Tag every image with the source revision; do not deploy `latest`. Take and verify a database backup before migrations. Deploy to staging, execute acceptance/security workflows, then promote the exact images. Roll back application images immediately when a release fails. Database rollback uses a tested restore into a new database and controlled connection switch—never an improvised destructive downgrade.
