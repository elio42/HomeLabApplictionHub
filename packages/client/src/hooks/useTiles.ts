import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTiles,
  createTile,
  updateTile,
  deleteTile,
  reorderTiles,
  refreshTileIcon,
  CreateTileInput,
  UpdateTileInput,
} from "../api/tiles";
import { Tile } from "@hub/shared";

export function useTiles() {
  return useQuery({ queryKey: ["tiles"], queryFn: fetchTiles });
}

export function useCreateTile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tiles"] });
    },
  });
}

export function useUpdateTile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTileInput) => updateTile(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tiles"] }),
  });
}

export function useDeleteTile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tiles"] }),
  });
}

export function useReorderTiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => reorderTiles(ids),
    // Optimistic update
    onMutate: async (newOrder: string[]) => {
      await qc.cancelQueries({ queryKey: ["tiles"] });
      const previous = qc.getQueryData<Tile[]>(["tiles"]);
      if (previous) {
        const idToTile = new Map(previous.map((t) => [t.id, t] as const));
        const reordered = newOrder
          .map((id, index) => {
            const tile = idToTile.get(id);
            if (!tile) return null;
            return { ...tile, order: index } as Tile;
          })
          .filter(Boolean) as Tile[];
        qc.setQueryData(["tiles"], reordered);
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["tiles"], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tiles"] });
    },
  });
}

export function useRefreshTileIcon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => refreshTileIcon(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tiles"] }),
  });
}

export type { CreateTileInput, UpdateTileInput };
