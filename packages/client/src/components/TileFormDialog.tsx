import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  MenuItem,
  Avatar,
  Typography,
  IconButton,
  Tooltip,
  Box,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadIcon from "@mui/icons-material/Upload";
import RefreshIcon from "@mui/icons-material/Refresh";
import { CreateTileInput } from "../hooks/useTiles";
import { useFetchIconFromUrl } from "../hooks/useTiles";
import { Tile } from "@hub/shared";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<CreateTileInput>({
    title: "",
    url: "",
    category: "",
    icon: "",
    target: "_self", // default same tab
  });
  const [iconMode, setIconMode] = useState<"upload" | "url">("upload");
  const [iconSourceUrl, setIconSourceUrl] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingIcon, setFetchingIcon] = useState(false);
  const fetchIconMutation = useFetchIconFromUrl();
  const [fetchedIcon, setFetchedIcon] = useState<string | null>(null); // base64 result of URL fetch

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
      const srcUrlRaw = (tile as any).iconSourceUrl || "";
      const srcUrl =
        srcUrlRaw && srcUrlRaw.startsWith("data:") ? "" : srcUrlRaw; // sanitize
      setForm({
        title: tile.title,
        url: tile.url,
        category: tile.category || "",
        icon: tile.icon || "",
        target: tile.target || "_self",
      });
      setIconSourceUrl(srcUrl);
      setIconMode(srcUrl ? "url" : "upload");
    } else {
      setForm({ title: "", url: "", category: "", icon: "", target: "_self" });
      setIconSourceUrl("");
      setIconMode("upload");
    }
    setUploadError(null);
    setFetchedIcon(null);
    setSubmitting(false);
    setFetchingIcon(false);
  }, [tile, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const processFile = (file: File) => {
    if (!/^image\//.test(file.type)) {
      setUploadError("File must be an image");
      return;
    }
    if (file.size > 200 * 1024) {
      setUploadError("Image must be <= 200KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setForm((f) => ({ ...f, icon: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadError(null);
      processFile(file);
    }
  };

  const handleClearIcon = () => {
    setForm((f) => ({ ...f, icon: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    setSubmitting(true);
    // If iconMode URL and user entered a URL but didn't click fetch yet, attempt fetch first
    const remoteInput = iconMode === "url" ? iconSourceUrl.trim() : "";
    const needsFetch =
      iconMode === "url" && remoteInput.length > 0 && !fetchedIcon;
    if (needsFetch) {
      setFetchingIcon(true);
      fetchIconMutation.mutate(remoteInput, {
        onSuccess: (dataUrl) => {
          const finalIcon = dataUrl || undefined;
          onSubmit({
            ...form,
            icon: finalIcon,
            iconSourceUrl: remoteInput,
            category: form.category || undefined,
          });
          setSubmitting(false);
          setFetchingIcon(false);
          onClose();
        },
        onError: () => {
          // remote icon fetch failed -> clear any previous remote iconSourceUrl & icon so server can fallback
          onSubmit({
            ...form,
            icon: null as any,
            iconSourceUrl: null as any,
            category: form.category || undefined,
          });
          setSubmitting(false);
          setFetchingIcon(false);
          onClose();
        },
      });
      return;
    }
    // If user already fetched (fetchedIcon) use it
    const finalIcon =
      fetchedIcon || (form.icon?.startsWith("data:") ? form.icon : undefined);
    if (iconMode === "url") {
      if (remoteInput === "") {
        // user cleared URL -> clear iconSourceUrl and don't send icon to trigger fallback
        onSubmit({
          ...form,
          icon: null as any,
          iconSourceUrl: null as any,
          category: form.category || undefined,
        });
      } else {
        onSubmit({
          ...form,
          icon: finalIcon || undefined,
          iconSourceUrl: remoteInput,
          category: form.category || undefined,
        });
      }
    } else {
      onSubmit({
        ...form,
        icon: finalIcon || undefined,
        iconSourceUrl: null as any,
        category: form.category || undefined,
      });
    }
    setSubmitting(false);
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
          <TextField
            label="Title"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            fullWidth
            error={titleEmpty}
            helperText={titleEmpty ? "Title is required" : ""}
          />
          <TextField
            label="URL"
            name="url"
            value={form.url}
            onChange={handleChange}
            required
            fullWidth
            error={!urlEmpty && !urlValid}
            helperText={
              !urlEmpty && !urlValid
                ? "Invalid URL (will still be saved)"
                : urlEmpty
                ? "URL is required"
                : ""
            }
          />
          <TextField
            label="Category"
            name="category"
            value={form.category}
            onChange={handleChange}
            fullWidth
          />
          {/* Icon source mode selector */}
          <TextField
            select
            label="Icon Source"
            value={iconMode}
            onChange={(e) => {
              const mode = e.target.value as "upload" | "url";
              setIconMode(mode);
              if (
                mode === "upload" &&
                form.icon &&
                !form.icon.startsWith("data:")
              ) {
                // switching from URL -> upload, clear URL so fallback applies
                setForm((f) => ({ ...f, icon: "" }));
              }
            }}
            fullWidth
          >
            <MenuItem value="upload">Upload</MenuItem>
            <MenuItem value="url">URL</MenuItem>
          </TextField>
          {iconMode === "url" && (
            <Stack spacing={1}>
              <TextField
                label="Icon URL (optional)"
                name="iconUrl"
                value={iconSourceUrl}
                onChange={(e) => {
                  setFetchedIcon(null); // reset fetched preview
                  setIconSourceUrl(e.target.value);
                }}
                fullWidth
                error={!!iconSourceUrl && !isValidUrl(iconSourceUrl)}
                helperText={
                  iconSourceUrl && !isValidUrl(iconSourceUrl)
                    ? "Invalid image URL - fallback will apply"
                    : fetchedIcon
                    ? "Fetched icon ready"
                    : "Enter URL then Fetch to preview"
                }
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="outlined"
                  size="small"
                  disabled={
                    !iconSourceUrl ||
                    !isValidUrl(iconSourceUrl) ||
                    fetchIconMutation.isPending
                  }
                  onClick={() => {
                    if (!iconSourceUrl || !isValidUrl(iconSourceUrl)) return;
                    setFetchingIcon(true);
                    fetchIconMutation.mutate(iconSourceUrl, {
                      onSuccess: (dataUrl) => {
                        setFetchedIcon(dataUrl);
                        setFetchingIcon(false);
                      },
                      onError: () => {
                        setFetchedIcon(null);
                        setFetchingIcon(false);
                      },
                    });
                  }}
                >
                  {fetchIconMutation.isPending ? "Fetching..." : "Fetch"}
                </Button>
                {fetchedIcon && (
                  <Avatar variant="rounded" sx={{ width: 40, height: 40 }}>
                    <img
                      src={fetchedIcon}
                      alt="preview"
                      style={{ width: "100%", height: "100%" }}
                    />
                  </Avatar>
                )}
              </Stack>
            </Stack>
          )}
          <Box display="flex" alignItems="center" gap={2}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            <Avatar variant="rounded" sx={{ width: 56, height: 56 }}>
              {fetchedIcon ? (
                <img
                  src={fetchedIcon}
                  alt="icon"
                  style={{ width: "100%", height: "100%" }}
                />
              ) : form.icon && form.icon.startsWith("data:") ? (
                <img
                  src={form.icon}
                  alt="icon"
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                form.title.charAt(0) || "?"
              )}
            </Avatar>
            {iconMode === "upload" && (
              <Stack direction="column" spacing={1} sx={{ flexGrow: 1 }}>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Upload image">
                    <span>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<UploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Upload
                      </Button>
                    </span>
                  </Tooltip>
                  {form.icon && (
                    <Tooltip title="Clear icon">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={handleClearIcon}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                <Box
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  sx={{
                    border: "2px dashed",
                    borderColor: dragActive ? "primary.main" : "divider",
                    p: 1.5,
                    textAlign: "center",
                    borderRadius: 1,
                    bgcolor: dragActive ? "action.hover" : "transparent",
                    transition: "background-color 120ms, border-color 120ms",
                    fontSize: "0.75rem",
                  }}
                >
                  Drag & drop image here (≤200KB)
                </Box>
              </Stack>
            )}
            {uploadError && (
              <Typography color="error" variant="caption">
                {uploadError}
              </Typography>
            )}
          </Box>
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
          disabled={titleEmpty || urlEmpty || submitting || fetchingIcon}
        >
          {submitting || fetchingIcon ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
      {(fetchingIcon || submitting) && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "rgba(255,255,255,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="body2">
            {fetchingIcon ? "Fetching icon…" : "Saving…"}
          </Typography>
        </Box>
      )}
    </Dialog>
  );
}
