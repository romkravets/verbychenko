import { NextRequest, NextResponse } from "next/server";

// Vercel Cron викликає цей маршрут о 07:00 та 15:00 UTC (10:00 та 18:00 Київ)
// Налаштування розкладу — у vercel.json
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Vercel надсилає цей заголовок для всіх cron-запитів
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const isManual = req.headers.get("x-build-secret") === process.env.EPISODE_BUILD_SECRET;

  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const secret = process.env.EPISODE_BUILD_SECRET!;
  const headers = { "Content-Type": "application/json", "x-build-secret": secret };

  try {
    // Крок 1 — підхоплюємо нові відео з YouTube каналів
    const newsRes = await fetch(`${base}/api/news/sync`, { method: "POST", headers });
    const newsData = await newsRes.json();
    console.log("[cron] news sync:", newsData);

    // Крок 2 — будуємо епізод з усіх підтверджених оголошень
    const buildRes = await fetch(`${base}/api/episode/build`, { method: "POST", headers, body: JSON.stringify({}) });
    const buildData = await buildRes.json();
    console.log("[cron] episode build:", buildData);

    if (!buildRes.ok) {
      return NextResponse.json({ ok: false, step: "episode/build", error: buildData }, { status: 500 });
    }

    // Крок 3 — якщо були новини, додаємо їх до щойно створеного епізоду
    if (newsData.count > 0 && buildData.episodeId) {
      const newsWithEpisode = await fetch(`${base}/api/news/sync`, {
        method: "POST",
        headers,
        body: JSON.stringify({ episodeId: buildData.episodeId }),
      });
      console.log("[cron] news attached to episode:", await newsWithEpisode.json());
    }

    return NextResponse.json({
      ok: true,
      episodeId: buildData.episodeId,
      newsCount: newsData.count ?? 0,
      announcementCount: buildData.announcementCount ?? 0,
    });
  } catch (err) {
    console.error("[cron] daily-show error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
