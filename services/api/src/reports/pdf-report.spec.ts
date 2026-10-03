import { describe, expect, it } from 'vitest';
import { buildSalesPdf } from './pdf-report';

describe('sales PDF', () => {
  it('creates a readable A4 report with local dates, tenant currency, and paginated details', () => {
    const report = buildSalesPdf({
      period: {
        from: new Date('2026-01-01T05:00:00.000Z'),
        to: new Date('2026-02-01T04:59:59.999Z'),
      },
      tickets: { count: 3, sales: '30.50', commission: '2.00' },
      payouts: { count: 1, amount: '50.00' },
      commission: '2.00',
      accounting: {
        cancelledCount: 1,
        cancelledAmount: '4.00',
        netSales: '-21.50',
        deficit: '21.50',
      },
      byStatus: [{ status: 'PAID', count: 1, amount: '10.00' }],
      byDay: Array.from({ length: 31 }, (_, index) => ({
        day: '2026-01-' + String(index + 1).padStart(2, '0'),
        count: 1,
        amount: '10.00',
      })),
      byGame: [{ gameCode: 'FL', gameName: 'Florida', count: 2, amount: '20.00' }],
      byBranch: [{ branchCode: 'M01', branchName: 'Biwo Santral', count: 3, amount: '30.50' }],
      byDraw: [{
        drawDate: new Date('2026-01-01T20:00:00.000Z'),
        session: 'EVENING',
        gameCode: 'FL',
        gameName: 'Florida',
        drawNumber: 'FL-20260101-2000',
        count: 2,
        amount: '20.00',
      }],
      biggestWins: [{
        ticketNumber: 'TICKET-001',
        merchantName: 'Machann Santral',
        gameName: 'Florida',
        drawNumber: 'FL-20260101-2000',
        amount: '50.00',
      }],
    }, 'Top Lotto', 'HTG').toString('latin1');

    expect(report.startsWith('%PDF-1.4')).toBe(true);
    expect(report).toContain('Top Lotto');
    expect(report).toContain('/MediaBox [0 0 595 842]');
    expect(report).toContain('HTG 30.50');
    expect(report).toContain('HTG 50.00');
    expect(report).toContain('VANT PA TIRAJ');
    expect(report).toContain('PI GWO TIKÈ GAYAN YO');
    expect(report).toContain('xref');
    expect(report).toMatch(/startxref\n\d+\n%%EOF/);
    expect(report).not.toContain('Gross sales:');
    expect(report).not.toContain('Currency: $');
    expect(report).not.toContain('Potential winnings');
    expect(report).not.toContain('2026-02-02');
    expect((report.match(/\/Type \/Page \/Parent/g) ?? []).length).toBeGreaterThan(1);
  });
});
