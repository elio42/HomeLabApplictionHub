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
  value: string; // icon string (data URL or external URL)
  onChange: (value: string) => void;
  titleForFallback: string; // used to render first letter when no/invalid icon
  maxKB?: number; // default 200KB
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
  titleForFallback,
  maxKB = 200,
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
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const invalidIconUrl = !!(mode === "url" && value && !isHttpUrl(value));

  return (
    <Stack spacing={2}>
      <TextField
        select
        label="Icon Source"
        value={mode}
        onChange={(e) => {
          const next = e.target.value as IconMode;
          onModeChange(next);
          if (next === "upload" && value && !isDataUrl(value)) {
            // switching from URL -> upload, clear URL so fallback applies
            onChange("");
          }
        }}
        fullWidth
      >
        <MenuItem value="upload">Upload</MenuItem>
        <MenuItem value="url">URL</MenuItem>
      </TextField>

      {mode === "url" && (
        <TextField
          label="Icon URL (optional)"
          value={!isDataUrl(value) ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          error={invalidIconUrl}
          helperText={
            invalidIconUrl
              ? "Invalid image URL - fallback will apply"
              : "Provide direct image URL or leave blank for favicon/letter"
          }
        />
      )}

      <Stack direction="row" alignItems="center" gap={2}>
        <Avatar variant="rounded" sx={{ width: 56, height: 56 }}>
          {value ? (
            isDataUrl(value) ? (
              <img
                src={value}
                alt="icon"
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              (titleForFallback || "?")[0]
            )
          ) : (
            (titleForFallback || "?")[0]
          )}
        </Avatar>

        {mode === "upload" && (
          <Stack direction="column" spacing={1} sx={{ flexGrow: 1 }}>
            <Stack direction="row" spacing={1}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />
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
              {value && (
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
              Drag & drop image here (≤{maxKB}KB)
            </Box>
            {uploadError && (
              <Typography color="error" variant="caption">
                {uploadError}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
