// Radio channels for Радіо Вербиченька
// ⚠️  Музика Росії та Білорусі ВИКЛЮЧЕНА — ці країни є державами-агресорами,
//     що розв'язали збройну агресію проти України.
//
// ─── ЯК НАЛАШТУВАТИ КАНАЛИ ЧЕРЕЗ .env ──────────────────────────────
// Змінні NEXT_PUBLIC_RADIO_* читаються на клієнті та сервері.
// Можна вказати кілька плейлістів через кому — кожного разу буде обиратись випадковий:
//
//   NEXT_PUBLIC_RADIO_UA_FOLK_PLAYLISTS=PLabc123,PLdef456
//   NEXT_PUBLIC_RADIO_UA_ESTRADA_PLAYLISTS=PLxxx
//   NEXT_PUBLIC_RADIO_UA_KANAL_VIDEOS=videoId1,videoId2
//   NEXT_PUBLIC_RADIO_WORLD_MIX_PLAYLISTS=RDCLAKxxx,RDCLAKyyy
//   NEXT_PUBLIC_RADIO_WORLD_JAZZ_PLAYLISTS=RDCLAKzzz
//
// ─── ЯК ЗНАЙТИ ID ПЛЕЙЛІСТА ─────────────────────────────────────────
// YouTube Music: music.youtube.com → відкрий плейліст → скопіюй list= з URL
// YouTube:       youtube.com/playlist?list=PL...
//
// ─── ЯК ДОДАТИ ОКРЕМІ ВІДЕО (без плейліста) ─────────────────────────
// В URL https://www.youtube.com/watch?v=K5KAc5CoCuk ID — це K5KAc5CoCuk
// Вкажи кілька через кому в NEXT_PUBLIC_RADIO_*_VIDEOS

/** Split a comma-separated env value into a trimmed, non-empty array. */
function envList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface Channel {
  id: string;
  name: string;
  emoji: string;
  description: string;
  country: "ua" | "world";
  /**
   * One or more YouTube / YT Music playlist IDs.
   * If multiple are provided (from env, comma-separated), a random one is
   * picked per session to give variety to repeat listeners.
   */
  playlistIds: string[];
  /** Fallback video IDs used when playlistIds is empty. */
  videoIds: string[];
}

// NOTE: process.env.NEXT_PUBLIC_* must be accessed with STATIC dot notation here.
// Next.js replaces these at build time — bracket notation (process.env[key])
// produces undefined in the browser bundle.
export const CHANNELS: Channel[] = [
  // ─── Українська музика ──────────────────────────────────────────
  {
    id: "ua-folk",
    name: "Народна",
    emoji: "🌻",
    description: "Українські народні пісні",
    country: "ua",
    playlistIds: envList(process.env.NEXT_PUBLIC_RADIO_UA_FOLK_PLAYLISTS),
    videoIds: ["K5KAc5CoCuk"],
  },
  {
    id: "ua-estrada",
    name: "Естрада",
    emoji: "🎤",
    description: "Українська естрада",
    country: "ua",
    playlistIds: envList(process.env.NEXT_PUBLIC_RADIO_UA_ESTRADA_PLAYLISTS),
    videoIds: ["K5KAc5CoCuk"],
  },
  {
    id: "ua-kanal",
    name: "Kanal UA Music",
    emoji: "📺",
    description: "Канал @kanal.UAmusic — українська музика",
    country: "ua",
    // Supports both a playlist (NEXT_PUBLIC_RADIO_UA_KANAL_PLAYLISTS) and
    // individual video IDs (NEXT_PUBLIC_RADIO_UA_KANAL_VIDEOS)
    playlistIds: envList(process.env.NEXT_PUBLIC_RADIO_UA_KANAL_PLAYLISTS),
    videoIds: envList(process.env.NEXT_PUBLIC_RADIO_UA_KANAL_VIDEOS),
  },
  // ─── Зарубіжна музика (без Росії та Білорусі) ───────────────────
  {
    id: "world-mix",
    name: "Світовий мікс",
    emoji: "🌍",
    description: "Зарубіжний мікс (без Росії та Білорусі)",
    country: "world",
    playlistIds: envList(process.env.NEXT_PUBLIC_RADIO_WORLD_MIX_PLAYLISTS),
    videoIds: ["K5KAc5CoCuk"],
  },
  {
    id: "world-jazz",
    name: "Джаз",
    emoji: "🎷",
    description: "Джаз і лаунж",
    country: "world",
    playlistIds: envList(process.env.NEXT_PUBLIC_RADIO_WORLD_JAZZ_PLAYLISTS),
    videoIds: ["K5KAc5CoCuk"],
  },
];

/**
 * Pick a random playlist ID from the channel's pool.
 * Returns null if the channel has no playlists (falls back to videoIds).
 * Randomisation happens once per component mount — each page load may get
 * a different playlist, providing variety for repeat listeners.
 */
export function channelPickPlaylist(channel: Channel): string | null {
  if (!channel.playlistIds.length) return null;
  return channel.playlistIds[
    Math.floor(Math.random() * channel.playlistIds.length)
  ];
}

/** Returns a comma-separated list of video IDs for fallback mode. */
export function channelPlaylist(channel: Channel): string {
  return channel.videoIds.join(",");
}

/** First video ID — used as the videoId param in fallback mode. */
export function channelFirstVideo(channel: Channel): string {
  return channel.videoIds[0] ?? "";
}

// Phrases the announcer (Тамара) says between songs
export const BETWEEN_SONG_PHRASES = [
  "А зараз на хвилях Радіо Вербиченька — наступна пісня. Насолоджуйтесь!",
  "Продовжуємо наш ефір. Ось чудова мелодія спеціально для вас, наші дорогі слухачі.",
  "На Радіо Вербиченька, де музика — це любов! Слухайте й насолоджуйтесь.",
  "Дякуємо, що залишаєтесь з нами. Наступна пісня — тільки для вас.",
  "Це Радіо Вербиченька. Ефір триває, і музика не замовкає!",
  "Залишайтесь на нашій хвилі. Попереду ще більше чудових пісень.",
  "А ось і наступний музичний подарунок від нашого ефіру!",
  "Хвилинка — і вже звучить нова пісня на Радіо Вербиченька!",
  "Музика об'єднує нас. Слухайте разом із близькими.",
  "Залишайтеся з нами — найкраща музика ефіру чекає саме вас!",
];

export function randomPhrase(): string {
  return BETWEEN_SONG_PHRASES[
    Math.floor(Math.random() * BETWEEN_SONG_PHRASES.length)
  ];
}
