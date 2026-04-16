"use client";

import { useState } from "react";

type Step = "form" | "preview" | "done";
type AudioState = "idle" | "loading" | "playing" | "error";

interface FormData {
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

const initialForm: FormData = {
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

export default function SubmitPage() {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormData>(initialForm);
  const [aiText, setAiText] = useState("");
  const [announcementId, setAnnouncementId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  async function playPreview() {
    if (audioState === "loading") return;
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleConfirm() {
    setSendLoading(true);
    setSendError("");
    try {
      const res = await fetch(`/api/announce/${announcementId}/confirm`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
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

    try {
      const res = await fetch("/api/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          age: Number(form.age),
          height: form.height ? Number(form.height) : undefined,
          weight: form.weight ? Number(form.weight) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Помилка сервера");
      }

      const data = await res.json();
      setAiText(data.aiText);
      setAnnouncementId(data.id);
      setStep("preview");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Щось пішло не так");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">📻</div>
          <h2 className="text-2xl font-bold text-amber-900 mb-3">
            Лист надіслано!
          </h2>
          <p className="text-amber-700">
            Ваше оголошення на розгляді. Після перевірки воно потрапить в ефір.
          </p>
          <button
            onClick={() => {
              setForm(initialForm);
              setStep("form");
              setAiText("");
            }}
            className="mt-6 px-6 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition"
          >
            Надіслати ще одне
          </button>
        </div>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🎙️</div>
            <h2 className="text-xl font-bold text-amber-900">
              Ваше оголошення
            </h2>
            <p className="text-sm text-amber-600 mt-1">
              Так воно прозвучить в ефірі
            </p>
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
              {sendLoading ? "⏳ Зберігаємо в ефір..." : "Надіслати в ефір ✓"}
            </button>
          </div>
          {sendError && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg mt-2">{sendError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📻</div>
          <h1 className="text-3xl font-bold text-amber-900">
            Подати оголошення
          </h1>
          <p className="text-amber-700 mt-2">
            Заповніть анкету — ведуча зачитає її в ефірі
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg p-6 space-y-4"
        >
          {/* Обов'язкові поля */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-1">
                Ім'я *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Василь"
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-1">
                Вік *
              </label>
              <input
                name="age"
                value={form.age}
                onChange={handleChange}
                required
                type="number"
                min="18"
                max="99"
                placeholder="45"
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">
              Місто *
            </label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              required
              placeholder="Тернопіль"
              className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Додаткові поля */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-1">
                Зріст (см)
              </label>
              <input
                name="height"
                value={form.height}
                onChange={handleChange}
                type="number"
                placeholder="165"
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-1">
                Вага (кг)
              </label>
              <input
                name="weight"
                value={form.weight}
                onChange={handleChange}
                type="number"
                placeholder="65"
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-1">
                Волосся
              </label>
              <input
                name="hairColor"
                value={form.hairColor}
                onChange={handleChange}
                placeholder="русява"
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-1">
                Освіта
              </label>
              <input
                name="education"
                value={form.education}
                onChange={handleChange}
                placeholder="вища"
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-1">
                Житло
              </label>
              <input
                name="housing"
                value={form.housing}
                onChange={handleChange}
                placeholder="є квартира"
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">
              Про себе *
            </label>
            <textarea
              name="about"
              value={form.about}
              onChange={handleChange}
              required
              rows={3}
              placeholder="люблю природу, сад, тихі вечори вдома..."
              className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">
              Кого шукаю *
            </label>
            <textarea
              name="lookingFor"
              value={form.lookingFor}
              onChange={handleChange}
              required
              rows={3}
              placeholder="надійного чоловіка 45-55 років, доброго і порядного..."
              className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Готуємо ваш текст..." : "Переглянути оголошення →"}
          </button>
        </form>
      </div>
    </div>
  );
}
