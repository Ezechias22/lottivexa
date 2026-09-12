# Full lifecycle staging gate

This runner uses only the public REST API and writes unique, traceable E2E records. It does not mock the API, database, ledger, printer queue, or authentication.

Run it against an already migrated and seeded non-production environment:

```bash
E2E_API_URL=https://staging.example.com/api/v1 \
E2E_PLATFORM_USERNAME=root \
E2E_PLATFORM_PASSWORD='current-secret' \
pnpm test:e2e:lifecycle
```

If the seeded platform administrator still requires its first password change, also set `E2E_PLATFORM_NEW_PASSWORD`. The runner intentionally keeps its records for audit inspection and uses a unique `E2E_RUN_ID` by default.

It verifies tenant provisioning, authentication, forced password replacement, RBAC, branch/merchant/device creation, lottery configuration, idempotent ticket sale, print queue completion, result/winner detection, idempotent payout, duplicate-payout rejection, ledger-backed cash close, and reports.
