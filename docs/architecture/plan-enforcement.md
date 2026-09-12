# Plan entitlement enforcement

Plan features are enforced by the API, independently of button visibility. `SubscriptionGuard` first requires an active tenant and either a current `ACTIVE`/`TRIAL` subscription or a bounded `PAST_DUE` grace period. `FeatureGuard` then resolves the authenticated tenant's current plan and requires the endpoint's declared feature flag.

The API currently declares hard gates for finance/cash/commission operations, offline synchronization, device management, audit logs, custom branding, custom domains, and advanced role creation. Printer creation and job queueing validate the transport-specific `bluetooth_printing`, `usb_printing`, or `network_printing` entitlement in the service layer because the required feature depends on the selected printer record.

The first branch is permitted on every plan. Creating another branch requires `multi_branch`, in addition to the configurable `maxBranches` limit. Merchant and device limits use the same grace-period subscription policy as the global guard.

The full staging lifecycle temporarily disables `finance`, proves that the real tenant endpoint returns HTTP 403, restores the feature, and then continues through sale, payout, ledger, cash close, and reporting.
