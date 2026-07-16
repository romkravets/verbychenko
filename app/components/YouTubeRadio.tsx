"use client";

import {
  type Channel,
  channelFirstVideo,
  channelPickPlaylist,
  channelPlaylist,
  CHANNELS,
} from "@/lib/channels";
import { useCallback, useEffect, useRef } from "react";

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
  playVideoAt: (index: number) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaylistIndex: () => number;
  destroy: () => void;
}

const posKey = (channelId: string) => `yt_pos_${channelId}`;

interface Props {
  playing: boolean;
  volume: number;
  channelId?: string;
  channels?: Channel[];
  onReady?: () => void;
  onTrackChange?: () => void;
  /** Called every second while playing: (currentSec, durationSec) */
  onTimeUpdate?: (current: number, duration: number) => void;
}

export default function YouTubeRadio({
  playing,
  volume,
  channelId,
  channels,
  onReady,
  onTrackChange,
  onTimeUpdate,
}: Props) {
  const sourceChannels = channels?.length ? channels : CHANNELS;
  const channelsRef = useRef(sourceChannels);
  const playerRef = useRef<YoutubePlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);
  const isFirstPlayRef = useRef(true);
  const pendingSeekRef = useRef<number | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  const playingRef = useRef(playing);
  const volumeRef = useRef(volume);
  const onReadyRef = useRef(onReady);
  const onTrackChangeRef = useRef(onTrackChange);
  const channelIdRef = useRef(channelId);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    onTrackChangeRef.current = onTrackChange;
  }, [onTrackChange]);
  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);
  useEffect(() => {
    channelsRef.current = sourceChannels;
  }, [sourceChannels]);

  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    try {
      playerRef.current.setVolume(volume);
    } catch {
      /* ignore */
    }
  }, [volume]);

  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    try {
      if (playing) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch {
      /* ignore */
    }
  }, [playing]);

  const initPlayer = useCallback(() => {
    if (!containerRef.current || playerRef.current) return;
    const localChannels = channelsRef.current;
    const ch =
      localChannels.find((c) => c.id === channelIdRef.current) ??
      localChannels[0];

    const pid = channelPickPlaylist(ch);

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: "1",
      width: "1",
      // When using a playlist ID, leave videoId empty — YouTube picks the first track
      videoId: pid ? "" : channelFirstVideo(ch),
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        // YouTube Music / YouTube playlist mode
        ...(pid
          ? { list: pid, listType: "playlist" }
          : { playlist: channelPlaylist(ch), loop: 1 }),
        mute: 0,
        vq: "tiny", // forces lowest video quality (176×144) — minimal video buffer
        playsinline: 1, // prevent iOS fullscreen (saves battery/memory)
      },
      events: {
        onReady: (e: { target: YoutubePlayer }) => {
          readyRef.current = true;
          playerRef.current = e.target;
          try {
            e.target.setVolume(volumeRef.current);
          } catch {
            /* ignore */
          }

          // Restore saved position from localStorage
          try {
            const saved = localStorage.getItem(
              posKey(channelIdRef.current ?? localChannels[0].id),
            );
            if (saved) {
              const { index, time } = JSON.parse(saved) as {
                index: number;
                time: number;
              };
              if (index > 0) {
                pendingSeekRef.current = time;
                e.target.playVideoAt(index);
              } else if (time > 30) {
                // Same track (index 0) but not at the start
                pendingSeekRef.current = time;
              }
            }
          } catch {
            /* ignore */
          }

          if (playingRef.current) {
            try {
              e.target.playVideo();
            } catch {
              /* ignore */
            }
          }
          onReadyRef.current?.();

          // Tick every second to expose current time + duration
          timeIntervalRef.current = setInterval(() => {
            if (!playerRef.current || !playingRef.current) return;
            try {
              const cur = playerRef.current.getCurrentTime();
              const dur = playerRef.current.getDuration();
              if (dur > 0)
                onTimeUpdateRef.current?.(Math.floor(cur), Math.floor(dur));
            } catch {
              /* ignore */
            }
          }, 1000);

          // Save position every 5 seconds while the tab is alive
          saveIntervalRef.current = setInterval(() => {
            if (!playerRef.current || !playingRef.current) return;
            try {
              const idx = playerRef.current.getPlaylistIndex();
              const t = Math.floor(playerRef.current.getCurrentTime());
              const ch = channelIdRef.current ?? localChannels[0].id;
              localStorage.setItem(
                posKey(ch),
                JSON.stringify({ index: idx, time: t }),
              );
            } catch {
              /* ignore */
            }
          }, 5000);
        },
        onStateChange: (e: { data: number }) => {
          if (e.data === window.YT.PlayerState.ENDED) {
            try {
              playerRef.current?.nextVideo();
            } catch {
              /* ignore */
            }
          }
          if (e.data === window.YT.PlayerState.PLAYING) {
            // Restore time position after playVideoAt (seek must wait until PLAYING)
            if (pendingSeekRef.current !== null) {
              const t = pendingSeekRef.current;
              pendingSeekRef.current = null;
              try {
                playerRef.current?.seekTo(t, true);
              } catch {
                /* ignore */
              }
            }
            if (isFirstPlayRef.current) {
              isFirstPlayRef.current = false;
            } else {
              onTrackChangeRef.current?.();
            }
          }
        },
        onError: () => {
          try {
            playerRef.current?.nextVideo();
          } catch {
            /* ignore */
          }
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
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      readyRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        position: "fixed",
        top: -9999,
        left: -9999,
        width: 1,
        height: 1,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <div ref={containerRef} />
    </div>
  );
}
