import { NextResponse } from "next/server";
import { textToSpeech, wrapWithHostIntro } from "@/lib/tts";
import { uploadAudio } from "@/lib/storage";

export async function GET() {
  const testText = "Де ти, моя ненька, озовися і прийди в моє життя! Мене звати Василь, мені 54 роки, я житель Тернополя. Маю свій дім, де росте щедрий сад. Шукаю добру жінку для спільного життя. Пияків прошу не турбувати.";

  const fullText = wrapWithHostIntro(testText, 364, "Тернополя");

  // Генеруємо аудіо
  const audioBuffer = await textToSpeech(fullText);

  // Зберігаємо в Supabase Storage
  const publicUrl = await uploadAudio(`test/announcement-364.mp3`, audioBuffer);

  return NextResponse.json({ ok: true, url: publicUrl, size: audioBuffer.length });
}
