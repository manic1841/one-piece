import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';

export const DEFAULT_TOUCH_DELAY_MS = 180;

export interface SortableListSensorsOptions {
  touchDelayMs?: number;
  pointerDistancePx?: number;
}

export function useSortableListSensors({
  touchDelayMs = DEFAULT_TOUCH_DELAY_MS,
  pointerDistancePx = 8,
}: SortableListSensorsOptions = {}) {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: pointerDistancePx },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: touchDelayMs, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
}

export function reorderFromDragEnd<T>({
  items,
  activeId,
  overId,
}: {
  items: T[];
  activeId: string | null | undefined;
  overId: string | null | undefined;
}): T[] | null {
  if (!activeId || !overId || activeId === overId) {
    return null;
  }

  const oldIndex = items.findIndex((item) => getItemId(item) === activeId);
  const newIndex = items.findIndex((item) => getItemId(item) === overId);

  if (oldIndex === -1 || newIndex === -1) {
    return null;
  }

  return arrayMove(items, oldIndex, newIndex);
}

function getItemId(item: unknown): string {
  if (typeof item === 'string') {
    return item;
  }
  return String((item as { id?: unknown }).id ?? '');
}

interface DragTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

export function getSortableRowStyle(
  transform: DragTransform | null | undefined,
): React.CSSProperties | undefined {
  if (!transform) {
    return undefined;
  }
  return {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`,
  };
}

export function useSortableRow(id: string) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useSortable({ id });

  return {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    isDragging,
    rowStyle: getSortableRowStyle(transform),
  };
}
