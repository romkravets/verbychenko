# 📻 Радіо Вербиченька

Симулятор українського радіо шлюбних і комерційних оголошень у стилі 90-х.
Слухачі надсилають оголошення через веб-форму, ШІ переписує їх у стилі радіоведучої Тамари, синтез мови озвучує текст, а між піснями оголошення виходять в ефір.

---

## Стек

- **Next.js 16** (App Router) + TypeScript
- **Prisma 7** + PostgreSQL (Supabase)
- **Google Cloud TTS** + опційно **Voicebox** (HTTP endpoint) — синтез мови
- **YouTube IFrame API** — програвання музики
- **Groq** (`llama-3.3-70b-versatile`) або **Anthropic Claude** (`claude-haiku-4-5-20251001`)

---

## Швидкий старт

### 1. Вимоги

- Node.js 20+
- PostgreSQL або Supabase

### 2. Встановлення

```bash
git clone <repo>
cd verbychenko
npm install
```

### 3. Змінні середовища

Створи `.env.local`:

```env
# PostgreSQL (Supabase або локальний)
DATABASE_URL=postgresql://user:pass@host:5432/db
DIRECT_URL=postgresql://user:pass@host:5432/db

# AI — один із двох (або обидва, вибір через AI_PROVIDER)
GROQ_API_KEY=gsk_...
ANTHROPIC_API_KEY=sk-ant-...
AI_PROVIDER=groq           # або: claude

# TTS
GOOGLE_TTS_API_KEY=...
TTS_PROVIDER=google        # google | voicebox
TTS_PROFILE=natural        # classic | natural | warm
TTS_FALLBACK_PROVIDER=     # опційно: google | voicebox
VOICEBOX_TTS_URL=          # опційно, якщо TTS_PROVIDER=voicebox

# Supabase Storage (для збереження MP3)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   # обов'язково service role, не publishable!

# Адмінка — будь-який рядок, головне запам'ятати
EPISODE_BUILD_SECRET=my-secret-password
```

### 4. Міграція бази даних

```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Запуск

```bash
npm run dev
```

Відкрий [http://localhost:3000](http://localhost:3000)

---

## Функціонал

### Радіоплеєр (нижня панель — PersistentRadioBar)

Плеєр зафіксований знизу на всіх сторінках і не зупиняється при навігації.

**Елементи керування:**

- ▶ / ■ — старт / стоп
- Повзунок гучності
- Випадаючий список каналів
- Кнопка `+ оголошення` — перехід до форми подачі
- ⚙️ — перехід до адмінки

**Ефірне розклад (автоматичний):**

```
2 пісні → фраза Тамари (TTS) →
2 пісні → випуск новин (RSS) →
2 пісні → оголошення слухача з бази →
... повтор
```

**Заставка після першої пісні (тільки десктоп, раз на сесію):**
Після того як перша пісня закінчується, на весь екран з'являється випадкове підтверджене оголошення — романтичне (рожеве) або комерційне (бурштинове). Закривається через 30 с, кнопку ×, клік за межами або Escape.

---

### Форма подачі оголошень (`/submit`)

Два типи оголошень на вибір:

#### 💌 Знайомства (DATING)

Поля: ім'я, вік, місто, зріст, вага, колір волосся, освіта, житло, про себе, кого шукаю.
ШІ (Тамара) переписує в стилі листа на радіо 90-х.

#### 🛒 Оголошення про продаж (COMMERCIAL)

Поля: ім'я, місто, що продається, ціна, телефон контакту, подробиці.
ШІ пише теплий текст у стилі радіооголошення 90-х.

**Попередній перегляд:**
Після генерації тексту з'являється кнопка «Прослухати» — відтворює TTS прямо в браузері (без збереження аудіо). У preview можна обрати движок озвучення (Google або Voicebox) та профіль голосу.

**Після підтвердження:** оголошення зберігається зі статусом `PENDING` та чекає на підтвердження адміна.

---

### Новини (RSS → TTS)

Кожні 4 пісні бот тягне заголовок з RSS-стрічок:

1. [Укрінформ](https://www.ukrinform.ua/rss/block-lastnews)
2. [BBC Ukrainian](https://www.bbc.com/ukrainian/index.xml)
3. [Суспільне](https://suspilne.media/rss/all.xml)

Заголовок кешується **10 хвилин**, щоб не спамити RSS-сервери.
Перед відтворенням Тамара говорить: _«Увага — новини! [заголовок]»_ (TTS).

Ендпоїнт: `GET /api/rss-news` → `{ headline: string }`

---

### Адмінка (`/admin`)

Захищена паролем (значення `EPISODE_BUILD_SECRET` з `.env`).
Пароль зберігається в `sessionStorage` — не треба вводити кожного разу.

**Функції:**

- Перегляд останньої RSS-новини
- Список всіх оголошень (ID, ім'я, місто, статус, дата)
- Кнопки **✅ Підтвердити** / **❌ Відхилити** для кожного
- Кнопка **🎚 Зібрати епізод** (для майбутнього функціоналу)

**Статуси оголошень:**
| Статус | Значення |
|--------|----------|
| `PENDING` | Щойно надійшло, чекає на рішення |
| `APPROVED` | Підтверджено, з'являється в ефірі |
| `REJECTED` | Відхилено, не показується |

---

## Музичні канали

Канали визначені у `lib/channels.ts`.

### Поточні канали

| ID           | Назва             | Тип                    |
| ------------ | ----------------- | ---------------------- |
| `ua-folk`    | 🌻 Народна        | Плейліст YouTube Music |
| `ua-estrada` | 🎤 Естрада        | Плейліст YouTube Music |
| `ua-kanal`   | 📺 Kanal UA Music | Ручні відео-ID         |
| `world-mix`  | 🌍 Світовий мікс  | Плейліст YouTube Music |
| `world-jazz` | 🎷 Джаз           | Плейліст YouTube Music |

> ⚠️ Музика Росії та Білорусі виключена повністю.

---

### Як додати новий канал

Відкрий `lib/channels.ts` і додай об'єкт у масив `CHANNELS`:

```ts
{
  id: "my-channel",          // унікальний рядок, без пробілів
  name: "Моя радіостанція",
  emoji: "🎸",
  description: "Короткий опис",
  country: "ua",             // "ua" або "world"

  // ВАРІАНТ А: цілий плейліст (YouTube або YouTube Music)
  playlistId: "PLxxxxxxxxxxxxx",

  // ВАРІАНТ Б: конкретні відео (якщо playlistId не задано)
  videoIds: ["video_id_1", "video_id_2"],
}
```

---

### Як взяти ID плейліста з YouTube Music

1. Відкрий [music.youtube.com](https://music.youtube.com)
2. Знайди потрібний плейліст або мікс
3. Скопіюй частину URL після `list=`:
   ```
   https://music.youtube.com/playlist?list=PLwMUOElpNABo8GEA1CkVxx
                                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ```
4. Встав у поле `playlistId` каналу

**Увага:** деякі плейлісти заблоковані для embed. Якщо канал не грає — спробуй інший плейліст або перейди на `videoIds`.

---

### Як взяти ID окремого відео з YouTube

```
https://www.youtube.com/watch?v=K5KAc5CoCuk
                                ^^^^^^^^^^^
                                це і є video ID
```

---

## API-ендпоїнти

| Метод   | URL                        | Призначення                                      |
| ------- | -------------------------- | ------------------------------------------------ |
| `POST`  | `/api/announce`            | Подати оголошення (DATING або COMMERCIAL)        |
| `GET`   | `/api/announce/featured`   | Випадкове підтверджене оголошення для заставки   |
| `POST`  | `/api/tts-preview`         | Текст → аудіо (blob), без збереження             |
| `GET`   | `/api/rss-news`            | Новинний заголовок з RSS                         |
| `GET`   | `/api/queue`               | Наступне оголошення з черги для ефіру            |
| `GET`   | `/api/admin/announcements` | Список оголошень (потребує `x-admin-secret`)     |
| `PATCH` | `/api/admin/announcements` | Схвалити / відхилити (потребує `x-admin-secret`) |
| `GET`   | `/api/tts-test`            | Smoke-тест TTS + Supabase (dev)                  |

---

## Структура проєкту

```
app/
  page.tsx                     # Головна — кнопка запуску радіо
  submit/page.tsx              # Форма подачі оголошення
  admin/page.tsx               # Адмінка
  components/
    PersistentRadioBar.tsx     # Нижня панель плеєра + ефірний розклад
    YouTubeRadio.tsx           # YouTube IFrame API (прихований плеєр)
    AnnouncementSplash.tsx     # Повноекранна заставка після першої пісні
    NowPlayingBadge.tsx        # Бейдж "В ефірі" на головній
    ClientProviders.tsx        # RadioContext + динамічний плеєр (ssr: false)
  context/
    RadioContext.tsx           # Глобальний стан радіо
  api/
    announce/route.ts          # Прийом оголошень
    announce/featured/route.ts # Випадкове оголошення для заставки
    tts-preview/route.ts       # TTS-прев'ю
    rss-news/route.ts          # RSS-новини
    queue/route.ts             # Черга оголошень
    admin/announcements/route.ts # Адмін CRUD

lib/
  channels.ts                  # Визначення музичних каналів
  llm.ts                       # ШІ-генерація тексту (Groq / Claude)
  tts.ts                       # TTS provider switch (Google / Voicebox)
  storage.ts                   # Supabase Storage (збереження MP3)
  db.ts                        # Prisma singleton

prisma/
  schema.prisma                # Схема БД
```

---

## Налаштування TTS

За замовчуванням використовується Google TTS (`TTS_PROVIDER=google`).

Якщо хочеш тестувати Voicebox паралельно, задай `TTS_PROVIDER=voicebox`
і `VOICEBOX_TTS_URL` (HTTP endpoint, що повертає `audio/mpeg` або JSON з `audioContent`).

Smoke-тест: `curl http://localhost:3000/api/tts-test`

---

## Команди

```bash
npm run dev              # Запуск dev-сервера (Node.js обмежено 1 ГБ RAM)
npm run build            # Production-збірка
npm run start            # Production-запуск
npm run lint             # ESLint

npx prisma migrate dev   # Застосувати міграції БД
npx prisma generate      # Перегенерувати Prisma Client
npx prisma studio        # GUI для БД
```

---

## Деплой (Vercel + Supabase)

1. Push на GitHub
2. Підключи репозиторій у [vercel.com](https://vercel.com)
3. Додай всі змінні з `.env.local` у налаштуваннях Vercel
4. Для Voicebox потрібен окремий endpoint/сервіс; Google TTS працює напряму на Vercel

> **Порада:** SQLite не підходить для Vercel (serverless). PostgreSQL через Supabase — оптимальний вибір.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
