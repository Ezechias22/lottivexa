export type BrandingImageKind = "logo" | "favicon";
export type BrandingImageIssue = "type" | "size" | "decode" | "encode";

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 768 * 1024;

export function brandingImageIssue(
  type: string,
  size: number,
): BrandingImageIssue | null {
  if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(type)) {
    return "type";
  }
  if (size <= 0 || size > MAX_INPUT_BYTES) return "size";
  return null;
}

export function fitBrandingImage(
  width: number,
  height: number,
  kind: BrandingImageKind,
) {
  const edge = kind === "favicon" ? 128 : 512;
  const scale = Math.min(1, edge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("encode"));
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("encode"));
    reader.readAsDataURL(blob);
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode"))),
      "image/webp",
      0.82,
    );
  });
}

/** Decode, resize, and compress an uploaded logo before placing it in settings. */
export async function prepareBrandingImage(
  file: File,
  kind: BrandingImageKind,
): Promise<string> {
  const issue = brandingImageIssue(file.type, file.size);
  if (issue) throw new Error(issue);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("decode");
  }

  try {
    if (!bitmap.width || !bitmap.height) throw new Error("decode");
    const base = fitBrandingImage(bitmap.width, bitmap.height, kind);
    for (const scale of [1, 0.75, 0.5, 0.35]) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(base.width * scale));
      canvas.height = Math.max(1, Math.round(base.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("encode");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const output = await canvasBlob(canvas);
      if (output.size <= MAX_OUTPUT_BYTES) return await readAsDataUrl(output);
    }
    throw new Error("encode");
  } finally {
    bitmap.close();
  }
}
