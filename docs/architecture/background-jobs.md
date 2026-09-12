# Background automation and delivery

Every API replica may start the scheduler, but a PostgreSQL `SchedulerLease` permits only one replica to process a maintenance cycle. The lease is short and recoverable after a crashed worker.

The cycle opens scheduled draws at `opensAt`, closes open draws at `closesAt`, moves expired subscriptions into `PAST_DUE` grace, suspends the subscription and tenant after grace, marks stale devices offline, and dispatches queued notifications.

Email, SMS and push use provider-neutral HTTPS adapters configured through `<CHANNEL>_ADAPTER_URL` and `<CHANNEL>_ADAPTER_KEY`. Payloads include a stable notification ID and the same value in the `Idempotency-Key` header so provider bridges can enforce idempotency. Email routes only to the user's email, SMS only to the user's phone, and push only to active registered device tokens. Missing destinations and failed providers retain the error, increment attempts and retry with bounded exponential delay. Secrets remain environment values.

Clients register or revoke push tokens through `/notifications/push-subscription`. Tokens are scoped to the authenticated tenant/user, deduplicated by SHA-256 hash, and can be disabled without deleting delivery history. Notification preferences are evaluated before external channel jobs are created; in-app defaults on while external channels default off.

The Flutter client encrypts offline ticket payloads with an OS-secured AES-256-GCM key. Network failures enqueue a UUIDv7 mutation in SQLite. Connectivity recovery automatically calls the sync API using the approved device ID; server validation still decides whether the ticket becomes valid.
