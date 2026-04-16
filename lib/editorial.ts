import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EDITORIAL_TOPICS = [
  "традиції сватання на Поліссі",
  "українські весільні звичаї",
  "цікавий факт про кохання в різних регіонах України",
  "прислів'я про сім'ю та кохання",
  "як раніше знайомились в українських селах",
  "легенда про кохання з українського фольклору",
  "традиції вишивання рушників для весілля",
];

// Generates a short editorial insert in the style of the host
export async function generateEditorial(): Promise<string> {
  const topic = EDITORIAL_TOPICS[Math.floor(Math.random() * EDITORIAL_TOPICS.length)];

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system: `Ти — ведуча радіопрограми знайомств "Вербиченько" 90-х років.
Пишеш короткі редакційні вставки між оголошеннями — теплі, душевні, з легкою ноткою ностальгії.
Текст має звучати як живе радіо: без зайвих слів, природно, 3-4 речення максимум.
Не використовуй слова "сьогодні", не посилайся на конкретні дати чи роки.`,
    messages: [{
      role: "user",
      content: `Напиши коротку вставку на тему: "${topic}"`
    }],
  });

  return (msg.content[0] as { text: string }).text.trim();
}

// Generates host intro for the episode
export async function generateIntro(announcementCount: number): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    system: `Ти — ведуча радіопрограми знайомств. Пишеш вступне слово до чергового випуску.
Тепло, лаконічно, по-радійному. 2-3 речення.`,
    messages: [{
      role: "user",
      content: `Привітай слухачів і скажи що сьогодні в ефірі ${announcementCount} оголошень від самотніх сердець.`
    }],
  });

  return (msg.content[0] as { text: string }).text.trim();
}

// Generates host outro
export async function generateOutro(): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    system: `Ти — ведуча радіопрограми знайомств. Пишеш завершальне слово. Тепло, коротко, 2 речення.`,
    messages: [{
      role: "user",
      content: `Попрощайся зі слухачами і запроси на наступний випуск.`
    }],
  });

  return (msg.content[0] as { text: string }).text.trim();
}
