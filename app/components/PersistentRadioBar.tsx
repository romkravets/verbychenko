"use client";

import { useRadio } from "@/app/context/RadioContext";
import { randomPhrase } from "@/lib/channels";
import {
  buildInitialPlayedSet,
  getDueSegment,
  type SegmentKey,
} from "@/lib/schedule";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AnnouncementSplash from "./AnnouncementSplash";

const YouTubeRadio = dynamic(() => import("./YouTubeRadio"), { ssr: false });

type FeaturedAnnouncement = {
  id: string;
  type: "DATING" | "COMMERCIAL";
  name: string;
  city: string;
  aiText: string | null;
  itemTitle: string | null;
  price: string | null;
  contactPhone: string | null;
};

export default function PersistentRadioBar() {
  const radio = useRadio();
  const [isBusy, setIsBusy] = useState(false);
  const [splash, setSplash] = useState<FeaturedAnnouncement | null>(null);
  const [pendingSegment, setPendingSegment] = useState<SegmentKey | null>(null);
  const [trackTime, setTrackTime] = useState<{
    cur: number;
    dur: number;
  } | null>(null);
  const [wavePhase, setWavePhase] = useState(0);

  const splashShownRef = useRef(false);
  const busyRef = useRef(false);
  const activeRef = useRef(false);
  const tracksRef = useRef(0); // songs played this session
  const lastHourRef = useRef(-1); // last hour we reset the played-segments set
  const playedRef = useRef<Set<SegmentKey>>(new Set());

  useEffect(() => {
    activeRef.current = radio.playing;
  }, [radio.playing]);
  useEffect(() => {
    busyRef.current = isBusy;
  }, [isBusy]);

  // Animate waveform — advances phase every 120 ms
  useEffect(() => {
    if (!radio.playing) return;
    const id = setInterval(() => setWavePhase((p) => p + 1), 120);
    return () => clearInterval(id);
  }, [radio.playing]);

  // ── TTS helper ────────────────────────────────────────────────────────────
  const playTTS = useCallback(async (text: string) => {
    const tts = await fetch("/api/tts-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!tts.ok) return;
    const blob = await tts.blob();
    const url = URL.createObjectURL(blob);
    await new Promise<void>((resolve) => {
      const a = new Audio(url);
      a.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      a.onerror = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      a.play().catch(() => resolve());
    });
  }, []);

  // ── 📰 News segment ───────────────────────────────────────────────────────
  const playNewsInsert = useCallback(async () => {
    if (!activeRef.current || busyRef.current) return;
    setIsBusy(true);
    busyRef.current = true;
    radio.setYtVolume(0);
    radio.setPhase("news");
    try {
      // Fetch all cached headlines (up to 5), read 2 different ones
      const res = await fetch("/api/rss-news?all=1");
      if (!res.ok) throw new Error("no news");
      const { headlines } = (await res.json()) as { headlines: string[] };
      if (!headlines?.length) throw new Error("empty");

      radio.setLabel(`📰 ${headlines[0]}`);
      await playTTS(
        `Шановні слухачі, у мікрофона Тамара. Слухайте новини. ${headlines[0]}`,
      );

      if (activeRef.current && headlines.length > 1) {
        radio.setLabel(`📰 ${headlines[1]}`);
        await playTTS(headlines[1]);
      }
    } catch {
      /* skip */
    } finally {
      radio.setYtVolume(radio.volume);
      radio.setPhase("music");
      radio.setLabel("🎵 Музичний ефір");
      setIsBusy(false);
      busyRef.current = false;
    }
  }, [radio, playTTS]);

  // ── 💌 Програма знайомств ─────────────────────────────────────────────────
  const playDatingProgram = useCallback(async () => {
    if (!activeRef.current || busyRef.current) return;
    setIsBusy(true);
    busyRef.current = true;
    radio.setYtVolume(0);
    radio.setPhase("announcement");
    try {
      // Check if there are any announcements before doing intro
      const first = await fetch("/api/announce/featured?type=DATING");
      if (!first.ok) return;
      const { announcement: ann1 } = (await first.json()) as {
        announcement: { id: string; aiText: string; city: string } | null;
      };
      if (!ann1?.aiText) return; // nothing to read — skip silently

      radio.setLabel("💌 Програма знайомств");
      await playTTS(
        "А зараз — програма знайомств Радіо Вербиченька! Слухайте листи наших слухачів.",
      );

      radio.setLabel(`💌 Лист із міста ${ann1.city}`);
      await playTTS(ann1.aiText);

      // Try to get a second (guaranteed different) announcement via ?exclude=
      if (activeRef.current) {
        const second = await fetch(
          `/api/announce/featured?type=DATING&exclude=${ann1.id}`,
        );
        if (second.ok) {
          const { announcement: ann2 } = (await second.json()) as {
            announcement: { id: string; aiText: string; city: string } | null;
          };
          if (ann2?.aiText) {
            await playTTS("Ще один лист до нашої програми.");
            radio.setLabel(`💌 Лист із міста ${ann2.city}`);
            await playTTS(ann2.aiText);
          }
        }
      }

      await playTTS(
        "Надсилайте свої листи на сайті Радіо Вербиченька. І пам'ятайте — кохання поруч!",
      );
    } catch {
      /* skip */
    } finally {
      radio.setYtVolume(radio.volume);
      radio.setPhase("music");
      radio.setLabel("🎵 Музичний ефір");
      setIsBusy(false);
      busyRef.current = false;
    }
  }, [radio, playTTS]);

  // ── 🛒 Комерційні оголошення ──────────────────────────────────────────────
  const playCommercialProgram = useCallback(async () => {
    if (!activeRef.current || busyRef.current) return;
    setIsBusy(true);
    busyRef.current = true;
    radio.setYtVolume(0);
    radio.setPhase("announcement");
    try {
      const first = await fetch("/api/announce/featured?type=COMMERCIAL");
      if (!first.ok) return;
      const { announcement: ann1 } = (await first.json()) as {
        announcement: {
          id: string;
          aiText: string;
          itemTitle: string | null;
        } | null;
      };
      if (!ann1?.aiText) return;

      radio.setLabel("🛒 Комерційні оголошення");
      await playTTS("І кілька оголошень від наших слухачів. Слухайте уважно!");

      radio.setLabel(`🛒 ${ann1.itemTitle ?? "Оголошення"}`);
      await playTTS(ann1.aiText);

      if (activeRef.current) {
        const second = await fetch(
          `/api/announce/featured?type=COMMERCIAL&exclude=${ann1.id}`,
        );
        if (second.ok) {
          const { announcement: ann2 } = (await second.json()) as {
            announcement: {
              id: string;
              aiText: string;
              itemTitle: string | null;
            } | null;
          };
          if (ann2?.aiText) {
            radio.setLabel(`🛒 ${ann2.itemTitle ?? "Оголошення"}`);
            await playTTS(ann2.aiText);
          }
        }
      }

      await playTTS("Подавайте свої оголошення на сайті Радіо Вербиченька.");
    } catch {
      /* skip */
    } finally {
      radio.setYtVolume(radio.volume);
      radio.setPhase("music");
      radio.setLabel("🎵 Музичний ефір");
      setIsBusy(false);
      busyRef.current = false;
    }
  }, [radio, playTTS]);

  // ── 🎙️ Тамара між піснями ─────────────────────────────────────────────────
  const playTamaraInsert = useCallback(async () => {
    if (!activeRef.current || busyRef.current) return;
    setIsBusy(true);
    busyRef.current = true;
    radio.setYtVolume(0);
    radio.setPhase("insert");
    try {
      const phrase = randomPhrase();
      radio.setLabel(`🎙️ ${phrase}`);
      await playTTS(phrase);
    } catch {
      /* skip */
    } finally {
      radio.setYtVolume(radio.volume);
      radio.setPhase("music");
      radio.setLabel("🎵 Музичний ефір");
      setIsBusy(false);
      busyRef.current = false;
    }
  }, [radio, playTTS]);

  // ── Process pending segment (after state flush) ───────────────────────────
  useEffect(() => {
    if (!pendingSegment || busyRef.current) return;
    const seg = pendingSegment;
    setPendingSegment(null);
    if (seg === "news-0" || seg === "news-30") playNewsInsert();
    else if (seg === "dating") playDatingProgram();
    else if (seg === "commercial") playCommercialProgram();
  }, [
    pendingSegment,
    playNewsInsert,
    playDatingProgram,
    playCommercialProgram,
  ]);

  // ── onTrackChange — runs after every song ─────────────────────────────────
  const handleTrackChange = useCallback(async () => {
    if (!activeRef.current || busyRef.current) return;

    const n = tracksRef.current + 1;
    tracksRef.current = n;

    // After FIRST song: show splash + initialize schedule
    if (n === 1) {
      // Splash
      if (!splashShownRef.current && window.innerWidth >= 768) {
        splashShownRef.current = true;
        try {
          const res = await fetch("/api/announce/featured");
          if (res.ok) {
            const { announcement } = (await res.json()) as {
              announcement: FeaturedAnnouncement | null;
            };
            if (announcement) setSplash(announcement);
          }
        } catch {
          /* skip */
        }
      }

      // Initialize: mark segments that are already >8 min past as done
      // so we don't replay old segments when the user joins mid-hour
      const now = new Date();
      lastHourRef.current = now.getHours();
      playedRef.current = buildInitialPlayedSet(now.getMinutes());
    }

    // Hour boundary → reset played set
    const now = new Date();
    const h = now.getHours();
    if (h !== lastHourRef.current) {
      lastHourRef.current = h;
      playedRef.current = new Set();
    }

    // Check if a scheduled segment is due
    const due = getDueSegment(now.getMinutes(), playedRef.current);
    if (due) {
      playedRef.current.add(due);
      setPendingSegment(due);
      return;
    }

    // No segment due → Tamara phrase every 2 songs
    if (n % 2 === 0) {
      await playTamaraInsert();
    }
  }, [playTamaraInsert]);

  // Expose callbacks via context refs
  useEffect(() => {
    radio.onTrackChange.current = handleTrackChange;
  }, [handleTrackChange, radio.onTrackChange]);

  useEffect(() => {
    radio.onReady.current = () => {
      radio.setPhase("music");
      const ch =
        radio.channels.find((c) => c.id === radio.channelId) ??
        radio.channels[0];
      radio.setLabel(`🎵 Канал: ${ch.emoji} ${ch.name}`);
    };
  }, [radio]);

  // ── UI helpers ────────────────────────────────────────────────────────────
  const phaseColor = {
    idle: "⚫",
    starting: "🟡",
    music: "🟢",
    insert: "🔴",
    news: "🔴",
    announcement: "🔴",
  }[radio.phase];

  const isLive = radio.phase !== "idle";

  function fmt(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return (
    <>
      {/* Full-screen splash after first song */}
      {splash && (
        <AnnouncementSplash
          announcement={splash}
          onClose={() => setSplash(null)}
        />
      )}

      {/* Hidden YouTube player — always mounted so position is preserved on stop/play */}
      <YouTubeRadio
        key={`${radio.channelId}:${radio.channels.length}`}
        playing={radio.ytPlaying && radio.playing}
        volume={radio.ytVolume}
        channelId={radio.channelId}
        channels={radio.channels}
        onReady={() => radio.onReady.current?.()}
        onTrackChange={() => {
          setTrackTime(null);
          radio.onTrackChange.current?.();
        }}
        onTimeUpdate={(cur, dur) => setTrackTime({ cur, dur })}
      />

      {/* Sticky bottom bar — monopo saigon dark */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-t border-white/10">
        {/* Timeline */}
        {radio.playing &&
          trackTime &&
          trackTime.dur > 0 &&
          radio.phase === "music" && (
            <div className="px-4 pt-1.5 pb-0">
              <div className="flex items-center gap-2">
                <span className="text-whisper-gray text-[10px] font-mono w-8 text-right shrink-0">
                  {fmt(trackTime.cur)}
                </span>
                <div className="flex-1 h-px bg-white/10 relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-white/40"
                    style={{
                      width:
                        trackTime.dur > 0
                          ? `${(trackTime.cur / trackTime.dur) * 100}%`
                          : "0%",
                      transition: "width 1s linear",
                    }}
                  />
                </div>
                <span className="text-whisper-gray text-[10px] font-mono w-8 shrink-0">
                  {fmt(trackTime.dur)}
                </span>
              </div>
            </div>
          )}

        <div className="max-w-[1078px] mx-auto px-4 py-2.5 flex items-center gap-3">
          {/* Play/Stop */}
          <button
            onClick={radio.playing ? radio.stop : radio.start}
            className="w-9 h-9 flex items-center justify-center border border-white/20 text-white hover:bg-white/10 text-base shrink-0 transition active:scale-95"
            style={{ borderRadius: "75.024px" }}
          >
            {radio.playing ? "■" : "▶"}
          </button>

          {/* Waveform + label */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] opacity-60">{phaseColor}</span>
              <span className="text-white text-[12px] font-mono truncate">
                {isBusy ? (
                  <span className="animate-pulse">{radio.currentLabel}</span>
                ) : (
                  radio.currentLabel
                )}
              </span>
            </div>
            {isLive && (
              <div className="flex items-end gap-[2px] h-3 overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => {
                  const speed = 0.35 + (i % 5) * 0.07;
                  const offset = i * 0.42;
                  const amp = isBusy
                    ? 3 + Math.abs(Math.sin(wavePhase * speed + offset)) * 7
                    : 1.5 +
                      Math.abs(Math.sin(wavePhase * speed + offset)) * 2.5;
                  return (
                    <div
                      key={i}
                      className="w-px bg-white/50 shrink-0"
                      style={{
                        height: `${amp}px`,
                        transition: "height 0.12s ease-in-out",
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Channel pills — hidden on mobile, shown sm+ */}
          <div className="hidden sm:flex items-center gap-1">
            {radio.channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => radio.setChannel(ch.id)}
                className={`text-[11px] font-mono px-2.5 py-0.5 border transition shrink-0 ${
                  radio.channelId === ch.id
                    ? "border-white/40 text-white bg-white/10"
                    : "border-white/10 text-whisper-gray hover:text-white"
                }`}
                style={{ borderRadius: "75.024px" }}
                title={ch.name}
              >
                {ch.emoji}
              </button>
            ))}
          </div>

          {/* Volume */}
          <input
            type="range"
            min={0}
            max={100}
            value={radio.volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              radio.setVolume(v);
              radio.setYtVolume(v);
            }}
            className="w-14 shrink-0 accent-white"
            title="Гучність"
          />

          {/* Schedule */}
          <Link
            href="/schedule"
            className="text-whisper-gray hover:text-white text-sm shrink-0 transition"
            title="Розклад ефіру"
          >
            📅
          </Link>

          {/* Submit */}
          <Link
            href="/submit"
            className="text-whisper-gray hover:text-white text-[11px] font-mono shrink-0 hidden sm:block tracking-wide"
          >
            + оголошення
          </Link>

          {/* Admin */}
          <Link
            href="/admin"
            className="text-whisper-gray hover:text-white text-[11px] shrink-0"
            title="Адмін"
          >
            ⚙️
          </Link>
        </div>
      </div>

      {/* Bottom padding so content isn't hidden under the bar */}
      <div className="h-14" />
    </>
  );
}
