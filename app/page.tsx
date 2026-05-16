import Link from "next/link";
import NowPlayingBadge from "./components/NowPlayingBadge";

export default function Home() {
  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      {/* Header */}
      <header className="bg-amber-900 text-amber-100 py-4 px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📻</span>
          <div>
            <h1 className="text-xl font-bold leading-tight">
              Радіо Вербиченко
            </h1>
            <p className="text-xs text-amber-400 tracking-widest uppercase">
              Програма знайомств
            </p>
          </div>
        </div>
        <Link
          href="/submit"
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg text-sm font-semibold transition"
        >
          Подати оголошення
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-12">
        <div className="text-center max-w-lg">
          <div className="inline-block bg-amber-900 text-amber-300 text-xs font-mono px-3 py-1 rounded-full mb-4 tracking-widest uppercase">
            🔴 Прямий ефір
          </div>
          <h2 className="text-4xl font-bold text-amber-900 mb-4 leading-tight">
            Шлюбні оголошення
            <br />в ефірі
          </h2>
          <p className="text-amber-700 text-lg leading-relaxed">
            Ведуча Тамара зачитає ваше оголошення в стилі&nbsp;
            <span className="font-semibold">Українського радіо 90-х</span>.
            Знайдіть своє кохання через ефір!
          </p>
        </div>

        {/* Now Playing indicator (replaces embedded player — player is now in bottom bar) */}
        <NowPlayingBadge />

        {/* How it works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full mt-4">
          {[
            {
              icon: "✍️",
              title: "1. Заповніть анкету",
              desc: "Розкажіть про себе і кого шукаєте",
            },
            {
              icon: "🎙️",
              title: "2. ШІ пише текст",
              desc: "Ведуча Тамара перепише у радійному стилі",
            },
            {
              icon: "📻",
              title: "3. Виходить в ефір",
              desc: "Оголошення прозвучить для всіх слухачів",
            },
          ].map((step) => (
            <div
              key={step.title}
              className="bg-white rounded-xl p-5 shadow-sm border border-amber-100 text-center"
            >
              <div className="text-3xl mb-2">{step.icon}</div>
              <h3 className="font-semibold text-amber-900 mb-1">
                {step.title}
              </h3>
              <p className="text-sm text-amber-600">{step.desc}</p>
            </div>
          ))}
        </div>

        <Link
          href="/submit"
          className="px-8 py-4 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-lg font-semibold shadow-lg transition active:scale-95"
        >
          📝 Подати оголошення безкоштовно
        </Link>
      </main>

      {/* Footer */}
      <footer className="text-center py-5 text-amber-500 text-xs font-mono border-t border-amber-200">
        Радіо Вербиченко © 2025 — Програма знайомств
      </footer>
    </div>
  );
}
