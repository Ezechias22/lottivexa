import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { prisma, Prisma } from '@lottivexa/database';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Principal } from '../common/guards/jwt-auth.guard';
import { isBettingOpen } from '../lottery/lottery-policy';
import { isConfiguredDrawEnabled } from '../lottery/draw-schedule-policy';
import { blockedNumberMatches, chooseOdds, isNumberBlocked, normalizeSelection, priceLines, validateHaitianBetType } from './ticket-policy';
import { presentTicketLines } from './ticket-line-flags';
import { isOperationallyDeleted } from './ticket-visibility-policy';
import { resolveFreeMaryajPolicy, randomFreeMaryajSelections } from './free-maryaj-policy';
import { currencyForOffice } from '../branches/office-currency-policy';
import { officeCountryFromSettings } from '../branches/office-location-policy';
import { postTicketCommission } from '../commissions/commission-processor.service';

/** Creates one physical ticket containing lines for several lottery draws. */
@Injectable()
export class MultiTicketService {
  async create(u: Principal, dto: any) {
    const tenantId = this.tenant(u);
    const db: any = prisma;
    const groups = Array.isArray(dto.draws) ? dto.draws : [];
    if (!groups.length) throw new BadRequestException('MULTI_DRAW_REQUIRED');
    const merchant = await db.merchantAccount.findFirst({ where: { tenantId, userId: u.sub, status: 'ACTIVE', branch: { status: 'ACTIVE' } }, include: { branch: true } });
    if (!merchant) throw new ForbiddenException('MERCHANT_ACCOUNT_REQUIRED');
    const tenant = await db.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { jurisdictionCode: true } });
    const officeCountry = officeCountryFromSettings(merchant.branch.settings, tenant.jurisdictionCode);
    const currencyCode = currencyForOffice(merchant.branch.settings, tenant.jurisdictionCode);
    if (dto.deviceId) {
      const device = await db.device.findFirst({ where: { id: dto.deviceId, tenantId, branchId: merchant.branchId, merchantId: merchant.id, status: { in: ['ONLINE', 'OFFLINE'] } } });
      if (!device) throw new ForbiddenException('DEVICE_NOT_AUTHORIZED');
    }
    const existing = await db.ticket.findUnique({ where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: dto.idempotencyKey } }, include: { lines: { include: { betType: true } }, events: true } });
    if (existing) {
      if (isOperationallyDeleted(existing.events)) throw new ForbiddenException('TICKET_DELETED');
      return presentTicketLines(existing as any);
    }

    const allLines: any[] = [];
    const ticketDraws: any[] = [];
    let firstDraw: any;
    for (const group of groups) {
      const draw = await db.draw.findFirst({ where: { id: group.drawId, tenantId }, include: { game: true } });
      if (!draw || !isBettingOpen(draw.status, draw.closesAt, draw.game.cutoffSeconds) || !(await isConfiguredDrawEnabled(tenantId, draw))) throw new BadRequestException('DRAW_CLOSED');
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
        return { ...line, selection, resultPosition: position, odds: odd.multiplier.toString(), selectionCount: bet.selectionCount, numberMin: bet.numberMin, numberMax: bet.numberMax, allowRepeats: bet.allowRepeats, isPromotional: false, drawId: draw.id, code: bet.code, id: randomUUID() };
      })).map(line => ({ ...line, drawId: draw.id }));
      await this.checkLimits(tenantId, draw.id, draw.gameId, merchant.id, merchant.branchId, priced);
      allLines.push(...priced);
    }
    if (!allLines.length) throw new BadRequestException('TICKET_EMPTY');
    let amount: Prisma.Decimal;
    try { amount = allLines.reduce((sum, line) => sum.add(new Prisma.Decimal(line.stake)), new Prisma.Decimal(0)); }
    catch { throw new BadRequestException('INVALID_AMOUNT'); }
    const now = new Date();
    const freeRule = await db.lotteryRule.findFirst({ where: { tenantId, jurisdictionCode: officeCountry, key: 'free_maryaj_policy', active: true, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }, orderBy: { effectiveFrom: 'desc' } });
    const freePolicy = resolveFreeMaryajPolicy(officeCountry, freeRule?.value);
    const earnsFreeMaryaj = amount.gte(freePolicy.minimumAmount);
    const maryaj = earnsFreeMaryaj ? await db.betType.findFirst({ where: { tenantId, code: 'MARYAJ' } }) : null;
    let freeLines: any[] = [];
    if (earnsFreeMaryaj) {
      if (!maryaj) throw new BadRequestException('FREE_MARYAJ_NOT_CONFIGURED');
      const maryajConfig = await db.gameBetType.findFirst({
        where: { gameId: firstDraw.gameId, betTypeId: maryaj.id, active: true },
        include: { betType: true },
      });
      if (!maryajConfig) throw new BadRequestException('FREE_MARYAJ_NOT_CONFIGURED');
      const freeOdds = await db.oddsRule.findMany({
        where: { tenantId, gameId: firstDraw.gameId, betTypeId: maryaj.id, active: true, startsAt: { lte: new Date() }, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
        orderBy: { startsAt: 'desc' },
      });
      const blockedRules = await db.bettingLimit.findMany({ where: { tenantId, scope: 'NUMBER', active: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, select: { numberKey: true, gameId: true, drawId: true, betTypeId: true } });
      const blockedKeys = blockedRules.filter((rule: any) => (!rule.gameId || rule.gameId === firstDraw.gameId) && (!rule.drawId || rule.drawId === firstDraw.id) && (!rule.betTypeId || rule.betTypeId === maryaj.id)).map((rule: any) => rule.numberKey).filter(Boolean);
      let selections: string[][];
      try { selections = randomFreeMaryajSelections(freePolicy.freeTicketCount, undefined, blockedKeys); }
      catch { throw new BadRequestException('FREE_MARYAJ_NUMBERS_BLOCKED'); }
      freeLines = priceLines(selections.map((selectionInput: any) => {
        const selection = normalizeSelection('MARYAJ', selectionInput);
        validateHaitianBetType('MARYAJ', selection);
        const odd: any = chooseOdds(freeOdds as any[], maryaj.id);
        if (!odd) throw new BadRequestException('ODDS_NOT_CONFIGURED');
        return {
          betTypeId: maryaj.id, selection, resultPosition: undefined, stake: '1', odds: freePolicy.payoutAmount ?? odd.multiplier.toString(),
          selectionCount: maryajConfig.betType.selectionCount, numberMin: maryajConfig.betType.numberMin,
          numberMax: maryajConfig.betType.numberMax, allowRepeats: maryajConfig.betType.allowRepeats,
          isPromotional: true, drawId: firstDraw.id, code: 'MARYAJ', id: randomUUID(),
        };
      })).map(line => ({ ...line, drawId: firstDraw.id }));
      await this.checkLimits(tenantId, firstDraw.id, firstDraw.gameId, merchant.id, merchant.branchId, freeLines);
      allLines.push(...freeLines);
    }
    const potentialWin = allLines.reduce((sum, line) => sum.add(line.potentialWin), new Prisma.Decimal(0));
    const token = randomBytes(12).toString('hex').toUpperCase();
    const date = new Date();
    const day = String(date.getUTCFullYear()).slice(-2) + String(date.getUTCMonth() + 1).padStart(2, '0') + String(date.getUTCDate()).padStart(2, '0');
    const suffix = (randomBytes(4).readUInt32BE(0) % 60466176).toString(36).toUpperCase().padStart(5, '0');
    const ticketNumber = day + suffix;
    return prisma.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', tenantId + ':' + dto.idempotencyKey);
      const concurrent = await tx.ticket.findUnique({ where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: dto.idempotencyKey } }, include: { lines: { include: { betType: true } }, events: true } });
      if (concurrent) {
        if (isOperationallyDeleted(concurrent.events)) throw new ForbiddenException('TICKET_DELETED');
        return presentTicketLines(concurrent as any);
      }
      const ticket = await tx.ticket.create({ data: {
        tenantId, ticketNumber, idempotencyKey: dto.idempotencyKey, branchId: merchant.branchId, merchantId: merchant.id, deviceId: dto.deviceId,
        gameId: firstDraw.gameId, drawId: firstDraw.id, amount, currencyCode, potentialWin, barcode: token, qrCode: `LV1:${tenantId}:${token}`,
        ticketDraws: { create: ticketDraws },
        lines: { create: allLines.map(line => ({ id: line.id, tenantId, drawId: line.drawId, betTypeId: line.betTypeId, selection: line.selection, selectionKey: line.selectionKey, stake: line.stake, odds: line.odds, potentialWin: line.potentialWin })) },
        events: { create: { tenantId, type: 'CREATED', userId: u.sub, deviceId: dto.deviceId, metadata: { multiLottery: true, drawIds: ticketDraws.map(item => item.drawId), ...(freeLines.length ? { freeMaryajLineIds: freeLines.map(line => line.id) } : {}) } } },
      } });
      const cash = await tx.ledgerAccount.upsert({ where: { tenantId_code: { tenantId, code: 'MERCHANT_CASH' } }, update: {}, create: { tenantId, code: 'MERCHANT_CASH', name: 'Merchant cash', type: 'ASSET' } });
      const sales = await tx.ledgerAccount.upsert({ where: { tenantId_code: { tenantId, code: 'TICKET_SALES' } }, update: {}, create: { tenantId, code: 'TICKET_SALES', name: 'Ticket sales', type: 'REVENUE' } });
      await tx.ledgerTransaction.create({ data: { tenantId, type: 'SALE', referenceType: 'Ticket', referenceId: ticket.id, idempotencyKey: 'sale:' + dto.idempotencyKey, entries: { create: [{ tenantId, accountId: cash.id, debit: amount }, { tenantId, accountId: sales.id, credit: amount }] } } });
      await postTicketCommission(tx, ticket, u.sub);
      return presentTicketLines(await tx.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: { lines: { include: { betType: true } }, events: true, ticketDraws: { include: { draw: { include: { game: true } } } }, draw: { include: { game: true } } } }) as any);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async checkLimits(tenantId: string, drawId: string, gameId: string, merchantId: string, branchId: string, lines: any[]) {
    const now = new Date();
    const limits = await (prisma as any).bettingLimit.findMany({
      where: { tenantId, active: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }], scope: { in: ['TENANT', 'BRANCH', 'MERCHANT', 'GAME', 'DRAW', 'BET_TYPE', 'NUMBER'] } },
      include: { betType: { select: { code: true } } },
    });
    const applies = (limit: any, line: any) => limit.scope === 'TENANT'
      || (limit.scope === 'BRANCH' && limit.scopeId === branchId)
      || (limit.scope === 'MERCHANT' && limit.scopeId === merchantId)
      || (limit.scope === 'GAME' && (limit.gameId === gameId || limit.scopeId === gameId))
      || (limit.scope === 'DRAW' && (limit.drawId === drawId || limit.scopeId === drawId))
      || (limit.scope === 'BET_TYPE' && (limit.betTypeId === line.betTypeId || limit.scopeId === line.betTypeId))
      || (limit.scope === 'NUMBER' && (!limit.gameId || limit.gameId === gameId) && (!limit.drawId || limit.drawId === drawId));
    for (const line of lines) {
      const code = line.code ?? line.betType?.code;
      const matching = (limits as any[])
        .filter((item: any) => applies(item, line))
        .filter((item: any) => !item.betTypeId || item.betTypeId === line.betTypeId)
        .filter((item: any) => blockedNumberMatches(item.numberKey, line.selectionKey, code));
      if (isNumberBlocked(matching, { gameId, drawId }, { betTypeId: line.betTypeId, selectionKey: line.selectionKey, betTypeCode: code })) {
        throw new BadRequestException('NUMBER_BLOCKED');
      }
      for (const limit of matching) {
        if (limit.scope === 'NUMBER' && limit.numberKey && limit.maxStake?.eq(0)) continue;
        if (limit.minStake && line.stake.lt(limit.minStake)) throw new BadRequestException('BELOW_MINIMUM_STAKE');
        if (limit.maxStake && line.stake.gt(limit.maxStake)) throw new BadRequestException('LIMIT_REACHED');
      }
    }
  }
  private tenant(u: Principal) { if (!u.tenantId) throw new ForbiddenException('TENANT_ACCESS_REQUIRED'); return u.tenantId; }
}
