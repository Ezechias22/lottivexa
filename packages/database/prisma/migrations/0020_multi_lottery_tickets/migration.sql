ALTER TABLE "TicketLine" ADD COLUMN "drawId" UUID;

UPDATE "TicketLine" AS line
SET "drawId" = ticket."drawId"
FROM "Ticket" AS ticket
WHERE line."ticketId" = ticket."id";

CREATE TABLE "TicketDraw" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "ticketId" UUID NOT NULL,
  "drawId" UUID NOT NULL,
  CONSTRAINT "TicketDraw_pkey" PRIMARY KEY ("id")
);

INSERT INTO "TicketDraw" ("id", "tenantId", "ticketId", "drawId")
SELECT gen_random_uuid(), "tenantId", "id", "drawId" FROM "Ticket";

ALTER TABLE "TicketLine" ADD CONSTRAINT "TicketLine_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "Draw"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketDraw" ADD CONSTRAINT "TicketDraw_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketDraw" ADD CONSTRAINT "TicketDraw_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "Draw"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "TicketDraw_ticketId_drawId_key" ON "TicketDraw"("ticketId", "drawId");
CREATE INDEX "TicketDraw_tenantId_drawId_idx" ON "TicketDraw"("tenantId", "drawId");
