ALTER TABLE "Notification" ADD COLUMN "dedupeKey" VARCHAR(180),ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,ADD COLUMN "nextAttemptAt" TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE TABLE "SchedulerLease"("name" VARCHAR(100) PRIMARY KEY,"owner" VARCHAR(100) NOT NULL,"lockedUntil" TIMESTAMPTZ NOT NULL,"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now());
