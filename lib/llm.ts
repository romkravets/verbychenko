const TAMARA_PROMPT = `Ти пишеш текст шлюбного оголошення для радіопрограми знайомств "Вербиченько" (Українське радіо, 90-ті роки).

Оголошення пишеться від ПЕРШОЇ ОСОБИ — як лист людини до радіо.

ГОЛОВНЕ ПРАВИЛО: текст пишеш для читання ВГОЛОС. Кожне речення має звучати природно — як жива мова, а не написане. Короткі речення. Паузи через кому і тире. Серце, а не канцелярія.

СТРУКТУРА (саме в такому порядку):
1. Емоційний заклик — одне просте речення: "Де ти, мій коханий? Відгукнись!", або "Відгукніться, хто втомився від самотності", або "Мужній лицар, озовися!"
2. Коротко про себе: вік, зріст чи вага (якщо є), колір волосся — просто, по-людськи, без списку
3. Освіта, робота, житло — одним живим реченням, якщо вказано
4. Характер та інтереси — 2–3 риси, щиро і тепло, не перелік
5. Кого шукаю — вік і 2–3 риси, як мрія, а не технічне завдання
6. Дискваліфікатори: "П'яниць і зайвих проблем прошу не турбувати" — якщо доречно
7. Прохання про фото — одне коротке речення, якщо доречно

МОВА: жива розмовна українська. Не суржик, але й не підручник. Так, як говорять серцем.
ПУНКТУАЦІЯ: коми і тире там, де людина зробила б паузу вголос. Крапка після кожного завершеного думки.
ДОВЖИНА: 6–9 речень. Не більше.
НЕ додавай "Лист номер" — це скаже ведуча окремо.
НЕ додавай вступних рядків, підписів чи коментарів — лише сам текст.`;

/**
 * Remove any leading meta-line the LLM might prepend, e.g.:
 * "Оголошення готове до ефіру в стилі..."
 * "Ось ваше оголошення:"
 * "**Оголошення:**"
 */
function cleanLLMOutput(text: string): string {
  return text
    .replace(/^[\s\S]*?(?=(?:Де ти|Відгукніть|Мужній|Шукаю|[А-ЯІЇЄҐ]))/u, "")
    .trim();
}

function formatUserInput(data: {
  name: string;
  age: number;
  city: string;
  height?: number;
  weight?: number;
  hairColor?: string;
  education?: string;
  housing?: string;
  about: string;
  lookingFor: string;
}): string {
  const parts = [
    `Ім'я: ${data.name}`,
    `Вік: ${data.age}`,
    `Місто: ${data.city}`,
    data.height ? `Зріст: ${data.height} см` : null,
    data.weight ? `Вага: ${data.weight} кг` : null,
    data.hairColor ? `Колір волосся: ${data.hairColor}` : null,
    data.education ? `Освіта: ${data.education}` : null,
    data.housing ? `Житло: ${data.housing}` : null,
    `Про себе: ${data.about}`,
    `Кого шукаю: ${data.lookingFor}`,
  ].filter(Boolean);

  return parts.join("\n");
}

const HOST_INTRO_PROMPT = `Ти — Тамара, ведуча радіопрограми знайомств "Вербиченько" на Українському радіо, 90-ті роки.
Перед кожним листом від слухача говориш коротку, теплу вставку — щоб людина відчула, що її лист особливий.

ПРАВИЛА:
- Рівно 1–2 речення. Не більше.
- Тепло, по-радійному, з легкою інтонацією ведучої
- Кожного разу різні формулювання — не повторюйся
- Скажи звідки лист (місто) і м'яко підведи до читання
- НЕ кажи слова "ведуча", "програма", "ефір" — просто говори

Стиль (варіюй, не копіюй дослівно):
"А ось наступний лист — аж із Харкова надійшов. Послухаємо разом..."
"Нам написала жінка з Полтави — і її слова варті того, щоб їх почути."
"Із Одеси прийшов цей лист. Читаємо..."
"Знаєте, є листи, які хочеться читати повільно. Ось один такий — з Дніпра."
"Ще один відгук — цього разу з Вінниці. Слухаємо..."`;

type AnnouncementInput = Parameters<typeof formatUserInput>[0];

export async function generateHostLetterIntro(letterNumber: number, city: string): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? "groq";
  const userMsg = `Лист номер ${letterNumber}, надійшов із міста ${city}.`;

  if (provider === "claude") {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      system: HOST_INTRO_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    });
    return (msg.content[0] as { text: string }).text.trim();
  }

  const Groq = (await import("groq-sdk")).default;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const res = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 80,
    messages: [
      { role: "system", content: HOST_INTRO_PROMPT },
      { role: "user", content: userMsg },
    ],
  });
  return (res.choices[0].message.content ?? "").trim();
}

export async function generateAnnouncement(
  userData: AnnouncementInput,
): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? "groq";

  if (provider === "claude") {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: TAMARA_PROMPT,
      messages: [{ role: "user", content: formatUserInput(userData) }],
    });
    return cleanLLMOutput((msg.content[0] as { text: string }).text);
  }

  // default: groq
  const Groq = (await import("groq-sdk")).default;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const res = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 400,
    messages: [
      { role: "system", content: TAMARA_PROMPT },
      { role: "user", content: formatUserInput(userData) },
    ],
  });
  return cleanLLMOutput(res.choices[0].message.content ?? "");
}
