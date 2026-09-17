ALTER TABLE "OddsRule" ADD COLUMN "resultPosition" INTEGER;
CREATE INDEX "OddsRule_tenantId_gameId_betTypeId_resultPosition_active_idx" ON "OddsRule"("tenantId", "gameId", "betTypeId", "resultPosition", "active");
