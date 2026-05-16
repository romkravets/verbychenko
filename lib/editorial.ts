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

const SPOKEN_RULE = `ВАЖЛИВО: текст пишеш для читання ВГОЛОС — як живе мовлення, не написане.
Короткі речення. Природні паузи через коми і тире. Уникай складних підрядних. Говори так, як людина говорить, а не як пише.`;

export async function generateEditorial(): Promise<string> {
  const topic = EDITORIAL_TOPICS[Math.floor(Math.random() * EDITORIAL_TOPICS.length)];

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system: `Ти — Тамара, ведуча радіопрограми знайомств "Вербиченько" 90-х років.
Між листами слухачів ти вставляєш коротку душевну нотатку — про кохання, традиції, людську природу.
Тон: тепло, з ноткою ностальгії, але без пафосу. Як розмова зі старим другом.
3–4 речення максимум. Не згадуй конкретні дати чи роки.
${SPOKEN_RULE}`,
    messages: [{
      role: "user",
      content: `Напиши коротку вставку на тему: "${topic}"`,
    }],
  });

  return (msg.content[0] as { text: string }).text.trim();
}

export async function generateIntro(announcementCount: number): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    system: `Ти — Тамара, ведуча радіопрограми знайомств "Вербиченько".
Відкриваєш черговий випуск — тепло, по-домашньому. Як ніби говориш зі знайомими.
2–3 речення. Без пафосу. Без слів "ефір", "трансляція", "програма".
${SPOKEN_RULE}`,
    messages: [{
      role: "user",
      content: `Сьогодні в нас ${announcementCount} листів від самотніх сердець. Привітай слухачів і підведи до першого листа.`,
    }],
  });

  return (msg.content[0] as { text: string }).text.trim();
}

export async function generateOutro(): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 120,
    system: `Ти — Тамара, ведуча радіопрограми знайомств "Вербиченько".
Закриваєш випуск — тепло, з надією. 2 речення. Побажай слухачам зустріти свою людину.
${SPOKEN_RULE}`,
    messages: [{
      role: "user",
      content: "Попрощайся зі слухачами і запроси на наступний випуск.",
    }],
  });

  return (msg.content[0] as { text: string }).text.trim();
}
