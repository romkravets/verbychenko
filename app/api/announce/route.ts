import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAnnouncement } from "@/lib/llm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, age, city, height, weight, hairColor, education, housing, about, lookingFor } = body;

  if (!name || !age || !city || !about || !lookingFor) {
    return NextResponse.json({ error: "Заповніть всі обов'язкові поля" }, { status: 400 });
  }

  // Генеруємо текст ведучої
  const aiText = await generateAnnouncement({ name, age, city, height, weight, hairColor, education, housing, about, lookingFor });

  // Зберігаємо як PENDING
  const announcement = await db.announcement.create({
    data: { name, age, city, height, weight, hairColor, education, housing, about, lookingFor, aiText },
  });

  // TODO: Фаза 3 — надіслати в Telegram-бот модератору

  return NextResponse.json({ id: announcement.id, aiText });
}
