import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { prisma, Prisma } from '@lottivexa/database';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Principal } from '../common/guards/jwt-auth.guard';
import { isBettingOpen } from '../lottery/lottery-policy';
import { chooseOdds, normalizeSelection, priceLines, validateHaitianBetType } from './ticket-policy';
import { presentTicketLines } from './ticket-line-flags';

/** Creates one physical ticket containing lines for several lottery draws. */
@Injectable()
export class MultiTicketService {
  async create(u: Principal, dto: any) {
    const tenantId = this.tenant(u);
    const db: any = prisma;
    const groups = Array.isArray(dto.draws) ? dto.draws : [];
    if (!groups.length) throw new BadRequestException('MULTI_DRAW_REQUIRED');
    const merchant = await db.merchantAccount.findFirst({ where: { tenantId, userId: u.sub, status: 'ACTIVE', branch: { status: 'ACTIVE' } } });
    if (!merchant) throw new ForbiddenException('MERCHANT_ACCOUNT_REQUIRED');
    if (dto.deviceId) {
      const device = await db.device.findFirst({ where: { id: dto.deviceId, tenantId, branchId: merchant.branchId, merchantId: merchant.id, status: { in: ['ONLINE', 'OFFLINE'] } } });
      if (!device) throw new ForbiddenException('DEVICE_NOT_AUTHORIZED');
    }
    const existing = await db.ticket.findUnique({ where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: dto.idempotencyKey } }, include: { lines: { include: { betType: true } }, events: true } });
    if (existing) return presentTicketLines(existing as any);

    const allLines: any[] = [];
    const ticketDraws: any[] = [];
    let firstDraw: any;
    for (const group of groups) {
      const draw = await db.draw.findFirst({ where: { id: group.drawId, tenantId }, include: { game: true } });
      if (!draw || !isBettingOpen(draw.status, draw.closesAt, draw.game.cutoffSeconds)) throw new BadRequestException('DRAW_CLOSED');
      if (!firstDraw) firstDraw = draw;
      if (ticketDraws.some(item => item.drawId === draw.id)) throw new BadRequestException('DUPLICATE_DRAW');
      ticketDraws.push({ drawId: draw.id, tenantId });
      const lines = Array.isArray(group.lines) ? group.lines : [];
      if (!lines.length) throw new BadRequestException('DRAW_LINES_REQUIRED');
      const betIds = [...new Set(lines.map((line: any) => String(line.betTypeId)))] as string[];
      const configured = await db.gameBetType.findMany({ where: { gameId: draw.gameId, betTypeId: { in: betIds }, active: true }, include: { betType: true } });
      if (configured.length !== betIds.length) throw new BadRequestException('INVALID_BET_TYPE');
      const odds = await db.oddsRule.findMany({ where: { tenantId, gameId: draw.gameId, betTypeId: { in: betIds }, active: true, startsAt: { lte: new Date() }, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }, orderBy: { startsAt: 'desc' } });
      const priced = priceLines(lines.map((line: any) => {
        const bet = (configured as any[]).find((item: any) => item.betTypeId === line.betTypeId)!.betType;
        const position = bet.code === 'BOLET' ? (line.resultPosition ?? 1) : line.resultPosition;
        if (position !== undefined && bet.code !== 'BOLET' && ![1, 2, 3].includes(position)) throw new BadRequestException('INVALID_RESULT_POSITION');
        const selection = normalizeSelection(bet.code, line.selection);
        validateHaitianBetType(bet.code, selection);
        const odd: any = chooseOdds(odds as any[], line.betTypeId, position);
        if (!odd) throw new BadRequestException('ODDS_NOT_CONFIGURED');
        return { ...line, selection, resultPosition: position, odds: odd.multiplier.toString(), selectionCount: bet.selectionCount, numberMin: bet.numberMin, numberMax: bet.numberMax, allowRepeats: bet.allowRepeats, isPromotional: false, drawId: draw.id, id: randomUUID() };
      })).map(line => ({ ...line, drawId: draw.id }));
      await this.checkLimits(tenantId, draw.id, draw.gameId, merchant.id, priced);
      allLines.push(...priced);
    }
    if (!allLines.length) throw new BadRequestException('TICKET_EMPTY');
    const amount = allLines.reduce((sum, line) => sum.add(line.stake), new Prisma.Decimal(0));
    const potentialWin = allLines.reduce((sum, line) => sum.add(line.potentialWin), new Prisma.Decimal(0));
    const token = randomBytes(12).toString('hex').toUpperCase();
    const date = new Date();
    const day = String(date.getUTCFullYear()).slice(-2) + String(date.getUTCMonth() + 1).padStart(2, '0') + String(date.getUTCDate()).padStart(2, '0');
    const suffix = (randomBytes(4).readUInt32BE(0) % 60466176).toString(36).toUpperCase().padStart(5, '0');
    const ticketNumber = day + suffix;
    return prisma.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', tenantId + ':' + dto.idempotencyKey);
      const concurrent = await tx.ticket.findUnique({ where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: dto.idempotencyKey } }, include: { lines: { include: { betType: true } }, events: true } });
      if (concurrent) return presentTicketLines(concurrent as any);
      const ticket = await tx.ticket.create({ data: {
        tenantId, ticketNumber, idempotencyKey: dto.idempotencyKey, branchId: merchant.branchId, merchantId: merchant.id, deviceId: dto.deviceId,
        gameId: firstDraw.gameId, drawId: firstDraw.id, amount, potentialWin, barcode: token, qrCode: `LV1:${tenantId}:${token}`,
        ticketDraws: { create: ticketDraws },
        lines: { create: allLines.map(line => ({ id: line.id, tenantId, drawId: line.drawId, betTypeId: line.betTypeId, selection: line.selection, selectionKey: line.selectionKey, stake: line.stake, odds: line.odds, potentialWin: line.potentialWin })) },
        events: { create: { tenantId, type: 'CREATED', userId: u.sub, deviceId: dto.deviceId, metadata: { multiLottery: true, drawIds: ticketDraws.map(item => item.drawId) } } },
      } });
      const cash = await tx.ledgerAccount.upsert({ where: { tenantId_code: { tenantId, code: 'MERCHANT_CASH' } }, update: {}, create: { tenantId, code: 'MERCHANT_CASH', name: 'Merchant cash', type: 'ASSET' } });
      const sales = await tx.ledgerAccount.upsert({ where: { tenantId_code: { tenantId, code: 'TICKET_SALES' } }, update: {}, create: { tenantId, code: 'TICKET_SALES', name: 'Ticket sales', type: 'REVENUE' } });
      await tx.ledgerTransaction.create({ data: { tenantId, type: 'SALE', referenceType: 'Ticket', referenceId: ticket.id, idempotencyKey: 'sale:' + dto.idempotencyKey, entries: { create: [{ tenantId, accountId: cash.id, debit: amount }, { tenantId, accountId: sales.id, credit: amount }] } } });
      return presentTicketLines(await tx.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: { lines: { include: { betType: true } }, events: true, ticketDraws: { include: { draw: { include: { game: true } } } }, draw: { include: { game: true } } } }) as any);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async checkLimits(tenantId: string, drawId: string, gameId: string, merchantId: string, lines: any[]) {
    const now = new Date();
    const limits = await (prisma as any).bettingLimit.findMany({ where: { tenantId, active: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }], AND: [{ OR: [{ scope: 'TENANT' }, { gameId }, { drawId }, { scope: 'MERCHANT', scopeId: merchantId }] }] } });
    for (const line of lines) for (const limit of (limits as any[]).filter((x: any) => !x.betTypeId || x.betTypeId === line.betTypeId).filter((x: any) => !x.numberKey || x.numberKey === line.selectionKey)) {
      if (limit.minStake && line.stake.lt(limit.minStake)) throw new BadRequestException('BELOW_MINIMUM_STAKE');
      if (limit.maxStake && line.stake.gt(limit.maxStake)) throw new BadRequestException('LIMIT_REACHED');
    }
  }
  private tenant(u: Principal) { if (!u.tenantId) throw new ForbiddenException('TENANT_ACCESS_REQUIRED'); return u.tenantId; }
}
