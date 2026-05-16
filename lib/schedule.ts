// ─── Radio Schedule — pure logic, no React deps ──────────────────────────────
// Extracted here so it can be unit-tested without mounting a component.
//
// Hourly broadcast schedule:
//   :00  📰 Новини
//   :05  💌 Програма знайомств
//   :30  📰 Новини
//   :35  🛒 Комерційні оголошення
//   інше 🎵 Музика (Тамара кожні 2 пісні)

export type SegmentKey = "news-0" | "dating" | "news-30" | "commercial";

export interface Segment {
  key: SegmentKey;
  minute: number; // clock minute at which this segment is scheduled
  label: string;
  emoji: string;
}

// Segments that actually fire (between songs, once per hour each)
export const TRIGGER_SEGMENTS: Segment[] = [
  { key: "news-0", minute: 0, label: "Новини", emoji: "📰" },
  { key: "dating", minute: 5, label: "Знайомства", emoji: "💌" },
  { key: "news-30", minute: 30, label: "Новини", emoji: "📰" },
  {
    key: "commercial",
    minute: 35,
    label: "Комерційні оголошення",
    emoji: "🛒",
  },
];

// All slots shown in the schedule panel (including non-trigger music blocks)
export const DISPLAY_SLOTS = [
  { key: "news-0", minute: 0, label: "Новини", emoji: "📰" },
  { key: "dating", minute: 5, label: "Знайомства", emoji: "💌" },
  { key: "music-1", minute: 15, label: "Музика", emoji: "🎵" },
  { key: "news-30", minute: 30, label: "Новини", emoji: "📰" },
  {
    key: "commercial",
    minute: 35,
    label: "Комерційні оголошення",
    emoji: "🛒",
  },
  { key: "music-2", minute: 45, label: "Музика", emoji: "🎵" },
];

/**
 * Returns the first segment that is overdue (minuteNow >= seg.minute)
 * and has not yet been played this hour.
 *
 * Returns null if no overdue segment is pending.
 */
export function getDueSegment(
  minuteNow: number,
  played: Set<string>,
): SegmentKey | null {
  for (const seg of TRIGGER_SEGMENTS) {
    if (minuteNow >= seg.minute && !played.has(seg.key)) {
      return seg.key;
    }
  }
  return null;
}

/**
 * Returns which DISPLAY_SLOTS key is currently "active".
 * Walks the slots in order and returns the last one whose minute <= m.
 */
export function getCurrentDisplayKey(m: number): string {
  let cur = DISPLAY_SLOTS[0].key;
  for (const slot of DISPLAY_SLOTS) {
    if (m >= slot.minute) cur = slot.key;
  }
  return cur;
}

/**
 * Format a schedule slot time as HH:MM using the given hour.
 */
export function slotTime(hourNow: number, minute: number): string {
  return `${String(hourNow).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * When a user joins mid-hour, segments that are already more than
 * SKIP_THRESHOLD minutes past are pre-marked as played so we don't
 * replay old segments.
 *
 * Returns a Set of SegmentKeys to pre-mark as done.
 */
export const SKIP_THRESHOLD_MINUTES = 8;

export function buildInitialPlayedSet(minuteNow: number): Set<SegmentKey> {
  const preloaded = new Set<SegmentKey>();
  for (const seg of TRIGGER_SEGMENTS) {
    if (minuteNow - seg.minute >= SKIP_THRESHOLD_MINUTES) {
      preloaded.add(seg.key);
    }
  }
  return preloaded;
}
