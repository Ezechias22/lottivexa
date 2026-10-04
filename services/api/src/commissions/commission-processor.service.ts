import { ForbiddenException, Injectable } from '@nestjs/common';
import { prisma, Prisma } from '@lottivexa/database';
import type { Principal } from '../common/guards/jwt-auth.guard';
import { calculateCommission } from './commission-policy';

export type CommissionTicket = {
  id: string;
  tenantId: string;
  merchantId: string;
  branchId: string;
  gameId: string;
  amount: Prisma.Decimal;
  currencyCode: string;
};

/** Creates the commission ledger and transaction inside the ticket's sale transaction. */
export async function postTicketCommission(
  tx: Prisma.TransactionClient,
  ticket: CommissionTicket,
  userId: string,
  options: { required?: boolean; now?: Date } = {},
) {
  const now = options.now ?? new Date();
  const rules = await tx.commissionRule.findMany({
    where: {
      tenantId: ticket.tenantId,
      active: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      AND: [{
        OR: [
          { scope: 'MERCHANT', scopeId: ticket.merchantId },
          { scope: 'BRANCH', scopeId: ticket.branchId },
          { scope: 'GAME', scopeId: ticket.gameId },
          { scope: 'TENANT' },
        ],
      }],
    },
    orderBy: { priority: 'desc' },
  });
  const rule = rules[0];
  if (!rule) {
    if (options.required) throw new ForbiddenException('COMMISSION_RULE_NOT_FOUND');
    return null;
  }

  const amount = calculateCommission(rule.kind, ticket.amount, rule.percentage, rule.fixedAmount, rule.tiers);
  const expense = await tx.ledgerAccount.upsert({
    where: { tenantId_code: { tenantId: ticket.tenantId, code: 'COMMISSION_EXPENSE' } },
    update: {},
    create: { tenantId: ticket.tenantId, code: 'COMMISSION_EXPENSE', name: 'Merchant commissions', type: 'EXPENSE' },
  });
  const payable = await tx.ledgerAccount.upsert({
    where: { tenantId_code: { tenantId: ticket.tenantId, code: 'COMMISSION_PAYABLE' } },
    update: {},
    create: { tenantId: ticket.tenantId, code: 'COMMISSION_PAYABLE', name: 'Commission payable', type: 'LIABILITY' },
  });
  const ledger = await tx.ledgerTransaction.create({
    data: {
      tenantId: ticket.tenantId,
      type: 'COMMISSION',
      referenceType: 'Ticket',
      referenceId: ticket.id,
      idempotencyKey: `commission:${ticket.id}`,
      entries: {
        create: [
          { tenantId: ticket.tenantId, accountId: expense.id, debit: amount },
          { tenantId: ticket.tenantId, accountId: payable.id, credit: amount },
        ],
      },
    },
  });
  const commission = await tx.commissionTransaction.create({
    data: {
      tenantId: ticket.tenantId,
      ticketId: ticket.id,
      merchantId: ticket.merchantId,
      ruleId: rule.id,
      baseAmount: ticket.amount,
      commissionAmount: amount,
      currencyCode: ticket.currencyCode,
      ledgerTransactionId: ledger.id,
    },
  });
  await tx.ticket.update({ where: { id: ticket.id }, data: { commission: amount } });
  await tx.auditLog.create({
    data: {
      tenantId: ticket.tenantId,
      userId,
      action: 'CREATE',
      entityType: 'CommissionTransaction',
      entityId: commission.id,
      newValues: { ticketId: ticket.id, amount: amount.toString(), ruleId: rule.id },
    },
  });
  return commission;
}

@Injectable()
export class CommissionProcessor {
  async apply(user: Principal, ticketId: string) {
    if (!user.tenantId) throw new ForbiddenException('TENANT_ACCESS_REQUIRED');
    const tenantId = user.tenantId;
    const existing = await prisma.commissionTransaction.findUnique({ where: { ticketId } });
    if (existing) {
      if (existing.tenantId !== tenantId) throw new ForbiddenException('RESOURCE_NOT_FOUND');
      return existing;
    }

    return prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: { id: ticketId, tenantId, status: { notIn: ['CANCELLED', 'VOID'] } },
      });
      if (!ticket) throw new ForbiddenException('RESOURCE_NOT_FOUND');
      return postTicketCommission(tx, ticket, user.sub, { required: true });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
