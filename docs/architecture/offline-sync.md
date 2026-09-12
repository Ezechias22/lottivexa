# Offline sync invariants

- Offline payloads are encrypted with AES-256-GCM; the key must live in Android Keystore/iOS Keychain via secure storage.
- SQLite uses WAL and an immutable UUIDv7 outbox. UI success while offline means locally queued, not server-accepted.
- A batch contains at most 50 mutations. Every mutation has a stable client ID and canonical SHA-256 request hash.
- Reusing an ID with identical bytes returns the stored outcome. Reusing it with changed payload returns `IDEMPOTENCY_PAYLOAD_MISMATCH`.
- Only approved, non-blocked devices assigned to the authenticated merchant may sync.
- The server re-runs subscription, permission, device, draw cutoff, bet type, odds and limit checks. Rejected offline tickets never become financial transactions.
- Network errors retry with bounded exponential backoff. Business rejections and conflicts are terminal and visible for reconciliation.
- Print jobs remain independent from financial sync so a printer failure cannot duplicate a ticket sale.
