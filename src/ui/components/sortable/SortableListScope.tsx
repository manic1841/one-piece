import React from 'react';

import { closestCenter, DndContext, type DragEndEvent, type DraggableAttributes, type DraggableSyntheticListeners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';

import { cn } from '@/ui/utils/cn';

import { reorderFromDragEnd, useSortableListSensors } from './useSortableList';

interface SortableListScopeProps<T extends { id: string }> {
  items: T[];
  onReorder: (next: T[]) => void;
  children: React.ReactNode;
}

export function SortableListScope<T extends { id: string }>({
  items,
  onReorder,
  children,
}: SortableListScopeProps<T>) {
  const sensors = useSortableListSensors();

  const handleDragEnd = (event: DragEndEvent) => {
    const next = reorderFromDragEnd({
      items,
      activeId: String(event.active.id),
      overId: event.over ? String(event.over.id) : null,
    });
    if (next) {
      onReorder(next);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}

interface GripHandleProps {
  label: string;
  attributes?: DraggableAttributes;
  listeners?: DraggableSyntheticListeners;
  className?: string;
  testId?: string;
  activatorRef?: React.Ref<HTMLButtonElement>;
}

export const GripHandle: React.FC<GripHandleProps> = ({
  label,
  attributes,
  listeners,
  className,
  testId,
  activatorRef,
}) => (
  <button
    type="button"
    ref={activatorRef}
    data-testid={testId}
    {...attributes}
    {...listeners}
    aria-label={label}
    onClick={(event) => event.stopPropagation()}
    className={cn(
      'inline-flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,transform] duration-fast ease-out-quint outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] active:cursor-grabbing',
      className,
    )}
  >
    <GripVertical size={16} aria-hidden="true" />
  </button>
);
