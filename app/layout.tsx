import ClientProviders from "@/app/components/ClientProviders";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Raleway } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const raleway = Raleway({
  variable: "--font-raleway-var",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
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
      className={`${geistSans.variable} ${geistMono.variable} ${raleway.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
