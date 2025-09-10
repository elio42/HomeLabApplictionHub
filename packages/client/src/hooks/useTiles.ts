import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTiles,
  createTile,
  updateTile,
  deleteTile,
  reorderTiles,
  refreshTileIcon,
  fetchIconFromUrl,
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
    onMutate: async (newTile) => {
      await qc.cancelQueries({ queryKey: ["tiles"] });
      const previous = qc.getQueryData<Tile[]>(["tiles"]);
      if (previous) {
        const tempId = `temp-${Date.now()}`;
        qc.setQueryData<Tile[]>(
          ["tiles"],
          [
            ...previous,
            {
              id: tempId,
              title: newTile.title,
              url: newTile.url,
              icon: newTile.icon,
              iconSourceUrl: (newTile as any).iconSourceUrl,
              category: newTile.category,
              description: newTile.description,
              target: newTile.target,
              order: (previous[previous.length - 1]?.order ?? 0) + 1,
              visible: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as unknown as Tile,
          ]
        );
      }
      return { previous };
    },
    onError: (_err, _newTile, ctx) => {
      if (ctx?.previous) qc.setQueryData(["tiles"], ctx.previous);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tiles"] }),
  });
}

export function useUpdateTile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTileInput) => updateTile(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["tiles"] });
      const previous = qc.getQueryData<Tile[]>(["tiles"]);
      if (previous) {
        qc.setQueryData<Tile[]>(
          ["tiles"],
          previous.map((t) => {
            if (t.id !== input.id) return t;
            const merged: any = { ...t, ...input.data };
            if (
              Object.prototype.hasOwnProperty.call(input.data, "icon") &&
              (input.data as any).icon === null
            ) {
              merged.icon = undefined;
            }
            if (
              Object.prototype.hasOwnProperty.call(
                input.data,
                "iconSourceUrl"
              ) &&
              (input.data as any).iconSourceUrl === null
            ) {
              merged.iconSourceUrl = undefined;
            }
            merged.updatedAt = new Date().toISOString();
            return merged as Tile;
          })
        );
      }
      return { previous };
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(["tiles"], ctx.previous);
    },
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

export function useFetchIconFromUrl() {
  return useMutation({
    mutationFn: (url: string) => fetchIconFromUrl(url),
  });
}

export type { CreateTileInput, UpdateTileInput };
