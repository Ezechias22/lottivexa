# Security baseline

## Password recovery

`POST /api/v1/auth/forgot-password` always returns the same accepted response to prevent account enumeration. A matching active user with an email receives a provider-adapter email containing 48 random bytes encoded as a URL-safe token. PostgreSQL stores only its SHA-256 hash. Requests are throttled per account, previous unused tokens are invalidated, and tokens expire after 30 minutes.

`POST /api/v1/auth/reset-password` atomically claims the unused token, hashes the new password with Argon2id, increments the user token version, revokes every refresh session, invalidates remaining reset tokens and writes an audit event. Production must configure `PASSWORD_RESET_WEB_URL`, `EMAIL_ADAPTER_URL`, and the corresponding provider credential.

- Argon2id password hashing; no plaintext password or refresh token storage.
- Short-lived access tokens and server-revocable, SHA-256 hashed refresh tokens. Refresh use rotates the token atomically; replay revokes the session family.
- Permissions and active subscriptions enforced by API guards.
- PostgreSQL RLS backs application-level tenant filters.
- Strict DTO validation rejects unknown fields.
- Helmet headers, explicit CORS origins, request IDs, standardized error envelopes and TLS termination at Nginx.
- Audit records are append-only at the application role level.

Production secrets must come from the deployment secret store. Startup rejects missing/short JWT secrets. Rotate JWT keys and database credentials through a documented dual-key rollout. Nginx applies stricter login throttling plus general request/connection limits. Run dependency, SAST, tenant-isolation, refresh-replay and broken-access-control tests in CI.

Users can inspect active sessions, revoke one session, or revoke all sessions. Revoke-all increments `tokenVersion`, invalidating every access token immediately. Do not log authorization headers, passwords, refresh tokens, ticket QR secrets, or financial payloads.

Two-factor authentication is intentionally outside the requested V1 scope. Gaming licensing, age controls, taxation and responsible-gaming policies remain jurisdiction-configured and require legal approval before launch.
