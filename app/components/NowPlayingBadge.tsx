"use client";
import { useRadio } from "@/app/context/RadioContext";
import { CHANNELS } from "@/lib/channels";

export default function NowPlayingBadge() {
  const radio = useRadio();

  return (
    <div
      className="border border-white/10 bg-white/5 backdrop-blur-sm max-w-sm w-full"
      style={{ borderRadius: "10px" }}
    >
      {/* Status row */}
      <div className="flex items-center gap-3 px-5 py-4">
        {/* Play / Stop */}
        <button
          onClick={radio.playing ? radio.stop : radio.start}
          className="w-10 h-10 flex items-center justify-center border border-white/20 text-white hover:bg-white/10 transition active:scale-95 shrink-0 text-lg"
          style={{ borderRadius: "75.024px" }}
          aria-label={radio.playing ? "Зупинити" : "Увімкнути"}
        >
          {radio.playing ? "■" : "▶"}
        </button>

        {/* Label */}
        <div className="flex-1 min-w-0">
          {radio.playing ? (
            <>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
                <span className="text-[11px] font-mono tracking-widest uppercase text-whisper-gray">
                  В ефірі
                </span>
              </div>
              <p className="text-white text-[14px] truncate leading-snug">
                {radio.currentLabel}
              </p>
            </>
          ) : (
            <>
              <p className="text-whisper-gray text-[11px] font-mono tracking-widest uppercase mb-0.5">
                Не в ефірі
              </p>
              <p className="text-white/40 text-[13px]">
                Натисніть ▶ щоб запустити
              </p>
            </>
          )}
        </div>
      </div>

      {/* Channel pills */}
      <div className="border-t border-white/10 px-3 py-2.5 flex gap-1.5 flex-wrap">
        {CHANNELS.map((ch) => {
          const active = radio.channelId === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => {
                radio.setChannel(ch.id);
                if (!radio.playing) radio.start();
              }}
              className={`text-[11px] font-mono px-3 py-1 border transition shrink-0 ${
                active
                  ? "border-white/40 text-white bg-white/10"
                  : "border-white/10 text-whisper-gray hover:text-white hover:border-white/25"
              }`}
              style={{ borderRadius: "75.024px" }}
            >
              {ch.emoji} {ch.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
