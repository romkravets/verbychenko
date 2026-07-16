"use client";

import { useEffect, useState } from "react";

type Step = "form" | "preview" | "done";
type AnnouncementType = "DATING" | "COMMERCIAL";
type AudioState = "idle" | "loading" | "playing" | "error";
type TtsProvider = "google" | "voicebox";
type TtsProfile = "classic" | "natural" | "warm";

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
  name: "",
  age: "",
  city: "",
  height: "",
  weight: "",
  hairColor: "",
  education: "",
  housing: "",
  about: "",
  lookingFor: "",
};

const initialCommercial: CommercialForm = {
  name: "",
  city: "",
  itemTitle: "",
  price: "",
  contactPhone: "",
  about: "",
};

const inputCls =
  "w-full px-3 py-2.5 bg-white/5 border border-white/10 text-white placeholder:text-whisper-gray focus:outline-none focus:border-white/30 focus:bg-white/8 transition font-mono text-[13px]";
const labelCls =
  "block text-[11px] font-mono tracking-widest uppercase text-whisper-gray mb-1.5";

export default function SubmitPage() {
  const [announcementType, setAnnouncementType] =
    useState<AnnouncementType>("DATING");
  const [step, setStep] = useState<Step>("form");
  const [dating, setDating] = useState<DatingForm>(initialDating);
  const [commercial, setCommercial] =
    useState<CommercialForm>(initialCommercial);
  const [aiText, setAiText] = useState("");
  const [announcementId, setAnnouncementId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>("google");
  const [ttsProfile, setTtsProfile] = useState<TtsProfile>("natural");

  useEffect(() => {
    return () => {
      if (audioEl) audioEl.pause();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [audioEl, previewUrl]);

  function handleDatingChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setDating({ ...dating, [e.target.name]: e.target.value });
  }
  function handleCommercialChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setCommercial({ ...commercial, [e.target.name]: e.target.value });
  }

  async function playPreview() {
    if (audioState === "loading") return;
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setAudioState("loading");
    try {
      const res = await fetch("/api/tts-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: aiText,
          provider: ttsProvider,
          profile: ttsProfile,
        }),
      });
      if (!res.ok) throw new Error("TTS error");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
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
      const res = await fetch(`/api/announce/${announcementId}/confirm`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
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
        } catch {
          /* empty body */
        }
        throw new Error(errMsg);
      }

      const data = (await res.json()) as { aiText?: string; id?: string };
      if (!data.aiText || !data.id)
        throw new Error("Порожня відповідь від сервера");
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
      <div className="min-h-screen flex items-center justify-center p-6">
        <div
          className="w-full max-w-md border border-white/10 bg-white/5 backdrop-blur-sm p-10 text-center"
          style={{ borderRadius: "10px" }}
        >
          <div className="text-5xl mb-5">📻</div>
          <p className="text-[11px] font-mono tracking-widest uppercase text-whisper-gray mb-3">
            {announcementType === "COMMERCIAL"
              ? "Оголошення надіслано"
              : "Лист надіслано"}
          </p>
          <h2
            className="text-[28px] font-light text-white mb-4 leading-[1.2]"
            style={{
              fontFamily: "var(--font-raleway-var, Raleway, sans-serif)",
            }}
          >
            Прийнято до ефіру
          </h2>
          <p className="text-whisper-gray text-[14px] leading-relaxed mb-8">
            Ваш лист отримано. Незабаром Тамара зачитає його для всіх слухачів
            Радіо Вербиченька. Дякуємо, що написали нам.
          </p>
          <button
            onClick={() => {
              setDating(initialDating);
              setCommercial(initialCommercial);
              setStep("form");
              setAiText("");
            }}
            className="px-8 py-3 border border-white/20 text-white text-[13px] font-mono tracking-widest uppercase hover:bg-white/5 transition"
            style={{ borderRadius: "75.024px" }}
          >
            Надіслати ще
          </button>
        </div>
      </div>
    );
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  if (step === "preview") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div
          className="w-full max-w-lg border border-white/10 bg-white/5 backdrop-blur-sm p-8"
          style={{ borderRadius: "10px" }}
        >
          <p className="text-[11px] font-mono tracking-widest uppercase text-whisper-gray mb-2">
            {announcementType === "COMMERCIAL"
              ? "🛒 Ваше оголошення"
              : "💌 Ваш лист"}
          </p>
          <h2
            className="text-[24px] font-light text-white mb-6 leading-[1.2]"
            style={{
              fontFamily: "var(--font-raleway-var, Raleway, sans-serif)",
            }}
          >
            Саме так прозвучить в ефірі
          </h2>

          {/* Transcript card */}
          <div
            className="border border-white/10 bg-black/30 px-5 py-4 mb-5"
            style={{ borderRadius: "10px" }}
          >
            {/* Tape-deck header */}
            <div className="flex items-center gap-2 text-whisper-gray text-[10px] font-mono mb-3">
              <span>▶▶</span>
              <span className="flex-1 border-t border-dashed border-white/10" />
              <span>Радіо Вербиченька</span>
              <span className="flex-1 border-t border-dashed border-white/10" />
              <span>◀◀</span>
            </div>
            <p className="text-white/90 text-[15px] leading-relaxed font-serif italic">
              «{aiText}»
            </p>
          </div>

          {/* Audio preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <label className="text-[11px] font-mono tracking-wide text-whisper-gray">
              Движок озвучення
              <select
                value={ttsProvider}
                onChange={(e) => setTtsProvider(e.target.value as TtsProvider)}
                className="mt-1.5 w-full px-3 py-2.5 bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/30"
              >
                <option value="google">Google TTS</option>
                <option value="voicebox">Voicebox (external)</option>
              </select>
            </label>

            <label className="text-[11px] font-mono tracking-wide text-whisper-gray">
              Профіль голосу
              <select
                value={ttsProfile}
                onChange={(e) => setTtsProfile(e.target.value as TtsProfile)}
                disabled={ttsProvider === "voicebox"}
                className="mt-1.5 w-full px-3 py-2.5 bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/30 disabled:opacity-40"
              >
                <option value="classic">Classic</option>
                <option value="natural">Natural</option>
                <option value="warm">Warm</option>
              </select>
            </label>
          </div>

          <button
            onClick={playPreview}
            disabled={audioState === "loading"}
            className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 border border-white/10 text-whisper-gray hover:text-white hover:border-white/25 text-[12px] font-mono tracking-wide transition disabled:opacity-40"
            style={{ borderRadius: "75.024px" }}
          >
            {audioState === "loading" && "⏳ Готуємо запис..."}
            {audioState === "playing" && "🔊 Слухаємо..."}
            {audioState === "error" && "⚠️ Помилка — спробувати ще раз"}
            {audioState === "idle" && "▶ Прослухати, як це прозвучить"}
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("form")}
              disabled={sendLoading}
              className="flex-1 px-4 py-3 border border-white/10 text-whisper-gray hover:text-white hover:border-white/25 text-[12px] font-mono tracking-wide transition disabled:opacity-40"
              style={{ borderRadius: "75.024px" }}
            >
              Змінити
            </button>
            <button
              onClick={handleConfirm}
              disabled={sendLoading}
              className="flex-1 px-4 py-3 bg-white text-black text-[12px] font-mono tracking-wide hover:bg-white/90 transition disabled:opacity-50"
              style={{ borderRadius: "75.024px" }}
            >
              {sendLoading ? "⏳ Надсилаємо..." : "Надіслати в редакцію →"}
            </button>
          </div>
          {sendError && (
            <p className="text-red-400 text-[12px] font-mono mt-3 text-center">
              {sendError}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-10 px-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] font-mono tracking-widest uppercase text-whisper-gray mb-3">
            Написати в редакцію
          </p>
          <h1
            className="text-[clamp(28px,5vw,40px)] font-light leading-[1.15] text-white mb-3"
            style={{
              fontFamily: "var(--font-raleway-var, Raleway, sans-serif)",
            }}
          >
            Напишіть нам листа
          </h1>
          <p className="text-whisper-gray text-[14px]">
            Тамара зачитає ваш лист в ефірі — щиро і тепло,
            як це робили на радіо в 90-х.
          </p>
        </div>

        {/* Type toggle */}
        <div
          className="flex gap-2 mb-8 p-1 border border-white/10 bg-white/3"
          style={{ borderRadius: "75.024px" }}
        >
          {(["DATING", "COMMERCIAL"] as AnnouncementType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setAnnouncementType(t)}
              className={`flex-1 py-2 text-[11px] font-mono tracking-widest uppercase transition ${
                announcementType === t
                  ? "bg-white text-black"
                  : "text-whisper-gray hover:text-white"
              }`}
              style={{ borderRadius: "75.024px" }}
            >
              {t === "DATING" ? "💌 Знайомства" : "🛒 Оголошення"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* ── COMMERCIAL FORM ── */}
          {announcementType === "COMMERCIAL" && (
            <>
              <div
                className="border border-white/10 bg-white/3 px-4 py-3 text-[12px] text-whisper-gray font-mono"
                style={{ borderRadius: "10px" }}
              >
                📢 Тамара зачитає ваше оголошення в прямому ефірі Радіо Вербиченька. Безкоштовно.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Ваше ім&#39;я</label>
                  <input
                    name="name"
                    value={commercial.name}
                    onChange={handleCommercialChange}
                    placeholder="Микола"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Місто *</label>
                  <input
                    name="city"
                    value={commercial.city}
                    onChange={handleCommercialChange}
                    required
                    placeholder="Харків"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  Що пропонується / продається *
                </label>
                <input
                  name="itemTitle"
                  value={commercial.itemTitle}
                  onChange={handleCommercialChange}
                  required
                  placeholder="Холодильник ЗИЛ, 1989 р."
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Ціна</label>
                  <input
                    name="price"
                    value={commercial.price}
                    onChange={handleCommercialChange}
                    placeholder="500 грн або домовимось"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Телефон</label>
                  <input
                    name="contactPhone"
                    value={commercial.contactPhone}
                    onChange={handleCommercialChange}
                    placeholder="(044) 123-4567"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Деталі *</label>
                <textarea
                  name="about"
                  value={commercial.about}
                  onChange={handleCommercialChange}
                  required
                  rows={4}
                  placeholder="Стан відмінний, не використовувався. Самовивіз із центру міста. Торг доречний..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </>
          )}

          {/* ── DATING FORM ── */}
          {announcementType === "DATING" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Ім&#39;я *</label>
                  <input
                    name="name"
                    value={dating.name}
                    onChange={handleDatingChange}
                    required
                    placeholder="Василь"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Вік *</label>
                  <input
                    name="age"
                    value={dating.age}
                    onChange={handleDatingChange}
                    required
                    type="number"
                    min="18"
                    max="99"
                    placeholder="45"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Місто *</label>
                <input
                  name="city"
                  value={dating.city}
                  onChange={handleDatingChange}
                  required
                  placeholder="Тернопіль"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Зріст (см)</label>
                  <input
                    name="height"
                    value={dating.height}
                    onChange={handleDatingChange}
                    type="number"
                    placeholder="165"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Вага (кг)</label>
                  <input
                    name="weight"
                    value={dating.weight}
                    onChange={handleDatingChange}
                    type="number"
                    placeholder="65"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Волосся</label>
                  <input
                    name="hairColor"
                    value={dating.hairColor}
                    onChange={handleDatingChange}
                    placeholder="русява"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Освіта</label>
                  <input
                    name="education"
                    value={dating.education}
                    onChange={handleDatingChange}
                    placeholder="вища"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Житло</label>
                  <input
                    name="housing"
                    value={dating.housing}
                    onChange={handleDatingChange}
                    placeholder="є квартира"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Про себе *</label>
                <textarea
                  name="about"
                  value={dating.about}
                  onChange={handleDatingChange}
                  required
                  rows={3}
                  placeholder="люблю природу, сад, тихі вечори вдома..."
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div>
                <label className={labelCls}>Кого шукаю *</label>
                <textarea
                  name="lookingFor"
                  value={dating.lookingFor}
                  onChange={handleDatingChange}
                  required
                  rows={3}
                  placeholder="надійного чоловіка 45–55 років, доброго і порядного..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-red-400 text-[12px] font-mono text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-white text-black text-[13px] font-mono tracking-widest uppercase hover:bg-white/90 transition disabled:opacity-40"
            style={{ borderRadius: "75.024px" }}
          >
            {loading ? "⏳ Готуємо ваш лист..." : "Переглянути лист →"}
          </button>
        </form>
      </div>
    </div>
  );
}
