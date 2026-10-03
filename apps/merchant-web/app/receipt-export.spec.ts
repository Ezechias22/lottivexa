import { describe, expect, it } from 'vitest';
import { receiptBrandName, receiptDrawName, receiptLineRows, receiptStatus, ticketSvg } from './receipt-export';

describe('ticket receipt output', () => {
  it('does not print the generic Bolet heading but keeps a tenant brand', () => {
    expect(receiptBrandName({ businessName: 'Bolet' })).toBe('');
    expect(receiptBrandName({ businessName: 'Marché Soleil' })).toBe('Marché Soleil');
  });

  it('shows the draw and session without its closing clock time', () => {
    const label = receiptDrawName({
      ticketDraws: [{
        draw: {
          game: { name: 'Texas' },
          session: 'MORNING',
          closesAt: '2026-10-03T15:00:00.000Z',
        },
      }],
    }, 'ht');
    expect(label).toContain('Texas');
    expect(label).toContain('Maten');
    expect(label).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('separates game, number, and price and translates ticket status', () => {
    expect(receiptLineRows({
      currency: 'USD',
      lines: [{ betType: { code: 'BOUL' }, selectionKey: '00', stake: '20' }],
    }, 'ht')).toEqual([{ label: 'BL', number: '00', price: '$20.00', extra: '' }]);
    expect(receiptStatus('PENDING', 'ht')).toBe('AN ATANT');
    expect(receiptStatus('PAID', 'fr')).toBe('PAYÉ');
  });

  it('sizes the exported image to include all lines and the receipt footer', () => {
    const svg = ticketSvg({
      businessName: 'Bolet',
      ticketNumber: '261003LGK4G',
      createdAt: '2026-10-03T15:00:00.000Z',
      amount: '300',
      currency: 'USD',
      status: 'VALID',
      barcode: 'VERIFY-261003LGK4G',
      lines: Array.from({ length: 15 }, (_, index) => ({
        id: String(index),
        betType: { code: 'BOUL' },
        selectionKey: String(index).padStart(2, '0'),
        stake: '20',
      })),
    }, 'ht');
    const height = Number(svg.match(/height="(\d+)"/)?.[1] ?? 0);
    expect(height).toBeGreaterThan(600);
    expect(svg).toContain('VERIFY-261003LGK4G');
    expect(svg).toContain('TOTAL: $300.00');
    expect(svg).toContain('Kenbe tikè orijinal la.');
    expect(svg).not.toContain('>Bolet<');
  });
});
