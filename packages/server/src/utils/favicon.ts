import { fetch } from "undici";
import { URL } from "node:url";

// Attempts a few common favicon locations. Returns base64 data URL or null.
export async function fetchFaviconBase64(
  pageUrl: string
): Promise<string | null> {
  let origin: string;
  try {
    const u = new URL(pageUrl);
    origin = `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }

  const candidates = [
    `${origin}/favicon.ico`,
    `${origin}/favicon.png`,
    `${origin}/favicon-32x32.png`,
    `${origin}/apple-touch-icon.png`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") || "image/x-icon";
      const buf = Buffer.from(await res.arrayBuffer());
      // skip if extremely small (likely 404 html) or huge >200KB
      if (buf.length < 100 || buf.length > 200_000) continue;
      const base64 = buf.toString("base64");
      return `data:${contentType};base64,${base64}`;
    } catch {
      // ignore and continue
    }
  }
  return null;
}
