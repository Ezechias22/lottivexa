import { describe, expect, it } from 'vitest';
import { makeTicketPdf, receiptLineRows, ticketPdfBlob, ticketSvg } from './receipt-export';

const ticket = {
  id: 'ticket-id',
  ticketNumber: 'LV-2026-001',
  currency: 'USD',
  amount: '2.00',
  createdAt: '2026-10-04T12:00:00.000Z',
  qrCode: 'LV1:tenant:ticket-token',
  lines: [{
    id: 'line-id',
    betType: { code: 'MARYAJ' },
    selectionKey: '12-34',
    stake: '1',
    potentialWin: '500',
    isWinner: false,
  }],
};

describe('ticket PDF export', () => {
  it('shares and downloads the same PDF bytes with its QR code', async () => {
    const shared = ticketPdfBlob(ticket, 'fr');
    const downloaded = makeTicketPdf(ticket, 'fr').output('blob') as Blob;

    expect(shared.type).toBe('application/pdf');
    expect(Array.from(new Uint8Array(await shared.arrayBuffer()))).toEqual(
      Array.from(new Uint8Array(await downloaded.arrayBuffer())),
    );
    expect(new TextDecoder().decode(await shared.slice(0, 5).arrayBuffer())).toBe('%PDF-');
  });

  it('shows actual winnings only, uses the requested dollar sign, and hides potential winnings', () => {
    const rows = receiptLineRows(ticket, 'fr');
    expect(rows[0].price).toBe('$1,00');
    expect(rows[0].extra).not.toContain('500');

    const winner = { ...ticket, lines: [{ ...ticket.lines[0], isWinner: true, winningAmount: '50' }] };
    expect(receiptLineRows(winner, 'fr')[0].extra).toContain('$50,00');

    const dekabes = { ...ticket, lines: [{ ...ticket.lines[0], isWinner: true, winCount: 2, winningAmount: '50' }] };
    expect(receiptLineRows(dekabes, 'fr')[0].extra).toContain('$50,00');
    expect(receiptLineRows(dekabes, 'fr')[0].extra).not.toContain('$100,00');
  });

  it('uses one dollar sign in the shared image receipt for every currency', () => {
    const svg = ticketSvg({ ...ticket, currency: 'HTG' }, 'fr');
    expect(svg).toContain('TOTAL: $2,00');
    expect(svg).not.toContain('G$');
    expect(svg).not.toContain('$$');
  });
});
