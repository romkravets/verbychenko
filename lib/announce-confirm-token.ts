import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_MAX_AGE_SEC = 24 * 60 * 60;

function getSecret(): string {
  const secret =
    process.env.ANNOUNCE_CONFIRM_SECRET ?? process.env.EPISODE_BUILD_SECRET;
  if (!secret) {
    throw new Error(
      "ANNOUNCE_CONFIRM_SECRET (or EPISODE_BUILD_SECRET fallback) is required",
    );
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createConfirmToken(announcementId: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const payload = `${announcementId}.${ts}`;
  const signature = signPayload(payload);
  return `${ts}.${signature}`;
}

export function verifyConfirmToken(
  announcementId: string,
  token: string | null,
  maxAgeSec = DEFAULT_MAX_AGE_SEC,
): boolean {
  if (!token) return false;

  const dot = token.indexOf(".");
  if (dot <= 0) return false;

  const tsRaw = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const ts = Number(tsRaw);

  if (!Number.isInteger(ts) || ts <= 0 || signature.length === 0) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - ts > maxAgeSec) return false;
  if (ts - now > 60) return false;

  const payload = `${announcementId}.${ts}`;
  const expected = signPayload(payload);

  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");

  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
