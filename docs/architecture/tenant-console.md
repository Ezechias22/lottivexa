# Tenant operational console

The tenant web app reads tenant identity and granular permissions from the signed
access token. Every mutation is still re-authorized, subscription-checked and
tenant-scoped by the API; hiding a UI control is never treated as authorization.

## Operational areas

- The dashboard aggregates live sales, payouts, tickets, branches, merchants and alerts.
- Branch, merchant and user creation writes through the corresponding API services.
- Authorized tenant staff create merchant accounts; first login requires a new password.
- Games, draws and guarded state transitions use the lottery service.
- Finance shows accounts, journal activity, trial balances and tenant-wide cash sessions.
  Only the merchant interface opens or closes a merchant shift.
- Device approval/blocking and printer configuration use their tenant-scoped services.
- Settings, branding, verified custom domains, reports and audit screens use live data.

## Session behavior

The browser keeps the short-lived access token and rotating refresh token. A 401 causes
one refresh request and persists both replacements. A failed refresh clears the local
session. Users marked `forcePasswordChange` cannot enter the console until the
password service accepts a new password; the server then revokes existing sessions.
