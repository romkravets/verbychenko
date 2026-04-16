# Verbychenko — Repository-Specific Review Overlay

**Extends**: `.github/prompts/review-base.md`

Use the base prompt for structure, output format, deduplication rules, and review philosophy.
This overlay defines all project-specific rules, patterns, and invariants.

---

## Repository Context

- **Purpose**: Ukrainian radio dating show simulator — users submit announcements, AI (Claude/Groq) generates radio-style text, edge-tts renders audio, Supabase stores MP3s, radio player streams the queue with background music
- **Stack**:
  - Framework: Next.js 16 (App Router), TypeScript strict
  - Database: PostgreSQL via Prisma 7 (adapter-pg)
  - AI: Anthropic Claude Haiku or Groq Llama (LLM), edge-tts Python CLI (TTS)
  - Storage: Supabase Storage (audio bucket) — requires `SUPABASE_SERVICE_ROLE_KEY` (not publishable key)
  - Secondary storage: Cloudflare R2 (`lib/r2.ts`) — available but not default
  - Telegram: moderation bot (Phase 3)
- **Package manager**: npm

### Architecture

```
app/
  page.tsx              — Radio landing page + player
  submit/page.tsx       — Announcement submission form (3-step: form → preview → done)
  api/
    announce/route.ts   — POST: validate → LLM generate → Prisma save (PENDING status)
    tts-preview/route.ts — POST: text → edge-tts → returns audio/mpeg blob (no storage)
    tts-test/route.ts   — GET: dev smoke test (TTS + Supabase upload)
    moderate/route.ts   — POST: Telegram webhook (approve/reject announcements)
    queue/route.ts       — GET: next unplayed queue item for radio player
    episode/build/      — POST: build episode from approved announcements

lib/
  tts.ts               — textToSpeech(text): execFileAsync("edge-tts"), reads output file, returns Buffer
  storage.ts           — uploadAudio(filename, buffer): Supabase Storage (REQUIRES service role key)
  r2.ts                — uploadAudio(key, buffer): Cloudflare R2 alternative
  llm.ts               — generateAnnouncement(userData): Claude Haiku or Groq Llama-3.3-70b
  db.ts                — Prisma singleton (PrismaClient + PrismaPg adapter)

prisma/schema.prisma   — Announcement, Episode, QueueItem models
```

### Critical project invariants

#### TTS execution

- `edge-tts` Python CLI (v7.2.8+) must be installed: `pip install edge-tts`
- Voice: `uk-UA-PolinaNeural` — NEVER change without stakeholder approval
- After `execFileAsync("edge-tts", ["--write-media", path, ...])`, the file IS at `path` (not a subdirectory)
- NEVER use `msedge-tts` npm package — it creates directory structure and fails in Node.js environment

#### Supabase Storage

- `storage.ts` uses `SUPABASE_SERVICE_ROLE_KEY` — must be the **secret key** (`sb_secret_...` or JWT), NOT the publishable key (`sb_publishable_...`)
- Using publishable key causes `row-level security policy` upload failures
- RLS policy: only service role can upload to `audio` bucket (anon reads allowed for public URLs)

#### Announcement lifecycle

```
PENDING → APPROVED → in Episode (QueueItem) → PLAYED
         ↓
      REJECTED
```

- Never skip status transitions
- `letterNumber` is assigned when moving to APPROVED (sequential)

#### LLM

- Prompt is in `TAMARA_PROMPT` — radio announcer persona from 90s Ukrainian radio
- Announcements write in FIRST PERSON as the person seeking a partner
- NEVER output "Лист номер" — that's prepended by `wrapWithHostIntro()` in `lib/tts.ts`
- Max 400 tokens — keep it concise

#### Audio preview endpoint

- `/api/tts-preview` — streaming: returns binary `audio/mpeg`, no Supabase upload
- Max input: 1000 chars (DoS prevention)
- Response: `Content-Type: audio/mpeg`, `Cache-Control: no-store`

---

## Project-Specific Review Rules

### 🔴 CRITICAL

1. **Wrong Supabase key** — if `SUPABASE_SERVICE_ROLE_KEY` is assigned value of `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, flag immediately. Uploadswill silently fail with RLS error.

2. **msedge-tts npm usage** — if any code imports from `msedge-tts`, flag as critical regression. Use `edge-tts` CLI only.

3. **TTS output path** — `--write-media` must point to a `.mp3` file path. Never use the path as a directory to look for `audio.mp3` inside.

4. **LLM prompt injection** — `formatUserInput()` concatenates unsanitized user input into prompts. New fields must also be sanitized/escaped before use in prompts. Strip control characters.

### 🟡 WARNINGS

5. **Unhandled TTS errors** — `textToSpeech()` must have try/catch at call sites. TTS failure should not crash the request.

6. **Missing `audioEl.pause()` on navigation** — `HTMLAudioElement` instances created in submit preview must be paused/destroyed when navigating away (step change).

7. **Queue race condition** — `queue/route.ts` marks items as played immediately. If client never actually plays the audio, it's marked played. Consider a heartbeat/confirm play endpoint.

8. **Missing rate limiting** — `/api/announce` and `/api/tts-preview` have no rate limiting. Add IP-based rate limiter before production.

### 🔵 STYLE / PATTERNS

9. **Prisma in route handlers** — always use singleton `db` from `lib/db.ts`, never instantiate `new PrismaClient()` in route files.

10. **Storage abstraction** — upload calls should go through `lib/storage.ts`, never call Supabase client directly in route files.

11. **Form state** — `SubmitPage` uses controlled inputs with `handleChange`. New fields must follow same pattern and be added to `FormData` interface and `initialForm`.

12. **Ukrainian text** — all UI strings must be in Ukrainian. No English in user-facing text.

---

## Score / Status Invariants

| Status   | Meaning                                    | Next allowed transitions |
| -------- | ------------------------------------------ | ------------------------ |
| PENDING  | Submitted, awaiting moderation             | APPROVED, REJECTED       |
| APPROVED | Passed moderation, can be added to episode | —                        |
| REJECTED | Declined                                   | —                        |

---

## Known Issues (do not flag as new)

- Episode builder `app/api/episode/build/` is empty — Phase 2 work in progress
- Music/crossfade system — planned, not yet implemented
- Telegram bot webhook — skeleton only, `TODO: Фаза 3` in code
- No rate limiting on `/api/announce` or `/api/tts-preview`
