"use client";

import { useEffect, useRef } from "react";

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

interface Props {
  announcement: FeaturedAnnouncement;
  onClose: () => void;
}

export default function AnnouncementSplash({ announcement, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Auto-close after 30 s
  useEffect(() => {
    const t = setTimeout(onClose, 30_000);
    return () => clearTimeout(t);
  }, [onClose]);

  const isCommercial = announcement.type === "COMMERCIAL";

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(4px)" }}
    >
      {/* Card */}
      <div
        className={`
        relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden
        border-4 animate-[fadeInScale_0.35s_ease-out_both]
        ${
          isCommercial
            ? "bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900 border-amber-500"
            : "bg-gradient-to-br from-rose-950 via-amber-950 to-rose-950 border-rose-400"
        }
      `}
        style={{ animation: "fadeInScale 0.35s ease-out both" }}
      >
        {/* Morse-code decorative line */}
        <div
          className="h-1 w-full"
          style={{
            background: isCommercial
              ? "repeating-linear-gradient(90deg,#f59e0b 0,#f59e0b 12px,transparent 12px,transparent 20px)"
              : "repeating-linear-gradient(90deg,#fb7185 0,#fb7185 12px,transparent 12px,transparent 20px)",
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full animate-pulse ${isCommercial ? "bg-amber-400" : "bg-rose-400"}`}
            />
            <span
              className={`text-xs font-mono tracking-[0.3em] uppercase font-bold ${isCommercial ? "text-amber-400" : "text-rose-300"}`}
            >
              {isCommercial
                ? "🛒 Оголошення про продаж"
                : "💌 Програма знайомств"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 text-2xl leading-none transition"
            aria-label="Закрити"
          >
            ×
          </button>
        </div>

        {/* Retro tape header */}
        <div className="px-8 pb-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-mono">
            <span>▶▶</span>
            <span className="flex-1 border-t border-dashed border-gray-700" />
            <span>Радіо Вербиченько</span>
            <span className="flex-1 border-t border-dashed border-gray-700" />
            <span>◀◀</span>
          </div>
        </div>

        {/* Main content */}
        <div className="px-8 pb-6">
          {/* Commercial meta */}
          {isCommercial && announcement.itemTitle && (
            <div className="mb-4">
              <h2 className="text-amber-300 text-2xl font-bold leading-tight">
                {announcement.itemTitle}
              </h2>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-amber-500 font-mono">
                {announcement.price && <span>💰 {announcement.price}</span>}
                {announcement.city && <span>📍 {announcement.city}</span>}
                {announcement.contactPhone && (
                  <span>📞 {announcement.contactPhone}</span>
                )}
              </div>
            </div>
          )}

          {/* Dating meta */}
          {!isCommercial && (
            <div className="mb-3 text-rose-300 font-mono text-sm">
              📮 Лист із {announcement.city}
            </div>
          )}

          {/* AI text — big */}
          {announcement.aiText && (
            <blockquote
              className={`text-lg md:text-xl leading-relaxed italic font-serif ${isCommercial ? "text-amber-100" : "text-rose-100"}`}
            >
              «{announcement.aiText}»
            </blockquote>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-8 py-4 flex items-center justify-between border-t ${isCommercial ? "border-amber-900 bg-amber-950/60" : "border-rose-900 bg-rose-950/60"}`}
        >
          <span className="text-xs text-gray-500 font-mono">
            Подати власне оголошення → /submit
          </span>
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
              isCommercial
                ? "bg-amber-500 hover:bg-amber-400 text-amber-950"
                : "bg-rose-500 hover:bg-rose-400 text-white"
            }`}
          >
            Закрити
          </button>
        </div>

        {/* Bottom morse line */}
        <div
          className="h-1 w-full"
          style={{
            background: isCommercial
              ? "repeating-linear-gradient(90deg,#f59e0b 0,#f59e0b 4px,transparent 4px,transparent 10px)"
              : "repeating-linear-gradient(90deg,#fb7185 0,#fb7185 4px,transparent 4px,transparent 10px)",
          }}
        />
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.92) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
