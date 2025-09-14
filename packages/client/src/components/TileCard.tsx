import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  CardActions,
  IconButton,
  Tooltip,
  Link as MuiLink,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Tile } from "@hub/shared";

function getFallbackInitial(title: string): string {
  if (!title) return "?";
  const m = title.trim().match(/\p{L}|\p{N}/u); // first letter/number unicode aware
  return m ? m[0].toUpperCase() : title.charAt(0).toUpperCase();
}
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  tile: Tile;
  onEdit?: (tile: Tile) => void;
  onDelete?: (tile: Tile) => void;
  reorderMode?: boolean; // when true, enable drag handle & sortable
}

export function TileCard({ tile, onEdit, onDelete, reorderMode }: Props) {
  const sortable = useSortable({ id: tile.id });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;

  const style: React.CSSProperties = reorderMode
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        cursor: "grab",
      }
    : {};

  // Default behavior: open in same tab unless tile.target specified.
  const target = tile.target || "_self";
  // Use rel when opening new tabs for security (noopener,noreferrer)
  const rel = target === "_blank" ? "noopener noreferrer" : undefined;
  return (
    <Card
      ref={reorderMode ? setNodeRef : undefined}
      variant="outlined"
      sx={{ display: "flex", flexDirection: "column", height: "100%" }}
      style={style}
      {...(reorderMode ? attributes : {})}
    >
      {/* Anchor styled as block so entire tile surface is an accessible link enabling ctrl+click, middle-click, drag */}
      <MuiLink
        href={tile.url}
        target={target}
        rel={rel}
        underline="none"
        sx={{ flexGrow: 1, display: "block", color: "inherit" }}
        draggable
      >
        <CardContent sx={{ p: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
                color: "text.primary",
                fontWeight: 600,
              }}
              variant="rounded"
            >
              {tile.icon ? (
                <img
                  src={tile.icon}
                  alt={tile.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    background: "transparent",
                  }}
                />
              ) : (
                getFallbackInitial(tile.title)
              )}
            </Avatar>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="subtitle1" noWrap>
                {tile.title}
              </Typography>
              {tile.category && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {tile.category}
                </Typography>
              )}
            </Box>
            {reorderMode && (
              <Tooltip title="Drag to reorder">
                <IconButton
                  size="small"
                  {...listeners}
                  sx={{ cursor: "grab" }}
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                >
                  <DragIndicatorIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </CardContent>
      </MuiLink>
      {reorderMode && (
        <CardActions sx={{ justifyContent: "flex-end", pt: 0 }}>
          {onEdit && (
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => onEdit(tile)}
                aria-label={`Edit ${tile.title}`}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={() => onDelete(tile)}
                aria-label={`Delete ${tile.title}`}
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </CardActions>
      )}
    </Card>
  );
}
