import React, { useState, useEffect } from "react";
import {
  Box,
  CircularProgress,
  Fab,
  Typography,
  Button,
  Stack,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  useTiles,
  useCreateTile,
  useUpdateTile,
  useDeleteTile,
  useReorderTiles,
  useRefreshTileIcon,
  CreateTileInput,
} from "../hooks/useTiles";
import { TileGrid } from "../components/TileGrid";
import { TileFormDialog } from "../components/TileFormDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Tile } from "@hub/shared";

const LS_KEY = "hub.tiles.cache.v1";

export default function Home() {
  const { data, isLoading, isError } = useTiles();
  const createMutation = useCreateTile();
  const updateMutation = useUpdateTile();
  const deleteMutation = useDeleteTile();
  const reorderMutation = useReorderTiles();
  const refreshIconMutation = useRefreshTileIcon();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTile, setEditTile] = useState<Tile | null>(null);
  const [deleteTileObj, setDeleteTileObj] = useState<Tile | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [offlineTiles, setOfflineTiles] = useState<Tile[] | null>(null);
  const [usingOffline, setUsingOffline] = useState(false);

  // Cache tiles on success
  useEffect(() => {
    if (data && !isLoading && !isError) {
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({ tiles: data, ts: Date.now() })
        );
      } catch {}
    }
  }, [data, isLoading, isError]);

  // Load from cache if error
  useEffect(() => {
    if (isError && !isLoading && !data) {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.tiles)) {
            setOfflineTiles(parsed.tiles);
            setUsingOffline(true);
          }
        }
      } catch {}
    }
  }, [isError, isLoading, data]);

  const effectiveTiles = usingOffline ? offlineTiles : data;
  const offline = usingOffline;

  const handleAdd = (d: CreateTileInput | Partial<CreateTileInput>) => {
    if (offline) return;
    if (!d.title || !d.url) return;
    createMutation.mutate(d as CreateTileInput);
  };
  const handleEditSave = (partial: Partial<CreateTileInput>) => {
    if (offline) return;
    if (editTile) {
      updateMutation.mutate({ id: editTile.id, data: partial });
    }
  };
  const handleDeleteConfirm = () => {
    if (offline) return;
    if (deleteTileObj) deleteMutation.mutate(deleteTileObj.id);
  };

  return (
    <Box p={2}>
      {offline && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Offline mode: showing cached tiles. Add/Edit/Delete/Reorder disabled.
        </Alert>
      )}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h4">Services</Typography>
        <Button
          variant={reorderMode ? "contained" : "outlined"}
          color={reorderMode ? "secondary" : "inherit"}
          onClick={() => !offline && setReorderMode((m) => !m)}
          disabled={offline}
        >
          {reorderMode ? "Finish Reordering" : "Reorder"}
        </Button>
      </Stack>
      {isLoading && !effectiveTiles && <CircularProgress />}
      {isError && !effectiveTiles && (
        <Typography color="error">Failed to load tiles.</Typography>
      )}
      {effectiveTiles && (
        <TileGrid
          tiles={effectiveTiles}
          onEdit={offline ? undefined : (t) => setEditTile(t)}
          onDelete={offline ? undefined : (t) => setDeleteTileObj(t)}
          onReorder={offline ? undefined : (ids) => reorderMutation.mutate(ids)}
          enableReorder={reorderMode && !offline}
        />
      )}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: "fixed", bottom: 24, right: 24 }}
        onClick={() => !offline && setCreateOpen(true)}
        disabled={offline}
      >
        <AddIcon />
      </Fab>
      <TileFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleAdd}
      />
      <TileFormDialog
        open={!!editTile}
        onClose={() => setEditTile(null)}
        onSubmit={handleEditSave}
        tile={editTile ?? undefined}
        onRefreshIcon={(id) => !offline && refreshIconMutation.mutate(id)}
      />
      <ConfirmDialog
        open={!!deleteTileObj}
        onCancel={() => setDeleteTileObj(null)}
        onConfirm={() => {
          handleDeleteConfirm();
          setDeleteTileObj(null);
        }}
        title="Delete Tile"
        message={`Delete tile "${deleteTileObj?.title}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </Box>
  );
}
