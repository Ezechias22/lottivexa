import sharp from 'sharp';

const MAX_LOGO_BYTES = 768 * 1024;

/** Convert a saved tenant image into a small ESC/POS monochrome logo. */
export async function receiptLogoRaster(source?: string | null): Promise<Uint8Array | undefined> {
  if (!source?.startsWith('data:image/')) return undefined;
  const comma = source.indexOf(',');
  if (comma < 0) return undefined;
  const encoded = source.slice(comma + 1);
  if (encoded.length > Math.ceil(MAX_LOGO_BYTES * 4 / 3)) return undefined;

  try {
    const imageBytes = Buffer.from(encoded, 'base64');
    if (!imageBytes.length || imageBytes.length > MAX_LOGO_BYTES) return undefined;
    const { data, info } = await sharp(imageBytes, { limitInputPixels: 4_000_000 })
      .resize({ width: 384, height: 128, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const widthBytes = Math.ceil(info.width / 8);
    const raster = Buffer.alloc(widthBytes * info.height);
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[y * info.width + x] < 170) {
          raster[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
        }
      }
    }
    const header = Buffer.from([
      0x1d, 0x76, 0x30, 0x00,
      widthBytes & 0xff, (widthBytes >> 8) & 0xff,
      info.height & 0xff, (info.height >> 8) & 0xff,
    ]);
    return new Uint8Array(Buffer.concat([header, raster]));
  } catch {
    // A bad or unsupported logo must not prevent the rest of the ticket printing.
    return undefined;
  }
}
