# Verbychenko — Repository-Specific Review Overlay

**Extends**: `.github/prompts/review-base.md`

Use the base prompt for structure, output format, deduplication rules, and review philosophy.
This overlay defines all project-specific rules, patterns, and invariants.

---

## Repository Context

- **Purpose**: Ukrainian radio dating show simulator — users submit announcements, AI (Claude/Groq) generates radio-style text, TTS renders audio, Supabase stores MP3s, radio player streams the queue with background music
- **Stack**:
  - Framework: Next.js 16 (App Router), TypeScript strict
  - Database: PostgreSQL via Prisma 7 (adapter-pg)
  - AI: Anthropic Claude Haiku or Groq Llama (LLM), Google TTS HTTP API + optional Voicebox endpoint (TTS)
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
    tts-preview/route.ts — POST: text → TTS → returns audio/mpeg blob (no storage)
    tts-test/route.ts   — GET: dev smoke test (TTS + Supabase upload)
    moderate/route.ts   — POST: Telegram webhook (approve/reject announcements)
    queue/route.ts       — GET: next unplayed queue item for radio player
    episode/build/      — POST: build episode from approved announcements

lib/
  tts.ts               — textToSpeech(text, opts): provider switch + fallback, returns Buffer
  storage.ts           — uploadAudio(filename, buffer): Supabase Storage (REQUIRES service role key)
  r2.ts                — uploadAudio(key, buffer): Cloudflare R2 alternative
  llm.ts               — generateAnnouncement(userData): Claude Haiku or Groq Llama-3.3-70b
  db.ts                — Prisma singleton (PrismaClient + PrismaPg adapter)

prisma/schema.prisma   — Announcement, Episode, QueueItem models
```

### Critical project invariants

#### TTS execution

- Primary TTS is Google Cloud Text-to-Speech via HTTP (`GOOGLE_TTS_API_KEY`)
- Optional provider: Voicebox over HTTP (`VOICEBOX_TTS_URL`)
- Supported providers: `google | voicebox` (`TTS_PROVIDER`)
- Optional fallback provider: `TTS_FALLBACK_PROVIDER`
- Supported profiles: `classic | natural | warm` (`TTS_PROFILE`)
- `tts-preview` provider/profile inputs must be allowlisted and validated server-side

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

2. **Unsafe TTS provider input** — if route accepts arbitrary provider/profile without server-side allowlist validation, flag as critical.

3. **Missing TTS credentials/endpoint guards** — if provider selection can reach Google/Voicebox without explicit env checks and deterministic error handling, flag as critical.

4. **LLM prompt injection** — `formatUserInput()` concatenates unsanitized user input into prompts. New fields must also be sanitized/escaped before use in prompts. Strip control characters.

### 🟡 WARNINGS

5. **Unhandled TTS errors** — `textToSpeech()` must have try/catch at call sites. TTS failure should return controlled JSON errors.

6. **Missing `audioEl.pause()` on navigation** — `HTMLAudioElement` instances created in submit preview must be paused/destroyed when navigating away (step change).

7. **Queue race condition** — `queue/route.ts` marks items as played immediately. If client never actually plays the audio, it's marked played. Consider a heartbeat/confirm play endpoint.

8. **Missing rate limiting** — `/api/announce` and `/api/tts-preview` should have IP-based rate limiting.

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
- `/api/announce` may still need stricter rate limiting in production
