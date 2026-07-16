import { getIp, rateLimit } from "@/lib/rate-limit";
import { textToSpeech } from "@/lib/tts";
import { NextRequest, NextResponse } from "next/server";

// Max text length to prevent DoS via very long TTS requests
const MAX_TEXT_LENGTH = 1000;
const ALLOWED_PROVIDERS = new Set(["google", "voicebox"]);
const ALLOWED_PROFILES = new Set(["classic", "natural", "warm"]);

export async function POST(req: NextRequest) {
  // Rate limit: 10 previews per IP per 5 minutes
  const ip = getIp(req);
  const rl = rateLimit(`tts-preview:${ip}`, 10, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Забагато запитів. Зачекайте кілька хвилин." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const body = await req.json();
  const { text, provider, profile } = body as {
    text?: string;
    provider?: string;
    profile?: string;
  };

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "text too long" }, { status: 400 });
  }

  if (provider && !ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "unsupported provider" }, { status: 400 });
  }

  if (profile && !ALLOWED_PROFILES.has(profile)) {
    return NextResponse.json({ error: "unsupported profile" }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = await textToSpeech(text, {
      provider: provider as "google" | "voicebox" | undefined,
      profile: profile as "classic" | "natural" | "warm" | undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "tts_failed";
    return NextResponse.json(
      { error: "TTS unavailable", detail: message },
      { status: 502 },
    );
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
