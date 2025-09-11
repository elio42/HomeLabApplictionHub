export type UUID = string;

export type TileTarget = "_blank" | "_self";

export interface Tile {
  id: UUID;
  title: string;
  url: string;
  icon?: string; // optional filename or data URL
  category?: string;
  description?: string;
  target?: TileTarget;
  order?: number;
  visible?: boolean;
  createdAt: string; // ISO
  updatedAt?: string;
}
