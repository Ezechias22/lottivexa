CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE "TenantDomain" ADD COLUMN "verificationToken" VARCHAR(100),ADD COLUMN "verifiedAt" TIMESTAMPTZ;
UPDATE "TenantDomain" SET "verificationToken"=encode(gen_random_bytes(24),'hex') WHERE "verificationToken" IS NULL;
ALTER TABLE "TenantDomain" ALTER COLUMN "verificationToken" SET NOT NULL;
CREATE UNIQUE INDEX "TenantDomain_verificationToken_key" ON "TenantDomain"("verificationToken");
