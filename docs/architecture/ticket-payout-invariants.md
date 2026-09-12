# Ticket and payout invariants

- The authenticated user resolves to one active merchant and active branch; client-supplied merchant or branch identifiers are never trusted.
- Every create request has a tenant-scoped idempotency key. PostgreSQL uniqueness is the final duplicate barrier.
- Draw status, authoritative server time, cutoff, enabled bet type, selection shape, odds and active limits are checked server-side.
- Ticket, lines, CREATED event and balanced sale ledger transaction commit atomically at `SERIALIZABLE` isolation.
- Barcode and QR values are lookup identifiers; neither grants payout authorization by itself.
- Result publication processes every still-valid ticket once and persists per-line winner flags.
- A ticket must atomically move from `WINNER` to `PAID`. A unique `Payout.ticketId` and tenant-scoped payout idempotency key provide additional double-payment barriers.
- Payout and its balanced ledger entries commit in the same transaction. Financial tickets are never physically deleted.
