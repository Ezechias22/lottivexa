CREATE TYPE "ProviderResultEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'APPLIED', 'FAILED');

CREATE TABLE "ProviderResultEvent" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(60) NOT NULL,
    "dedupeKey" VARCHAR(180) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ProviderResultEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProviderResultEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderResultEvent_dedupeKey_key" ON "ProviderResultEvent"("dedupeKey");
CREATE INDEX "ProviderResultEvent_status_createdAt_idx" ON "ProviderResultEvent"("status", "createdAt");
