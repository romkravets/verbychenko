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
  const [secret, setSecret] = useState("");
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
    setSecret(inputSecret);
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
      <div className="min-h-screen bg-amber-950 flex items-center justify-center">
        <div className="bg-amber-900 rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-amber-700">
          <h1 className="text-amber-200 text-lg font-mono font-bold mb-4 text-center">
            🔐 Адмін-панель
          </h1>
          <input
            type="password"
            placeholder="Секретний ключ"
            value={inputSecret}
            onChange={(e) => setInputSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full bg-amber-950 text-amber-200 border border-amber-700 rounded-lg px-3 py-2 text-sm font-mono mb-3"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold rounded-lg px-4 py-2 transition"
          >
            Увійти
          </button>
          {msg && (
            <p className="text-red-400 text-xs mt-3 text-center">{msg}</p>
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
    <div className="min-h-screen bg-amber-950 text-amber-100 p-4 font-mono">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-amber-300">📻 Адмін-панель</h1>
          <div className="flex gap-3">
            <button
              onClick={loadAnnouncements}
              className="text-xs bg-amber-800 hover:bg-amber-700 px-3 py-1.5 rounded-lg"
            >
              🔄 Оновити
            </button>
            <button
              onClick={handleBuildEpisode}
              className="text-xs bg-amber-600 hover:bg-amber-500 text-amber-950 font-bold px-3 py-1.5 rounded-lg"
            >
              📦 Зібрати епізод
            </button>
          </div>
        </div>

        {msg && (
          <div className="bg-amber-900 border border-amber-600 rounded-lg px-4 py-2 text-sm text-amber-300 mb-4">
            {msg}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              label: "Очікують",
              count: pending.length,
              color: "bg-yellow-800",
            },
            {
              label: "Схвалено",
              count: approved.length,
              color: "bg-green-900",
            },
            { label: "Відхилено", count: rejected.length, color: "bg-red-900" },
          ].map((s) => (
            <div
              key={s.label}
              className={`${s.color} rounded-xl p-4 text-center border border-amber-800`}
            >
              <div className="text-2xl font-bold">{s.count}</div>
              <div className="text-xs text-amber-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* News preview */}
        <div className="bg-amber-900 border border-amber-700 rounded-xl p-4 mb-6">
          <h2 className="text-amber-400 text-sm font-bold mb-2">
            📰 Остання новина (RSS)
          </h2>
          {news?.headline ? (
            <p className="text-amber-200 text-sm">{news.headline}</p>
          ) : (
            <p className="text-amber-600 text-xs">Немає новин</p>
          )}
          <button
            onClick={loadNews}
            className="mt-2 text-xs text-amber-600 hover:text-amber-400"
          >
            ↺ Оновити новину
          </button>
        </div>

        {/* Pending announcements */}
        <h2 className="text-amber-400 text-sm font-bold mb-3">
          📋 Оголошення (очікують)
        </h2>
        {loading && <p className="text-amber-600 text-sm">Завантаження...</p>}
        {pending.length === 0 && !loading && (
          <p className="text-amber-600 text-sm mb-6">
            Немає оголошень на розгляді
          </p>
        )}
        <div className="space-y-3 mb-8">
          {pending.map((a) => (
            <div
              key={a.id}
              className="bg-amber-900 border border-amber-700 rounded-xl p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-amber-300 font-bold">{a.name}</span>
                  <span className="text-amber-600 text-xs ml-2">
                    {a.age} р., {a.city}
                  </span>
                </div>
                <span className="text-xs text-amber-700">
                  {new Date(a.createdAt).toLocaleDateString("uk-UA")}
                </span>
              </div>
              {a.aiText && (
                <p className="text-amber-200 text-xs mb-3 leading-relaxed italic">
                  «{a.aiText.slice(0, 200)}
                  {a.aiText.length > 200 ? "..." : ""}»
                </p>
              )}
              {a.audioUrl && (
                <audio src={a.audioUrl} controls className="w-full mb-2 h-8" />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusChange(a.id, "APPROVED")}
                  className="flex-1 bg-green-800 hover:bg-green-700 text-green-200 text-xs px-3 py-1.5 rounded-lg font-bold"
                >
                  ✅ Схвалити
                </button>
                <button
                  onClick={() => handleStatusChange(a.id, "REJECTED")}
                  className="flex-1 bg-red-900 hover:bg-red-800 text-red-300 text-xs px-3 py-1.5 rounded-lg"
                >
                  ❌ Відхилити
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Approved list */}
        {approved.length > 0 && (
          <>
            <h2 className="text-amber-400 text-sm font-bold mb-3">
              ✅ Схвалені
            </h2>
            <div className="space-y-2 mb-8">
              {approved.map((a) => (
                <div
                  key={a.id}
                  className="bg-amber-950 border border-green-900 rounded-lg px-4 py-2 flex justify-between items-center"
                >
                  <span className="text-amber-300 text-sm">
                    {a.name}, {a.age} р., {a.city}
                  </span>
                  <button
                    onClick={() => handleStatusChange(a.id, "REJECTED")}
                    className="text-xs text-red-600 hover:text-red-400"
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
