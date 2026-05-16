import {
  buildInitialPlayedSet,
  getCurrentDisplayKey,
  getDueSegment,
  SKIP_THRESHOLD_MINUTES,
  slotTime,
  TRIGGER_SEGMENTS,
} from "@/lib/schedule";
import { describe, expect, it } from "vitest";

// ─── getDueSegment — what should play next ────────────────────────────────────

describe("getDueSegment — what should play next between songs", () => {
  it("returns null when all segments for this hour have already aired", () => {
    const played = new Set(["news-0", "dating", "news-30", "commercial"]);
    expect(getDueSegment(0, played)).toBeNull();
  });

  it("returns null before the first scheduled segment of the hour", () => {
    expect(getDueSegment(-1, new Set())).toBeNull();
  });

  it("schedules the news at :00 as soon as the first song ends", () => {
    // At minute 2, news-0 (minute 0) is overdue
    expect(getDueSegment(2, new Set())).toBe("news-0");
  });

  it("schedules the dating show at :05 once the news has aired", () => {
    const played = new Set(["news-0"]);
    expect(getDueSegment(6, played)).toBe("dating");
  });

  it("always plays news first even when multiple segments are overdue", () => {
    // At minute 10 both news-0 and dating are overdue — news wins
    expect(getDueSegment(10, new Set())).toBe("news-0");
  });

  it("skips to dating when news is done and minute >= 5", () => {
    expect(getDueSegment(10, new Set(["news-0"]))).toBe("dating");
  });

  it("fires the half-hour news when the hour is past :30", () => {
    const played = new Set(["news-0", "dating"]);
    expect(getDueSegment(32, played)).toBe("news-30");
  });

  it("fires commercials at :35 once news and dating are done", () => {
    const played = new Set(["news-0", "dating", "news-30"]);
    expect(getDueSegment(45, played)).toBe("commercial");
  });

  it("returns null at :59 when the full hour program has played", () => {
    const played = new Set(["news-0", "dating", "news-30", "commercial"]);
    expect(getDueSegment(59, played)).toBeNull();
  });

  it("fires the segment exactly at its scheduled minute", () => {
    expect(getDueSegment(30, new Set(["news-0", "dating"]))).toBe("news-30");
  });

  it("does not fire a segment one minute before its time", () => {
    const played = new Set(["news-0", "dating"]);
    expect(getDueSegment(29, played)).toBeNull();
  });
});

// ─── getCurrentDisplayKey — which slot is highlighted in the schedule panel ───

describe("getCurrentDisplayKey — which schedule slot to highlight", () => {
  it("shows the opening news at the top of the hour", () => {
    expect(getCurrentDisplayKey(0)).toBe("news-0");
  });

  it("shows the dating show at :05", () => {
    expect(getCurrentDisplayKey(5)).toBe("dating");
  });

  it("still shows dating at :10, before the music block starts", () => {
    expect(getCurrentDisplayKey(10)).toBe("dating");
  });

  it("shows the first music block at :15", () => {
    expect(getCurrentDisplayKey(15)).toBe("music-1");
  });

  it("shows the half-hour news at :30", () => {
    expect(getCurrentDisplayKey(30)).toBe("news-30");
  });

  it("shows commercials at :35", () => {
    expect(getCurrentDisplayKey(35)).toBe("commercial");
  });

  it("shows the second music block at :45", () => {
    expect(getCurrentDisplayKey(45)).toBe("music-2");
  });

  it("still shows the second music block at :59 — last slot of the hour", () => {
    expect(getCurrentDisplayKey(59)).toBe("music-2");
  });
});

// ─── buildInitialPlayedSet — catch up when a listener joins mid-hour ──────────

describe("buildInitialPlayedSet — skip old segments when joining mid-hour", () => {
  it("marks nothing as played when joining right at the top of the hour", () => {
    const played = buildInitialPlayedSet(0);
    expect(played.size).toBe(0);
  });

  it("does not skip a segment that aired only 7 minutes ago (under the threshold)", () => {
    // news-0 at :00, joining at :07 → 7 min ago < 8 min threshold → still playable
    const played = buildInitialPlayedSet(7);
    expect(played.has("news-0")).toBe(false);
  });

  it("skips a segment that aired exactly at the threshold boundary", () => {
    const played = buildInitialPlayedSet(SKIP_THRESHOLD_MINUTES);
    expect(played.has("news-0")).toBe(true);
  });

  it("pre-marks news and dating as aired when joining at minute 20", () => {
    // news-0 at :00 → 20 min ago ✓ skip
    // dating at :05 → 15 min ago ✓ skip
    // news-30 at :30 → not yet ✗ keep
    const played = buildInitialPlayedSet(20);
    expect(played.has("news-0")).toBe(true);
    expect(played.has("dating")).toBe(true);
    expect(played.has("news-30")).toBe(false);
    expect(played.has("commercial")).toBe(false);
  });

  it("pre-marks all segments as aired when joining at minute 59", () => {
    const played = buildInitialPlayedSet(59);
    for (const seg of TRIGGER_SEGMENTS) {
      expect(played.has(seg.key)).toBe(true);
    }
  });
});

// ─── slotTime — clock display ─────────────────────────────────────────────────

describe("slotTime — formats HH:MM for the schedule display", () => {
  it("pads single-digit hours and minutes with a leading zero", () => {
    expect(slotTime(9, 5)).toBe("09:05");
  });

  it("formats a normal two-digit time", () => {
    expect(slotTime(14, 30)).toBe("14:30");
  });

  it("handles midnight correctly", () => {
    expect(slotTime(0, 0)).toBe("00:00");
  });

  it("handles end of day correctly", () => {
    expect(slotTime(23, 59)).toBe("23:59");
  });
});
