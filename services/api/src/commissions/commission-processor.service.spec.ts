import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@lottivexa/database';
import { describe, expect, it, vi } from 'vitest';
import { postTicketCommission } from './commission-processor.service';

function makeTx(rule: unknown = {
  id: 'rule-1',
  kind: 'PERCENTAGE',
  percentage: new Prisma.Decimal('12.5'),
  fixedAmount: null,
  tiers: null,
}) {
  return {
    commissionRule: { findMany: vi.fn().mockResolvedValue(rule ? [rule] : []) },
    ledgerAccount: { upsert: vi.fn()
      .mockResolvedValueOnce({ id: 'expense-1' })
      .mockResolvedValueOnce({ id: 'payable-1' }) },
    ledgerTransaction: { create: vi.fn().mockResolvedValue({ id: 'ledger-1' }) },
    commissionTransaction: { create: vi.fn().mockResolvedValue({ id: 'commission-1' }) },
    ticket: { update: vi.fn() },
    auditLog: { create: vi.fn() },
  };
}

const ticket = {
  id: 'ticket-1',
  tenantId: 'tenant-1',
  merchantId: 'merchant-1',
  branchId: 'branch-1',
  gameId: 'game-1',
  amount: new Prisma.Decimal('200'),
};

describe('postTicketCommission', () => {
  it('calculates and records the merchant percentage during the ticket sale', async () => {
    const tx = makeTx();
    const result = await postTicketCommission(tx as unknown as Prisma.TransactionClient, ticket, 'seller-1');

    expect(result).toEqual({ id: 'commission-1' });
    expect(tx.commissionRule.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-1', active: true }),
      orderBy: { priority: 'desc' },
    }));
    expect(tx.commissionTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ ticketId: 'ticket-1', commissionAmount: new Prisma.Decimal('25') }),
    }));
    expect(tx.ticket.update).toHaveBeenCalledWith({ where: { id: 'ticket-1' }, data: { commission: new Prisma.Decimal('25') } });
    expect(tx.ledgerTransaction.create).toHaveBeenCalledTimes(1);
  });

  it('allows a sale with no configured commission rule, without writing a false commission', async () => {
    const tx = makeTx(null);
    await expect(postTicketCommission(tx as unknown as Prisma.TransactionClient, ticket, 'seller-1')).resolves.toBeNull();
    expect(tx.commissionTransaction.create).not.toHaveBeenCalled();
    expect(tx.ledgerTransaction.create).not.toHaveBeenCalled();
  });

  it('still reports a missing rule when an administrator explicitly applies commission', async () => {
    const tx = makeTx(null);
    await expect(postTicketCommission(tx as unknown as Prisma.TransactionClient, ticket, 'admin-1', { required: true }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
