"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Головна" },
  { href: "/submit", label: "Подати оголошення" },
  { href: "/schedule", label: "📅 Розклад" },
  { href: "/admin", label: "Адмінка" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 bg-black/70 backdrop-blur-md border-b border-white/10">
      <div className="max-w-[1078px] mx-auto px-6 flex items-center h-12 gap-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-white font-light text-[16px] shrink-0 mr-auto tracking-wide"
        >
          <span>📻</span>
          <span className="hidden sm:inline">Радіо Вербиченька</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-1 text-[11px] tracking-widest uppercase font-mono whitespace-nowrap transition rounded-full border ${
                  active
                    ? "border-white/30 text-white bg-white/10"
                    : "border-transparent text-whisper-gray hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
