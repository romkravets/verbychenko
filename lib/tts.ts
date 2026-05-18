const VOICE = "uk-UA-Wavenet-A";

function preprocessForSpeech(text: string): string {
  return text
    .replace(/\.\.\.\s*/g, "... ")
    .replace(/\s*—\s*/g, " — ")
    .replace(/([.!?])\s{2,}/g, "$1 ")
    .trim();
}

export async function textToSpeech(text: string): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_TTS_API_KEY not set");

  const processedText = preprocessForSpeech(text);

  // speaking_rate: 0.75–1.0 (slower = more dramatic), pitch: -5.0 to +5.0
  const speakingRate = parseFloat(process.env.TTS_RATE ?? "0.85");
  const pitch = parseFloat(process.env.TTS_PITCH ?? "0.0");

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: processedText },
        voice: { languageCode: "uk-UA", name: VOICE },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate,
          pitch,
          sampleRateHertz: 24000,
        },
      }),
    },
  );

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Google TTS error ${res.status}: ${msg}`);
  }

  const data = (await res.json()) as { audioContent: string };
  return Buffer.from(data.audioContent, "base64");
}

// hostIntro — LLM-generated warm intro phrase (from generateHostLetterIntro)
// Falls back to simple format if not provided
export function wrapWithHostIntro(aiText: string, hostIntro: string): string {
  return `${hostIntro} ${aiText}`;
}
