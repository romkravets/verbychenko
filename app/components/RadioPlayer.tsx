"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import YouTubeRadio from "./YouTubeRadio";
import { CHANNELS, randomPhrase } from "@/lib/channels";

type PlayerState =
  | "idle"
  | "loading-music"
  | "playing-music"
  | "loading-ann"
  | "playing-ann"
  | "error";

interface QueueItem {
  audioUrl: string;
  type: "MUSIC" | "ANNOUNCEMENT";
}

const MUSIC_FADE_STEPS = 20;
const MUSIC_FADE_INTERVAL_MS = 100; // 2 seconds total fade
const MUSIC_MAX_VOLUME = 0.35;
const MUSIC_LOW_VOLUME = 0.07; // ducked under announcement

interface RadioPlayerProps {
  episodeId?: string;
  musicUrl?: string; // looping background music URL (legacy, overridden by YouTube)
  useYouTube?: boolean; // use YouTube as music source
}

export default function RadioPlayer({ episodeId, musicUrl, useYouTube = true }: RadioPlayerProps) {
  const [state, setState] = useState<PlayerState>("idle");
  const [currentText, setCurrentText] = useState(
    "Натисніть ▶ щоб розпочати ефір...",
  );
  const [error, setError] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState(CHANNELS[0].id);
  const [isBetweenSongAnn, setIsBetweenSongAnn] = useState(false);

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const annRef = useRef<HTMLAudioElement | null>(null);
  const betweenSongRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(false);
  const isBetweenSongBusyRef = useRef(false);
  const stateRef = useRef<PlayerState>("idle"); // mirror of state for use inside stable callbacks
  const [ytVolume, setYtVolume] = useState(MUSIC_MAX_VOLUME * 100);
  const [ytPlaying, setYtPlaying] = useState(false);

  // Keep stateRef in sync for stable callbacks
  useEffect(() => { stateRef.current = state; }, [state]);

  // Smoothly change music volume (works for both HTML audio and YouTube)
  const fadeMusicTo = useCallback((targetVolume: number) => {
    if (useYouTube) {
      setYtVolume(targetVolume * 100);
      return;
    }
    const music = musicRef.current;
    if (!music) return;
    const startVol = music.volume;
    const delta = (targetVolume - startVol) / MUSIC_FADE_STEPS;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (!musicRef.current) {
        clearInterval(interval);
        return;
      }
      musicRef.current.volume = Math.max(
        0,
        Math.min(1, startVol + delta * step),
      );
      if (step >= MUSIC_FADE_STEPS) clearInterval(interval);
    }, MUSIC_FADE_INTERVAL_MS);
  }, []);

  const playNextAnnouncement = useCallback(async () => {
    if (!episodeId || !isActiveRef.current) return;

    try {
      const res = await fetch(`/api/queue?episodeId=${episodeId}`);
      const data: QueueItem & { done?: boolean } = await res.json();

      if (data.done || !data.audioUrl) {
        // Queue finished — keep playing music
        setState("playing-music");
        setCurrentText("Ефір закінчено. Слухайте музику...");
        fadeMusicTo(MUSIC_MAX_VOLUME);
        return;
      }

      // Duck music before announcement
      fadeMusicTo(MUSIC_LOW_VOLUME);
      setState("loading-ann");

      const ann = new Audio(data.audioUrl);
      annRef.current = ann;

      ann.onended = () => {
        if (!isActiveRef.current) return;
        // Fade music back up, then play next
        fadeMusicTo(MUSIC_MAX_VOLUME);
        setState("playing-music");
        setCurrentText("🎵 Повідомлення зачитано. Наступне невдовзі...");
        setTimeout(() => {
          if (isActiveRef.current) playNextAnnouncement();
        }, 8000);
      };

      ann.onerror = () => {
        fadeMusicTo(MUSIC_MAX_VOLUME);
        setState("playing-music");
        setTimeout(() => {
          if (isActiveRef.current) playNextAnnouncement();
        }, 5000);
      };

      ann.oncanplay = () => {
        if (!isActiveRef.current) return;
        setState("playing-ann");
        setCurrentText("📻 В ефірі лист від слухача...");
        ann.play().catch(() => setState("error"));
      };

      ann.load();
    } catch {
      setError("Помилка завантаження черги");
      setState("error");
    }
  }, [episodeId, fadeMusicTo]);

  // Called when YouTube starts a new track — play a short Tamara announcement
  const handleTrackChange = useCallback(async () => {
    if (!isActiveRef.current) return;
    if (isBetweenSongBusyRef.current) return;
    if (stateRef.current === "playing-ann") return; // announcement already playing

    isBetweenSongBusyRef.current = true;

    // duck music
    fadeMusicTo(MUSIC_LOW_VOLUME);
    setIsBetweenSongAnn(true);
    setCurrentText("🎙️ Ведуча Тамара...");

    try {
      const phrase = randomPhrase();
      const res = await fetch("/api/tts-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: phrase }),
      });

      if (!res.ok) throw new Error("TTS failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      betweenSongRef.current = audio;

      setCurrentText(`📻 ${phrase}`);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        betweenSongRef.current = null;
        fadeMusicTo(MUSIC_MAX_VOLUME);
        setIsBetweenSongAnn(false);
        isBetweenSongBusyRef.current = false;
        setCurrentText("🎵 Грає музика...");
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        betweenSongRef.current = null;
        fadeMusicTo(MUSIC_MAX_VOLUME);
        setIsBetweenSongAnn(false);
        isBetweenSongBusyRef.current = false;
      };

      await audio.play();
    } catch {
      // TTS failed gracefully — restore music and continue
      fadeMusicTo(MUSIC_MAX_VOLUME);
      setIsBetweenSongAnn(false);
      isBetweenSongBusyRef.current = false;
    }
  }, [fadeMusicTo]); // stable — state accessed via stateRef

  const startRadio = useCallback(async () => {
    if (state !== "idle" && state !== "error") return;
    setError("");
    isActiveRef.current = true;

    // YouTube music mode
    if (useYouTube) {
      setYtPlaying(true);
      setState("playing-music");
      const ch = CHANNELS.find((c) => c.id === selectedChannelId) ?? CHANNELS[0];
      setCurrentText(`🎵 Ефір розпочато! Канал: ${ch.emoji} ${ch.name}`);
      if (episodeId) setTimeout(() => playNextAnnouncement(), 5000);
      return;
    }

    // Start background music
    if (musicUrl) {
      const music = new Audio(musicUrl);
      music.loop = true;
      music.volume = 0;
      musicRef.current = music;
      setState("loading-music");
      setCurrentText("🎵 Завантаження музики...");

      music.oncanplay = () => {
        if (!isActiveRef.current) return;
        setState("playing-music");
        setCurrentText("🎵 Ефір розпочато! Зараз грає музика...");
        music
          .play()
          .then(() => fadeMusicTo(MUSIC_MAX_VOLUME))
          .catch(() => {});
        if (episodeId) {
          setTimeout(() => playNextAnnouncement(), 3000);
        }
      };
      music.onerror = () => {
        // Music failed — continue without it
        setState("playing-music");
        setCurrentText("📻 Ефір розпочато (без музики)...");
        if (episodeId) playNextAnnouncement();
      };
      music.load();
    } else {
      setState("playing-music");
      setCurrentText("📻 Ефір розпочато...");
      if (episodeId) playNextAnnouncement();
    }
  }, [state, musicUrl, episodeId, fadeMusicTo, playNextAnnouncement]);

  const stopRadio = useCallback(() => {
    isActiveRef.current = false;
    isBetweenSongBusyRef.current = false;
    setYtPlaying(false);
    setIsBetweenSongAnn(false);
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current = null;
    }
    if (annRef.current) {
      annRef.current.pause();
      annRef.current = null;
    }
    if (betweenSongRef.current) {
      betweenSongRef.current.pause();
      betweenSongRef.current = null;
    }
    setState("idle");
    setCurrentText("Натисніть ▶ щоб розпочати ефір...");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
    };
  }, []);

  const isPlaying = state === "playing-music" || state === "playing-ann";
  const isLoading = state === "loading-music" || state === "loading-ann";

  // Switch channel only when radio is stopped (or restart it)
  const handleChannelSelect = useCallback(
    (channelId: string) => {
      if (selectedChannelId === channelId) return;
      if (isPlaying || isLoading) {
        stopRadio();
      }
      setSelectedChannelId(channelId);
    },
    [selectedChannelId, isPlaying, isLoading, stopRadio],
  );

  const uaChannels = CHANNELS.filter((c) => c.country === "ua");
  const worldChannels = CHANNELS.filter((c) => c.country === "world");

  return (
    <div className="w-full max-w-lg flex flex-col gap-4">

      {/* ── Aggressor countries notice ─────────────────────────────── */}
      <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3 text-xs text-yellow-800 font-mono leading-snug flex gap-2 items-start">
        <span className="text-base mt-0.5">⚠️</span>
        <span>
          Наш ефір <strong>не транслює</strong> музику Росії та Білорусі —
          країн-агресорів, що розв'язали збройну агресію проти України.
          Тільки українська та світова музика.
        </span>
      </div>

      {/* ── Channel selector ───────────────────────────────────────── */}
      <div className="bg-amber-100 rounded-xl p-3 border border-amber-200">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">
          🎚 Канал
        </p>
        <div className="flex flex-col gap-2">
          {/* Ukrainian channels */}
          <div>
            <p className="text-xs text-amber-500 font-mono mb-1">🇺🇦 Українська музика</p>
            <div className="flex flex-wrap gap-1.5">
              {uaChannels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => handleChannelSelect(ch.id)}
                  title={ch.description}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    selectedChannelId === ch.id
                      ? "bg-amber-700 text-amber-100 border-amber-700 shadow-md"
                      : "bg-white text-amber-800 border-amber-300 hover:bg-amber-50"
                  }`}
                >
                  {ch.emoji} {ch.name}
                </button>
              ))}
            </div>
          </div>
          {/* World channels */}
          <div>
            <p className="text-xs text-amber-500 font-mono mb-1">🌍 Зарубіжна музика</p>
            <div className="flex flex-wrap gap-1.5">
              {worldChannels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => handleChannelSelect(ch.id)}
                  title={ch.description}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    selectedChannelId === ch.id
                      ? "bg-amber-700 text-amber-100 border-amber-700 shadow-md"
                      : "bg-white text-amber-800 border-amber-300 hover:bg-amber-50"
                  }`}
                >
                  {ch.emoji} {ch.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Radio display ──────────────────────────────────────────── */}
      <div className="bg-amber-900 rounded-2xl p-6 shadow-2xl border-4 border-amber-700 select-none">
        {/* Faux LED display */}
        <div className="bg-black rounded-lg px-4 py-3 mb-5 min-h-[60px] flex items-center border border-amber-800">
          <p className="text-amber-400 font-mono text-sm leading-snug tracking-wide">
            {isLoading ? (
              <span className="animate-pulse">{currentText}</span>
            ) : (
              currentText
            )}
          </p>
        </div>

        {/* Frequency bar (decorative) */}
        {isPlaying && (
          <div className="flex items-end gap-0.5 h-8 mb-4 justify-center">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-amber-400 rounded-sm"
                style={{
                  height: `${12 + Math.sin(i * 0.8) * 8}px`,
                  opacity: 0.6 + Math.random() * 0.4,
                  animation: `pulse ${0.4 + (i % 3) * 0.2}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        )}
        {!isPlaying && !isLoading && (
          <div className="flex items-end gap-0.5 h-8 mb-4 justify-center opacity-20">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-amber-400 rounded-sm"
                style={{ height: "8px" }}
              />
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-4 justify-center">
          {!isPlaying && !isLoading ? (
            <button
              onClick={startRadio}
              className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-400 text-amber-950 text-2xl font-bold flex items-center justify-center shadow-lg active:scale-95 transition-all"
              title="Увімкнути ефір"
            >
              ▶
            </button>
          ) : (
            <button
              onClick={stopRadio}
              className="w-16 h-16 rounded-full bg-amber-700 hover:bg-amber-600 text-amber-100 text-xl font-bold flex items-center justify-center shadow-lg active:scale-95 transition-all"
              title="Зупинити ефір"
            >
              ■
            </button>
          )}
        </div>

        {error && (
          <p className="mt-3 text-red-400 text-xs text-center font-mono">
            {error}
          </p>
        )}
      </div>

      {/* Status label */}
      <p className="text-center text-xs text-amber-700 mt-3 font-mono tracking-wide uppercase">
        {state === "playing-ann" || isBetweenSongAnn
          ? "🔴 ON AIR — Ведуча Тамара"
          : state === "playing-music"
            ? "🟢 LIVE — Музичний ефір"
            : "⚫ OFF"}
      </p>

      {/* Hidden YouTube player for background music */}
      {useYouTube && (
        <YouTubeRadio
          key={selectedChannelId}
          playing={ytPlaying}
          volume={ytVolume}
          channelId={selectedChannelId}
          onReady={() => {
            if (isActiveRef.current) {
              const ch = CHANNELS.find((c) => c.id === selectedChannelId) ?? CHANNELS[0];
              setCurrentText(`🎵 Ефір розпочато! Канал: ${ch.emoji} ${ch.name}`);
            }
          }}
          onTrackChange={handleTrackChange}
        />
      )}
    </div>
  );
}
