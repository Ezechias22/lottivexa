# Security acceptance testing

Unit tests verify permission denial, access-token revocation through `tokenVersion`, account/tenant mismatch, forced password change, subscription expiration, platform bypass, idempotency and financial state transitions.

Run `node tests/security/tenant-isolation.mjs` against staging with two real tenants and a ticket owned by tenant A. Supply the eight named environment values in the script. The test fails if tenant B can read tenant A's ticket, anonymous settings access succeeds, or a modified JWT succeeds. Use dedicated staging accounts and rotate their passwords afterward.

The deployment security gate must also run `tests/e2e/acceptance.sh`, the full unit suite, dependency audit, migration deploy on a restored database, HTTPS/header inspection, rate-limit checks through Nginx, and duplicate payout/ticket concurrency tests against PostgreSQL. Never run destructive load or payout tests against production financial data.
