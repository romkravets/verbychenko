import { CHANNELS } from "@/lib/channels";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function requireSecret(req: NextRequest) {
  const auth = req.headers.get("x-admin-secret");
  const secret = process.env.EPISODE_BUILD_SECRET;
  if (!secret || auth !== secret) return false;
  return true;
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value))
    return value
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function fallbackChannels() {
  return CHANNELS.map((c, idx) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    description: c.description,
    country: c.country === "ua" ? "UA" : "WORLD",
    playlistIds: c.playlistIds,
    videoIds: c.videoIds,
    isActive: true,
    sortOrder: idx,
  }));
}

export async function GET(req: NextRequest) {
  if (!requireSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const channels = await db.radioChannel.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ channels, source: "db" });
  } catch {
    return NextResponse.json({ channels: fallbackChannels(), source: "env" });
  }
}

export async function POST(req: NextRequest) {
  if (!requireSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const name = String(body.name || "").trim();
  const country = String(body.country || "UA").toUpperCase();
  const playlistIds = parseList(body.playlistIds);
  const videoIds = parseList(body.videoIds);

  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  if (country !== "UA" && country !== "WORLD") {
    return NextResponse.json({ error: "invalid country" }, { status: 400 });
  }

  if (playlistIds.length === 0 && videoIds.length === 0) {
    return NextResponse.json(
      { error: "add at least one playlist ID or one video ID" },
      { status: 400 },
    );
  }

  try {
    const maxSort = await db.radioChannel.aggregate({
      _max: { sortOrder: true },
    });
    const created = await db.radioChannel.create({
      data: {
        name,
        emoji: String(body.emoji || "🎵").trim() || "🎵",
        description: String(body.description || "").trim(),
        country: country === "UA" ? "UA" : "WORLD",
        playlistIds,
        videoIds,
        isActive: body.isActive !== false,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ channel: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "db_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!requireSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const id = String(body.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    if (body.delete === true) {
      await db.radioChannel.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    const data: {
      isActive?: boolean;
      sortOrder?: number;
      name?: string;
      description?: string;
      emoji?: string;
      playlistIds?: string[];
      videoIds?: string[];
    } = {};

    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.description === "string")
      data.description = body.description.trim();
    if (typeof body.emoji === "string") data.emoji = body.emoji.trim() || "🎵";
    if (body.playlistIds !== undefined)
      data.playlistIds = parseList(body.playlistIds);
    if (body.videoIds !== undefined) data.videoIds = parseList(body.videoIds);

    const updated = await db.radioChannel.update({ where: { id }, data });
    return NextResponse.json({ channel: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "db_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
