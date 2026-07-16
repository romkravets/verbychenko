# Radio Verbychenko

![Radio Verbychenko](img.png)

## English

Ukrainian radio simulator for 90s-style dating and commercial announcements.
Users submit announcements via web form, AI rewrites them in Tamara's radio tone,
TTS generates voice, and content is mixed into a music-driven live flow.

### Stack

- Next.js 16 (App Router) + TypeScript
- Prisma 7 + PostgreSQL (Supabase)
- Google Cloud TTS + optional Voicebox (HTTP endpoint)
- YouTube IFrame API (music playback)
- Groq (`llama-3.3-70b-versatile`) or Anthropic Claude (`claude-haiku-4-5-20251001`)

### Quick Start

1. Requirements

- Node.js 20+
- PostgreSQL or Supabase

2. Install

```bash
git clone <repo>
cd verbychenko
npm install
```

3. Environment

Create `.env.local`:

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
DIRECT_URL=postgresql://user:pass@host:5432/db

GROQ_API_KEY=gsk_...
ANTHROPIC_API_KEY=sk-ant-...
AI_PROVIDER=groq

GOOGLE_TTS_API_KEY=...
TTS_PROVIDER=google
TTS_PROFILE=natural
TTS_FALLBACK_PROVIDER=
VOICEBOX_TTS_URL=

NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

EPISODE_BUILD_SECRET=my-secret-password
```

4. DB Migration

```bash
npx prisma migrate dev
npx prisma generate
```

5. Run

```bash
npm run dev
```

Open http://localhost:3000

### Main Features

- Persistent bottom radio bar (`PersistentRadioBar`)
- Automated schedule: music -> inserts -> news -> announcements
- AI rewrite for dating/commercial submissions
- TTS preview with provider/profile selection
- Admin moderation (`/admin`) for approve/reject + episode build
- Admin-managed YouTube/YouTube Music channels (add/toggle/delete)

### Music Channel Management

You can still define default channels in env, but now admin can manage channels from UI.

Admin channel endpoints:

- `GET /api/admin/channels`
- `POST /api/admin/channels`
- `PATCH /api/admin/channels`

Public channel endpoint used by player:

- `GET /api/channels`

### API Endpoints

| Method  | URL                        | Purpose                                 |
| ------- | -------------------------- | --------------------------------------- |
| `POST`  | `/api/announce`            | Submit announcement (DATING/COMMERCIAL) |
| `GET`   | `/api/announce/featured`   | Random approved announcement            |
| `POST`  | `/api/tts-preview`         | Text -> audio blob (no storage)         |
| `GET`   | `/api/rss-news`            | RSS headline                            |
| `GET`   | `/api/queue`               | Next queue item for radio               |
| `GET`   | `/api/channels`            | Active radio channels for player        |
| `GET`   | `/api/admin/announcements` | Admin list                              |
| `PATCH` | `/api/admin/announcements` | Approve/reject                          |
| `GET`   | `/api/admin/channels`      | Admin channels list                     |
| `POST`  | `/api/admin/channels`      | Add channel                             |
| `PATCH` | `/api/admin/channels`      | Toggle/update/delete channel            |
| `GET`   | `/api/tts-test`            | TTS smoke test                          |

### Commands

```bash
npm run dev
npm run build
npm run start
npm run lint

npx prisma migrate dev
npx prisma generate
npx prisma studio
```

### Deploy

Use Vercel + Supabase.

- Add all env vars in Vercel project settings.
- Voicebox requires a separate running endpoint.
- Google TTS works directly in serverless mode.

---

## Українська

Симулятор українського радіо шлюбних і комерційних оголошень у стилі 90-х.
Слухачі надсилають оголошення через веб-форму, ШІ переписує їх у стилі
радіоведучої Тамари, TTS озвучує текст, а між піснями оголошення виходять в ефір.

### Стек

- Next.js 16 (App Router) + TypeScript
- Prisma 7 + PostgreSQL (Supabase)
- Google Cloud TTS + опційно Voicebox (HTTP endpoint)
- YouTube IFrame API (музика)
- Groq (`llama-3.3-70b-versatile`) або Anthropic Claude (`claude-haiku-4-5-20251001`)

### Швидкий старт

1. Вимоги

- Node.js 20+
- PostgreSQL або Supabase

2. Встановлення

```bash
git clone <repo>
cd verbychenko
npm install
```

3. Змінні середовища

Створи `.env.local`:

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
DIRECT_URL=postgresql://user:pass@host:5432/db

GROQ_API_KEY=gsk_...
ANTHROPIC_API_KEY=sk-ant-...
AI_PROVIDER=groq

GOOGLE_TTS_API_KEY=...
TTS_PROVIDER=google
TTS_PROFILE=natural
TTS_FALLBACK_PROVIDER=
VOICEBOX_TTS_URL=

NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

EPISODE_BUILD_SECRET=my-secret-password
```

4. Міграції БД

```bash
npx prisma migrate dev
npx prisma generate
```

5. Запуск

```bash
npm run dev
```

Відкрий http://localhost:3000

### Основні можливості

- Постійний нижній радіоплеєр (`PersistentRadioBar`)
- Автоматичний ефірний цикл: музика -> вставки -> новини -> оголошення
- AI-генерація текстів для DATING/COMMERCIAL
- Попереднє прослуховування TTS з вибором провайдера
- Адмінка (`/admin`) для модерації і збірки епізодів
- Керування YouTube/YouTube Music каналами з адмінки (додати/вкл/видалити)

### Керування музичними каналами

Дефолтні канали можна лишити через env, але тепер адмін може керувати каналами через UI.

Адмінські endpoints:

- `GET /api/admin/channels`
- `POST /api/admin/channels`
- `PATCH /api/admin/channels`

Публічний endpoint для плеєра:

- `GET /api/channels`

### API-ендпоїнти

| Метод   | URL                        | Призначення                           |
| ------- | -------------------------- | ------------------------------------- |
| `POST`  | `/api/announce`            | Подати оголошення (DATING/COMMERCIAL) |
| `GET`   | `/api/announce/featured`   | Випадкове підтверджене оголошення     |
| `POST`  | `/api/tts-preview`         | Текст -> аудіо blob (без збереження)  |
| `GET`   | `/api/rss-news`            | Новинний заголовок RSS                |
| `GET`   | `/api/queue`               | Наступний елемент черги               |
| `GET`   | `/api/channels`            | Активні канали для плеєра             |
| `GET`   | `/api/admin/announcements` | Список оголошень (адмін)              |
| `PATCH` | `/api/admin/announcements` | Схвалити/відхилити                    |
| `GET`   | `/api/admin/channels`      | Список каналів (адмін)                |
| `POST`  | `/api/admin/channels`      | Додати канал                          |
| `PATCH` | `/api/admin/channels`      | Увімкнути/оновити/видалити канал      |
| `GET`   | `/api/tts-test`            | Smoke-тест TTS                        |

### Команди

```bash
npm run dev
npm run build
npm run start
npm run lint

npx prisma migrate dev
npx prisma generate
npx prisma studio
```

### Деплой

Vercel + Supabase.

- Додай усі env змінні в налаштування Vercel.
- Для Voicebox потрібен окремий живий endpoint.
- Google TTS працює напряму в serverless.
