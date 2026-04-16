import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);
const VOICE = "uk-UA-PolinaNeural";

export async function textToSpeech(text: string): Promise<Buffer> {
  const tmpFile = join(tmpdir(), `tts-${Date.now()}.mp3`);

  await execFileAsync("edge-tts", [
    "--voice", VOICE,
    "--rate", process.env.TTS_RATE ?? "-10%",   // трохи повільніше — радійний стиль
    "--pitch", process.env.TTS_PITCH ?? "+5Hz",  // трохи тепліший тон
    "--text", text,
    "--write-media", tmpFile,
  ]);

  const buffer = await readFile(tmpFile);
  await unlink(tmpFile).catch(() => {});
  return buffer;
}

export function wrapWithHostIntro(aiText: string, letterNumber: number, city: string): string {
  return `Лист номер ${letterNumber} з ${city}. ${aiText} Це лист номер ${letterNumber}.`;
}
