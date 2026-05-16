"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "🏠 Головна" },
  { href: "/submit", label: "✉️ Подати оголошення" },
  { href: "/admin", label: "⚙️ Адмінка" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="bg-amber-950 border-b border-amber-800 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 flex items-center gap-1 h-11">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-amber-300 font-bold text-sm mr-4 flex-shrink-0"
        >
          <span className="text-lg">📻</span>
          <span className="hidden sm:inline">Радіо Вербиченко</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto">
          {LINKS.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap transition ${
                  active
                    ? "bg-amber-700 text-amber-100"
                    : "text-amber-400 hover:bg-amber-900 hover:text-amber-200"
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
