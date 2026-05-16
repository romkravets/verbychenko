"use client";

import { useRadio } from "@/app/context/RadioContext";
import { CHANNELS, randomPhrase } from "@/lib/channels";
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

// ─── Radio Scheduler ────────────────────────────────────────────────────────
// Sequence: [music x2-3] → [Tamara insert] → [music x2-3] → [news TTS] →
//           [music x2-3] → [announcement if any] → repeat

const SONGS_BEFORE_INSERT = 2; // play this many songs before insert

export default function PersistentRadioBar() {
  const radio = useRadio();
  const [tracksPlayed, setTracksPlayed] = useState(0);
  const [isBusy, setIsBusy] = useState(false); // TTS playing
  const [newsInsertDue, setNewsInsertDue] = useState(false);
  const [announcementDue, setAnnouncementDue] = useState(false);
  const [splash, setSplash] = useState<FeaturedAnnouncement | null>(null);
  const splashShownRef = useRef(false); // only show once per session
  const newsCountRef = useRef(0); // how many news inserts happened this session
  const busyRef = useRef(false);
  const activeRef = useRef(false);

  useEffect(() => {
    activeRef.current = radio.playing;
  }, [radio.playing]);
  useEffect(() => {
    busyRef.current = isBusy;
  }, [isBusy]);

  // ── Fetch news headline via TTS ──────────────────────────────────────────
  const playNewsInsert = useCallback(async () => {
    if (!activeRef.current || busyRef.current) return;
    setIsBusy(true);
    busyRef.current = true;
    radio.setYtVolume(7);
    radio.setPhase("news");

    try {
      const res = await fetch("/api/rss-news");
      if (!res.ok) throw new Error("no news");
      const data = (await res.json()) as { headline: string };
      radio.setLabel(`📰 ${data.headline}`);

      const tts = await fetch("/api/tts-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `Увага — новини! ${data.headline}` }),
      });
      if (tts.ok) {
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
      }
      newsCountRef.current++;
    } catch {
      // no news — skip silently
    } finally {
      radio.setYtVolume(radio.volume);
      radio.setPhase("music");
      radio.setLabel("🎵 Музичний ефір");
      setIsBusy(false);
      busyRef.current = false;
    }
  }, [radio]);

  // ── Fetch & play next announcement from queue ────────────────────────────
  const playAnnouncementInsert = useCallback(async () => {
    if (!activeRef.current || busyRef.current) return;
    setIsBusy(true);
    busyRef.current = true;
    radio.setYtVolume(7);
    radio.setPhase("announcement");

    try {
      const res = await fetch("/api/queue?episodeId=live");
      const data = (await res.json()) as {
        audioUrl?: string;
        done?: boolean;
        text?: string;
      };

      if (!data.done && data.audioUrl) {
        radio.setLabel("📻 В ефірі оголошення від слухача...");
        await new Promise<void>((resolve) => {
          const a = new Audio(data.audioUrl!);
          a.onended = () => resolve();
          a.onerror = () => resolve();
          a.play().catch(() => resolve());
        });
      }
    } catch {
      // no announcements — skip
    } finally {
      radio.setYtVolume(radio.volume);
      radio.setPhase("music");
      radio.setLabel("🎵 Музичний ефір");
      setIsBusy(false);
      busyRef.current = false;
    }
  }, [radio]);

  // ── Tamara between-song insert ───────────────────────────────────────────
  const playTamaraInsert = useCallback(async () => {
    if (!activeRef.current || busyRef.current) return;
    setIsBusy(true);
    busyRef.current = true;
    radio.setYtVolume(7);
    radio.setPhase("insert");

    try {
      const phrase = randomPhrase();
      radio.setLabel(`🎙️ ${phrase}`);
      const tts = await fetch("/api/tts-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: phrase }),
      });
      if (tts.ok) {
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
  }, [radio]);

  // ── onTrackChange — called every time YouTube switches song ──────────────
  const handleTrackChange = useCallback(async () => {
    if (!activeRef.current || busyRef.current) return;

    const next = tracksPlayed + 1;
    setTracksPlayed(next);

    // After the FIRST song: show the big splash (only once per session, desktop only)
    if (next === 1 && !splashShownRef.current && window.innerWidth >= 768) {
      splashShownRef.current = true;
      try {
        const res = await fetch("/api/announce/featured");
        if (res.ok) {
          const data = (await res.json()) as {
            announcement: FeaturedAnnouncement | null;
          };
          if (data.announcement) setSplash(data.announcement);
        }
      } catch {
        /* no announcements — skip silently */
      }
    }

    if (next % (SONGS_BEFORE_INSERT * 3) === 0) {
      setAnnouncementDue(true);
    } else if (next % (SONGS_BEFORE_INSERT * 2) === 0) {
      setNewsInsertDue(true);
    } else if (next % SONGS_BEFORE_INSERT === 0) {
      await playTamaraInsert();
    }
  }, [tracksPlayed, playTamaraInsert]);

  // Process pending inserts after state updates
  useEffect(() => {
    if (newsInsertDue && !busyRef.current) {
      setNewsInsertDue(false);
      playNewsInsert();
    }
  }, [newsInsertDue, playNewsInsert]);

  useEffect(() => {
    if (announcementDue && !busyRef.current) {
      setAnnouncementDue(false);
      playAnnouncementInsert();
    }
  }, [announcementDue, playAnnouncementInsert]);

  // Expose callbacks via context refs
  useEffect(() => {
    radio.onTrackChange.current = handleTrackChange;
  }, [handleTrackChange, radio.onTrackChange]);

  useEffect(() => {
    radio.onReady.current = () => {
      radio.setPhase("music");
      const ch = CHANNELS.find((c) => c.id === radio.channelId) ?? CHANNELS[0];
      radio.setLabel(`🎵 Канал: ${ch.emoji} ${ch.name}`);
    };
  }, [radio]);

  // ── Phase label ──────────────────────────────────────────────────────────
  const phaseColor = {
    idle: "⚫",
    starting: "🟡",
    music: "🟢",
    insert: "🔴",
    news: "🔴",
    announcement: "🔴",
  }[radio.phase];

  const isLive = radio.phase !== "idle";

  return (
    <>
      {/* Full-screen splash after first song */}
      {splash && (
        <AnnouncementSplash
          announcement={splash}
          onClose={() => setSplash(null)}
        />
      )}

      {/* Hidden YouTube player — always mounted */}
      {radio.playing && (
        <YouTubeRadio
          key={radio.channelId}
          playing={radio.ytPlaying}
          volume={radio.ytVolume}
          channelId={radio.channelId}
          onReady={() => radio.onReady.current?.()}
          onTrackChange={() => radio.onTrackChange.current?.()}
        />
      )}

      {/* Sticky mini-bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-950 border-t-2 border-amber-700 shadow-2xl">
        <div className="max-w-4xl mx-auto px-3 py-2 flex items-center gap-3">
          {/* Play/Stop */}
          <button
            onClick={radio.playing ? radio.stop : radio.start}
            className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-lg flex items-center justify-center flex-shrink-0 transition active:scale-95"
          >
            {radio.playing ? "■" : "▶"}
          </button>

          {/* Status dot + label */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{phaseColor}</span>
              <span className="text-amber-200 text-xs font-mono truncate">
                {isBusy ? (
                  <span className="animate-pulse">{radio.currentLabel}</span>
                ) : (
                  radio.currentLabel
                )}
              </span>
            </div>
            {isLive && (
              <div className="flex items-center gap-0.5 mt-0.5 overflow-hidden h-2">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-amber-500 rounded-full flex-shrink-0"
                    style={{
                      height: isBusy ? `${4 + Math.sin(i * 0.9) * 4}px` : "2px",
                      opacity: 0.5 + (i % 3) * 0.2,
                      transition: "height 0.3s",
                    }}
                  />
                ))}
              </div>
            )}
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
            className="w-16 accent-amber-400 flex-shrink-0"
            title="Гучність"
          />

          {/* Channel selector */}
          <select
            value={radio.channelId}
            onChange={(e) => radio.setChannel(e.target.value)}
            className="bg-amber-900 text-amber-200 text-xs rounded px-1 py-1 border border-amber-700 flex-shrink-0"
          >
            {CHANNELS.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.emoji} {ch.name}
              </option>
            ))}
          </select>

          {/* Submit link */}
          <Link
            href="/submit"
            className="text-amber-400 hover:text-amber-300 text-xs font-mono flex-shrink-0 hidden sm:block"
          >
            + оголошення
          </Link>

          {/* Admin link */}
          <Link
            href="/admin"
            className="text-amber-700 hover:text-amber-500 text-xs flex-shrink-0"
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
