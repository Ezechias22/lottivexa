# Master Admin operations

The Master Admin web application authenticates with the platform realm and sends the issued bearer token to platform-only endpoints. Dashboard values, plan rows, tenants, subscriptions, payments and reports are loaded from the API; no production metrics are embedded in the frontend.

Plan create/update/archive and feature configuration are enforced by granular permissions. Tenant provisioning creates tenant settings, branding, primary subdomain, owner role/user and subscription in one transaction. Suspension updates tenant and subscription access; activation restores them them. Owner password reset uses Argon2id, forces replacement at next login, increments token version, revokes refresh sessions and writes a platform audit event.

Subscription controls perform manual activation, extension, suspension/reactivation, invoice generation and immediate plan upgrade/downgrade against PostgreSQL. An extension records its payment and event in the same serializable transaction. A plan change is rejected when current tenant usage exceeds the target plan's configured limits or when multi-branch operation would lose its required feature. Every operation records the platform actor in both subscription history and the audit log.

Support inspection endpoints return recent cross-platform audit activity, devices, domains and failed sync/printing/notification jobs. They remain `PlatformOnly` and require the corresponding permission.
