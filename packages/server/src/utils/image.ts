import sharp from "sharp";
import { request } from "undici";

const MAX_ICON_BYTES = 200 * 1024; // 200KB
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/svg+xml",
]);

export interface ParsedDataUrl {
  mime: string;
  data: Buffer;
}

export function parseDataUrl(dataUrl: string): ParsedDataUrl | null {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIME.has(mime)) return null;
  try {
    const buf = Buffer.from(match[2], "base64");
    if (buf.length === 0 || buf.length > MAX_ICON_BYTES) return null;
    return { mime, data: buf };
  } catch {
    return null;
  }
}

export async function stripMetadataAndNormalize(
  buf: Buffer,
  mime: string
): Promise<string | null> {
  try {
    // For SVG just return original (no EXIF) if within size limit
    if (mime === "image/svg+xml") {
      if (buf.length > MAX_ICON_BYTES) return null;
      const base64 = buf.toString("base64");
      return `data:${mime};base64,${base64}`;
    }

    let pipeline = sharp(buf, { failOnError: false }).rotate();
    // Convert ICO/GIF to PNG to normalize
    if (mime === "image/gif" || mime.includes("icon")) {
      pipeline = pipeline.png({ compressionLevel: 9 });
    }

    const out = await pipeline
      .resize(128, 128, { fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    if (out.length > MAX_ICON_BYTES) return null;
    const base64 = out.toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch {
    return null;
  }
}

export async function sanitizeDataUrl(dataUrl: string): Promise<string | null> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  return stripMetadataAndNormalize(parsed.data, parsed.mime);
}

export async function fetchRemoteImageBase64(
  url: string
): Promise<string | null> {
  try {
    const res = await request(url, {
      method: "GET",
      headers: { "user-agent": "HomeLabApp/1.0" },
    });
    if (res.statusCode >= 400) return null;
    const ctype = res.headers["content-type"];
    if (!ctype || Array.isArray(ctype)) return null;
    const mime = ctype.split(";")[0].toLowerCase();
    if (!mime.startsWith("image/")) return null; // enforce image
    const arrayBuf = await res.body.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    if (buf.length === 0 || buf.length > 200 * 1024) return null;
    return stripMetadataAndNormalize(buf, mime);
  } catch {
    return null;
  }
}
