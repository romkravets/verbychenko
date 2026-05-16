import { parseXmlTitles } from "@/lib/rss-parser";
import { NextResponse } from "next/server";

const RSS_FEEDS = [
  "https://www.ukrinform.ua/rss/block-lastnews",
  "https://www.bbc.com/ukrainian/index.xml",
  "https://suspilne.media/rss/all.xml",
];

// Cache up to 5 headlines for 10 min so we don't spam RSS every song.
// Two consecutive news calls within the same cache window return DIFFERENT items.
let cache: {
  headlines: string[];
  fetchedAt: number;
  nextIndex: number;
} | null = null;
const CACHE_TTL = 10 * 60 * 1000;
const MAX_HEADLINES = 5;

async function fetchHeadlines(): Promise<string[]> {
  const results: string[] = [];
  for (const url of RSS_FEEDS) {
    if (results.length >= MAX_HEADLINES) break;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(4000),
        headers: { "User-Agent": "RadioVerbychenko/1.0" },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const titles = parseXmlTitles(xml, MAX_HEADLINES - results.length);
      results.push(...titles);
    } catch {
      /* try next feed */
    }
  }
  return results;
}

/**
 * GET /api/rss-news
 *
 * Returns the next headline from the cache (rotates through up to 5).
 * Refreshes the cache every 10 min.
 *
 * ?all=1 returns the full array (used during news segments to read 2 items).
 */
export async function GET(req: Request) {
  const wantAll = new URL(req.url).searchParams.get("all") === "1";

  // Refresh cache if stale or empty
  if (!cache || Date.now() - cache.fetchedAt >= CACHE_TTL) {
    const headlines = await fetchHeadlines();
    if (headlines.length === 0) {
      return NextResponse.json({ error: "no news" }, { status: 503 });
    }
    cache = { headlines, fetchedAt: Date.now(), nextIndex: 0 };
  }

  if (wantAll) {
    return NextResponse.json({ headlines: cache.headlines });
  }

  // Return the next headline and advance the rotation index
  const headline = cache.headlines[cache.nextIndex % cache.headlines.length];
  cache.nextIndex = (cache.nextIndex + 1) % cache.headlines.length;
  return NextResponse.json({ headline });
}
