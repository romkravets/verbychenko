import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processChannelUpdates } from "@/lib/youtube-news";
import { textToSpeech } from "@/lib/tts";
import { uploadAudio } from "@/lib/storage";

export const maxDuration = 120;

// POST /api/news/sync
// Headers: x-build-secret (same secret as episode builder)
// Body (optional): { channelIds: string[] } — sync only specific channels
// Body (optional): { episodeId: string } — add news items to existing episode
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-build-secret");
  if (secret !== process.env.EPISODE_BUILD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const channelIds: string[] | undefined = body.channelIds;
  const episodeId: string | undefined = body.episodeId;

  // Step 1 — fetch + transcript + summarize
  const processed = await processChannelUpdates(channelIds);

  if (processed.length === 0) {
    return NextResponse.json({ ok: true, message: "No new videos to process", count: 0 });
  }

  // Step 2 — generate TTS + upload + save to DB
  const saved = [];
  for (const item of processed) {
    try {
      const audio = await textToSpeech(item.radioText);
      const key = `news/${item.videoId}.mp3`;
      const audioUrl = await uploadAudio(key, audio);

      const record = await db.youtubeVideo.create({
        data: {
          videoId: item.videoId,
          channelId: item.channelId,
          channelName: item.channelName,
          title: item.title,
          radioText: item.radioText,
          audioUrl,
        },
      });

      saved.push(record);

      // Step 3 — optionally add to episode queue
      if (episodeId) {
        const lastItem = await db.queueItem.findFirst({
          where: { episodeId },
          orderBy: { order: "desc" },
        });
        const nextOrder = (lastItem?.order ?? -1) + 1;

        await db.queueItem.create({
          data: {
            episodeId,
            type: "NEWS",
            audioUrl,
            order: nextOrder,
            youtubeVideoId: record.id,
          },
        });
      }
    } catch (err) {
      console.error(`[news/sync] failed for ${item.videoId}:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    count: saved.length,
    videos: saved.map((v) => ({ id: v.id, videoId: v.videoId, title: v.title })),
  });
}

// GET /api/news/sync — list recently processed videos
export async function GET() {
  const videos = await db.youtubeVideo.findMany({
    orderBy: { processedAt: "desc" },
    take: 20,
    select: { videoId: true, channelName: true, title: true, audioUrl: true, processedAt: true },
  });
  return NextResponse.json({ videos });
}
