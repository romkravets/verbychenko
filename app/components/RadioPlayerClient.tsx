"use client";

import dynamic from "next/dynamic";

const RadioPlayer = dynamic(() => import("./RadioPlayer"), { ssr: false });

export default function RadioPlayerClient(props: {
  episodeId?: string;
  musicUrl?: string;
}) {
  return <RadioPlayer {...props} />;
}
