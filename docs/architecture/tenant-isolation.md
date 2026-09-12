# Tenant isolation

Tenant identity comes exclusively from the verified access token, never from a request body or query parameter. API repositories must filter by that identity. PostgreSQL row-level security is the second enforcement layer; each transaction must set `app.tenant_id` locally before accessing tenant tables. Platform operations use a separate database role and explicitly set `app.is_platform_admin=true`; every such action is audited.

Cache keys follow `tenant:{tenantId}:{resource}:{id}`. Storage uses immutable tenant prefixes. Queue messages carry a signed tenant context and workers re-resolve tenant status before processing. Unique constraints include tenant identity wherever the identifier is tenant-local.

The initial migration enables RLS for foundation tables. Every future tenant-owned table must enable RLS in the same migration that creates it. CI must reject a tenant table without `tenant_id`, policy and an isolation test.
