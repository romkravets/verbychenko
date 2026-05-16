// YouTube channel news pipeline
// Fetches latest videos via RSS (no API key needed), extracts transcripts,
// summarizes via LLM for radio delivery, generates TTS audio.

import { YoutubeTranscript } from "youtube-transcript";

export interface NewsChannel {
  id: string;
  name: string;
  category: "politics" | "tech" | "ai" | "general";
  radioStyle: string;
}

// ─── Channel registry ────────────────────────────────────────────────────────
// Find channel ID: go to the channel page → right-click → "View page source"
// → search for "externalId"  OR use https://commentpicker.com/youtube-channel-id.php
export const NEWS_CHANNELS: NewsChannel[] = [
  {
    // Стерненко — замінити на реальний channel ID (знайди на сторінці каналу)
    id: "UCPKMZBQzOZm7BFZiJqCQsaQ",
    name: "Стерненко",
    category: "politics",
    radioStyle:
      "Коротко і по суті — як новинна вставка. Нейтральний, поважний тон. Без оцінок. Тільки факти.",
  },
  {
    // AI-новини — замінити на реальний channel ID
    id: "PLACEHOLDER_AI_NEWS_CHANNEL_ID",
    name: "Штучний інтелект",
    category: "ai",
    radioStyle:
      "Зрозуміло, без жаргону. Поясни що відбулось у світі AI так, щоб будь-яка людина зрозуміла.",
  },
];

// ─── RSS fetch (no API key needed) ───────────────────────────────────────────

interface VideoEntry {
  videoId: string;
  title: string;
  publishedAt: string;
}

export async function fetchLatestVideos(
  channelId: string,
  maxVideos = 3,
): Promise<VideoEntry[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) {
    throw new Error(`RSS fetch failed for channel ${channelId}: ${res.status}`);
  }

  const xml = await res.text();

  const entries: VideoEntry[] = [];
  const entryBlocks = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];

  for (const blockMatch of entryBlocks.slice(0, maxVideos)) {
    const block = blockMatch[1];
    const videoIdMatch = block.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const titleMatch = block.match(/<title>(.*?)<\/title>/);
    const publishedMatch = block.match(/<published>(.*?)<\/published>/);

    if (videoIdMatch && titleMatch) {
      entries.push({
        videoId: videoIdMatch[1],
        title: titleMatch[1]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">"),
        publishedAt: publishedMatch?.[1] ?? new Date().toISOString(),
      });
    }
  }

  return entries;
}

// ─── Transcript extraction ────────────────────────────────────────────────────

export async function getVideoTranscript(videoId: string): Promise<string | null> {
  try {
    let segments;
    try {
      segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: "uk" });
    } catch {
      segments = await YoutubeTranscript.fetchTranscript(videoId);
    }

    if (!segments || segments.length === 0) return null;

    const raw = segments.map((s) => s.text).join(" ");
    return raw
      .replace(/\[.*?\]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 8000);
  } catch {
    return null;
  }
}

// ─── LLM summarization for radio ─────────────────────────────────────────────

function buildRadioNewsSystem(channel: NewsChannel): string {
  return `Ти — Тамара, ведуча радіопрограми "Вербиченько".
Між музикою і листами слухачів ти зачитуєш короткі новинні вставки.

Зараз ти переказуєш відео з каналу "${channel.name}".
Стиль: ${channel.radioStyle}

ПРАВИЛА:
- Починай з: "А тепер коротко про головне..." або "Кілька слів про те, що відбувається..."
- Перекажи суть у 3–5 реченнях. Тільки головне.
- Закінчи плавно: "Це — коротко. Повертаємось до наших листів..."
- Мова: жива усна українська. Короткі речення з природними паузами через коми і тире.
- НЕ вигадуй факти. Якщо інформації мало — скажи менше, але точно.`;
}

export async function summarizeForRadio(
  transcript: string,
  videoTitle: string,
  channel: NewsChannel,
): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? "groq";
  const userMsg = `Назва відео: "${videoTitle}"\n\nТранскрипт:\n${transcript}`;

  if (provider === "claude") {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: buildRadioNewsSystem(channel),
      messages: [{ role: "user", content: userMsg }],
    });
    return (msg.content[0] as { text: string }).text.trim();
  }

  const Groq = (await import("groq-sdk")).default;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const res = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 300,
    messages: [
      { role: "system", content: buildRadioNewsSystem(channel) },
      { role: "user", content: userMsg },
    ],
  });
  return (res.choices[0].message.content ?? "").trim();
}

// ─── Full pipeline ────────────────────────────────────────────────────────────

export interface ProcessedVideo {
  videoId: string;
  channelId: string;
  channelName: string;
  title: string;
  radioText: string;
}

export async function processChannelUpdates(
  channelIds?: string[],
): Promise<ProcessedVideo[]> {
  const { db } = await import("@/lib/db");

  const channels = channelIds
    ? NEWS_CHANNELS.filter((c) => channelIds.includes(c.id))
    : NEWS_CHANNELS.filter((c) => !c.id.startsWith("PLACEHOLDER"));

  const results: ProcessedVideo[] = [];

  for (const channel of channels) {
    let videos: VideoEntry[];
    try {
      videos = await fetchLatestVideos(channel.id, 2);
    } catch (err) {
      console.error(`[news] RSS fetch failed for ${channel.name}:`, err);
      continue;
    }

    for (const video of videos) {
      const existing = await db.youtubeVideo.findUnique({
        where: { videoId: video.videoId },
      });
      if (existing) continue;

      const transcript = await getVideoTranscript(video.videoId);
      if (!transcript) {
        console.log(`[news] no transcript for ${video.videoId} — skipping`);
        continue;
      }

      const radioText = await summarizeForRadio(transcript, video.title, channel);

      results.push({
        videoId: video.videoId,
        channelId: channel.id,
        channelName: channel.name,
        title: video.title,
        radioText,
      });
    }
  }

  return results;
}
