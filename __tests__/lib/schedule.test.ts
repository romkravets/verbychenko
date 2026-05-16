import {
  buildInitialPlayedSet,
  getCurrentDisplayKey,
  getDueSegment,
  SKIP_THRESHOLD_MINUTES,
  slotTime,
  TRIGGER_SEGMENTS,
} from "@/lib/schedule";
import { describe, expect, it } from "vitest";

// ─── getDueSegment ────────────────────────────────────────────────────────────

describe("getDueSegment", () => {
  it("returns null when nothing is due (minute 0, all played)", () => {
    const played = new Set(["news-0", "dating", "news-30", "commercial"]);
    expect(getDueSegment(0, played)).toBeNull();
  });

  it("returns null when no segments have passed yet (minute < first segment)", () => {
    // Before :00 technically can't happen in a real clock, but guard anyway
    expect(getDueSegment(-1, new Set())).toBeNull();
  });

  it("returns the first overdue unplayed segment in order", () => {
    // At minute 2 — only news-0 (minute 0) is due
    expect(getDueSegment(2, new Set())).toBe("news-0");
  });

  it("returns dating when news-0 is already played and minute >= 5", () => {
    const played = new Set(["news-0"]);
    expect(getDueSegment(6, played)).toBe("dating");
  });

  it("returns news-0 if minute >= 0 and news-0 not played, even if dating is also due", () => {
    // At minute 10, both news-0 AND dating are overdue — returns news-0 first
    expect(getDueSegment(10, new Set())).toBe("news-0");
  });

  it("skips news-0, returns dating when news-0 done at minute 10", () => {
    expect(getDueSegment(10, new Set(["news-0"]))).toBe("dating");
  });

  it("returns news-30 at minute 32 when earlier segments are played", () => {
    const played = new Set(["news-0", "dating"]);
    expect(getDueSegment(32, played)).toBe("news-30");
  });

  it("returns commercial at minute 45 when all earlier played", () => {
    const played = new Set(["news-0", "dating", "news-30"]);
    expect(getDueSegment(45, played)).toBe("commercial");
  });

  it("returns null at minute 59 when all segments played", () => {
    const played = new Set(["news-0", "dating", "news-30", "commercial"]);
    expect(getDueSegment(59, played)).toBeNull();
  });

  it("exactly at segment minute — segment is due", () => {
    expect(getDueSegment(30, new Set(["news-0", "dating"]))).toBe("news-30");
  });

  it("one minute before segment minute — segment not yet due", () => {
    const played = new Set(["news-0", "dating"]);
    expect(getDueSegment(29, played)).toBeNull();
  });
});

// ─── getCurrentDisplayKey ────────────────────────────────────────────────────

describe("getCurrentDisplayKey", () => {
  it("returns news-0 at minute 0", () => {
    expect(getCurrentDisplayKey(0)).toBe("news-0");
  });

  it("returns dating at minute 5", () => {
    expect(getCurrentDisplayKey(5)).toBe("dating");
  });

  it("returns dating at minute 10 (between dating and music-1)", () => {
    expect(getCurrentDisplayKey(10)).toBe("dating");
  });

  it("returns music-1 at minute 15", () => {
    expect(getCurrentDisplayKey(15)).toBe("music-1");
  });

  it("returns news-30 at minute 30", () => {
    expect(getCurrentDisplayKey(30)).toBe("news-30");
  });

  it("returns commercial at minute 35", () => {
    expect(getCurrentDisplayKey(35)).toBe("commercial");
  });

  it("returns music-2 at minute 45", () => {
    expect(getCurrentDisplayKey(45)).toBe("music-2");
  });

  it("returns music-2 at minute 59", () => {
    expect(getCurrentDisplayKey(59)).toBe("music-2");
  });
});

// ─── buildInitialPlayedSet ────────────────────────────────────────────────────

describe("buildInitialPlayedSet", () => {
  it("marks nothing when joining at minute 0 (everything is fresh)", () => {
    const played = buildInitialPlayedSet(0);
    expect(played.size).toBe(0);
  });

  it("marks nothing when joining at minute 7 (< threshold 8)", () => {
    // news-0 is at :00, now is :07 → diff = 7 < 8 → not marked
    const played = buildInitialPlayedSet(7);
    expect(played.has("news-0")).toBe(false);
  });

  it("marks news-0 when joining at threshold boundary (diff === 8)", () => {
    const played = buildInitialPlayedSet(SKIP_THRESHOLD_MINUTES);
    expect(played.has("news-0")).toBe(true);
  });

  it("marks news-0 and dating but not news-30 when joining at minute 20", () => {
    // news-0 at 0 → diff=20 ≥ 8 ✓
    // dating at 5 → diff=15 ≥ 8 ✓
    // news-30 at 30 → minute 20 - 30 = -10 → not yet
    const played = buildInitialPlayedSet(20);
    expect(played.has("news-0")).toBe(true);
    expect(played.has("dating")).toBe(true);
    expect(played.has("news-30")).toBe(false);
    expect(played.has("commercial")).toBe(false);
  });

  it("marks all 4 segments when joining late (minute 59)", () => {
    const played = buildInitialPlayedSet(59);
    for (const seg of TRIGGER_SEGMENTS) {
      expect(played.has(seg.key)).toBe(true);
    }
  });
});

// ─── slotTime ────────────────────────────────────────────────────────────────

describe("slotTime", () => {
  it("formats single digit hour and minute with leading zeros", () => {
    expect(slotTime(9, 5)).toBe("09:05");
  });

  it("formats standard time", () => {
    expect(slotTime(14, 30)).toBe("14:30");
  });

  it("formats midnight", () => {
    expect(slotTime(0, 0)).toBe("00:00");
  });

  it("formats end of day", () => {
    expect(slotTime(23, 59)).toBe("23:59");
  });
});
