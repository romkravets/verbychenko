"use client";
import { CHANNELS, type Channel } from "@/lib/channels";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type RadioPhase =
  | "idle"
  | "starting"
  | "music"
  | "insert"
  | "news"
  | "announcement";

export interface RadioContextValue {
  channels: Channel[];
  playing: boolean;
  phase: RadioPhase;
  channelId: string;
  volume: number; // 0-100
  currentLabel: string;
  ytPlaying: boolean;
  ytVolume: number; // 0-100
  start: () => void;
  stop: () => void;
  setChannel: (id: string) => void;
  setVolume: (v: number) => void;
  setLabel: (t: string) => void;
  setPhase: (p: RadioPhase) => void;
  setYtPlaying: (b: boolean) => void;
  setYtVolume: (v: number) => void;
  onTrackChange: React.RefObject<(() => void) | null>;
  onReady: React.RefObject<(() => void) | null>;
}

const RadioContext = createContext<RadioContextValue | null>(null);

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be inside RadioProvider");
  return ctx;
}

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const [channels, setChannels] = useState<Channel[]>(CHANNELS);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState<RadioPhase>("idle");
  const [channelId, setChannelId] = useState(CHANNELS[0].id);
  const [volume, setVolume] = useState(35);
  const [currentLabel, setCurrentLabel] = useState(
    "Натисніть ▶ щоб розпочати ефір",
  );
  const [ytPlaying, setYtPlaying] = useState(false);
  const [ytVolume, setYtVolume] = useState(35);

  // Refs for callbacks passed into YouTubeRadio — avoids re-init
  const onTrackChange = useRef<(() => void) | null>(null);
  const onReady = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadChannels = async () => {
      try {
        const res = await fetch("/api/channels", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { channels?: Channel[] };
        if (
          !cancelled &&
          Array.isArray(data.channels) &&
          data.channels.length
        ) {
          const nextChannels = data.channels;
          setChannels(nextChannels);
          setChannelId((prev) =>
            nextChannels.some((c) => c.id === prev) ? prev : nextChannels[0].id,
          );
        }
      } catch {
        /* keep env channels */
      }
    };

    loadChannels();
    return () => {
      cancelled = true;
    };
  }, []);

  const start = useCallback(() => {
    setPlaying(true);
    setYtPlaying(true);
    setPhase("music");
    setCurrentLabel("🎵 Ефір розпочато...");
  }, []);

  const stop = useCallback(() => {
    setPlaying(false);
    setYtPlaying(false);
    setPhase("idle");
    setCurrentLabel("Натисніть ▶ щоб розпочати ефір");
  }, []);

  const setChannel = useCallback(
    (id: string) => {
      const ch = channels.find((c: Channel) => c.id === id);
      if (!ch) return;
      setChannelId(id);
    },
    [channels],
  );

  const setLabel = useCallback((t: string) => setCurrentLabel(t), []);

  return (
    <RadioContext.Provider
      value={{
        channels,
        playing,
        phase,
        channelId,
        volume,
        currentLabel,
        ytPlaying,
        ytVolume,
        start,
        stop,
        setChannel,
        setVolume: (v) => setVolume(v),
        setLabel,
        setPhase,
        setYtPlaying,
        setYtVolume,
        onTrackChange,
        onReady,
      }}
    >
      {children}
    </RadioContext.Provider>
  );
}
