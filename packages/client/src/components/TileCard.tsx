import React from "react";
import {
  Box,
  Avatar,
  IconButton,
  Tooltip,
  Link,
  Text,
  HStack,
  VStack,
  useColorModeValue,
  Flex,
  ButtonGroup,
} from "@chakra-ui/react";
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
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  return (
    <Box
      ref={reorderMode ? setNodeRef : undefined}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      display="flex"
      flexDirection="column"
      h="100%"
      bg={cardBg}
      style={style}
      {...(reorderMode ? attributes : {})}
    >
      <Link
        href={tile.url}
        target={target}
        rel={rel}
        _hover={{ textDecoration: "none" }}
        flexGrow={1}
        draggable
      >
        <Flex p={3} align="center" gap={3} minH="76px">
          <Avatar
            bg={useColorModeValue("white", "gray.900")}
            borderWidth="1px"
            borderColor={borderColor}
            color={useColorModeValue("gray.800", "gray.100")}
            fontWeight={600}
            w="52px"
            h="52px"
            src={tile.icon || undefined}
            name={tile.title}
          >
            {!tile.icon && getFallbackInitial(tile.title)}
          </Avatar>
          <VStack spacing={0} align="start" flex={1} minW={0}>
            <Text fontSize="sm" fontWeight={600} noOfLines={1}>
              {tile.title}
            </Text>
            {tile.category && (
              <Text fontSize="xs" color="gray.500" noOfLines={1}>
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
              />
            </Tooltip>
          )}
        </Flex>
      </Link>
      {reorderMode && (
        <Flex justify="flex-end" gap={1} px={2} pb={2} pt={0}>
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
        </Flex>
      )}
    </Box>
  );
}
