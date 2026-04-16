"use client";

import { useEffect, useRef, useCallback } from "react";

// Ukrainian folk music playlists (public YouTube playlists)
const PLAYLISTS = [
  "PLz7GgOB_9OBiVpOgSNXm-B-3wd9XVXTDO", // Народні пісні
];

declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLElement | string, opts: object) => YoutubePlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YoutubePlayer {
  setVolume: (v: number) => void;
  getVolume: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  nextVideo: () => void;
  destroy: () => void;
}

interface Props {
  playing: boolean;
  volume: number; // 0-100
  onReady?: () => void;
}

export default function YouTubeRadio({ playing, volume, onReady }: Props) {
  const playerRef = useRef<YoutubePlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);

  const initPlayer = useCallback(() => {
    if (!containerRef.current || playerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: "1",
      width: "1",
      // Реальний відеоID — українська народна музика (замінити на свій плейлист)
      videoId: "K5KAc5CoCuk",
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        loop: 1,
        playlist: "K5KAc5CoCuk", // loop потребує playlist з тим самим ID
        mute: 0,
      },
      events: {
        onReady: (e: { target: YoutubePlayer }) => {
          readyRef.current = true;
          playerRef.current = e.target;
          if (typeof e.target.setVolume === "function") e.target.setVolume(volume);
          onReady?.();
        },
        onStateChange: (e: { data: number }) => {
          // Auto-play next track when current ends
          if (e.data === window.YT.PlayerState.ENDED) {
            playerRef.current?.nextVideo();
          }
        },
        onError: () => {
          // Skip errored video
          playerRef.current?.nextVideo();
        },
      },
    });
  }, [volume, onReady]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT?.Player) {
      initPlayer();
      return;
    }

    window.onYouTubeIframeAPIReady = initPlayer;

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [initPlayer]);

  // Control playback
  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    const player = playerRef.current;
    if (typeof player.playVideo !== "function") return;
    if (playing) {
      player.playVideo();
    } else {
      player.pauseVideo();
    }
  }, [playing]);

  // Control volume
  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    const player = playerRef.current;
    if (typeof player.setVolume !== "function") return;
    player.setVolume(volume);
  }, [volume]);

  // Hidden iframe container
  return (
    <div
      style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none", overflow: "hidden" }}
      aria-hidden="true"
    >
      <div ref={containerRef} />
    </div>
  );
}
