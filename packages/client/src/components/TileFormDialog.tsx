import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Stack,
  Input,
  Select,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
} from "@chakra-ui/react";
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
    // If this tile has a remote icon source and a stored processed icon, show it immediately as preview
    if (hasRemote && tile?.icon && tile.icon.startsWith("data:")) {
      setPreviewIcon(tile.icon);
    } else {
      setPreviewIcon(undefined);
    }
  }, [tile, open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Icon upload & URL handling is delegated to IconPicker

  const handleSubmit = async () => {
    let finalIcon = form.icon || undefined;
    let iconSourceUrl: string | undefined | null;
    if (iconMode === "url") {
      const trimmed = iconUrlInput.trim();
      if (trimmed) {
        iconSourceUrl = trimmed;
        if (previewIcon) {
          finalIcon = previewIcon;
        } else {
          finalIcon = undefined; // force server-side fetch attempt
        }
      } else if ((tile as any)?.iconSourceUrl) {
        // Was previously set but now cleared -> send null to clear it
        iconSourceUrl = null;
        finalIcon = form.icon ? form.icon : undefined; // if user switched modes previously may keep upload
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
    <Modal isOpen={open} onClose={onClose} isCentered size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{tile ? "Edit Tile" : "Add Tile"}</ModalHeader>
        <ModalBody>
          <Stack spacing={4} mt={1}>
            <FormControl isRequired isInvalid={titleEmpty}>
              <FormLabel>Title</FormLabel>
              <Input name="title" value={form.title} onChange={handleChange} />
              {titleEmpty && (
                <FormErrorMessage>Title is required</FormErrorMessage>
              )}
            </FormControl>
            <FormControl isRequired isInvalid={urlEmpty}>
              <FormLabel>URL</FormLabel>
              <Input name="url" value={form.url} onChange={handleChange} />
              <FormHelperText
                color={!urlEmpty && !urlValid ? "orange.400" : undefined}
              >
                {!urlEmpty && !urlValid
                  ? "Invalid URL (will still be saved)"
                  : urlEmpty
                  ? "URL is required"
                  : "URL should include http:// or https://"}
              </FormHelperText>
            </FormControl>
            <FormControl>
              <FormLabel>Target</FormLabel>
              <Select name="target" value={form.target} onChange={handleChange}>
                <option value="_self">Same Tab</option>
                <option value="_blank">New Tab</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Optional Category for filtering</FormLabel>
              <Input
                name="category"
                value={form.category}
                onChange={handleChange}
              />
            </FormControl>
            <IconPicker
              mode={iconMode}
              onModeChange={setIconMode}
              value={iconMode === "upload" ? form.icon ?? "" : iconUrlInput}
              onChange={(val) => {
                if (iconMode === "upload") {
                  setForm((f) => ({ ...f, icon: val }));
                } else {
                  setIconUrlInput(val);
                  setPreviewIcon(undefined);
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
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="brand"
            onClick={handleSubmit}
            isDisabled={titleEmpty || urlEmpty || previewMutation.isPending}
          >
            {previewMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
