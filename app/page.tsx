import Link from "next/link";
import NowPlayingBadge from "./components/NowPlayingBadge";

const GRADIENT =
  "linear-gradient(90deg, rgb(160, 224, 171), rgb(255, 172, 46) 50%, rgb(165, 45, 37))";

const STEPS = [
  {
    icon: "✍️",
    title: "Напишіть листа",
    desc: "Розкажіть кілька слів про себе і кого шукаєте — щиро, своїми словами",
  },
  {
    icon: "🎙️",
    title: "Тамара готує текст",
    desc: "Ведуча підготує ваш лист у теплому стилі живого радіо 90-х",
  },
  {
    icon: "📻",
    title: "Виходить в ефір",
    desc: "Ваш лист прозвучить для всіх слухачів Радіо Вербиченька",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col text-white">
      {/* Hero */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center text-center px-6 pt-28 pb-40 min-h-[60vh]">
        <div
          className="absolute inset-0 opacity-75"
          style={{ background: GRADIENT }}
          aria-hidden
        />
        <div
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#000000] to-transparent"
          aria-hidden
        />
        <div className="relative z-10 max-w-[1078px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] tracking-widest uppercase px-4 py-1.5 rounded-full border border-white/30 text-white/80 mb-8 font-mono backdrop-blur-sm bg-black/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Живий ефір
          </div>
          <h1
            className="text-[clamp(36px,7vw,54px)] font-light leading-[1.15] text-white mb-6"
            style={{
              fontFamily: "var(--font-raleway-var, Raleway, sans-serif)",
            }}
          >
            Напишіть листа —
            <br />почуєте в ефірі
          </h1>
          <p className="text-[18px] text-white/75 leading-[1.22] max-w-lg mx-auto mb-10">
            Ведуча Тамара зачитає ваш лист для всіх слухачів{" "}
            <span className="text-white font-normal">
              Радіо Вербиченька
            </span>
            . Так, як це було в 90-х.
          </p>
          <Link
            href="/submit"
            className="inline-block px-8 py-3.5 bg-black/30 backdrop-blur-md text-white border border-white/30 text-[16px] font-normal transition hover:bg-white/10 active:scale-95"
            style={{ borderRadius: "75.024px" }}
          >
            Надіслати листа
          </Link>
        </div>
      </section>

      {/* Now Playing */}
      <div className="flex justify-center px-6 -mt-6 pb-12">
        <NowPlayingBadge />
      </div>

      {/* How it works */}
      <section className="max-w-[1078px] mx-auto px-6 pb-24 w-full">
        <p className="text-[11px] tracking-widest uppercase text-whisper-gray mb-8 font-mono">
          Як це працює
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px]">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-[10px] p-8 border border-white/10 bg-white/5 backdrop-blur-sm"
            >
              <div className="text-2xl mb-4">{step.icon}</div>
              <p className="text-[11px] tracking-widest uppercase text-whisper-gray font-mono mb-2">
                {i + 1} / 3
              </p>
              <h3 className="text-[18px] font-light text-white mb-2 leading-[1.22]">
                {step.title}
              </h3>
              <p className="text-[14px] text-whisper-gray leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/submit"
            className="inline-block px-10 py-4 text-white border border-white/20 text-[16px] font-normal transition hover:border-white/50 hover:bg-white/5 active:scale-95"
            style={{ borderRadius: "75.024px" }}
          >
            Написати в редакцію
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-auto text-center">
        <p className="text-[11px] text-whisper-gray tracking-wider font-mono">
          Радіо Вербиченька © 2025 — Програма знайомств
        </p>
        <p className="text-[11px] text-whisper-gray mt-2 font-mono">
          Розробник:{" "}
          <a
            href="https://github.com/romkravets"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-white transition underline underline-offset-4"
          >
            @romkravets
          </a>
        </p>
      </footer>
    </div>
  );
}
