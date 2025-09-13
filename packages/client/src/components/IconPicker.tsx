import React, { useCallback, useRef, useState } from "react";
import {
  Stack,
  TextField,
  MenuItem,
  Avatar,
  Tooltip,
  Button,
  IconButton,
  Box,
  Typography,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import DeleteIcon from "@mui/icons-material/Delete";

export type IconMode = "upload" | "url";

interface IconPickerProps {
  mode: IconMode;
  onModeChange: (mode: IconMode) => void;
  value: string; // icon string (data URL or URL input)
  onChange: (value: string) => void;
  onPreview?: (args: {
    iconUrl?: string;
    uploadedIcon?: string;
  }) => Promise<string | undefined>;
  previewing?: boolean;
  previewValue?: string;
  titleForFallback: string;
  maxKB?: number;
  onClear?: () => void; // clears both icon and url externally if provided
}

const isDataUrl = (s: string) => s.startsWith("data:");
const isHttpUrl = (value: string) => {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

export function IconPicker({
  mode,
  onModeChange,
  value,
  onChange,
  onPreview,
  previewing,
  previewValue,
  titleForFallback,
  maxKB = 200,
  onClear,
}: IconPickerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!/^image\//.test(file.type)) {
        setUploadError("File must be an image");
        return;
      }
      if (file.size > maxKB * 1024) {
        setUploadError(`Image must be ≤ ${maxKB}KB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        onChange(result);
      };
      reader.readAsDataURL(file);
    },
    [maxKB, onChange]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (onClear) onClear();
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadError(null);
  };

  const invalidIconUrl = !!(mode === "url" && value && !isHttpUrl(value));
  const ACTION_BUTTON_WIDTH = 150;

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {/* Mode Switch */}
      <TextField
        select
        label="Icon Source"
        value={mode}
        size="small"
        onChange={(e) => {
          const next = e.target.value as IconMode;
          onModeChange(next);
          if (next === "upload" && value && !isDataUrl(value)) {
            onChange("");
          }
          if (next === "url" && value && isDataUrl(value)) {
            onChange("");
          }
        }}
        fullWidth
      >
        <MenuItem value="upload">Upload</MenuItem>
        <MenuItem value="url">URL</MenuItem>
      </TextField>

      {/* Action Buttons (same slot) */}
      <Stack direction="row" spacing={1}>
        {mode === "upload" ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            <Button
              variant="outlined"
              fullWidth
              size="small"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ textTransform: "none", width: ACTION_BUTTON_WIDTH }}
            >
              Upload Image
            </Button>
          </>
        ) : (
          <Button
            variant="outlined"
            size="small"
            onClick={() =>
              onPreview?.({ iconUrl: !isDataUrl(value) ? value : undefined })
            }
            disabled={previewing || !value}
            sx={{ textTransform: "none", width: ACTION_BUTTON_WIDTH }}
          >
            {previewing
              ? "Fetching..."
              : previewValue
              ? "Refetch"
              : "Fetch Preview"}
          </Button>
        )}

        <Button
          variant="outlined"
          size="small"
          color="error"
          onClick={handleClearIcon}
          sx={{ textTransform: "none", width: ACTION_BUTTON_WIDTH }}
        >
          Clear Icon/URL
        </Button>
      </Stack>

      {/* Unified Body: URL field on left (URL mode) / Drop zone right (upload) with preview centered consistently */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          gap: 1,
          minHeight: 90,
        }}
      >
        {/* URL Field (left) */}
        {mode === "url" && (
          <Box sx={{ flex: 1, display: "flex" }}>
            <TextField
              label="Icon URL"
              value={!isDataUrl(value) ? value : ""}
              onChange={(e) => {
                onChange(e.target.value);
              }}
              size="small"
              fullWidth
              error={invalidIconUrl}
              helperText={
                invalidIconUrl
                  ? "Invalid image URL"
                  : previewValue
                  ? "Preview loaded"
                  : "Provide image URL or leave blank"
              }
            />
          </Box>
        )}

        {/* Preview */}
        <Box
          sx={{
            width: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Avatar variant="rounded" sx={{ width: 56, height: 56 }}>
            {(() => {
              const shown = previewValue || value;
              if (shown && isDataUrl(shown)) {
                return (
                  <img
                    src={shown}
                    alt="icon"
                    style={{ width: "100%", height: "100%" }}
                  />
                );
              }
              return (titleForFallback || "?")[0];
            })()}
          </Avatar>
        </Box>

        {/* Drag & Drop (right) */}
        {mode === "upload" && (
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              flex: 1,
              border: "2px dashed",
              borderColor: dragActive ? "primary.main" : "divider",
              borderRadius: 1,
              bgcolor: dragActive ? "action.hover" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 1,
              fontSize: "0.7rem",
              textAlign: "center",
              transition: "background-color 120ms, border-color 120ms",
            }}
          >
            Drop image here (≤{maxKB}KB)
          </Box>
        )}
      </Box>
      {uploadError && mode === "upload" && (
        <Typography color="error" variant="caption" sx={{ mt: -0.5 }}>
          {uploadError}
        </Typography>
      )}
    </Stack>
  );
}
