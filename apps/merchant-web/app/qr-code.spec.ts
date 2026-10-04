import { describe, expect, it } from 'vitest';
import { qrCodeDataUrl, qrCodeMatrix, qrCodePath } from './qr-code';

describe('ticket QR code', () => {
  it('encodes a ticket verification payload as a QR matrix with a quiet zone path', () => {
    const matrix = qrCodeMatrix('LV1:12345678-1234-1234-1234-123456789abc:0123456789ABCDEF01234567');
    expect(matrix).toHaveLength(33);
    expect(matrix.every(row => row.length === 33)).toBe(true);
    expect(qrCodePath(matrix, 4)).toContain('M4,4h1v1h-1z');
    expect(qrCodeDataUrl('ticket')).toMatch(/^data:image\/svg\+xml/);
  });

  it('rejects payloads beyond this receipt QR version capacity', () => {
    expect(() => qrCodeMatrix('x'.repeat(79))).toThrow('QR_VALUE_TOO_LONG');
  });
});
