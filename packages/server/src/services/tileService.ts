import { prisma } from "../db/prismaClient";
import { TileCreateInput, TileUpdateInput } from "../utils/validation";
import { fetchFaviconBase64 } from "../utils/favicon";
import { sanitizeDataUrl } from "../utils/image";

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
  if (icon?.startsWith("data:")) {
    icon = (await sanitizeDataUrl(icon)) || undefined;
  }
  if (!icon) {
    // Only attempt favicon fetch if no explicit icon or iconSourceUrl
    icon = (await fetchFaviconBase64(data.url)) || undefined;
  }
  return prisma.tile.create({ data: { ...data, icon, order: nextOrder } });
}

export async function updateTile(id: string, data: TileUpdateInput) {
  let newData = { ...data } as TileUpdateInput;
  // Normalize explicit nulls to null; undefined means leave unchanged
  const clearingIcon =
    Object.prototype.hasOwnProperty.call(data, "icon") && data.icon === null;
  const clearingIconSource =
    Object.prototype.hasOwnProperty.call(data, "iconSourceUrl") &&
    data.iconSourceUrl === null;

  if (typeof newData.icon === "string" && newData.icon.startsWith("data:")) {
    newData.icon = (await sanitizeDataUrl(newData.icon)) || undefined;
  }

  if (clearingIcon) {
    (newData as any).icon = null; // explicit clear
  }
  if (clearingIconSource) {
    (newData as any).iconSourceUrl = null; // explicit clear
  }

  // If both icon and iconSourceUrl cleared explicitly, attempt favicon fallback once
  if (clearingIcon && clearingIconSource) {
    const existing = await prisma.tile.findUnique({ where: { id } });
    if (existing) {
      const favicon = await fetchFaviconBase64(existing.url);
      if (favicon) {
        (newData as any).icon = favicon;
      }
    }
  }

  return prisma.tile.update({ where: { id }, data: newData });
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
