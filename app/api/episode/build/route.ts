import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { textToSpeech, wrapWithHostIntro } from "@/lib/tts";
import { uploadAudio } from "@/lib/storage";
import { generateEditorial, generateIntro, generateOutro } from "@/lib/editorial";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-build-secret");
  if (secret !== process.env.EPISODE_BUILD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const force = body.force === true;

  const announcements = await db.announcement.findMany({
    where: {
      status: "APPROVED",
      ...(force ? {} : { queueItems: { none: {} } }),
    },
    orderBy: { createdAt: "asc" },
    take: 8,
  });

  if (announcements.length === 0) {
    return NextResponse.json({ error: "No approved announcements to air" }, { status: 400 });
  }

  const episode = await db.episode.create({
    data: { scheduledAt: new Date(), status: "DRAFT" },
  });

  // Step 1 — generate all texts in parallel
  const [introText, outroText, editorialTexts] = await Promise.all([
    generateIntro(announcements.length),
    generateOutro(),
    Promise.all(
      Array.from({ length: Math.floor(announcements.length / 2) }, () => generateEditorial())
    ),
  ]);

  // Step 2 — generate all TTS audio in parallel
  type AudioJob = { type: string; text: string; key: string; annId?: string; annIdx?: number };

  const jobs: AudioJob[] = [
    { type: "INTRO", text: introText, key: `episodes/${episode.id}/intro.mp3` },
    { type: "OUTRO", text: outroText, key: `episodes/${episode.id}/outro.mp3` },
    ...editorialTexts.map((t, i) => ({
      type: "EDITORIAL",
      text: t,
      key: `episodes/${episode.id}/editorial-${i}.mp3`,
      annIdx: i,
    })),
  ];

  // Add announcements that don't have audioUrl yet
  const annJobMap = new Map<string, string>(); // annId -> existing audioUrl
  for (const ann of announcements) {
    if (ann.audioUrl) {
      annJobMap.set(ann.id, ann.audioUrl);
    } else if (ann.aiText) {
      const letterNumber = ann.letterNumber ?? await db.announcement.count({ where: { createdAt: { lte: ann.createdAt } } });
      const fullText = wrapWithHostIntro(ann.aiText, letterNumber, ann.city);
      jobs.push({
        type: "ANNOUNCEMENT",
        text: fullText,
        key: `announcements/${ann.id}.mp3`,
        annId: ann.id,
      });
    }
  }

  // Run TTS + uploads with concurrency limit (edge-tts hangs with too many parallel calls)
  const CONCURRENCY = 3;
  console.log(`[episode] starting ${jobs.length} TTS jobs (concurrency: ${CONCURRENCY})`);

  const results: ({ url: string } & AudioJob)[] = [];
  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY);
    console.log(`[episode] batch ${Math.floor(i/CONCURRENCY)+1}: ${batch.map(j => j.type).join(", ")}`);
    const batchResults = await Promise.all(
      batch.map(async (job) => {
        console.log(`[episode] TTS start: ${job.type} ${job.key}`);
        const audio = await textToSpeech(job.text);
        console.log(`[episode] TTS done: ${job.type}, uploading...`);
        const url = await uploadAudio(job.key, audio);
        console.log(`[episode] upload done: ${job.key}`);
        return { ...job, url };
      })
    );
    results.push(...batchResults);
  }

  // Save audioUrls for announcements that were newly generated
  await Promise.all(
    results
      .filter((r) => r.type === "ANNOUNCEMENT" && r.annId)
      .map((r) => db.announcement.update({
        where: { id: r.annId },
        data: { audioUrl: r.url },
      }))
  );

  // Step 3 — build ordered queue
  const urlMap = new Map(results.map((r) => [r.key, r.url]));

  const items: { type: string; audioUrl: string; order: number; announcementId?: string }[] = [];
  let order = 0;
  let editorialIdx = 0;

  items.push({ type: "INTRO", audioUrl: urlMap.get(`episodes/${episode.id}/intro.mp3`)!, order: order++ });

  for (let i = 0; i < announcements.length; i++) {
    const ann = announcements[i];
    const audioUrl = annJobMap.get(ann.id) ?? urlMap.get(`announcements/${ann.id}.mp3`);
    if (audioUrl) {
      items.push({ type: "ANNOUNCEMENT", audioUrl, order: order++, announcementId: ann.id });
    }

    if ((i + 1) % 2 === 0 && i < announcements.length - 1) {
      const editUrl = urlMap.get(`episodes/${episode.id}/editorial-${editorialIdx}.mp3`);
      if (editUrl) items.push({ type: "EDITORIAL", audioUrl: editUrl, order: order++ });
      editorialIdx++;
    }
  }

  items.push({ type: "OUTRO", audioUrl: urlMap.get(`episodes/${episode.id}/outro.mp3`)!, order: order++ });

  await db.queueItem.createMany({
    data: items.map((item) => ({
      episodeId: episode.id,
      type: item.type as "INTRO" | "ANNOUNCEMENT" | "EDITORIAL" | "OUTRO" | "MUSIC",
      audioUrl: item.audioUrl,
      order: item.order,
      announcementId: item.announcementId ?? null,
    })),
  });

  await db.episode.update({ where: { id: episode.id }, data: { status: "PUBLISHED" } });

  return NextResponse.json({
    ok: true,
    episodeId: episode.id,
    itemCount: items.length,
    announcementCount: announcements.length,
  });
}

export async function GET() {
  const episode = await db.episode.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { scheduledAt: "desc" },
    include: { _count: { select: { queueItems: true } } },
  });
  return NextResponse.json({ episode: episode ?? null });
}
