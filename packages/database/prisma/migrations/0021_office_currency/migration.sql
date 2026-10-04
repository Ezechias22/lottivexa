ALTER TABLE "Ticket" ADD COLUMN "currencyCode" CHAR(3);

UPDATE "Ticket" AS ticket
SET "currencyCode" = COALESCE(
  CASE UPPER(COALESCE(NULLIF(branch."settings"->>'countryCode', ''), tenant."jurisdictionCode"))
    WHEN 'HT' THEN 'HTG' WHEN 'US' THEN 'USD' WHEN 'CA' THEN 'CAD' WHEN 'DO' THEN 'DOP'
    WHEN 'JM' THEN 'JMD' WHEN 'BS' THEN 'BSD' WHEN 'BB' THEN 'BBD' WHEN 'BZ' THEN 'BZD'
    WHEN 'TT' THEN 'TTD' WHEN 'GY' THEN 'GYD' WHEN 'SR' THEN 'SRD' WHEN 'MX' THEN 'MXN'
    WHEN 'BR' THEN 'BRL' WHEN 'AR' THEN 'ARS' WHEN 'BO' THEN 'BOB' WHEN 'CL' THEN 'CLP'
    WHEN 'CO' THEN 'COP' WHEN 'CR' THEN 'CRC' WHEN 'CU' THEN 'CUP' WHEN 'EC' THEN 'USD'
    WHEN 'SV' THEN 'USD' WHEN 'GT' THEN 'GTQ' WHEN 'HN' THEN 'HNL' WHEN 'NI' THEN 'NIO'
    WHEN 'PA' THEN 'USD' WHEN 'PY' THEN 'PYG' WHEN 'PE' THEN 'PEN' WHEN 'UY' THEN 'UYU'
    WHEN 'VE' THEN 'VES' WHEN 'PR' THEN 'USD' WHEN 'GB' THEN 'GBP' WHEN 'FR' THEN 'EUR'
    WHEN 'ES' THEN 'EUR' WHEN 'DE' THEN 'EUR' WHEN 'PT' THEN 'EUR' WHEN 'IT' THEN 'EUR'
    WHEN 'NL' THEN 'EUR' WHEN 'BE' THEN 'EUR' WHEN 'CH' THEN 'CHF' WHEN 'IE' THEN 'EUR'
    WHEN 'AU' THEN 'AUD' WHEN 'NZ' THEN 'NZD' WHEN 'JP' THEN 'JPY' WHEN 'CN' THEN 'CNY'
    WHEN 'IN' THEN 'INR' WHEN 'PH' THEN 'PHP' WHEN 'NG' THEN 'NGN' WHEN 'GH' THEN 'GHS'
    WHEN 'ZA' THEN 'ZAR'
  END,
  setting."currency",
  'USD'
)
FROM "Branch" AS branch, "Tenant" AS tenant
LEFT JOIN "TenantSetting" AS setting ON setting."tenantId" = tenant."id"
WHERE branch."id" = ticket."branchId"
  AND tenant."id" = ticket."tenantId";

ALTER TABLE "Ticket" ALTER COLUMN "currencyCode" SET NOT NULL;
CREATE INDEX "Ticket_tenantId_currencyCode_createdAt_idx" ON "Ticket"("tenantId", "currencyCode", "createdAt" DESC);

ALTER TABLE "Payout" ADD COLUMN "currencyCode" CHAR(3);
UPDATE "Payout" AS payout SET "currencyCode" = ticket."currencyCode"
FROM "Ticket" AS ticket WHERE ticket."id" = payout."ticketId";
ALTER TABLE "Payout" ALTER COLUMN "currencyCode" SET NOT NULL;
CREATE INDEX "Payout_tenantId_currencyCode_paidAt_idx" ON "Payout"("tenantId", "currencyCode", "paidAt" DESC);

ALTER TABLE "CommissionTransaction" ADD COLUMN "currencyCode" CHAR(3);
UPDATE "CommissionTransaction" AS commission SET "currencyCode" = ticket."currencyCode"
FROM "Ticket" AS ticket WHERE ticket."id" = commission."ticketId";
ALTER TABLE "CommissionTransaction" ALTER COLUMN "currencyCode" SET NOT NULL;
CREATE INDEX "CommissionTransaction_tenantId_currencyCode_createdAt_idx" ON "CommissionTransaction"("tenantId", "currencyCode", "createdAt" DESC);
