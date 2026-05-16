import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);
const VOICE = "uk-UA-PolinaNeural";

function preprocessForSpeech(text: string): string {
  return text
    // Normalize ellipsis spacing for natural long pause
    .replace(/\.\.\.\s*/g, "... ")
    // Em dash always breathes with spaces
    .replace(/\s*—\s*/g, " — ")
    // Ensure sentence-ending punctuation has a single space after
    .replace(/([.!?])\s{2,}/g, "$1 ")
    .trim();
}

export async function textToSpeech(text: string): Promise<Buffer> {
  const tmpFile = join(tmpdir(), `tts-${Date.now()}.mp3`);
  const processedText = preprocessForSpeech(text);

  await execFileAsync("edge-tts", [
    "--voice", VOICE,
    "--rate", process.env.TTS_RATE ?? "-5%",
    "--pitch", process.env.TTS_PITCH ?? "+3Hz",
    "--text", processedText,
    "--write-media", tmpFile,
  ]);

  const buffer = await readFile(tmpFile);
  await unlink(tmpFile).catch(() => {});
  return buffer;
}

// hostIntro — LLM-generated warm intro phrase (from generateHostLetterIntro)
// Falls back to simple format if not provided
export function wrapWithHostIntro(aiText: string, hostIntro: string): string {
  return `${hostIntro} ${aiText}`;
}
