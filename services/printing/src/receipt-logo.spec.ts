import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { receiptLogoRaster } from './receipt-logo.js';

describe('receipt logo raster', () => {
  it('converts uploaded tenant logos into an ESC/POS raster header and pixels', async () => {
    const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#000000' } }).png().toBuffer();
    const raster = await receiptLogoRaster(`data:image/png;base64,${png.toString('base64')}`);
    expect(raster).toBeDefined();
    expect(Array.from(raster!.slice(0, 8))).toEqual([0x1d, 0x76, 0x30, 0x00, 0x01, 0x00, 0x01, 0x00]);
    expect(raster![8]).toBe(0x80);
  });

  it('skips remote image addresses and malformed image values safely', async () => {
    await expect(receiptLogoRaster('https://example.com/logo.png')).resolves.toBeUndefined();
    await expect(receiptLogoRaster('data:image/png;base64,not-an-image')).resolves.toBeUndefined();
  });
});
