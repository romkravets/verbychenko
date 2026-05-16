"use client";

import NavBar from "@/app/components/NavBar";
import { RadioProvider } from "@/app/context/RadioContext";
import dynamic from "next/dynamic";

const PersistentRadioBar = dynamic(
  () => import("@/app/components/PersistentRadioBar"),
  { ssr: false },
);

const BackgroundCanvas = dynamic(
  () => import("@/app/components/BackgroundCanvas"),
  { ssr: false },
);

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RadioProvider>
      {/* Particle layer sits above body #000 but below all content */}
      <BackgroundCanvas />
      <NavBar />
      <div className="relative flex-1 flex flex-col" style={{ zIndex: 2 }}>
        {children}
      </div>
      <PersistentRadioBar />
    </RadioProvider>
  );
}
