import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Webhook від Telegram-бота
// Фаза 3 — тут буде логіка схвалення/відхилення + ElevenLabs TTS
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Перевірка секретного токена від Telegram
  const token = req.headers.get("x-telegram-bot-api-secret-token");
  if (token !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { callback_query } = body;
  if (!callback_query) return NextResponse.json({ ok: true });

  const [action, id] = callback_query.data.split(":");

  if (action === "approve") {
    await db.announcement.update({
      where: { id },
      data: { status: "APPROVED" },
    });
    // TODO: Фаза 3 — запустити ElevenLabs TTS
  }

  if (action === "reject") {
    await db.announcement.update({
      where: { id },
      data: { status: "REJECTED" },
    });
  }

  return NextResponse.json({ ok: true });
}
