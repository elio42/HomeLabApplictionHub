import { Tile } from "@hub/shared";

export const isDataUrl = (s: string) => s.startsWith("data:");

export function tileHasIconUrl(t?: Tile | null): boolean {
  if (!t || !t.icon) return false;
  const v = t.icon.trim();
  if (!v) return false;
  return !isDataUrl(v);
}
