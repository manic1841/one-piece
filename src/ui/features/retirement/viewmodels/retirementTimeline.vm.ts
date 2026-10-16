/**
 * Life Events Timeline 的純幾何／視窗／焦點運算（spec #301 §5.3／§5.4）。
 *
 * 無 DOM 依賴，全部是純函式，讓 `TimelineView` 保持薄。視窗、單一年份寬度、
 * bar 幾何、roving tabindex 的移動與「焦點落視窗外即時平移」都在這裡定義。
 */

/** Tone = 事件的收入／支出（決定 bar 著色；spec #301 §5.1 不顯示金額）。 */
export type TimelineTone = 'income' | 'expense';

/** 固定視窗、無縮放：桌面 10 年／行動 5 年（spec #301 §5.3）。 */
export const DESKTOP_VISIBLE_YEARS = 10;
export const MOBILE_VISIBLE_YEARS = 5;

/** 平移按鈕步進（年）：1 年與 5 年並存（spec #301 §5.3）。 */
export const TIMELINE_PAN_STEPS = [1, 5] as const;

/** 按下後移動超過此 px 才算拖曳、否則視為點擊（原型常數）。 */
export const TIMELINE_DRAG_THRESHOLD_PX = 4;

/** 投影範圍 `[投影起始, birthYear + lifeExpectancy]`（與投影引擎同源）。 */
export interface TimelineRange {
  startYear: number;
  endYear: number;
}

/** 平移邊界：視窗起點可落範圍。 */
export interface TimelineWindowBounds {
  minStart: number;
  maxStart: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * 由 plan 推導 Timeline 的年份範圍（spec #301 §5.3）。
 * 投影起始＝`currentYear`，投影結束＝`birthYear + lifeExpectancy`（引擎同源）。
 */
export const deriveTimelineRange = (assumptions: {
  currentYear: number;
  birthYear: number;
  lifeExpectancy: number;
}): TimelineRange => ({
  startYear: assumptions.currentYear,
  endYear: assumptions.birthYear + assumptions.lifeExpectancy,
});

/** 平移邊界＝`[投影起始, 投影結束 − 視窗年數 + 1]`（不得小於起始）。 */
export const timelineWindowBounds = (
  range: TimelineRange,
  visibleYears: number,
): TimelineWindowBounds => ({
  minStart: range.startYear,
  maxStart: Math.max(range.startYear, range.endYear - visibleYears + 1),
});

/** 夾住視窗起點到邊界內。 */
export const clampWindowStart = (value: number, bounds: TimelineWindowBounds): number =>
  clamp(value, bounds.minStart, bounds.maxStart);

/**
 * 初始定位＝含 `currentYear` 的那個視窗（spec #301 §5.3）。
 * 以 `currentYear` 作為視窗首年、再夾到邊界內。
 */
export const initialWindowStart = (
  range: TimelineRange,
  currentYear: number,
  visibleYears: number,
): number => clampWindowStart(currentYear, timelineWindowBounds(range, visibleYears));

/** 以年為單位平移視窗並夾到邊界內。 */
export const panWindowStart = (
  windowStart: number,
  deltaYears: number,
  bounds: TimelineWindowBounds,
): number => clampWindowStart(windowStart + deltaYears, bounds);

/** 指標 x 座標 → 年份（夾到視窗可見年份內）。 */
export const yearAtPoint = (
  clientX: number,
  rect: { left: number; width: number },
  windowStart: number,
  visibleYears: number,
): number => {
  const cellWidth = rect.width / visibleYears;
  const index = Math.floor((clientX - rect.left) / cellWidth);
  return windowStart + clamp(index, 0, visibleYears - 1);
};

/** 指標水平位移（px）→ 平移年數（四捨五入到最接近的整年）。 */
export const yearsToPanDelta = (
  deltaX: number,
  rectWidth: number,
  visibleYears: number,
): number => {
  const cellWidth = rectWidth / visibleYears;
  return Math.round(deltaX / cellWidth);
};

/** 一個 phase bar（已併入所屬事件與 tone）。 */
export interface TimelineBar {
  /** 穩定識別：`eventId:index`（供選取持久化與 ref key）。 */
  id: string;
  eventId: string;
  /** phase 在事件 `phases[]` 的索引。 */
  index: number;
  /** 顯示名：`phase.name`，空白時回退為事件名（bar 必有無障礙名稱）。 */
  name: string;
  tone: TimelineTone;
  startYear: number;
  endYear: number;
}

/** 一列＝一個事件（spec #301 §5.1：依 Event 分列）。 */
export interface TimelineRow {
  id: string;
  name: string;
  tone: TimelineTone;
  bars: TimelineBar[];
}

/** 建立 bar 所需的事件輸入（結構型別，避免依賴 domain）。 */
export interface TimelineEventInput {
  id: string;
  name: string;
  type: TimelineTone;
  phases: ReadonlyArray<{
    name?: string;
    startYear: number;
    endYear: number;
    /** phase 在事件 `phases[]` 的原始索引；省略時以陣列位置為準。 */
    index?: number;
  }>;
}

const phaseNameOrUndefined = (name?: string): string | undefined => {
  const trimmed = name?.trim();
  return trimmed ? trimmed : undefined;
};

/** 事件清單 → 分列 bar（每 phase 一條，依 phase 順序）。 */
export const mapTimelineRows = (events: readonly TimelineEventInput[]): TimelineRow[] =>
  events.map((event) => ({
    id: event.id,
    name: event.name,
    tone: event.type,
    bars: event.phases.map((phase, position) => {
      const index = phase.index ?? position;
      return {
        id: `${event.id}:${index}`,
        eventId: event.id,
        index,
        name: phaseNameOrUndefined(phase.name) ?? event.name,
        tone: event.type,
        startYear: phase.startYear,
        endYear: phase.endYear,
      };
    }),
  }));

/** 無障礙名稱：`{name}，{start}–{end}`；單一年份為 `{name}，{start}`（spec #301 §5.4）。 */
export const timelineBarLabel = (bar: TimelineBar): string =>
  bar.endYear > bar.startYear
    ? `${bar.name}，${bar.startYear}–${bar.endYear}`
    : `${bar.name}，${bar.startYear}`;

/** bar 相對視窗的水平幾何（比例 0..1）；完全在視窗外時 `visible=false`。 */
export interface BarGeometry {
  left: number;
  width: number;
  visible: boolean;
}

export const barGeometry = (
  bar: { startYear: number; endYear: number },
  windowStart: number,
  visibleYears: number,
): BarGeometry => {
  const leftRaw = (bar.startYear - windowStart) / visibleYears;
  const rightRaw = (bar.endYear - windowStart + 1) / visibleYears;
  const left = clamp(leftRaw, 0, 1);
  const right = clamp(rightRaw, 0, 1);
  const width = Math.max(right - left, 0);
  return { left, width, visible: width > 0 };
};

/* --------------------------- roving tabindex --------------------------- */

/** 複合元件內的位置：列（事件）索引 + bar 索引。 */
export interface TimelineFocus {
  rowIndex: number;
  barIndex: number;
}

export type TimelineFocusKey =
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'Home'
  | 'End';

/** 有可聚焦 bar 的列（含原始索引），供跳列用。 */
const focusableRows = (rows: readonly TimelineRow[]): { row: TimelineRow; rowIndex: number }[] =>
  rows.map((row, rowIndex) => ({ row, rowIndex })).filter((entry) => entry.row.bars.length > 0);

/** 初始焦點＝第一條可聚焦的 bar；無 bar 時 null。 */
export const initialTimelineFocus = (rows: readonly TimelineRow[]): TimelineFocus | null => {
  const first = focusableRows(rows)[0];
  return first ? { rowIndex: first.rowIndex, barIndex: 0 } : null;
};

const closestBarIndex = (bars: readonly TimelineBar[], year: number): number => {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  bars.forEach((bar, index) => {
    const distance = Math.abs(bar.startYear - year);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
};

/**
 * Roving tabindex 的焦點移動（spec #301 §5.4）：←→ 列內、↑↓ 列間（跳到最近年份的
 * bar）、Home／End 全清單首末。無可移動目標時回傳原焦點。
 */
export const moveTimelineFocus = (
  rows: readonly TimelineRow[],
  focus: TimelineFocus,
  key: TimelineFocusKey,
): TimelineFocus => {
  const current = rows[focus.rowIndex]?.bars[focus.barIndex];
  if (!current) {
    return initialTimelineFocus(rows) ?? focus;
  }

  if (key === 'ArrowLeft') {
    return { rowIndex: focus.rowIndex, barIndex: Math.max(0, focus.barIndex - 1) };
  }
  if (key === 'ArrowRight') {
    const row = rows[focus.rowIndex];
    return {
      rowIndex: focus.rowIndex,
      barIndex: Math.min(row.bars.length - 1, focus.barIndex + 1),
    };
  }
  if (key === 'Home') {
    const first = focusableRows(rows)[0];
    return first ? { rowIndex: first.rowIndex, barIndex: 0 } : focus;
  }
  if (key === 'End') {
    const focusables = focusableRows(rows);
    const last = focusables[focusables.length - 1];
    return last ? { rowIndex: last.rowIndex, barIndex: last.row.bars.length - 1 } : focus;
  }

  // ArrowUp / ArrowDown：在有 bar 的列之間跳，選最近年份的 bar。
  const focusables = focusableRows(rows);
  const position = focusables.findIndex((entry) => entry.rowIndex === focus.rowIndex);
  if (position === -1) return focus;
  const nextPosition = position + (key === 'ArrowDown' ? 1 : -1);
  const target = focusables[nextPosition];
  if (!target) return focus;
  return {
    rowIndex: target.rowIndex,
    barIndex: closestBarIndex(target.row.bars, current.startYear),
  };
};

/** 取得焦點所在 bar；越界時 null。 */
export const timelineFocusBar = (
  rows: readonly TimelineRow[],
  focus: TimelineFocus | null,
): TimelineBar | null => {
  if (!focus) return null;
  return rows[focus.rowIndex]?.bars[focus.barIndex] ?? null;
};

/**
 * 焦點落視窗外時，回傳即時平移（無動畫）後的視窗起點，讓 bar 完整可見；
 * 已在視窗內則回傳原值。優先對齊左緣（bar 比視窗寬時）。
 */
export const windowStartToRevealBar = (
  bar: { startYear: number; endYear: number },
  windowStart: number,
  visibleYears: number,
  bounds: TimelineWindowBounds,
): number => {
  const lastVisible = windowStart + visibleYears - 1;
  if (bar.startYear < windowStart) {
    return clampWindowStart(bar.startYear, bounds);
  }
  if (bar.endYear > lastVisible) {
    return clampWindowStart(bar.endYear - visibleYears + 1, bounds);
  }
  return windowStart;
};

/* ------------------------------- drafts -------------------------------- */

export interface TimelineCreateDraft {
  kind: 'create';
  eventId: string;
  startYear: number;
  endYear: number;
}

export interface TimelineMoveDraft {
  kind: 'move';
  eventId: string;
  index: number;
  fromEventId: string;
  targetEventId: string;
  startYear: number;
  endYear: number;
}

export interface TimelineResizeDraft {
  kind: 'resize';
  eventId: string;
  index: number;
  startYear: number;
  endYear: number;
}

export type TimelineDraft = TimelineCreateDraft | TimelineMoveDraft | TimelineResizeDraft;

/** 空白拖曳 / 點擊 → 建立草稿（點擊＝單一年，拖曳＝跨年度 span）。 */
export const createDraftFromRange = (
  eventId: string,
  anchorYear: number,
  currentYear: number,
): TimelineCreateDraft => ({
  kind: 'create',
  eventId,
  startYear: Math.min(anchorYear, currentYear),
  endYear: Math.max(anchorYear, currentYear),
});

/** 拖動把手 → resize 草稿；起點不得越過終點、終點不得越過起點。 */
export const resizeDraftFromEdge = (params: {
  eventId: string;
  index: number;
  edge: 'start' | 'end';
  origStart: number;
  origEnd: number;
  year: number;
}): TimelineResizeDraft => {
  const { eventId, index, edge, origStart, origEnd, year } = params;
  return edge === 'start'
    ? { kind: 'resize', eventId, index, startYear: Math.min(year, origEnd), endYear: origEnd }
    : { kind: 'resize', eventId, index, startYear: origStart, endYear: Math.max(year, origStart) };
};

/**
 * 拖動 bar 本體 → move 草稿：整段平移，並可換列（上下決定 `targetEventId`）；
 * 位移夾在 `[range.start, range.end]` 內，保持時長不變。
 */
export const moveDraftFromDelta = (params: {
  eventId: string;
  index: number;
  targetEventId: string;
  origStart: number;
  origEnd: number;
  deltaYears: number;
  range: TimelineRange;
}): TimelineMoveDraft => {
  const { eventId, index, targetEventId, origStart, origEnd, deltaYears, range } = params;
  const delta = clamp(deltaYears, range.startYear - origStart, range.endYear - origEnd);
  return {
    kind: 'move',
    eventId,
    index,
    fromEventId: eventId,
    targetEventId,
    startYear: origStart + delta,
    endYear: origEnd + delta,
  };
};
