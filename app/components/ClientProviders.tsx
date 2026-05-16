"use client";

import NavBar from "@/app/components/NavBar";
import { RadioProvider } from "@/app/context/RadioContext";
import dynamic from "next/dynamic";

const PersistentRadioBar = dynamic(
  () => import("@/app/components/PersistentRadioBar"),
  { ssr: false },
);

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RadioProvider>
      <NavBar />
      {children}
      <PersistentRadioBar />
    </RadioProvider>
  );
}
