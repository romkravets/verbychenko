type TtsProvider = "google" | "voicebox";
type TtsProfile = "classic" | "natural" | "warm";

type TtsOptions = {
  provider?: TtsProvider;
  profile?: TtsProfile;
};

const DEFAULT_PROVIDER: TtsProvider =
  (process.env.TTS_PROVIDER as TtsProvider) || "google";
const DEFAULT_PROFILE: TtsProfile =
  (process.env.TTS_PROFILE as TtsProfile) || "classic";

const PROFILE_CONFIG: Record<TtsProfile, { voice: string; speakingRate: number; pitch: number }> = {
  classic: { voice: "uk-UA-Wavenet-A", speakingRate: 0.85, pitch: 0.0 },
  natural: { voice: "uk-UA-Neural2-A", speakingRate: 0.92, pitch: -0.3 },
  warm: { voice: "uk-UA-Wavenet-A", speakingRate: 0.88, pitch: -1.0 },
};

function parseProvider(value: string | undefined): TtsProvider | undefined {
  if (value === "google" || value === "voicebox") return value;
  return undefined;
}

function parseProfile(value: string | undefined): TtsProfile {
  if (value === "classic" || value === "natural" || value === "warm") return value;
  return DEFAULT_PROFILE;
}

function getFallbackProvider(current: TtsProvider): TtsProvider | null {
  const fallback = parseProvider(process.env.TTS_FALLBACK_PROVIDER);
  if (!fallback || fallback === current) return null;
  return fallback;
}

function preprocessForSpeech(text: string): string {
  return text
    .replace(/\.\.\.\s*/g, "... ")
    .replace(/\s*—\s*/g, " — ")
    .replace(/([.!?])\s{2,}/g, "$1 ")
    .trim();
}

async function synthesizeGoogle(text: string, profile: TtsProfile): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_TTS_API_KEY not set");

  const profileCfg = PROFILE_CONFIG[profile];
  const voice = process.env.GOOGLE_TTS_VOICE || profileCfg.voice;

  const speakingRateRaw = process.env.TTS_RATE;
  const pitchRaw = process.env.TTS_PITCH;

  // Keep env vars as hard override; otherwise use profile defaults.
  const speakingRate = Number.isFinite(Number(speakingRateRaw))
    ? Number(speakingRateRaw)
    : profileCfg.speakingRate;
  const pitch = Number.isFinite(Number(pitchRaw))
    ? Number(pitchRaw)
    : profileCfg.pitch;

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "uk-UA", name: voice },
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

async function synthesizeVoicebox(text: string): Promise<Buffer> {
  const endpoint = process.env.VOICEBOX_TTS_URL;
  if (!endpoint) {
    throw new Error("VOICEBOX_TTS_URL not set");
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, format: "mp3" }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Voicebox TTS error ${res.status}: ${msg}`);
  }

  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = (await res.json()) as { audioContent?: string };
    if (!data.audioContent) {
      throw new Error("Voicebox response missing audioContent");
    }
    return Buffer.from(data.audioContent, "base64");
  }

  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

export async function textToSpeech(text: string, opts?: TtsOptions): Promise<Buffer> {
  const processedText = preprocessForSpeech(text);
  const provider = opts?.provider ?? DEFAULT_PROVIDER;
  const profile = parseProfile(opts?.profile);

  try {
    if (provider === "voicebox") {
      return await synthesizeVoicebox(processedText);
    }

    return await synthesizeGoogle(processedText, profile);
  } catch (err) {
    const fallback = getFallbackProvider(provider);
    if (!fallback) throw err;

    if (fallback === "voicebox") {
      return synthesizeVoicebox(processedText);
    }

    return synthesizeGoogle(processedText, profile);
  }
}

// hostIntro — LLM-generated warm intro phrase (from generateHostLetterIntro)
// Falls back to simple format if not provided
export function wrapWithHostIntro(aiText: string, hostIntro: string): string {
  return `${hostIntro} ${aiText}`;
}
