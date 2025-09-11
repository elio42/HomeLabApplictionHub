import { z } from "zod";

// Allow any non-empty URL string; client may highlight invalid patterns but server stores as-is.
export const tileCreateSchema = z.object({
  title: z.string().min(1).max(128),
  url: z.string().min(1, "URL required"),
  icon: z.string().optional(),
  category: z.string().max(64).optional(),
  description: z.string().optional(),
  target: z.enum(["_blank", "_self"]).optional(),
  order: z.number().int().nonnegative().optional(),
  visible: z.boolean().optional(),
});

export const tileUpdateSchema = tileCreateSchema.partial();

export type TileCreateInput = z.infer<typeof tileCreateSchema>;
export type TileUpdateInput = z.infer<typeof tileUpdateSchema>;
