ALTER TABLE "Game"
  ADD COLUMN "catalogCode" VARCHAR(80),
  ADD COLUMN "logoUrl" VARCHAR(500),
  ADD COLUMN "resultProvider" VARCHAR(80),
  ADD COLUMN "sourceUrl" VARCHAR(500),
  ADD COLUMN "sourceVerifiedAt" TIMESTAMPTZ;

CREATE UNIQUE INDEX "Game_tenantId_catalogCode_key" ON "Game"("tenantId", "catalogCode");
