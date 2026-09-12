INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."tenantId" IS NOT NULL
  AND r."code" = 'MERCHANT'
  AND p."code" IN ('finance.view', 'reports.view')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
