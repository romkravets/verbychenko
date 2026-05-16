"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CHANNELS, type Channel } from "@/lib/channels";

export type RadioPhase = "idle" | "starting" | "music" | "insert" | "news" | "announcement";

export interface RadioContextValue {
  playing: boolean;
  phase: RadioPhase;
  channelId: string;
  volume: number;          // 0-100
  currentLabel: string;
  ytPlaying: boolean;
  ytVolume: number;        // 0-100
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
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState<RadioPhase>("idle");
  const [channelId, setChannelId] = useState(CHANNELS[0].id);
  const [volume, setVolume] = useState(35);
  const [currentLabel, setCurrentLabel] = useState("Натисніть ▶ щоб розпочати ефір");
  const [ytPlaying, setYtPlaying] = useState(false);
  const [ytVolume, setYtVolume] = useState(35);

  // Refs for callbacks passed into YouTubeRadio — avoids re-init
  const onTrackChange = useRef<(() => void) | null>(null);
  const onReady = useRef<(() => void) | null>(null);

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

  const setChannel = useCallback((id: string) => {
    const ch = CHANNELS.find((c: Channel) => c.id === id);
    if (!ch) return;
    setChannelId(id);
  }, []);

  const setLabel = useCallback((t: string) => setCurrentLabel(t), []);

  return (
    <RadioContext.Provider value={{
      playing, phase, channelId, volume, currentLabel,
      ytPlaying, ytVolume,
      start, stop, setChannel, setVolume: (v) => setVolume(v),
      setLabel, setPhase, setYtPlaying, setYtVolume,
      onTrackChange, onReady,
    }}>
      {children}
    </RadioContext.Provider>
  );
}
