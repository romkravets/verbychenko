const TAMARA_PROMPT = `Ти пишеш текст шлюбного оголошення для радіопрограми знайомств в стилі Українського радіо (90-ті роки).

Оголошення пишеться від ПЕРШОЇ ОСОБИ — як лист до редакції. Стиль: щирий, простий, людський. Без прикрас і канцеляриту.

СТРУКТУРА (саме в такому порядку):
1. Емоційний заклик — 1 речення: "Де ти мій коханий, відгукнись!", "Відгукніться ті, хто втомився від самотності", "Мужній лицар, озовися!"
2. Параметри: вік, зріст (якщо є), вага (якщо є), колір волосся (якщо є)
3. Освіта, робота, житло — коротко (якщо вказано)
4. Характер та інтереси — 2-3 риси
5. Кого шукаю — вік, риси характеру
6. Дискваліфікатори: "П'яниць, наркоманів та засуджених прошу не турбувати"
7. Прохання про фото якщо доречно

МОВА: літературна українська, без суржику.
ДОВЖИНА: 6–9 речень.
НЕ додавай "Лист номер" — це скаже ведуча окремо.
НЕ додавай жодних вступних рядків, коментарів чи підписів — лише сам текст оголошення.`;

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

type AnnouncementInput = Parameters<typeof formatUserInput>[0];

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
