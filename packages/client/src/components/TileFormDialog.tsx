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
import { usePreviewIcon } from "../hooks/useTiles";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTileInput | Partial<CreateTileInput>) => void;
  tile?: Tile; // when provided, acts as edit
}

export function TileFormDialog({ open, onClose, onSubmit, tile }: Props) {
  const [form, setForm] = useState<CreateTileInput>({
    title: "",
    url: "",
    category: "",
    icon: "",
    target: "_self", // default same tab
  });
  const [iconMode, setIconMode] = useState<IconMode>("upload");
  const [previewIcon, setPreviewIcon] = useState<string | undefined>();
  const previewMutation = usePreviewIcon();
  const [iconUrlInput, setIconUrlInput] = useState<string>("");

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
      setIconUrlInput((tile as any).iconSourceUrl || "");
    } else {
      setForm({ title: "", url: "", category: "", icon: "", target: "_self" });
      setIconUrlInput("");
    }
    const hasRemote = Boolean((tile as any)?.iconSourceUrl);
    setIconMode(hasRemote ? "url" : "upload");
    setPreviewIcon(undefined);
  }, [tile, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Icon upload & URL handling is delegated to IconPicker

  const handleSubmit = async () => {
    let finalIcon = form.icon || undefined;
    let iconSourceUrl: string | undefined;
    if (iconMode === "url" && iconUrlInput) {
      iconSourceUrl = iconUrlInput.trim() || undefined;
      // If user never fetched preview, still proceed; server will fetch remote or fallback.
      if (previewIcon) {
        finalIcon = previewIcon; // already resolved data URL
      } else {
        // ensure we don't send stale uploaded icon; let server attempt fetch
        finalIcon = undefined;
      }
    }
    onSubmit({
      ...form,
      icon: finalIcon,
      category: form.category || undefined,
      iconSourceUrl,
    } as any);
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
                : "URL should include http:// or https://"
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
            <MenuItem value="_self">Same Tab</MenuItem>
            <MenuItem value="_blank">New Tab</MenuItem>
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
            value={iconMode === "upload" ? form.icon ?? "" : iconUrlInput}
            onChange={(val) => {
              if (iconMode === "upload") {
                setForm((f) => ({ ...f, icon: val }));
              } else {
                setIconUrlInput(val);
                setPreviewIcon(undefined); // reset preview when editing URL
              }
            }}
            onPreview={async ({ iconUrl }) => {
              if (!iconUrl) return;
              const res = await previewMutation.mutateAsync({
                iconSourceUrl: iconUrl,
                url: form.url,
              });
              setPreviewIcon(res);
              return res;
            }}
            previewing={previewMutation.isPending}
            previewValue={previewIcon}
            titleForFallback={form.title}
            maxKB={200}
            onClear={() => {
              setForm((f) => ({ ...f, icon: "" }));
              setIconUrlInput("");
              setPreviewIcon(undefined);
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={titleEmpty || urlEmpty || previewMutation.isPending}
        >
          {previewMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
