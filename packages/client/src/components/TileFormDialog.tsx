import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  MenuItem,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { CreateTileInput } from "../hooks/useTiles";
import { Tile } from "@hub/shared";
import { IconPicker, IconMode } from "./IconPicker";
import { tileHasIconUrl } from "../utils/icon";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTileInput | Partial<CreateTileInput>) => void;
  tile?: Tile; // when provided, acts as edit
  onRefreshIcon?: (id: string) => void;
}

export function TileFormDialog({
  open,
  onClose,
  onSubmit,
  tile,
  onRefreshIcon,
}: Props) {
  const [form, setForm] = useState<CreateTileInput>({
    title: "",
    url: "",
    category: "",
    icon: "",
    target: "_self", // default same tab
  });
  const [iconMode, setIconMode] = useState<IconMode>("upload");

  // Simple URL validation (HTTP(S) scheme); invalid allowed but highlighted.
  const isValidUrl = useCallback((value: string) => {
    if (!value) return true; // empty handled separately by required logic
    try {
      const u = new URL(value);
      return (
        !!u.protocol && (u.protocol === "http:" || u.protocol === "https:")
      );
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (tile) {
      setForm({
        title: tile.title,
        url: tile.url,
        category: tile.category || "",
        icon: tile.icon || "",
        target: tile.target || "_self",
      });
    } else {
      setForm({ title: "", url: "", category: "", icon: "", target: "_self" });
    }
    setIconMode(tileHasIconUrl(tile) ? "url" : "upload");
  }, [tile, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Icon upload & URL handling is delegated to IconPicker

  const handleSubmit = () => {
    onSubmit({
      ...form,
      category: form.category || undefined,
      icon: form.icon || undefined,
    });
    onClose();
  };

  const titleEmpty = !form.title.trim();
  const urlEmpty = !form.url.trim();
  const urlValid = isValidUrl(form.url.trim());

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{tile ? "Edit Tile" : "Add Tile"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {/* Fields */}
          <TextField
            label="Title"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            fullWidth
            error={titleEmpty}
          />
          <TextField
            label="URL"
            name="url"
            value={form.url}
            onChange={handleChange}
            required
            fullWidth
            error={urlEmpty}
            helperText={
              !urlEmpty && !urlValid
                ? "Invalid URL (will still be saved)"
                : urlEmpty
                ? "URL is required"
                : ""
            }
            sx={
              !urlEmpty && !urlValid
                ? {
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor: "warning.main",
                      },
                    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor: "warning.main",
                      },
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor: "warning.main",
                      },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "warning.main",
                    },
                    "& .MuiFormHelperText-root": {
                      color: "warning.main",
                    },
                  }
                : undefined
            }
          />
          <TextField
            select
            label="Target"
            name="target"
            value={form.target}
            onChange={handleChange}
            fullWidth
          >
            <MenuItem value="_blank">New Tab</MenuItem>
            <MenuItem value="_self">Same Tab</MenuItem>
          </TextField>
          <TextField
            label="Optional Category for filtering"
            name="category"
            value={form.category}
            onChange={handleChange}
            fullWidth
          />
          <IconPicker
            mode={iconMode}
            onModeChange={setIconMode}
            value={form.icon ?? ""}
            onChange={(val) => setForm((f) => ({ ...f, icon: val }))}
            titleForFallback={form.title}
            maxKB={200}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        {tile && (
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => tile && onRefreshIcon?.(tile.id)}
            disabled={!tile}
          >
            Refresh Icon
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={titleEmpty || urlEmpty}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
