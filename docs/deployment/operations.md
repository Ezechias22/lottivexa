# Production operations

Run `preflight.sh .env.production` before every deployment. It rejects missing/placeholder critical values, validates Compose, and parses every operations script. Deployment applies Prisma migrations before replacing services.
Production Compose runs the API plus independent Master Admin, Tenant Web, Merchant Web and Public Site containers. Nginx renders `PLATFORM_DOMAIN` at startup and proxies every container on its actual internal port `3000`.

Public liveness `/health` reports only process availability. Public readiness `/ready` executes a database query and an authenticated Redis `PING`. Detailed system state is restricted to platform users with `audit.view` at `/master/system-health`; it includes API memory/uptime, database and Redis latency, writable storage capacity, failed print/notification/sync counts, pending deliveries and scheduler leases.

Alert externally when readiness fails, storage free space crosses the chosen threshold, failed queues grow, scheduler leases stop advancing, backups are late, certificate renewal fails or database latency breaches the service objective. Forward structured container logs to durable centralized storage and redact authorization headers, passwords, provider keys and ticket/customer sensitive data.
