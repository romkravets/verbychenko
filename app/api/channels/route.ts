import { db } from "@/lib/db";
import { CHANNELS, type Channel } from "@/lib/channels";
import { NextResponse } from "next/server";

function fallbackChannels(): Channel[] {
  return CHANNELS.filter((c) => c.playlistIds.length > 0 || c.videoIds.length > 0);
}

export async function GET() {
  try {
    const rows = await db.radioChannel.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    if (rows.length === 0) {
      return NextResponse.json({ channels: fallbackChannels(), source: "env" });
    }

    const channels: Channel[] = rows
      .map((r) => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji || "🎵",
        description: r.description || "",
        country: r.country === "UA" ? "ua" : "world",
        playlistIds: (r.playlistIds || []).filter(Boolean),
        videoIds: (r.videoIds || []).filter(Boolean),
      }))
      .filter((c) => c.playlistIds.length > 0 || c.videoIds.length > 0);

    if (channels.length === 0) {
      return NextResponse.json({ channels: fallbackChannels(), source: "env" });
    }

    return NextResponse.json({ channels, source: "db" });
  } catch {
    return NextResponse.json({ channels: fallbackChannels(), source: "env" });
  }
}
