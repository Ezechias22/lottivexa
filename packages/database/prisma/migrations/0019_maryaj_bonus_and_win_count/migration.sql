-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "BetType" DROP CONSTRAINT "BetType_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "BettingLimit" DROP CONSTRAINT "BettingLimit_betTypeId_fkey";

-- DropForeignKey
ALTER TABLE "BettingLimit" DROP CONSTRAINT "BettingLimit_drawId_fkey";

-- DropForeignKey
ALTER TABLE "BettingLimit" DROP CONSTRAINT "BettingLimit_gameId_fkey";

-- DropForeignKey
ALTER TABLE "BettingLimit" DROP CONSTRAINT "BettingLimit_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Branch" DROP CONSTRAINT "Branch_managerId_fkey";

-- DropForeignKey
ALTER TABLE "Branch" DROP CONSTRAINT "Branch_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CashMovement" DROP CONSTRAINT "CashMovement_createdById_fkey";

-- DropForeignKey
ALTER TABLE "CashMovement" DROP CONSTRAINT "CashMovement_ledgerTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "CashMovement" DROP CONSTRAINT "CashMovement_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "CashMovement" DROP CONSTRAINT "CashMovement_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CashSession" DROP CONSTRAINT "CashSession_branchId_fkey";

-- DropForeignKey
ALTER TABLE "CashSession" DROP CONSTRAINT "CashSession_closedById_fkey";

-- DropForeignKey
ALTER TABLE "CashSession" DROP CONSTRAINT "CashSession_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "CashSession" DROP CONSTRAINT "CashSession_openedById_fkey";

-- DropForeignKey
ALTER TABLE "CashSession" DROP CONSTRAINT "CashSession_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CommissionRule" DROP CONSTRAINT "CommissionRule_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CommissionTransaction" DROP CONSTRAINT "CommissionTransaction_ledgerTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "CommissionTransaction" DROP CONSTRAINT "CommissionTransaction_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "CommissionTransaction" DROP CONSTRAINT "CommissionTransaction_ruleId_fkey";

-- DropForeignKey
ALTER TABLE "CommissionTransaction" DROP CONSTRAINT "CommissionTransaction_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CommissionTransaction" DROP CONSTRAINT "CommissionTransaction_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_branchId_fkey";

-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Draw" DROP CONSTRAINT "Draw_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Draw" DROP CONSTRAINT "Draw_gameId_fkey";

-- DropForeignKey
ALTER TABLE "Draw" DROP CONSTRAINT "Draw_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "GameBetType" DROP CONSTRAINT "GameBetType_betTypeId_fkey";

-- DropForeignKey
ALTER TABLE "GameBetType" DROP CONSTRAINT "GameBetType_gameId_fkey";

-- DropForeignKey
ALTER TABLE "GameSchedule" DROP CONSTRAINT "GameSchedule_gameId_fkey";

-- DropForeignKey
ALTER TABLE "GameSchedule" DROP CONSTRAINT "GameSchedule_marketId_fkey";

-- DropForeignKey
ALTER TABLE "GameSchedule" DROP CONSTRAINT "GameSchedule_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerAccount" DROP CONSTRAINT "LedgerAccount_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_accountId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerTransaction" DROP CONSTRAINT "LedgerTransaction_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "LotteryRule" DROP CONSTRAINT "LotteryRule_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Market" DROP CONSTRAINT "Market_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "MerchantAccount" DROP CONSTRAINT "MerchantAccount_branchId_fkey";

-- DropForeignKey
ALTER TABLE "MerchantAccount" DROP CONSTRAINT "MerchantAccount_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "MerchantAccount" DROP CONSTRAINT "MerchantAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationPreference" DROP CONSTRAINT "NotificationPreference_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationPreference" DROP CONSTRAINT "NotificationPreference_userId_fkey";

-- DropForeignKey
ALTER TABLE "OddsRule" DROP CONSTRAINT "OddsRule_betTypeId_fkey";

-- DropForeignKey
ALTER TABLE "OddsRule" DROP CONSTRAINT "OddsRule_gameId_fkey";

-- DropForeignKey
ALTER TABLE "OddsRule" DROP CONSTRAINT "OddsRule_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_authorizedById_fkey";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_ledgerTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "PlanFeature" DROP CONSTRAINT "PlanFeature_planId_fkey";

-- DropForeignKey
ALTER TABLE "PrintJob" DROP CONSTRAINT "PrintJob_printerId_fkey";

-- DropForeignKey
ALTER TABLE "PrintJob" DROP CONSTRAINT "PrintJob_templateId_fkey";

-- DropForeignKey
ALTER TABLE "PrintJob" DROP CONSTRAINT "PrintJob_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PrintJob" DROP CONSTRAINT "PrintJob_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "PrintTemplate" DROP CONSTRAINT "PrintTemplate_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Printer" DROP CONSTRAINT "Printer_branchId_fkey";

-- DropForeignKey
ALTER TABLE "Printer" DROP CONSTRAINT "Printer_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PushSubscription" DROP CONSTRAINT "PushSubscription_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PushSubscription" DROP CONSTRAINT "PushSubscription_userId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_roleId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_planId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionEvent" DROP CONSTRAINT "SubscriptionEvent_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionEvent" DROP CONSTRAINT "SubscriptionEvent_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionPayment" DROP CONSTRAINT "SubscriptionPayment_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionPayment" DROP CONSTRAINT "SubscriptionPayment_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "SyncJob" DROP CONSTRAINT "SyncJob_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "SyncJob" DROP CONSTRAINT "SyncJob_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantBranding" DROP CONSTRAINT "TenantBranding_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantDomain" DROP CONSTRAINT "TenantDomain_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantSetting" DROP CONSTRAINT "TenantSetting_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_branchId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_drawId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_gameId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TicketEvent" DROP CONSTRAINT "TicketEvent_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TicketEvent" DROP CONSTRAINT "TicketEvent_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "TicketEvent" DROP CONSTRAINT "TicketEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "TicketLine" DROP CONSTRAINT "TicketLine_betTypeId_fkey";

-- DropForeignKey
ALTER TABLE "TicketLine" DROP CONSTRAINT "TicketLine_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TicketLine" DROP CONSTRAINT "TicketLine_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_tenant_fk";

-- DropForeignKey
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_roleId_fkey";

-- DropForeignKey
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_userId_fkey";

-- DropForeignKey
ALTER TABLE "WinningTicket" DROP CONSTRAINT "WinningTicket_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "WinningTicket" DROP CONSTRAINT "WinningTicket_ticketId_fkey";

-- DropIndex
DROP INDEX "odds_lookup";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BettingLimit" ALTER COLUMN "startsAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "endsAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Branch" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "archivedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CashMovement" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CashSession" ALTER COLUMN "openedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "closedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CommissionRule" ALTER COLUMN "startsAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "endsAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CommissionTransaction" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Device" ALTER COLUMN "lastSeenAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Draw" ALTER COLUMN "opensAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "closesAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "resultAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "publishedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Game" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "archivedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "sourceVerifiedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "dueAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "paidAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LedgerTransaction" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LotteryRule" ALTER COLUMN "effectiveFrom" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "effectiveTo" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Market" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MerchantAccount" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "archivedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "readAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "sentAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "failedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "nextAttemptAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "NotificationPreference" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OddsRule" ALTER COLUMN "startsAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "endsAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PasswordResetToken" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Payout" ALTER COLUMN "paidAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Plan" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PrintJob" ALTER COLUMN "availableAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lockedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "printedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PrintTemplate" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Printer" ALTER COLUMN "lastSeenAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PushSubscription" ALTER COLUMN "lastSeenAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "revokedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SchedulerLease" ALTER COLUMN "lockedUntil" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "startsAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "currentPeriodEndsAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "graceEndsAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SubscriptionEvent" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "verifiedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SyncJob" ALTER COLUMN "receivedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "archivedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TenantDomain" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "verifiedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TicketEvent" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "lastLoginAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WinningTicket" ALTER COLUMN "detectedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "BettingLimit_drawId_betTypeId_numberKey_idx" ON "BettingLimit"("drawId", "betTypeId", "numberKey");

-- CreateIndex
CREATE INDEX "CashSession_tenantId_openedAt_idx" ON "CashSession"("tenantId", "openedAt" DESC);

-- CreateIndex
CREATE INDEX "GameSchedule_tenantId_weekday_active_idx" ON "GameSchedule"("tenantId", "weekday", "active");

-- CreateIndex
CREATE INDEX "LedgerEntry_tenantId_accountId_idx" ON "LedgerEntry"("tenantId", "accountId");

-- CreateIndex
CREATE INDEX "LedgerEntry_transactionId_idx" ON "LedgerEntry"("transactionId");

-- CreateIndex
CREATE INDEX "LotteryRule_tenantId_active_effectiveFrom_idx" ON "LotteryRule"("tenantId", "active", "effectiveFrom");

-- CreateIndex
CREATE INDEX "Payout_tenantId_paidAt_idx" ON "Payout"("tenantId", "paidAt" DESC);

-- CreateIndex
CREATE INDEX "RefreshToken_userId_expiresAt_idx" ON "RefreshToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "TenantDomain_tenantId_isPrimary_idx" ON "TenantDomain"("tenantId", "isPrimary");

-- CreateIndex
CREATE INDEX "WinningTicket_tenantId_detectedAt_idx" ON "WinningTicket"("tenantId", "detectedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "SubscriptionPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSetting" ADD CONSTRAINT "TenantSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantBranding" ADD CONSTRAINT "TenantBranding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDomain" ADD CONSTRAINT "TenantDomain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantAccount" ADD CONSTRAINT "MerchantAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantAccount" ADD CONSTRAINT "MerchantAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantAccount" ADD CONSTRAINT "MerchantAccount_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetType" ADD CONSTRAINT "BetType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameBetType" ADD CONSTRAINT "GameBetType_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameBetType" ADD CONSTRAINT "GameBetType_betTypeId_fkey" FOREIGN KEY ("betTypeId") REFERENCES "BetType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSchedule" ADD CONSTRAINT "GameSchedule_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSchedule" ADD CONSTRAINT "GameSchedule_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draw" ADD CONSTRAINT "Draw_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draw" ADD CONSTRAINT "Draw_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OddsRule" ADD CONSTRAINT "OddsRule_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OddsRule" ADD CONSTRAINT "OddsRule_betTypeId_fkey" FOREIGN KEY ("betTypeId") REFERENCES "BetType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotteryRule" ADD CONSTRAINT "LotteryRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BettingLimit" ADD CONSTRAINT "BettingLimit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BettingLimit" ADD CONSTRAINT "BettingLimit_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BettingLimit" ADD CONSTRAINT "BettingLimit_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "Draw"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BettingLimit" ADD CONSTRAINT "BettingLimit_betTypeId_fkey" FOREIGN KEY ("betTypeId") REFERENCES "BetType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "MerchantAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "Draw"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLine" ADD CONSTRAINT "TicketLine_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLine" ADD CONSTRAINT "TicketLine_betTypeId_fkey" FOREIGN KEY ("betTypeId") REFERENCES "BetType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinningTicket" ADD CONSTRAINT "WinningTicket_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_ledgerTransactionId_fkey" FOREIGN KEY ("ledgerTransactionId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionTransaction" ADD CONSTRAINT "CommissionTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionTransaction" ADD CONSTRAINT "CommissionTransaction_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionTransaction" ADD CONSTRAINT "CommissionTransaction_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "MerchantAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionTransaction" ADD CONSTRAINT "CommissionTransaction_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionTransaction" ADD CONSTRAINT "CommissionTransaction_ledgerTransactionId_fkey" FOREIGN KEY ("ledgerTransactionId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "MerchantAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_ledgerTransactionId_fkey" FOREIGN KEY ("ledgerTransactionId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintTemplate" ADD CONSTRAINT "PrintTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PrintTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "MerchantAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "audit_tenant_time" RENAME TO "AuditLog_tenantId_createdAt_idx";

-- RenameIndex
ALTER INDEX "limit_lookup" RENAME TO "BettingLimit_tenantId_scope_scopeId_active_idx";

-- RenameIndex
ALTER INDEX "branch_tenant_status" RENAME TO "Branch_tenantId_status_idx";

-- RenameIndex
ALTER INDEX "cash_movement_time" RENAME TO "CashMovement_sessionId_createdAt_idx";

-- RenameIndex
ALTER INDEX "cash_session_lookup" RENAME TO "CashSession_tenantId_merchantId_status_idx";

-- RenameIndex
ALTER INDEX "commission_rule_lookup" RENAME TO "CommissionRule_tenantId_scope_scopeId_active_priority_idx";

-- RenameIndex
ALTER INDEX "commission_merchant_time" RENAME TO "CommissionTransaction_tenantId_merchantId_createdAt_idx";

-- RenameIndex
ALTER INDEX "device_tenant_status_seen" RENAME TO "Device_tenantId_status_lastSeenAt_idx";

-- RenameIndex
ALTER INDEX "draw_game_date" RENAME TO "Draw_gameId_drawDate_idx";

-- RenameIndex
ALTER INDEX "draw_tenant_status_close" RENAME TO "Draw_tenantId_status_closesAt_idx";

-- RenameIndex
ALTER INDEX "game_tenant_status" RENAME TO "Game_tenantId_status_idx";

-- RenameIndex
ALTER INDEX "invoice_tenant_status_due" RENAME TO "Invoice_tenantId_status_dueAt_idx";

-- RenameIndex
ALTER INDEX "ledger_tenant_time" RENAME TO "LedgerTransaction_tenantId_createdAt_idx";

-- RenameIndex
ALTER INDEX "merchant_tenant_branch_status" RENAME TO "MerchantAccount_tenantId_branchId_status_idx";

-- RenameIndex
ALTER INDEX "notification_delivery" RENAME TO "Notification_status_channel_createdAt_idx";

-- RenameIndex
ALTER INDEX "notification_inbox" RENAME TO "Notification_tenantId_userId_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "notification_preference_user" RENAME TO "NotificationPreference_tenantId_userId_idx";

-- RenameIndex
ALTER INDEX "print_queue" RENAME TO "PrintJob_tenantId_status_availableAt_idx";

-- RenameIndex
ALTER INDEX "printer_jobs" RENAME TO "PrintJob_printerId_status_idx";

-- RenameIndex
ALTER INDEX "template_kind_active" RENAME TO "PrintTemplate_tenantId_kind_active_idx";

-- RenameIndex
ALTER INDEX "printer_branch_status" RENAME TO "Printer_tenantId_branchId_status_idx";

-- RenameIndex
ALTER INDEX "subscription_enforcement" RENAME TO "Subscription_tenantId_status_currentPeriodEndsAt_idx";

-- RenameIndex
ALTER INDEX "subscription_event_timeline" RENAME TO "SubscriptionEvent_subscriptionId_createdAt_idx";

-- RenameIndex
ALTER INDEX "payment_tenant_status_time" RENAME TO "SubscriptionPayment_tenantId_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "sync_tenant_status_time" RENAME TO "SyncJob_tenantId_status_receivedAt_idx";

-- RenameIndex
ALTER INDEX "ticket_draw_status" RENAME TO "Ticket_drawId_status_idx";

-- RenameIndex
ALTER INDEX "ticket_merchant_time" RENAME TO "Ticket_merchantId_createdAt_idx";

-- RenameIndex
ALTER INDEX "ticket_tenant_time" RENAME TO "Ticket_tenantId_createdAt_idx";

-- RenameIndex
ALTER INDEX "event_ticket_time" RENAME TO "TicketEvent_tenantId_ticketId_createdAt_idx";

-- RenameIndex
ALTER INDEX "line_selection" RENAME TO "TicketLine_tenantId_selectionKey_idx";

-- RenameIndex
ALTER INDEX "line_ticket" RENAME TO "TicketLine_tenantId_ticketId_idx";

-- RenameIndex
ALTER INDEX "user_tenant_status" RENAME TO "User_tenantId_status_idx";

