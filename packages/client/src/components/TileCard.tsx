import React from "react";
import {
  Avatar,
  IconButton,
  Tooltip,
  Link,
  Text,
  VStack,
  useColorModeValue,
  Flex,
} from "@chakra-ui/react";
import { Card } from "../ui";
import { MdEdit, MdDelete, MdDragIndicator } from "react-icons/md";
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
  const borderColor = useColorModeValue("gray.200", "gray.900");
  const Content = (
    <Card
      ref={reorderMode ? setNodeRef : undefined}
      variant="tile"
      style={style}
      display="flex"
      flexDirection="column"
      {...(reorderMode ? attributes : {})}
      p={0}
      cursor={reorderMode ? "grab" : "pointer"}
    >
      <Flex p={2.5} gap={2} w="100%" h="100%">
        <Avatar
          bg={useColorModeValue("white", "gray.800")}
          borderWidth="2px"
          borderColor={borderColor}
          color={useColorModeValue("gray.800", "gray.100")}
          fontWeight={600}
          w="64px"
          h="64px"
          src={tile.icon || undefined}
          name={tile.title}
        >
          {!tile.icon && getFallbackInitial(tile.title)}
        </Avatar>
        <VStack spacing={0} align="start" flex={1} minW={0}>
          <Text fontSize="md" fontWeight={600} noOfLines={1}>
            {tile.title}
          </Text>
          {tile.category && (
            <Text fontSize="sm" color="gray.500" noOfLines={1}>
              {tile.category}
            </Text>
          )}
        </VStack>
        {reorderMode && (
          <Tooltip label="Drag to reorder" openDelay={300}>
            <IconButton
              aria-label="Drag Handle"
              size="sm"
              variant="ghost"
              cursor="grab"
              {...listeners}
              onClick={(e) => e.preventDefault()}
              icon={<MdDragIndicator />}
              alignSelf={"end"}
            />
          </Tooltip>
        )}
        {reorderMode && (
          <VStack spacing={0}>
            {onEdit && (
              <Tooltip label="Edit" openDelay={300}>
                <IconButton
                  aria-label={`Edit ${tile.title}`}
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(tile)}
                  icon={<MdEdit />}
                />
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip label="Delete" openDelay={300}>
                <IconButton
                  aria-label={`Delete ${tile.title}`}
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => onDelete(tile)}
                  icon={<MdDelete />}
                />
              </Tooltip>
            )}
          </VStack>
        )}
      </Flex>
    </Card>
  );

  if (reorderMode) {
    return (
      <div
        style={{
          userSelect: "none",
          pointerEvents: "auto",
        }}
        onClick={(e) => e.preventDefault()}
      >
        {Content}
      </div>
    );
  }

  return (
    <Link
      href={tile.url}
      target={target}
      rel={rel}
      _hover={{ textDecoration: "none" }}
      flexGrow={1}
      draggable
    >
      {Content}
    </Link>
  );
}
