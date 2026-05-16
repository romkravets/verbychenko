import { NextResponse } from "next/server";

const RSS_FEEDS = [
  "https://www.ukrinform.ua/rss/block-lastnews",
  "https://www.bbc.com/ukrainian/index.xml",
  "https://suspilne.media/rss/all.xml",
];

// Cache headline for 10 min so we don't spam RSS on every song
let cache: { headline: string; fetchedAt: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

function parseXmlTitle(xml: string): string | null {
  // Grab first <item><title> that isn't the channel title
  const items = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) ?? [];
  for (const item of items) {
    const m = item.match(
      /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i,
    );
    if (m && m[1]) {
      return m[1]
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&#\d+;/g, "")
        .trim();
    }
  }
  return null;
}

async function fetchHeadline(): Promise<string | null> {
  for (const url of RSS_FEEDS) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(4000),
        headers: { "User-Agent": "RadioVerbychenko/1.0" },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const title = parseXmlTitle(xml);
      if (title && title.length > 10) return title;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function GET() {
  // Return cached if fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ headline: cache.headline });
  }

  const headline = await fetchHeadline();
  if (!headline) {
    return NextResponse.json({ error: "no news" }, { status: 503 });
  }

  cache = { headline, fetchedAt: Date.now() };
  return NextResponse.json({ headline });
}
