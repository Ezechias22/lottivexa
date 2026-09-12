# Finance invariants

- Every ledger transaction has at least two entries and equal debit/credit totals.
- Money uses `NUMERIC(19,4)` and application calculations use `Prisma.Decimal`.
- Manual adjustments require `finance.adjust` and create an audit event.
- Cash movements are tenant-idempotent and post their ledger transaction atomically.
- A partial unique index permits only one open cash session per tenant/merchant.
- Closing uses sales, payouts and movements since the authoritative opening timestamp. The session can transition from OPEN to CLOSED exactly once.
- Commission definitions are effective-dated, prioritized and support percentage, fixed and tiered calculations without floating point.
- Posted financial records are retained. Future corrections reverse transactions rather than deleting them.
