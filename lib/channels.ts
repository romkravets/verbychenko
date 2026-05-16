// Radio channels for Радіо Вербиченько
// ⚠️  Музика Росії та Білорусі ВИКЛЮЧЕНА — ці країни є державами-агресорами,
//     що розв'язали збройну агресію проти України.
//
// ─── ЯК ДОДАТИ ПІСНЮ ────────────────────────────────────────────────
// Скопіюй посилання з YouTube, наприклад:
//   https://www.youtube.com/watch?v=K5KAc5CoCuk
// ID — це частина після "v=":  K5KAc5CoCuk
// Додай цей ID у масив videoIds потрібного каналу.

export interface Channel {
  id: string;
  name: string;
  emoji: string;
  description: string;
  country: "ua" | "world";
  videoIds: string[]; // YouTube video IDs — НЕ playlist IDs!
}

export const CHANNELS: Channel[] = [
  // ─── Українська музика ─────────────────────────────────────────
  {
    id: "ua-folk",
    name: "Народна",
    emoji: "🌻",
    description: "Українські народні пісні",
    country: "ua",
    // TODO: додай реальні YouTube video IDs українських народних пісень
    videoIds: ["K5KAc5CoCuk"], // тимчасова заглушка
  },
  {
    id: "ua-estrada",
    name: "Естрада",
    emoji: "🎤",
    description: "Українська естрада",
    country: "ua",
    // TODO: додай реальні YouTube video IDs української естради
    videoIds: ["K5KAc5CoCuk"], // тимчасова заглушка
  },
  {
    id: "ua-kanal",
    name: "Kanal UA Music",
    emoji: "📺",
    description: "Канал @kanal.UAmusic — українська музика",
    country: "ua",
    videoIds: ["091V1n0yXMI", "PaYWeaI9Jac", "UO_Fov7-uXM", "Z3MAZre--94"],
  },
  // ─── Зарубіжна музика (без Росії та Білорусі) ──────────────────
  {
    id: "world-mix",
    name: "Світовий мікс",
    emoji: "🌍",
    description: "Зарубіжний мікс (без Росії та Білорусі)",
    country: "world",
    videoIds: [
      "K5KAc5CoCuk", // Indila — Dernière Danse (France)
      // TODO: додай ще світові пісні
    ],
  },
  {
    id: "world-jazz",
    name: "Джаз",
    emoji: "🎷",
    description: "Джаз і лаунж",
    country: "world",
    // TODO: додай real video IDs джазових пісень
    videoIds: ["K5KAc5CoCuk"], // тимчасова заглушка
  },
];

// Returns a comma-separated list of all video IDs for a channel.
// YouTube IFrame API accepts this format in the `playlist` playerVar.
export function channelPlaylist(channel: Channel): string {
  return channel.videoIds.join(",");
}

// First video ID — used as the initial videoId for the player
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
