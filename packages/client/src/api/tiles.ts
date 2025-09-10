import { api } from "./apiClient";
import { Tile } from "@hub/shared";

export async function fetchTiles(): Promise<Tile[]> {
  const res = await api.get<{ tiles: Tile[] }>("/tiles");
  return res.data.tiles;
}

export interface CreateTileInput {
  title: string;
  url: string;
  icon?: string;
  iconSourceUrl?: string;
  category?: string;
  description?: string;
  target?: "_blank" | "_self";
}

export async function createTile(input: CreateTileInput): Promise<Tile> {
  const res = await api.post<{ tile: Tile }>("/tiles", input);
  return res.data.tile;
}

export interface UpdateTileInput {
  id: string;
  data: Partial<CreateTileInput & { order?: number; visible?: boolean }>;
}

export async function updateTile({ id, data }: UpdateTileInput): Promise<Tile> {
  const res = await api.put<{ tile: Tile }>(`/tiles/${id}`, data);
  return res.data.tile;
}

export async function deleteTile(id: string): Promise<void> {
  await api.delete(`/tiles/${id}`);
}

// Reorder tiles by sending ordered list of IDs
export async function reorderTiles(ids: string[]): Promise<Tile[]> {
  const res = await api.put<{ tiles: Tile[] }>("/tiles/reorder", { ids });
  return res.data.tiles;
}

export async function refreshTileIcon(id: string): Promise<Tile> {
  const res = await api.put<{ tile: Tile }>(`/tiles/${id}/refresh-icon`, {});
  return res.data.tile;
}

export async function fetchIconFromUrl(url: string): Promise<string> {
  const res = await api.post<{ icon: string }>(`/tiles/fetch-icon`, { url });
  return res.data.icon;
}
