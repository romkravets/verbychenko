import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Повертає наступний item в черзі для радіоплеєра
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const episodeId = searchParams.get("episodeId");

  if (!episodeId) {
    return NextResponse.json({ error: "episodeId required" }, { status: 400 });
  }

  const item = await db.queueItem.findFirst({
    where: { episodeId, playedAt: null },
    orderBy: { order: "asc" },
  });

  if (!item) {
    return NextResponse.json({ done: true });
  }

  // Позначаємо як відтворений
  await db.queueItem.update({
    where: { id: item.id },
    data: { playedAt: new Date() },
  });

  return NextResponse.json({ audioUrl: item.audioUrl, type: item.type });
}
