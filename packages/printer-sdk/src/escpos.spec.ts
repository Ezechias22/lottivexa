import { describe, expect, it } from 'vitest';
import { EscPosDriver, renderTicket } from './escpos';

const data = {
  businessName: 'King Lotto', ticketNumber: 'LV-1', merchant: 'Jean Pierre',
  branch: 'Centre Ville', branchAddress: 'Rue du Centre', branchPhone: '509-0000',
  game: 'NY', draw: 'New York · Nòmal · Maten', currency: 'HTG',
  lines: [{ selection: '12-34', stake: '10.00', potentialWin: '500.00' }],
  amount: '10.00', potentialWin: '500.00', createdAt: '20/09/2026 09:00',
  barcode: 'ABC', qrCode: 'LV1:ABC',
};

function containsBytes(bytes: Uint8Array, sequence: number[]) {
  return bytes.some((_, start) => sequence.every((value, index) => bytes[start + index] === value));
}

describe('ESC/POS', () => {
  it('prints the complete business-branded receipt and keeps machine codes out of its text', () => {
    const bytes = renderTicket({ paperWidth: 58, showBarcode: true, showQr: true, header: 'LOTTIVEXA' }, data);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('King Lotto');
    expect(text).toContain('TIKE LV-1');
    expect(text).toContain('FICH BOLET');
    expect(text).toContain('TIRAJ: New York · Nòmal · Maten');
    expect(text).toContain('HTG 10.00');
    expect(text).toContain('Rue du Centre');
    expect(text).toContain('MACHANN: Jean Pierre');
    expect(text).not.toContain('LOTTIVEXA');
    expect([...bytes].some((x, i, a) => x === 0x1d && a[i + 1] === 0x6b && a[i + 2] === 73)).toBe(true);
    expect([...bytes].some((x, i, a) => x === 0x1d && a[i + 1] === 0x28 && a[i + 2] === 0x6b)).toBe(true);
  });

  it('prints the double zero and centers an OP on its own line', () => {
    const bytes = renderTicket({ paperWidth: 58, showBarcode: false, showQr: false }, {
      ...data,
      lines: [{ betType: 'BOUL PÈ', selection: '00@2', stake: '50.00', potentialWin: '500.00' }],
    });
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('00');
    expect(text).toContain('OP 2');
    expect(text).not.toContain('00@2');
    expect(containsBytes(bytes, [0x1b, 0x61, 1, 0x4f, 0x50, 0x20, 0x32, 0x0a, 0x1b, 0x61, 0])).toBe(true);
  });

  it('prints dekabes and promotional Maryaj as free lines', () => {
    const text = new TextDecoder().decode(renderTicket({ paperWidth: 58, showBarcode: false, showQr: false }, {
      ...data,
      lines: [{ betType: 'MARYAJ', selection: '00-11', stake: '1.00', potentialWin: '100.00', isPromotional: true, winCount: 2, isWinner: true }],
    }));
    expect(text).toContain('DEKABÈS × 2');
    expect(text).toContain('GRATIS');
    expect(text).toContain('GANYEN: HTG 100.00');
  });

  it('rejects missing or platform branding', () => {
    expect(() => renderTicket({ paperWidth: 58, showBarcode: false, showQr: false }, { ...data, businessName: '' })).toThrow('RECEIPT_BUSINESS_NAME_REQUIRED');
    expect(() => renderTicket({ paperWidth: 58, showBarcode: false, showQr: false }, { ...data, businessName: 'LOTTIVEXA' })).toThrow('RECEIPT_BUSINESS_NAME_REQUIRED');
  });

  it('omits machine codes when the template disables them', () => {
    const bytes = [...renderTicket({ paperWidth: 58, showBarcode: false, showQr: false }, data)];
    expect(bytes.some((x, i) => x === 0x1d && bytes[i + 1] === 0x6b)).toBe(false);
  });

  it('writes through injected transport', async () => {
    const writes: Uint8Array[] = [];
    const driver = new EscPosDriver({ open: async () => {}, close: async () => {}, write: async (bytes) => { writes.push(bytes); } });
    await driver.connect(); await driver.testPrint(); expect(writes.length).toBe(2);
  });
});
