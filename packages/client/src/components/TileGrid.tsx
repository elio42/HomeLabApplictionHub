import React from "react";
import { SimpleGrid } from "@chakra-ui/react";
import { Tile } from "@hub/shared";
import { TileCard } from "./TileCard";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

interface Props {
  tiles: Tile[];
  onEdit?: (tile: Tile) => void;
  onDelete?: (tile: Tile) => void;
  onReorder?: (ids: string[]) => void; // called with ordered IDs after drag
  enableReorder?: boolean; // edit mode toggle
}

export function TileGrid({
  tiles,
  onEdit,
  onDelete,
  onReorder,
  enableReorder,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tiles.findIndex((t) => t.id === active.id);
    const newIndex = tiles.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(tiles, oldIndex, newIndex);
    if (onReorder) onReorder(reordered.map((t) => t.id));
  };

  if (!enableReorder) {
    return (
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 6 }} spacing={4}>
        {tiles.map((t) => (
          <TileCard
            key={t.id}
            tile={t}
            onEdit={onEdit}
            onDelete={onDelete}
            reorderMode={false}
          />
        ))}
      </SimpleGrid>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext
        items={tiles.map((t) => t.id)}
        strategy={rectSortingStrategy}
      >
        <SimpleGrid
          columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 6 }}
          spacing={4}
        >
          {tiles.map((t) => (
            <TileCard
              key={t.id}
              tile={t}
              onEdit={onEdit}
              onDelete={onDelete}
              reorderMode
            />
          ))}
        </SimpleGrid>
      </SortableContext>
    </DndContext>
  );
}
