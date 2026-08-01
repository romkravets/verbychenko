import { uploadAudio } from "@/lib/storage";
import { textToSpeech, wrapWithHostIntro } from "@/lib/tts";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const secret = req.headers.get("x-build-secret");
  const allowed =
    isDev ||
    (process.env.EPISODE_BUILD_SECRET &&
      secret === process.env.EPISODE_BUILD_SECRET);

  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const testText =
    "Де ти, моя ненька, озовися і прийди в моє життя! Мене звати Василь, мені 54 роки, я житель Тернополя. Маю свій дім, де росте щедрий сад. Шукаю добру жінку для спільного життя. Пияків прошу не турбувати.";

  const fullText = wrapWithHostIntro(
    testText,
    "А ось лист номер 364 — із самого Тернополя надійшов. Послухаємо...",
  );

  // Генеруємо аудіо
  const audioBuffer = await textToSpeech(fullText);

  // Зберігаємо в Supabase Storage
  const publicUrl = await uploadAudio(`test/announcement-364.mp3`, audioBuffer);

  return NextResponse.json({
    ok: true,
    url: publicUrl,
    size: audioBuffer.length,
  });
}
