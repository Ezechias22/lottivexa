# Merchant Web POS

Merchant Web is an authenticated POS client. It never exposes account registration:
an authorized tenant user creates each merchant and assigns its branch and permissions.

## Connected workflow

1. Login resolves the tenant and merchant account and returns rotating session tokens.
2. Dashboard totals and history are constrained to the authenticated merchant.
3. New Ticket loads only open draws and configured game bet types, then sends a unique
   idempotency key to the atomic ticket service.
4. Optional auto-print queues a durable job against a printer in the merchant branch
   and an active versioned ticket template.
5. Lookup accepts ticket number, barcode or QR. Winner payout uses an independent
   idempotency key and the server blocks duplicate payment.
6. Authorized cancellation requires a valid ticket, an open draw and an unexpired
   cancellation window. The transaction changes status, reverses sale/commission
   journals, appends ticket events and writes an audit record atomically.
7. Open, movement and close shift operations use the cash service and ledger.

## Cancellation configuration

Create an active lottery rule with key `ticket_cancellation_seconds` and a JSON value
such as `{"seconds":300}` for tenant/jurisdiction-specific control. When no active
rule exists, `TICKET_CANCELLATION_SECONDS` supplies the deployment default. The
effective deadline can never pass the draw close time.

The Web POS reports offline state and blocks online sale submission. Supported offline
ticket sale and recovery remain in the Flutter SQLite outbox, where server sync
revalidates device, permission, draw cutoff, limits and idempotency.
