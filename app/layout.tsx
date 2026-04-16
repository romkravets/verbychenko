import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Радіо Вербиченко — Програма знайомств",
  description:
    "Шлюбні оголошення в стилі Українського радіо 90-х. Подайте своє оголошення — ведуча Тамара зачитає його в ефірі.",
  openGraph: {
    title: "Радіо Вербиченко — Програма знайомств",
    description: "Шлюбні оголошення в ефірі. 90-ті. Україна.",
    locale: "uk_UA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
