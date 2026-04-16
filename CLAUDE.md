@AGENTS.md

# CLAUDE.md — Verbychenko

Ukrainian radio dating show simulator. Users submit dating announcements via a web form; AI (Claude/Groq) rewrites them in the style of 90s Ukrainian public radio; edge-tts (Microsoft Neural Voice) renders audio; Supabase stores MP3s; a radio player streams them with background music.

---

## Commands

```bash
npm run dev        # Start dev server (Next.js 16)
npm run build      # Production build
npm run lint       # ESLint

# One-time setup — must have edge-tts Python CLI installed
pip install edge-tts

# Prisma migrations
npx prisma migrate dev --name "description"
npx prisma generate
npx prisma studio    # GUI to inspect DB

# Smoke test TTS + Storage
curl -s http://localhost:3000/api/tts-test
```

Required `.env` variables: `DATABASE_URL`, `DIRECT_URL`, `GROQ_API_KEY` or `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, **`SUPABASE_SERVICE_ROLE_KEY`** (must be `sb_secret_...` from Supabase Dashboard → Project Settings → API).

---

## Architecture

**Next.js 16 App Router** + TypeScript + Tailwind CSS 4. Database: PostgreSQL via Prisma 7 (PrismaPg adapter). AI: Groq Llama (free) or Claude Haiku. TTS: edge-tts Python CLI.

### Routes

```
GET  /                       → Radio landing page + live player
GET  /submit                 → Announcement submission form (3-step)

POST /api/announce           → Submit announcement → LLM → DB (PENDING)
POST /api/tts-preview        → Text → edge-tts → returns audio/mpeg blob (no storage)
GET  /api/tts-test           → Dev smoke test: TTS + Supabase upload
POST /api/moderate           → Telegram webhook (approve / reject)
GET  /api/queue?episodeId=   → Next unplayed QueueItem for radio player
POST /api/episode/build      → Build episode from approved announcements (TODO)
```

### Announcement pipeline

```
User fills form (submit/page.tsx)
  → POST /api/announce
  → formatUserInput() → LLM (TAMARA_PROMPT) → aiText
  → db.announcement.create({ status: PENDING })
  → returns { id, aiText }

User previews text, clicks "Прослухати" → POST /api/tts-preview → plays audio/mpeg blob
User confirms → setStep("done")  (TODO: trigger moderation flow)

Moderator approves via Telegram bot
  → POST /api/moderate (Telegram callback_query)
  → db.announcement.update({ status: APPROVED })
  → (TODO Phase 3) textToSpeech(aiText) → uploadAudio → db.update({ audioUrl })

Radio player
  → GET /api/queue?episodeId=xxx → { audioUrl, type }
  → plays audio; loops
```

### Key files

| File                           | Purpose                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| `lib/tts.ts`                   | `textToSpeech(text)` — calls `edge-tts` CLI, returns Buffer                |
| `lib/storage.ts`               | `uploadAudio(path, buffer)` — Supabase Storage (service role key required) |
| `lib/r2.ts`                    | `uploadAudio(key, buffer)` — Cloudflare R2 alternative                     |
| `lib/llm.ts`                   | `generateAnnouncement(userData)` — Claude Haiku or Groq Llama-3.3-70b      |
| `lib/db.ts`                    | Prisma singleton (PrismaClient + PrismaPg adapter)                         |
| `app/submit/page.tsx`          | 3-step form: form → preview (with TTS listen button) → done                |
| `app/api/tts-preview/route.ts` | Returns raw audio/mpeg binary, no storage, max 1000 chars                  |

---

## Critical rules

### TTS

- Use `edge-tts` Python CLI **only** (`pip install edge-tts`). NEVER add `msedge-tts` npm package.
- Voice: `uk-UA-PolinaNeural` — always Ukrainian female voice
- `--write-media` writes directly to the file path passed. Reads back with `fs.readFile(path)`.
- `wrapWithHostIntro(aiText, letterNumber, city)` prepends "Лист номер N з Міста." prefix — called before TTS render, NEVER in LLM prompt.

### Supabase Storage

- `SUPABASE_SERVICE_ROLE_KEY` must be the **secret** key — copy from Supabase Dashboard → Project Settings → API → `service_role`
- It starts with `sb_secret_` (new format) or is a long JWT `eyJ...`
- Publishable key (`sb_publishable_...`) → RLS blocks all uploads with `row-level security policy` error
- Bucket name: `audio` — must be created in Supabase dashboard with public read access

### Database

- Prisma 7 with `PrismaPg` adapter for PostgreSQL
- Connection string: `DATABASE_URL=postgresql://...` (standard PostgreSQL)
- `DIRECT_URL` for migrations (Prisma requires direct connection for `migrate dev`)

### LLM

- `TAMARA_PROMPT` — announcer persona (Тамара), 90s Ukrainian radio style
- Output: first-person announcement, 6-9 sentences, literary Ukrainian
- NEVER include "Лист номер" in LLM output — prepended by host separately
- `AI_PROVIDER=groq` (default) or `AI_PROVIDER=claude` — switch via env

---

## Announcement status lifecycle

```
PENDING → APPROVED → added to Episode as QueueItem
        → REJECTED
```

## Planned features (TODO)

### Phase 2 — Audio + Radio Player (current)

- [x] `/api/tts-preview` — live audio preview in submit form
- [ ] Main page: radio player UI (background music + announcements queue)
- [ ] Crossfade: music fades when announcement starts, fades back after
- [ ] Episode builder: `/api/episode/build` — concat intro jingle + announcements
- [ ] Music tracks stored in Supabase bucket `music/`

### Phase 3 — Moderation

- [ ] Telegram bot: send pending announcement → moderator approves/rejects via inline keyboard
- [ ] Auto-TTS after approval: moderate webhook → textToSpeech → uploadAudio → update audioUrl
- [ ] Admin web UI: list PENDING announcements with approve/reject buttons

### Phase 4 — Polish

- [ ] Rate limiting on `/api/announce` and `/api/tts-preview` (IP-based, in-memory)
- [ ] Confirm-play endpoint for queue (prevent ghost-marking items as played)
- [ ] Public archive page: list past episodes + listen
- [ ] Proper app metadata, SEO, og:image
