import { describe, expect, it } from 'vitest';
import { Prisma } from '@lottivexa/database';
import { groupTicketSalesByDraw, reportDrawSession } from './report-draw-policy';

describe('draw sales details', () => {
  it('keeps legacy single-draw ticket labels when TicketDraw rows are absent', () => {
    const draw = {
      id: 'draw-1',
      drawNumber: 'NY-20260912-2230',
      drawDate: new Date('2026-09-13T02:30:00.000Z'),
      game: { name: 'New York', code: 'NY' },
    };
    const rows = groupTicketSalesByDraw([{
      drawId: 'draw-1',
      amount: new Prisma.Decimal('172.00'),
      draw,
      ticketDraws: [],
      lines: [{ drawId: null, stake: new Prisma.Decimal('172.00'), isPromotional: false }],
    }]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      drawNumber: 'NY-20260912-2230',
      gameName: 'New York',
      gameCode: 'NY',
      session: 'NIGHT',
      count: 1,
      amount: '172',
    });
  });

  it('splits multi-draw stakes and excludes promotional lines from sales', () => {
    const newYork = { id: 'draw-1', drawNumber: 'NY-20260912-2230', drawDate: new Date('2026-09-13T02:30:00Z'), game: { name: 'New York', code: 'NY' } };
    const florida = { id: 'draw-2', drawNumber: 'FL-20260913-1200', drawDate: new Date('2026-09-13T16:00:00Z'), game: { name: 'Florida', code: 'FL' } };
    const rows = groupTicketSalesByDraw([{
      drawId: 'draw-1',
      amount: new Prisma.Decimal('30.00'),
      draw: newYork,
      ticketDraws: [{ drawId: 'draw-1', draw: newYork }, { drawId: 'draw-2', draw: florida }],
      lines: [
        { drawId: 'draw-1', stake: new Prisma.Decimal('10.00'), isPromotional: false },
        { drawId: 'draw-1', stake: new Prisma.Decimal('1.00'), isPromotional: true },
        { drawId: 'draw-2', stake: new Prisma.Decimal('20.00'), isPromotional: false },
      ],
    }]);

    expect(rows.map((row) => [row.gameCode, row.count, row.amount])).toEqual([
      ['NY', 1, '10'],
      ['FL', 1, '20'],
    ]);
  });

  it('uses scheduled HHMM in the draw number to identify sessions', () => {
    expect(reportDrawSession(undefined, 'NY-20260912-2230')).toBe('NIGHT');
    expect(reportDrawSession(undefined, 'FL-20260912-1200')).toBe('MIDDAY');
    expect(reportDrawSession(undefined, 'FL-20260912-9999')).toBe('UNKNOWN');
  });
});
