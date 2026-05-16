// Radio channels for Радіо Вербиченько
// ⚠️  Музика Росії та Білорусі ВИКЛЮЧЕНА — ці країни є державами-агресорами,
//     що розв'язали збройну агресію проти України.
//
// ─── ЯК ВЗЯТИ ПЛЕЙЛІСТ З YOUTUBE MUSIC ─────────────────────────────
// 1. Відкрий music.youtube.com або youtube.com
// 2. Знайди потрібний плейліст/мікс
// 3. Скопіюй ID з URL після "list=":
//      https://music.youtube.com/playlist?list=PL4fGSI1pDJn6O1LS0XSdF3Q3mCgNpP--f
//                                               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// 4. Встав у поле playlistId каналу нижче
//
// ─── ЯК ДОДАТИ ОКРЕМІ ВІДЕО (якщо немає плейліста) ─────────────────
// Скопіюй посилання: https://www.youtube.com/watch?v=K5KAc5CoCuk
// ID — частина після "v=": K5KAc5CoCuk
// Додай у масив videoIds (якщо playlistId не задано)

export interface Channel {
  id: string;
  name: string;
  emoji: string;
  description: string;
  country: "ua" | "world";
  // Якщо задано playlistId — програвач використовує весь плейліст (YouTube / YT Music)
  // YouTube Music playlist IDs: відкрий music.youtube.com, скопіюй list= з URL
  playlistId?: string;
  videoIds: string[]; // fallback якщо playlistId не задано
}

export const CHANNELS: Channel[] = [
  // ─── Українська музика ─────────────────────────────────────────
  {
    id: "ua-folk",
    name: "Народна",
    emoji: "🌻",
    description: "Українські народні пісні",
    country: "ua",
    // Плейліст "Українські народні пісні" від UА Music на YouTube Music
    // Щоб замінити: music.youtube.com → знайди плейліст → скопіюй list= з URL
    playlistId: "PLwMUOElpNABo8GEA1CkVnmRBGafNv_AZG",
    videoIds: ["K5KAc5CoCuk"], // fallback
  },
  {
    id: "ua-estrada",
    name: "Естрада",
    emoji: "🎤",
    description: "Українська естрада",
    country: "ua",
    // Плейліст "Українська популярна музика"
    playlistId: "PLwMUOElpNABoFXnPJwJKvP8EbNkGMmgTc",
    videoIds: ["K5KAc5CoCuk"], // fallback
  },
  {
    id: "ua-kanal",
    name: "Kanal UA Music",
    emoji: "📺",
    description: "Канал @kanal.UAmusic — українська музика",
    country: "ua",
    // Окремі відео з каналу @kanal.UAmusic (вже перевірені)
    videoIds: ["091V1n0yXMI", "PaYWeaI9Jac", "UO_Fov7-uXM", "Z3MAZre--94"],
  },
  // ─── Зарубіжна музика (без Росії та Білорусі) ──────────────────
  {
    id: "world-mix",
    name: "Світовий мікс",
    emoji: "🌍",
    description: "Зарубіжний мікс (без Росії та Білорусі)",
    country: "world",
    // YouTube Music офіційний плейліст "Pop Music"
    playlistId: "RDCLAK5uy_kmPRjHDMwr47bK339X5CKqmPm2KRHFx1Q",
    videoIds: ["K5KAc5CoCuk"], // fallback
  },
  {
    id: "world-jazz",
    name: "Джаз",
    emoji: "🎷",
    description: "Джаз і лаунж",
    country: "world",
    // YouTube Music офіційний плейліст "Jazz & Blues"
    playlistId: "RDCLAK5uy_lT1gE57t4_gG3BFM8G8eiGXQl-pE5S578",
    videoIds: ["K5KAc5CoCuk"], // fallback
  },
];

// Returns the playlistId if defined, or comma-separated video IDs as fallback.
export function channelPlaylistId(channel: Channel): string | null {
  return channel.playlistId ?? null;
}

// Returns a comma-separated list of all video IDs for a channel (fallback mode).
export function channelPlaylist(channel: Channel): string {
  return channel.videoIds.join(",");
}

// First video ID — used in fallback mode
export function channelFirstVideo(channel: Channel): string {
  return channel.videoIds[0];
}

// Phrases the announcer (Тамара) says between songs
export const BETWEEN_SONG_PHRASES = [
  "А зараз на хвилях Радіо Вербиченько — наступна пісня. Насолоджуйтесь!",
  "Продовжуємо наш ефір. Ось чудова мелодія спеціально для вас, наші дорогі слухачі.",
  "На Радіо Вербиченько, де музика — це любов! Слухайте й насолоджуйтесь.",
  "Дякуємо, що залишаєтесь з нами. Наступна пісня — тільки для вас.",
  "Це Радіо Вербиченько. Ефір триває, і музика не замовкає!",
  "Залишайтесь на нашій хвилі. Попереду ще більше чудових пісень.",
  "А ось і наступний музичний подарунок від нашого ефіру!",
  "Хвилинка — і вже звучить нова пісня на Радіо Вербиченько!",
  "Музика об'єднує нас. Слухайте разом із близькими.",
  "Залишайтеся з нами — найкраща музика ефіру чекає саме вас!",
];

export function randomPhrase(): string {
  return BETWEEN_SONG_PHRASES[
    Math.floor(Math.random() * BETWEEN_SONG_PHRASES.length)
  ];
}
