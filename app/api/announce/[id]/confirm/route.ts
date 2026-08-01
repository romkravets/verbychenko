import { verifyConfirmToken } from "@/lib/announce-confirm-token";
import { db } from "@/lib/db";
import { generateHostLetterIntro } from "@/lib/llm";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { uploadAudio } from "@/lib/storage";
import { textToSpeech, wrapWithHostIntro } from "@/lib/tts";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const confirmToken = _req.headers.get("x-confirm-token");

  if (!verifyConfirmToken(id, confirmToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Protect TTS/storage resources from automated retries.
  const ip = getIp(_req);
  const rl = rateLimit(`announce-confirm:${ip}`, 3, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Забагато запитів. Спробуйте пізніше." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const announcement = await db.announcement.findUnique({ where: { id } });
  if (!announcement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!announcement.aiText) {
    return NextResponse.json({ error: "No aiText to render" }, { status: 400 });
  }
  if (announcement.status !== "PENDING") {
    return NextResponse.json(
      { error: "Announcement already processed" },
      { status: 409 },
    );
  }

  // Assign letter number if not yet set (count of all announcements up to this one)
  let letterNumber = announcement.letterNumber;
  if (!letterNumber) {
    letterNumber = await db.announcement.count();
  }

  const hostIntro = await generateHostLetterIntro(
    letterNumber,
    announcement.city,
  );
  const fullText = wrapWithHostIntro(announcement.aiText, hostIntro);

  try {
    // Generate TTS audio
    const audioBuffer = await textToSpeech(fullText);

    // Upload to Supabase Storage
    const filename = `announcements/${id}.mp3`;
    const audioUrl = await uploadAudio(filename, audioBuffer);

    // Save audioUrl + letterNumber to DB
    await db.announcement.update({
      where: { id },
      data: { audioUrl, letterNumber },
    });

    return NextResponse.json({ ok: true, audioUrl });
  } catch (err) {
    // Log full error on server for debugging and return JSON error to client
    console.error("announce.confirm error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
