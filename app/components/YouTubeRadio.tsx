"use client";

import { useEffect, useRef, useCallback } from "react";
import { CHANNELS, channelFirstVideo, channelPlaylist } from "@/lib/channels";

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
  volume: number;
  channelId?: string;
  onReady?: () => void;
  onTrackChange?: () => void;
}

export default function YouTubeRadio({ playing, volume, channelId, onReady, onTrackChange }: Props) {
  const playerRef = useRef<YoutubePlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);
  const isFirstPlayRef = useRef(true);

  const playingRef = useRef(playing);
  const volumeRef = useRef(volume);
  const onReadyRef = useRef(onReady);
  const onTrackChangeRef = useRef(onTrackChange);
  const channelIdRef = useRef(channelId);

  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onTrackChangeRef.current = onTrackChange; }, [onTrackChange]);
  useEffect(() => { channelIdRef.current = channelId; }, [channelId]);

  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    try { playerRef.current.setVolume(volume); } catch { /* ignore */ }
  }, [volume]);

  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    try {
      if (playing) { playerRef.current.playVideo(); }
      else { playerRef.current.pauseVideo(); }
    } catch { /* ignore */ }
  }, [playing]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initPlayer = useCallback(() => {
    if (!containerRef.current || playerRef.current) return;
    const ch = CHANNELS.find((c) => c.id === channelIdRef.current) ?? CHANNELS[0];

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: "1",
      width: "1",
      videoId: channelFirstVideo(ch),
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        playlist: channelPlaylist(ch),
        loop: 1,
        mute: 0,
      },
      events: {
        onReady: (e: { target: YoutubePlayer }) => {
          readyRef.current = true;
          playerRef.current = e.target;
          try { e.target.setVolume(volumeRef.current); } catch { /* ignore */ }
          if (playingRef.current) {
            try { e.target.playVideo(); } catch { /* ignore */ }
          }
          onReadyRef.current?.();
        },
        onStateChange: (e: { data: number }) => {
          if (e.data === window.YT.PlayerState.ENDED) {
            try { playerRef.current?.nextVideo(); } catch { /* ignore */ }
          }
          if (e.data === window.YT.PlayerState.PLAYING) {
            if (isFirstPlayRef.current) { isFirstPlayRef.current = false; }
            else { onTrackChangeRef.current?.(); }
          }
        },
        onError: () => {
          try { playerRef.current?.nextVideo(); } catch { /* ignore */ }
        },
      },
    });
  }, []); // stable — all values via refs

  useEffect(() => {
    if (typeof window !== "undefined" && window.YT?.Player) {
      initPlayer();
      return;
    }
    window.onYouTubeIframeAPIReady = initPlayer;
    if (!document.getElementById("yt-iframe-api")) {
      const script = document.createElement("script");
      script.id = "yt-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
    return () => {
      try { playerRef.current?.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
      readyRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{ position: "fixed", top: -9999, left: -9999, width: 1, height: 1, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <div ref={containerRef} />
    </div>
  );
}
