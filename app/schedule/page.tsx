"use client";

import {
  buildInitialPlayedSet,
  DISPLAY_SLOTS,
  getCurrentDisplayKey,
  getDueSegment,
  slotTime,
  TRIGGER_SEGMENTS,
  type SegmentKey,
} from "@/lib/schedule";
import { useEffect, useState } from "react";

const SLOT_STYLES: Record<
  string,
  { bar: string; dot: string; label: string; bg: string; border: string }
> = {
  "news-0": {
    bar: "bg-blue-500",
    dot: "bg-blue-400",
    label: "text-blue-300",
    bg: "bg-blue-950/40",
    border: "border-blue-800/50",
  },
  dating: {
    bar: "bg-rose-500",
    dot: "bg-rose-400",
    label: "text-rose-300",
    bg: "bg-rose-950/40",
    border: "border-rose-800/50",
  },
  "music-1": {
    bar: "bg-white/20",
    dot: "bg-white/30",
    label: "text-white/40",
    bg: "bg-white/3",
    border: "border-white/[0.07]",
  },
  "news-30": {
    bar: "bg-blue-500",
    dot: "bg-blue-400",
    label: "text-blue-300",
    bg: "bg-blue-950/40",
    border: "border-blue-800/50",
  },
  commercial: {
    bar: "bg-amber-500",
    dot: "bg-amber-400",
    label: "text-amber-300",
    bg: "bg-amber-950/40",
    border: "border-amber-800/50",
  },
  "music-2": {
    bar: "bg-white/20",
    dot: "bg-white/30",
    label: "text-white/40",
    bg: "bg-white/3",
    border: "border-white/[0.07]",
  },
};

function padTwo(n: number) {
  return String(n).padStart(2, "0");
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function SchedulePage() {
  const now = useNow();
  const h = now.getHours();
  const m = now.getMinutes();

  const played = buildInitialPlayedSet(m);
  const currentKey = getCurrentDisplayKey(m);
  const dueKey = getDueSegment(m, played);

  // Next segment countdown
  const nextSeg =
    TRIGGER_SEGMENTS.find((s) => s.minute > m) ?? TRIGGER_SEGMENTS[0];
  const nextIsNextHour = nextSeg.minute <= m;
  const nextHour = nextIsNextHour ? (h + 1) % 24 : h;
  const nextTime = slotTime(nextHour, nextSeg.minute);
  const minsUntil = nextIsNextHour
    ? 60 - m + nextSeg.minute
    : nextSeg.minute - m;

  // Progress through the current hour (0–100)
  const hourProgress = Math.round((m / 59) * 100);

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-[1078px] mx-auto px-6 pt-10 pb-32">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] font-mono tracking-widest uppercase text-whisper-gray mb-3">
            Ефірний розклад
          </p>
          <h1
            className="text-[clamp(28px,5vw,42px)] font-light leading-[1.15] text-white"
            style={{
              fontFamily: "var(--font-raleway-var, Raleway, sans-serif)",
            }}
          >
            Розклад Радіо Вербиченька
          </h1>
          <p className="text-whisper-gray text-[14px] mt-2">
            Розклад повторюється щогодини. Сегменти запускаються між піснями.
          </p>
        </div>

        {/* Now card */}
        <div className="rounded-[10px] border border-white/10 bg-white/5 p-6 mb-8 flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Current segment */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-mono tracking-widest uppercase text-whisper-gray">
                Зараз в ефірі
              </span>
            </div>
            <p className="text-white text-[20px] font-light">
              {DISPLAY_SLOTS.find((s) => s.key === currentKey)?.emoji}{" "}
              {DISPLAY_SLOTS.find((s) => s.key === currentKey)?.label}
            </p>
            <p className="text-whisper-gray text-[13px] font-mono mt-0.5">
              {padTwo(h)}:00 — {padTwo(h)}:59
            </p>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-12 bg-white/10" />

          {/* Next segment */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono tracking-widest uppercase text-whisper-gray">
                Наступне
              </span>
            </div>
            <p className="text-white text-[20px] font-light">
              {nextSeg.emoji} {nextSeg.label}
            </p>
            <p className="text-whisper-gray text-[13px] font-mono mt-0.5">
              {nextTime} · через {minsUntil} хв
            </p>
          </div>

          {/* Hour progress bar */}
          <div className="sm:w-28 flex flex-col gap-2">
            <span className="text-[11px] font-mono text-whisper-gray tracking-wider">
              Година {padTwo(h)}:{padTwo(m)}
            </span>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/40 rounded-full transition-all duration-500"
                style={{ width: `${hourProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-whisper-gray">
              {hourProgress}% години
            </span>
          </div>
        </div>

        {/* This hour's schedule — visual timeline */}
        <div className="mb-10">
          <p className="text-[11px] font-mono tracking-widest uppercase text-whisper-gray mb-4">
            Щогодинна програма
          </p>

          {/* Time ruler (0–59 min) */}
          <div className="relative mb-3 pl-[72px]">
            <div className="flex">
              {[0, 15, 30, 45, 59].map((tick) => (
                <div
                  key={tick}
                  className="absolute text-[10px] font-mono text-whisper-gray"
                  style={{ left: `calc(72px + ${(tick / 59) * 100}%)` }}
                >
                  :{padTwo(tick)}
                </div>
              ))}
            </div>
          </div>

          {/* Slot rows */}
          <div className="flex flex-col gap-2">
            {DISPLAY_SLOTS.map((slot) => {
              const s = SLOT_STYLES[slot.key] ?? SLOT_STYLES["music-1"];
              const isActive = slot.key === currentKey;
              const isDue = slot.key === dueKey;
              const widthPct = slot.key.startsWith("music")
                ? slot.key === "music-1"
                  ? ((30 - 15) / 60) * 100
                  : ((60 - 45) / 60) * 100
                : slot.key === "news-0"
                  ? (5 / 60) * 100
                  : slot.key === "dating"
                    ? (10 / 60) * 100
                    : slot.key === "news-30"
                      ? (5 / 60) * 100
                      : (10 / 60) * 100; // commercial

              return (
                <div key={slot.key} className="flex items-center gap-3">
                  {/* Time label */}
                  <div className="w-[60px] shrink-0 text-right">
                    <span
                      className={`text-[12px] font-mono ${isActive ? "text-white" : "text-whisper-gray"}`}
                    >
                      :{padTwo(slot.minute)}
                    </span>
                  </div>

                  {/* Bar + label */}
                  <div
                    className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-md border transition-all ${s.bg} ${s.border} ${isActive ? "ring-1 ring-white/20" : ""}`}
                  >
                    <span className="text-base shrink-0">{slot.emoji}</span>
                    <span
                      className={`text-[13px] font-mono ${isActive ? "text-white" : s.label}`}
                    >
                      {slot.label}
                    </span>
                    {isActive && (
                      <span className="ml-auto text-[10px] font-mono text-white/60 animate-pulse shrink-0">
                        ● зараз
                      </span>
                    )}
                    {isDue && !isActive && (
                      <span className="ml-auto text-[10px] font-mono text-amber-400 shrink-0">
                        скоро
                      </span>
                    )}
                  </div>

                  {/* Duration bar */}
                  <div className="w-[80px] shrink-0">
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.bar}`}
                        style={{
                          width: `${Math.round(widthPct * 5)}%`,
                          maxWidth: "100%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 24-hour calendar grid */}
        <div>
          <p className="text-[11px] font-mono tracking-widest uppercase text-whisper-gray mb-4">
            Сьогодні —{" "}
            {new Date().toLocaleDateString("uk-UA", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {hours.map((hour) => {
              const isCurrent = hour === h;
              const isPast = hour < h;
              return (
                <div
                  key={hour}
                  className={`rounded-[10px] border p-4 transition-all ${
                    isCurrent
                      ? "border-white/25 bg-white/8"
                      : isPast
                        ? "border-white/5 bg-white/[0.02] opacity-50"
                        : "border-white/10 bg-white/3"
                  }`}
                >
                  {/* Hour header */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[13px] font-mono font-semibold ${isCurrent ? "text-white" : "text-whisper-gray"}`}
                    >
                      {padTwo(hour)}:00
                    </span>
                    {isCurrent && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        LIVE
                      </span>
                    )}
                  </div>

                  {/* Segments */}
                  <div className="flex flex-col gap-1">
                    {TRIGGER_SEGMENTS.map((seg) => {
                      const segTime = slotTime(hour, seg.minute);
                      const isDone =
                        isCurrent && played.has(seg.key as SegmentKey);
                      const isNow =
                        isCurrent && seg.key === (dueKey ?? currentKey);
                      const sf = SLOT_STYLES[seg.key] ?? SLOT_STYLES["news-0"];
                      return (
                        <div
                          key={seg.key}
                          className={`flex items-center gap-2 text-[11px] font-mono px-2 py-1 rounded transition-all ${
                            isNow
                              ? `${sf.bg} ${sf.border} border`
                              : isDone
                                ? "opacity-40"
                                : ""
                          }`}
                        >
                          <span className="text-whisper-gray w-9 shrink-0">
                            {segTime}
                          </span>
                          <span>{seg.emoji}</span>
                          <span
                            className={
                              isNow ? "text-white" : "text-whisper-gray"
                            }
                          >
                            {seg.label}
                          </span>
                          {isDone && (
                            <span className="ml-auto text-whisper-gray">✓</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-[11px] text-whisper-gray font-mono mt-8 text-center">
          Сегменти запускаються після поточної пісні. Музика грає між ними
          автоматично.
        </p>
      </div>
    </div>
  );
}
