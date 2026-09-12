# Lottery engine invariants

- Every configurable record is tenant-owned and protected by API scoping plus PostgreSQL RLS.
- Draw times are persisted in UTC; schedule definitions retain an IANA timezone for generation.
- A draw follows `SCHEDULED → OPEN → CLOSED → RESULT_PENDING → RESULT_PUBLISHED`; cancellation is terminal.
- Draw transition updates include the previous status in the SQL predicate, preventing concurrent lost updates.
- Betting closes at `closesAt - cutoffSeconds`; the server clock is authoritative.
- Bet type definitions control selection count, range and duplicate-number policy.
- Odds and all monetary limits use fixed-precision decimal fields.
- Jurisdiction behavior is configuration with effective dates, never hard-coded legislation.
- Limits can be layered at tenant, branch, merchant, game, draw, bet-type and number level. Ticket creation must select the strictest applicable active limit.
