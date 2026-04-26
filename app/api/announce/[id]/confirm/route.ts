import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { textToSpeech, wrapWithHostIntro } from "@/lib/tts";
import { uploadAudio } from "@/lib/storage";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const announcement = await db.announcement.findUnique({ where: { id } });
  if (!announcement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!announcement.aiText) {
    return NextResponse.json({ error: "No aiText to render" }, { status: 400 });
  }

  // Assign letter number if not yet set (count of all announcements up to this one)
  let letterNumber = announcement.letterNumber;
  if (!letterNumber) {
    letterNumber = await db.announcement.count();
  }

  const fullText = wrapWithHostIntro(
    announcement.aiText,
    letterNumber,
    announcement.city,
  );

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
