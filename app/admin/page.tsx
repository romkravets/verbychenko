"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SECRET_KEY = "radio_admin_secret";

type Announcement = {
  id: string;
  name: string;
  age: number;
  city: string;
  about: string;
  lookingFor: string;
  aiText: string | null;
  status: string;
  audioUrl: string | null;
  createdAt: string;
};

type NewsHeadline = { headline?: string; error?: string };

export default function AdminPage() {
  const [inputSecret, setInputSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [news, setNews] = useState<NewsHeadline | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const secretRef = useRef("");

  useEffect(() => {
    const saved = sessionStorage.getItem(SECRET_KEY) ?? "";
    setInputSecret(saved);
  }, []);

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      "x-admin-secret": secretRef.current,
    }),
    [],
  );

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        headers: headers(),
      });
      if (res.status === 401) {
        setMsg("❌ Невірний пароль");
        setAuthed(false);
        return;
      }
      const data = (await res.json()) as { announcements: Announcement[] };
      setAnnouncements(data.announcements);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const loadNews = useCallback(async () => {
    const res = await fetch("/api/rss-news");
    const data = (await res.json()) as NewsHeadline;
    setNews(data);
  }, []);

  const handleLogin = () => {
    secretRef.current = inputSecret;
    sessionStorage.setItem(SECRET_KEY, inputSecret);
    setAuthed(true);
    loadAnnouncements();
    loadNews();
  };

  const handleStatusChange = async (
    id: string,
    status: "APPROVED" | "REJECTED",
  ) => {
    await fetch("/api/admin/announcements", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ id, status }),
    });
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a)),
    );
    setMsg(`✅ ${id.slice(0, 8)} → ${status}`);
  };

  const handleBuildEpisode = async () => {
    setMsg("⏳ Збираємо епізод...");
    const res = await fetch("/api/episode/build", {
      method: "POST",
      headers: headers(),
    });
    const data = (await res.json()) as { episodeId?: string; error?: string };
    setMsg(
      data.episodeId
        ? `✅ Епізод створено: ${data.episodeId}`
        : `❌ ${data.error}`,
    );
  };

  // ── Auth screen ───────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
        <div
          className="border border-white/10 bg-white/5 backdrop-blur-sm p-8 w-full max-w-sm"
          style={{ borderRadius: "10px" }}
        >
          <p className="text-[11px] font-mono tracking-widest uppercase text-[#6d6d6d] mb-2 text-center">
            Радіо Вербиченька
          </p>
          <h1 className="text-[24px] font-light text-white mb-6 text-center leading-[1.2]">
            Адмін-панель
          </h1>
          <input
            type="password"
            placeholder="Секретний ключ"
            value={inputSecret}
            onChange={(e) => setInputSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full px-3 py-2.5 bg-black/30 border border-white/10 text-white placeholder:text-[#6d6d6d] text-[14px] font-mono focus:outline-none focus:border-white/30 transition mb-3"
            style={{ borderRadius: "6px" }}
          />
          <button
            onClick={handleLogin}
            className="w-full py-2.5 bg-white/10 border border-white/20 text-white text-[13px] font-mono tracking-widest uppercase hover:bg-white/15 transition"
            style={{ borderRadius: "75.024px" }}
          >
            Увійти
          </button>
          {msg && (
            <p className="text-red-400 text-[12px] font-mono mt-3 text-center">
              {msg}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Admin dashboard ───────────────────────────────────────────────────────
  const pending = announcements.filter((a) => a.status === "PENDING");
  const approved = announcements.filter((a) => a.status === "APPROVED");
  const rejected = announcements.filter((a) => a.status === "REJECTED");

  return (
    <div className="min-h-screen bg-[#000000] text-white py-10 px-4 font-mono">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[11px] tracking-widest uppercase text-[#6d6d6d] mb-1">
              Радіо Вербиченька
            </p>
            <h1 className="text-[29px] font-light text-white leading-[1.15]">
              Адмін-панель
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadAnnouncements}
              className="text-[11px] tracking-widest uppercase border border-white/10 text-[#6d6d6d] hover:text-white hover:border-white/30 px-4 py-2 transition"
              style={{ borderRadius: "75.024px" }}
            >
              Оновити
            </button>
            <button
              onClick={handleBuildEpisode}
              className="text-[11px] tracking-widest uppercase border border-white/20 bg-white/10 text-white hover:bg-white/15 px-4 py-2 transition"
              style={{ borderRadius: "75.024px" }}
            >
              Епізод
            </button>
          </div>
        </div>

        {msg && (
          <div
            className="border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] text-[#6d6d6d] mb-6"
            style={{ borderRadius: "10px" }}
          >
            {msg}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Очікують", count: pending.length },
            { label: "Схвалено", count: approved.length },
            { label: "Відхилено", count: rejected.length },
          ].map((s) => (
            <div
              key={s.label}
              className="border border-white/10 bg-white/5 p-4 text-center"
              style={{ borderRadius: "10px" }}
            >
              <div className="text-[29px] font-light text-white">{s.count}</div>
              <div className="text-[11px] tracking-widest uppercase text-[#6d6d6d] mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* News preview */}
        <div
          className="border border-white/10 bg-white/5 p-4 mb-8"
          style={{ borderRadius: "10px" }}
        >
          <p className="text-[11px] tracking-widest uppercase text-[#6d6d6d] mb-2">
            Остання новина (RSS)
          </p>
          {news?.headline ? (
            <p className="text-white text-[14px] leading-relaxed">
              {news.headline}
            </p>
          ) : (
            <p className="text-[#6d6d6d] text-[13px]">Немає новин</p>
          )}
          <button
            onClick={loadNews}
            className="mt-3 text-[11px] tracking-widest uppercase text-[#6d6d6d] hover:text-white transition"
          >
            ↺ Оновити
          </button>
        </div>

        {/* Pending announcements */}
        <p className="text-[11px] tracking-widest uppercase text-[#6d6d6d] mb-3">
          Очікують розгляду
        </p>
        {loading && (
          <p className="text-[#6d6d6d] text-[13px] mb-4">Завантаження...</p>
        )}
        {pending.length === 0 && !loading && (
          <p className="text-[#6d6d6d] text-[13px] mb-8">
            Немає оголошень на розгляді
          </p>
        )}
        <div className="space-y-3 mb-10">
          {pending.map((a) => (
            <div
              key={a.id}
              className="border border-white/10 bg-white/5 p-4"
              style={{ borderRadius: "10px" }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-white font-normal">{a.name}</span>
                  <span className="text-[#6d6d6d] text-[12px] ml-2">
                    {a.age} р., {a.city}
                  </span>
                </div>
                <span className="text-[11px] text-[#6d6d6d]">
                  {new Date(a.createdAt).toLocaleDateString("uk-UA")}
                </span>
              </div>
              {a.aiText && (
                <p className="text-white/70 text-[13px] mb-3 leading-relaxed italic">
                  «{a.aiText.slice(0, 200)}
                  {a.aiText.length > 200 ? "..." : ""}»
                </p>
              )}
              {a.audioUrl && (
                <audio src={a.audioUrl} controls className="w-full mb-3 h-8" />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusChange(a.id, "APPROVED")}
                  className="flex-1 border border-white/20 text-white text-[11px] tracking-widest uppercase px-3 py-2 hover:bg-white/10 transition"
                  style={{ borderRadius: "75.024px" }}
                >
                  Схвалити
                </button>
                <button
                  onClick={() => handleStatusChange(a.id, "REJECTED")}
                  className="flex-1 border border-red-900/40 text-red-400 text-[11px] tracking-widest uppercase px-3 py-2 hover:bg-red-900/20 transition"
                  style={{ borderRadius: "75.024px" }}
                >
                  Відхилити
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Approved list */}
        {approved.length > 0 && (
          <>
            <p className="text-[11px] tracking-widest uppercase text-[#6d6d6d] mb-3">
              Схвалені
            </p>
            <div className="space-y-2 mb-8">
              {approved.map((a) => (
                <div
                  key={a.id}
                  className="border border-white/10 bg-white/5 px-4 py-2.5 flex justify-between items-center"
                  style={{ borderRadius: "10px" }}
                >
                  <span className="text-white text-[14px]">
                    {a.name}, {a.age} р., {a.city}
                  </span>
                  <button
                    onClick={() => handleStatusChange(a.id, "REJECTED")}
                    className="text-[11px] text-[#6d6d6d] hover:text-red-400 transition"
                  >
                    Скасувати
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
