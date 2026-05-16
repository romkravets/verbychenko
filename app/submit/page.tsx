"use client";

import { useState } from "react";

type Step = "form" | "preview" | "done";
type AnnouncementType = "DATING" | "COMMERCIAL";
type AudioState = "idle" | "loading" | "playing" | "error";

interface DatingForm {
  name: string;
  age: string;
  city: string;
  height: string;
  weight: string;
  hairColor: string;
  education: string;
  housing: string;
  about: string;
  lookingFor: string;
}

interface CommercialForm {
  name: string;
  city: string;
  itemTitle: string;
  price: string;
  contactPhone: string;
  about: string;
}

const initialDating: DatingForm = {
  name: "", age: "", city: "", height: "", weight: "",
  hairColor: "", education: "", housing: "", about: "", lookingFor: "",
};

const initialCommercial: CommercialForm = {
  name: "", city: "", itemTitle: "", price: "", contactPhone: "", about: "",
};

export default function SubmitPage() {
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>("DATING");
  const [step, setStep] = useState<Step>("form");
  const [dating, setDating] = useState<DatingForm>(initialDating);
  const [commercial, setCommercial] = useState<CommercialForm>(initialCommercial);
  const [aiText, setAiText] = useState("");
  const [announcementId, setAnnouncementId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  function handleDatingChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setDating({ ...dating, [e.target.name]: e.target.value });
  }
  function handleCommercialChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setCommercial({ ...commercial, [e.target.name]: e.target.value });
  }

  async function playPreview() {
    if (audioState === "loading") return;
    if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
    setAudioState("loading");
    try {
      const res = await fetch("/api/tts-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      if (!res.ok) throw new Error("TTS error");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      setAudioEl(audio);
      audio.onended = () => setAudioState("idle");
      audio.onerror = () => setAudioState("error");
      await audio.play();
      setAudioState("playing");
    } catch {
      setAudioState("error");
    }
  }

  async function handleConfirm() {
    setSendLoading(true);
    setSendError("");
    try {
      const res = await fetch(`/api/announce/${announcementId}/confirm`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "Помилка збереження аудіо");
      }
      setStep("done");
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Щось пішло не так");
    } finally {
      setSendLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload =
      announcementType === "COMMERCIAL"
        ? {
            type: "COMMERCIAL",
            name: commercial.name,
            city: commercial.city,
            itemTitle: commercial.itemTitle,
            price: commercial.price || undefined,
            contactPhone: commercial.contactPhone || undefined,
            about: commercial.about,
          }
        : {
            type: "DATING",
            ...dating,
            age: Number(dating.age),
            height: dating.height ? Number(dating.height) : undefined,
            weight: dating.weight ? Number(dating.weight) : undefined,
          };

    try {
      const res = await fetch("/api/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMsg = "Помилка сервера";
        try {
          const data = (await res.json()) as { error?: string };
          errMsg = data.error || errMsg;
        } catch { /* empty body */ }
        throw new Error(errMsg);
      }

      const data = (await res.json()) as { aiText?: string; id?: string };
      if (!data.aiText || !data.id) throw new Error("Порожня відповідь від сервера");
      setAiText(data.aiText);
      setAnnouncementId(data.id);
      setStep("preview");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Щось пішло не так");
    } finally {
      setLoading(false);
    }
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">📻</div>
          <h2 className="text-2xl font-bold text-amber-900 mb-3">
            {announcementType === "COMMERCIAL" ? "Оголошення надіслано!" : "Лист надіслано!"}
          </h2>
          <p className="text-amber-700">
            Ваше оголошення на розгляді. Після перевірки воно потрапить в ефір.
          </p>
          <button
            onClick={() => { setDating(initialDating); setCommercial(initialCommercial); setStep("form"); setAiText(""); }}
            className="mt-6 px-6 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition"
          >
            Надіслати ще одне
          </button>
        </div>
      </div>
    );
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  if (step === "preview") {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">
              {announcementType === "COMMERCIAL" ? "📢" : "🎙️"}
            </div>
            <h2 className="text-xl font-bold text-amber-900">Ваше оголошення</h2>
            <p className="text-sm text-amber-600 mt-1">Так воно прозвучить в ефірі</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
            <p className="text-amber-900 leading-relaxed italic">{aiText}</p>
          </div>

          <button
            onClick={playPreview}
            disabled={audioState === "loading"}
            className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 bg-amber-100 border border-amber-300 text-amber-800 rounded-lg hover:bg-amber-200 transition disabled:opacity-50 font-medium"
          >
            {audioState === "loading" && "⏳ Генерую аудіо..."}
            {audioState === "playing" && "🔊 Відтворюється..."}
            {audioState === "error" && "⚠️ Помилка аудіо — спробувати ще"}
            {audioState === "idle" && "▶ Прослухати як вийде в ефірі"}
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("form")}
              disabled={sendLoading}
              className="flex-1 px-4 py-3 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition disabled:opacity-40"
            >
              Змінити
            </button>
            <button
              onClick={handleConfirm}
              disabled={sendLoading}
              className="flex-1 px-4 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendLoading ? "⏳ Зберігаємо..." : "Надіслати в ефір ✓"}
            </button>
          </div>
          {sendError && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg mt-2">{sendError}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  const inputCls = "w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 placeholder:text-gray-400";
  const labelCls = "block text-sm font-medium text-amber-800 mb-1";

  return (
    <div className="min-h-screen bg-amber-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📻</div>
          <h1 className="text-3xl font-bold text-amber-900">Подати оголошення</h1>
          <p className="text-amber-700 mt-2">Ведуча Тамара зачитає ваше оголошення в ефірі</p>
        </div>

        {/* Type selector */}
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => setAnnouncementType("DATING")}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition ${
              announcementType === "DATING"
                ? "bg-amber-700 border-amber-700 text-white"
                : "bg-white border-amber-200 text-amber-700 hover:border-amber-400"
            }`}
          >
            💌 Знайомства
          </button>
          <button
            type="button"
            onClick={() => setAnnouncementType("COMMERCIAL")}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition ${
              announcementType === "COMMERCIAL"
                ? "bg-amber-700 border-amber-700 text-white"
                : "bg-white border-amber-200 text-amber-700 hover:border-amber-400"
            }`}
          >
            🛒 Оголошення про продаж
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">

          {/* ── COMMERCIAL FORM ── */}
          {announcementType === "COMMERCIAL" && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                📢 Ведуча Тамара зачитає ваше оголошення в стилі радіо 90-х. Плата не стягується.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Ваше ім'я</label>
                  <input name="name" value={commercial.name} onChange={handleCommercialChange}
                    placeholder="Микола" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Місто *</label>
                  <input name="city" value={commercial.city} onChange={handleCommercialChange}
                    required placeholder="Харків" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Що пропонується / продається *</label>
                <input name="itemTitle" value={commercial.itemTitle} onChange={handleCommercialChange}
                  required placeholder="Холодильник ЗИЛ, 1989 р." className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Ціна</label>
                  <input name="price" value={commercial.price} onChange={handleCommercialChange}
                    placeholder="500 грн або домовимось" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Телефон</label>
                  <input name="contactPhone" value={commercial.contactPhone} onChange={handleCommercialChange}
                    placeholder="(044) 123-4567" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Деталі про товар / послугу *</label>
                <textarea name="about" value={commercial.about} onChange={handleCommercialChange}
                  required rows={4}
                  placeholder="Стан відмінний, не використовувався. Самовивіз з центру міста. Торг доречний..."
                  className={`${inputCls} resize-none`} />
              </div>
            </>
          )}

          {/* ── DATING FORM ── */}
          {announcementType === "DATING" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Ім'я *</label>
                  <input name="name" value={dating.name} onChange={handleDatingChange}
                    required placeholder="Василь" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Вік *</label>
                  <input name="age" value={dating.age} onChange={handleDatingChange}
                    required type="number" min="18" max="99" placeholder="45" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Місто *</label>
                <input name="city" value={dating.city} onChange={handleDatingChange}
                  required placeholder="Тернопіль" className={inputCls} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Зріст (см)</label>
                  <input name="height" value={dating.height} onChange={handleDatingChange}
                    type="number" placeholder="165" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Вага (кг)</label>
                  <input name="weight" value={dating.weight} onChange={handleDatingChange}
                    type="number" placeholder="65" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Волосся</label>
                  <input name="hairColor" value={dating.hairColor} onChange={handleDatingChange}
                    placeholder="русява" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Освіта</label>
                  <input name="education" value={dating.education} onChange={handleDatingChange}
                    placeholder="вища" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Житло</label>
                  <input name="housing" value={dating.housing} onChange={handleDatingChange}
                    placeholder="є квартира" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Про себе *</label>
                <textarea name="about" value={dating.about} onChange={handleDatingChange}
                  required rows={3}
                  placeholder="люблю природу, сад, тихі вечори вдома..."
                  className={`${inputCls} resize-none`} />
              </div>

              <div>
                <label className={labelCls}>Кого шукаю *</label>
                <textarea name="lookingFor" value={dating.lookingFor} onChange={handleDatingChange}
                  required rows={3}
                  placeholder="надійного чоловіка 45-55 років, доброго і порядного..."
                  className={`${inputCls} resize-none`} />
              </div>
            </>
          )}

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "⏳ Готуємо ваш текст..." : "Переглянути оголошення →"}
          </button>
        </form>
      </div>
    </div>
  );
}
