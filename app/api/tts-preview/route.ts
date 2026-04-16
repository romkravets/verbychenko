import { NextRequest, NextResponse } from "next/server";
import { textToSpeech, wrapWithHostIntro } from "@/lib/tts";

// Max text length to prevent DoS via very long TTS requests
const MAX_TEXT_LENGTH = 1000;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text } = body as { text?: string };

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "text too long" }, { status: 400 });
  }

  const buffer = await textToSpeech(text);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
