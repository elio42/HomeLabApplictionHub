import { fetch } from "undici";
import { URL } from "node:url";

// Simple HTML parsing to extract <link rel="...icon..." href="..."> candidates.
async function extractIconLinks(html: string, base: string): Promise<string[]> {
  const links: string[] = [];
  // Very lightweight regex-based parse (good enough for favicon discovery)
  const linkRegex = /<link\s+[^>]*rel=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html))) {
    const relValue = match[1];
    if (!/icon/i.test(relValue)) continue;
    const tag = match[0];
    const hrefMatch = /href=["']([^"']+)["']/i.exec(tag);
    if (!hrefMatch) continue;
    let href = hrefMatch[1].trim();
    try {
      // Resolve relative URLs
      href = new URL(href, base).toString();
      links.push(href);
    } catch {
      /* ignore */
    }
  }
  return links;
}

// Attempts a few common favicon locations. Returns base64 data URL or null.
export async function fetchFaviconBase64(
  pageUrl: string
): Promise<string | null> {
  let origin: string;
  let urlObj: URL;
  try {
    urlObj = new URL(pageUrl);
    origin = `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    return null;
  }

  const directCandidates = [
    `${origin}/favicon.ico`,
    `${origin}/favicon-32x32.png`,
    `${origin}/favicon.png`,
    `${origin}/apple-touch-icon.png`,
    `${origin}/android-chrome-192x192.png`,
  ];

  const dynamicCandidates: string[] = [];
  // Attempt to fetch HTML once to look for declared icons
  try {
    const htmlRes = await fetch(pageUrl, { method: "GET" });
    if (htmlRes.ok) {
      const ct = htmlRes.headers.get("content-type") || "";
      if (/text\/html/i.test(ct)) {
        const htmlText = await htmlRes.text();
        const found = await extractIconLinks(htmlText, `${origin}/`);
        for (const f of found) {
          if (!dynamicCandidates.includes(f)) dynamicCandidates.push(f);
        }
      }
    }
  } catch {
    /* ignore */
  }

  const seen = new Set<string>();
  const all = [...dynamicCandidates, ...directCandidates].filter((c) => {
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });

  for (const url of all) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") || "image/x-icon";
      // Accept SVG separately (text/xml or image/svg+xml)
      const isSvg = /svg\+xml/i.test(contentType);
      const isLikelyImage = /^image\//i.test(contentType) || isSvg;
      const buf = Buffer.from(await res.arrayBuffer());
      const lowerUrl = url.toLowerCase();

      // If server returned HTML or other non-image mime, skip (prevents alt text fallback showing title)
      if (!isLikelyImage) {
        // Special-case ICO mislabeling: sometimes served as application/octet-stream
        const isOctet = /octet-stream/i.test(contentType);
        const icoSig =
          buf.length >= 4 &&
          buf[0] === 0x00 &&
          buf[1] === 0x00 &&
          buf[2] === 0x01 &&
          buf[3] === 0x00;
        const urlLooksIco = lowerUrl.endsWith(".ico");
        if (!(isOctet && (icoSig || urlLooksIco))) {
          continue;
        }
      }
      // Basic HTML sniff (in case content-type lied)
      const startsWithLt = buf[0] === 0x3c; // '<'
      if (startsWithLt) {
        const first20 = buf.slice(0, 200).toString("utf8").toLowerCase();
        if (first20.includes("<html") || first20.includes("<!doctype")) {
          continue;
        }
      }
      if (!isSvg) {
        // skip if extremely small (<50 bytes likely HTML) or huge >300KB
        if (buf.length < 50 || buf.length > 300_000) continue;
      } else {
        // Basic length guard for SVG
        if (buf.length < 30 || buf.length > 200_000) continue;
      }
      const base64 = buf.toString("base64");
      return `data:${contentType};base64,${base64}`;
    } catch {
      // ignore and continue
    }
  }
  return null;
}
