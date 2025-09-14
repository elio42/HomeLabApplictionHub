import { prisma } from "../db/prismaClient";
import { TileCreateInput, TileUpdateInput } from "../utils/validation";
import { fetchFaviconBase64 } from "../utils/favicon";
import { sanitizeDataUrl } from "../utils/image";
import { request } from "undici";

async function fetchRemoteImageBase64(
  url: string
): Promise<string | undefined> {
  try {
    const res = await request(url, { method: "GET" });
    if (res.statusCode >= 400) return undefined;
    const ctHeader = res.headers["content-type"];
    if (!ctHeader) return undefined;
    const singleCt = Array.isArray(ctHeader) ? ctHeader[0] : ctHeader;
    if (!singleCt.startsWith("image/")) {
      return undefined; // not an image -> trigger favicon fallback
    }
    const maxBytes = 200 * 1024; // reuse same limit
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of res.body as any as AsyncIterable<Buffer>) {
      total += chunk.length;
      if (total > maxBytes) {
        return undefined; // oversize -> fallback
      }
      chunks.push(chunk);
    }
    const buf = Buffer.concat(chunks);
    const b64 = buf.toString("base64");
    const mime = singleCt;
    return `data:${mime};base64,${b64}`;
  } catch {
    return undefined;
  }
}

export async function listTiles() {
  return prisma.tile.findMany({ orderBy: { order: "asc" } });
}

export async function getTile(id: string) {
  return prisma.tile.findUnique({ where: { id } });
}

export async function createTile(data: TileCreateInput) {
  // Determine next order
  const max = await prisma.tile.aggregate({ _max: { order: true } });
  const nextOrder = (max._max.order ?? 0) + 1;

  let icon = data.icon;
  let iconSourceUrl = data.iconSourceUrl;

  // If user supplied an upload (data URL) sanitize
  if (icon?.startsWith("data:")) {
    icon = (await sanitizeDataUrl(icon)) || undefined;
  } else if (!icon && iconSourceUrl) {
    // Try downloading remote image URL
    const downloaded = await fetchRemoteImageBase64(iconSourceUrl);
    if (downloaded) {
      icon = (await sanitizeDataUrl(downloaded)) || undefined;
    }
  }

  if (!icon) {
    // Fallback to favicon
    icon = (await fetchFaviconBase64(data.url)) || undefined;
  }

  return prisma.tile.create({
    data: { ...data, icon, iconSourceUrl, order: nextOrder },
  });
}

export async function updateTile(id: string, data: TileUpdateInput) {
  let newData: TileUpdateInput & { iconSourceUrl?: string | null } = {
    ...data,
  };

  // Normalize clearing of iconSourceUrl: if explicitly provided as empty string, set to null
  const clearingSource = (newData as any).iconSourceUrl === "";
  if (clearingSource) {
    delete (newData as any).iconSourceUrl; // delete to allow explicit null in separate update data object below
  }

  if (newData.icon?.startsWith("data:")) {
    newData.icon = (await sanitizeDataUrl(newData.icon)) || undefined;
  } else if (!newData.icon && newData.iconSourceUrl) {
    // attempt remote download only if not clearing
    const downloaded = await fetchRemoteImageBase64(newData.iconSourceUrl);
    if (downloaded) {
      newData.icon = (await sanitizeDataUrl(downloaded)) || undefined;
    }
  }

  if (!newData.icon && !clearingSource && data.url) {
    // Final fallback to favicon (only if not explicitly clearing source URL)
    const fav = await fetchFaviconBase64(data.url);
    if (fav) newData.icon = fav;
  }

  // Build final data object; if clearingSource, set iconSourceUrl to null
  const updateData: any = { ...newData };
  if (clearingSource) updateData.iconSourceUrl = null;
  return prisma.tile.update({ where: { id }, data: updateData });
}

export async function refreshTileIcon(id: string) {
  const tile = await prisma.tile.findUnique({ where: { id } });
  if (!tile) return null;
  const icon = await fetchFaviconBase64(tile.url);
  if (!icon) {
    // Clear existing icon if fetch fails? Keep existing icon.
    return tile; // unchanged
  }
  return prisma.tile.update({ where: { id }, data: { icon } });
}

export async function deleteTile(id: string) {
  await prisma.tile.delete({ where: { id } });
}

export async function reorderTiles(ids: string[]) {
  // Apply new order indexes based on array position (starting at 1)
  return prisma.$transaction(
    ids.map((id, index) =>
      prisma.tile.update({ where: { id }, data: { order: index + 1 } })
    )
  );
}
