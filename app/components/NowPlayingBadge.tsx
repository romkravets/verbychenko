"use client";
import { useRadio } from "@/app/context/RadioContext";

export default function NowPlayingBadge() {
  const radio = useRadio();

  if (!radio.playing) {
    return (
      <div className="text-center">
        <p className="text-amber-600 text-sm mb-3">
          Радіо не грає. Натисніть ▶ внизу екрану.
        </p>
        <button
          onClick={radio.start}
          className="px-6 py-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-semibold shadow-lg transition active:scale-95"
        >
          📻 Увімкнути радіо
        </button>
      </div>
    );
  }

  return (
    <div className="bg-amber-900 rounded-2xl px-6 py-4 text-center shadow-xl border border-amber-700 max-w-sm w-full">
      <div className="flex items-center justify-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
        <span className="text-amber-400 text-xs font-mono tracking-widest uppercase">
          В ефірі
        </span>
      </div>
      <p className="text-amber-200 text-sm truncate max-w-xs mx-auto">
        {radio.currentLabel}
      </p>
      <p className="text-amber-600 text-xs mt-1 font-mono">
        Плеєр внизу екрану ↓
      </p>
    </div>
  );
}
