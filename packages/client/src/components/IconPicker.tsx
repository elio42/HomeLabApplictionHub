import React, { useCallback, useRef, useState } from "react";
import {
  Stack,
  Select,
  Avatar,
  Tooltip,
  Button,
  IconButton,
  Box,
  Text,
  Input,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdUpload, MdDelete } from "react-icons/md";

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
  const ACTION_BUTTON_SX = {
    textTransform: "none",
    width: ACTION_BUTTON_WIDTH,
  };

  const getFallbackInitial = (title: string): string => {
    if (!title) return "?";
    const m = title.trim().match(/\p{L}|\p{N}/u);
    return m ? m[0].toUpperCase() : title.charAt(0).toUpperCase();
  };

  return (
    <Stack spacing={2} mt={1}>
      {/* Mode Switch */}
      <Box>
        <Select
          value={mode}
          size="sm"
          onChange={(e) => {
            const next = e.target.value as IconMode;
            onModeChange(next);
            if (next === "upload" && value && !isDataUrl(value)) onChange("");
            if (next === "url" && value && isDataUrl(value)) onChange("");
          }}
        >
          <option value="upload">Upload</option>
          <option value="url">URL</option>
        </Select>
      </Box>

      {/* Action Buttons (same slot) */}
      <Stack direction="row" spacing={2}>
        {mode === "upload" ? (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<MdUpload />}
            onClick={() => fileInputRef.current?.click()}
            w="150px"
          >
            Upload Image
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onPreview?.({ iconUrl: !isDataUrl(value) ? value : undefined })
            }
            disabled={previewing || !value}
            w="150px"
          >
            {previewing
              ? "Fetching..."
              : previewValue
              ? "Refetch"
              : "Fetch Preview"}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          colorScheme="red"
          onClick={handleClearIcon}
          w="150px"
        >
          Clear Icon/URL
        </Button>
      </Stack>

      {/* Unified Body: URL field / Preview / Drop zone */}
      <Box
        display="flex"
        flexDirection="row"
        alignItems="center"
        gap={2}
        h="64px"
      >
        {/* Preview */}
        <Box display="flex" alignItems="center" justifyContent="center">
          <Avatar
            borderWidth="1px"
            borderColor={useColorModeValue("gray.200", "gray.700")}
            w="64px"
            h="64px"
            fontSize="22px"
            fontWeight={600}
          >
            {(() => {
              const shown = previewValue || value;
              if (shown && isDataUrl(shown)) {
                return (
                  <img
                    src={shown}
                    alt="icon"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      background: "transparent",
                    }}
                  />
                );
              }
              return getFallbackInitial(titleForFallback || "?");
            })()}
          </Avatar>
        </Box>

        {/* URL Field (right) */}
        {mode === "url" && (
          <Box flex={1} display="flex">
            <Box flex={1}>
              <Input
                placeholder="Icon URL"
                value={!isDataUrl(value) ? value : ""}
                onChange={(e) => onChange(e.target.value)}
                size="sm"
                isInvalid={invalidIconUrl}
              />
              <Text
                mt={1}
                fontSize="xs"
                color={
                  invalidIconUrl
                    ? "red.400"
                    : previewValue
                    ? "green.400"
                    : "gray.500"
                }
              >
                {invalidIconUrl
                  ? "Invalid image URL"
                  : previewValue
                  ? "Preview loaded"
                  : "Provide image URL or leave blank"}
              </Text>
            </Box>
          </Box>
        )}

        {/* Drag & Drop (right) */}
        {mode === "upload" && (
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            flex={1}
            h="64px"
            border="2px dashed"
            borderColor={
              dragActive
                ? "brand.400"
                : useColorModeValue("gray.300", "gray.600")
            }
            borderRadius="md"
            bg={
              dragActive
                ? useColorModeValue("gray.100", "gray.700")
                : "transparent"
            }
            display="flex"
            alignItems="center"
            justifyContent="center"
            px={2}
            fontSize="xs"
            textAlign="center"
            transition="background-color 120ms, border-color 120ms"
            overflow="hidden"
          >
            Drop image here (≤{maxKB}KB)
          </Box>
        )}
      </Box>
      {uploadError && mode === "upload" && (
        <Text color="red.400" fontSize="xs" mt={-1}>
          {uploadError}
        </Text>
      )}
    </Stack>
  );
}
