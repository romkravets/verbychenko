# SEO Spark — Repository-Specific Review Overlay

**Extends**: `.github/prompts/review-base.md`

Use the base prompt for structure, output format, deduplication rules, and review philosophy.
This overlay defines all project-specific rules, patterns, and invariants.

---

## Repository Context

- **Purpose**: AI-powered SEO audit SaaS — crawls websites, scores SEO health (0-100), GEO health (AI Search readiness 0-100), Security (0-100 OWASP 2025), Pentest Defense (0-100), generates fixes, monitors AI visibility across 9 AI engines
- **Stack**:
  - Framework: Next.js 15 (App Router), TypeScript strict
  - Crawler: Playwright (chromium headless)
  - AI Agent: Anthropic Claude API (`claude-opus-4-6`) — agentic loop with tools
  - AI Visibility: Perplexity API (sonar), OpenAI API (gpt-4o-mini + web_search_preview)
  - Styling: Tailwind CSS
  - Deploy: Vercel
- **Package manager**: npm
- **Monetization tiers**: Free (`/api/audit/free`) → Pro (`/api/audit` + `/api/visibility`)

### Architecture

```
agent/
  index.ts              — Claude agentic loop (tool_use → execute → loop, max 10 iterations)
  tools/
    crawl.ts            — Playwright crawler: meta, headings, JSON-LD, robots.txt, AI bots, llms.txt, wordCount, schemaTypes, lang, viewport
    analyze.ts          — Rule-based SEO/GEO scorer (zero AI cost) — 5-component GEO weights
    security.ts         — OWASP 2025 HTTP security headers checker (pure fetch, accepts Playwright headers)
    pentest-defense.ts  — Defensive checks vs Hydra/SQLmap/FFUF/Nmap/Burp/Amass (pure fetch, defensive only)
    visibility.ts       — Pro: queries Perplexity + OpenAI, checks domain mention

app/api/
  audit/route.ts        — POST: crawl + analyze + Claude summary + ZAP scan (Pro, requires ANTHROPIC_API_KEY)
  audit/free/route.ts   — POST: crawl + analyze only, zero AI cost, zap=null (Free)
  visibility/route.ts   — POST: AI visibility monitor (Pro, requires PERPLEXITY/OPENAI keys)
  security/
    clickjacking-demo/route.ts — GET: Clickjacking PoC demo (educational, free)

lib/
  claude.ts             — Anthropic client singleton
  api-helpers.ts        — requireJson(), normalizeUrl() shared helpers

scripts/
  test-audit.mjs        — CLI test script: SEO + GEO + Security + Pentest (no server needed)
```

### Score Formulas (invariant — do not change without recalibration)

```typescript
// SEO Score
const deductions = critical * 15 + warnings * 5;
const score = Math.max(0, 100 - deductions);

// GEO Score (AI Search readiness) — 5 components, must sum to 100
const GEO_WEIGHTS = {
  AI_BOTS_ALLOWED: 40,  // most critical — blocked = invisible to AI
  VALID_JSON_LD:   25,  // was 30, reduced to fit llms.txt
  SITEMAP:         20,
  CANONICAL:       10,
  LLMS_TXT:         5,  // emerging standard, weight grows as adoption increases
} as const;
// Total: 40+25+20+10+5 = 100 ✅

// Security Score (security.ts) — grade scale: A≥90, B≥75, C≥60, D≥40, F<40
// Header deduction weights: critical=25, high=15, medium=8, low=3
// + cookie issues * 5 + info leakage * 3 + (HTTPS penalty 30 if HTTP)

// Pentest Defense Score (pentest-defense.ts) — same grade scale
// Deduction weights: critical=25, high=15, medium=5
// WAF bonus: -10 deductions if WAF detected
```

### AI Engines Tracked (9 total — invariant list, defined ONLY in crawl.ts)

```typescript
// SINGLE SOURCE OF TRUTH — crawl.ts
// scripts/test-audit.mjs imports this, does NOT redefine
export const AI_BOTS: Record<string, string[]> = {
  "ChatGPT":      ["GPTBot", "ChatGPT-User", "OAI-SearchBot"],
  "Google AI":    ["Google-Extended", "Googlebot"],
  "Perplexity":   ["PerplexityBot"],
  "Claude":       ["ClaudeBot", "anthropic-ai"],
  "Bing Copilot": ["Bingbot", "MicrosoftBot"],
  "Gemini":       ["Bard"],
  "Grok":         ["xAI-Bot"],
  "Meta AI":      ["Meta-ExternalAgent", "facebookexternalhit"],
  "Apple":        ["Applebot-Extended"],
};
```

### Security Score (added 2026-03-22, OWASP 2025)

```typescript
// security.ts — grade scale
// A: 90-100, B: 75-89, C: 60-74, D: 40-59, F: <40
// Header deduction weights: critical=25, high=15, medium=8, low=3
// Cookie issues: +5 per missing flag (Secure / HttpOnly / SameSite)
// Info leakage: +3 per exposed header (Server version, X-Powered-By, etc.)
// HTTPS penalty: +30 if site is HTTP
// CSP frame-ancestors is valid replacement for X-Frame-Options (do not double-penalize)
// Cloudflare may serve different headers in iframe context vs direct GET — this is expected
```

### GEO Signals Checked (as of 2026-03-22)

```
✅ AI bots in robots.txt (9 engines)
✅ JSON-LD structured data
✅ sitemap.xml
✅ canonical tag
✅ llms.txt (implemented — new standard like robots.txt for LLMs, weight=5)
🔲 FAQ schema
🔲 Speakable schema
🔲 E-E-A-T signals (Author schema, dateModified)
```

### Pentest Defense Checks (as of 2026-03-22)

```
✅ CORS misconfiguration — Burp Suite / Caido
✅ Rate limiting / Brute force — Hydra
✅ Server version disclosure — Nmap / Metasploit
✅ SQL error leakage — SQLmap
✅ Sensitive path exposure — FFUF / Gobuster / dirb
   (/.git/config, /.env, /backup.zip, /backup.sql, /phpmyadmin/, /wp-admin/, /admin/, /server-status, /config.php, /.DS_Store)
✅ security.txt (RFC 9116) — Amass / recon
✅ WAF detection — Cloudflare, Vercel, Netlify, AWS WAF, Sucuri, Imperva, Akamai, Fastly
```

---

## File Type Handling (Extends Base)

**ALSO REVIEW IN DETAIL:**

- `agent/tools/*.ts` — crawler correctness, AI bot detection logic, score formulas
- `agent/index.ts` — agentic loop termination, tool execution, error handling
- `app/api/**/*.ts` — input validation, error responses, API key guards
- `lib/*.ts` — client configuration

**ALSO SKIP:**

- `scripts/*.mjs` — dev/test scripts, not production code
- `.next/` — build artifacts
- `public/` — static assets
- `*.lock`, `package-lock.json` — lockfiles

---

## Project Severity Rules

### 🔴 CRITICAL

| Rule | Why |
|------|-----|
| Hardcoded API keys in source (ANTHROPIC_API_KEY, PERPLEXITY_API_KEY, OPENAI_API_KEY) | Credentials in git — exposed permanently |
| `any` type in TypeScript | Project uses `strict: true` — silently breaks type safety |
| Missing API key guard in Pro endpoints | `/api/audit` and `/api/visibility` must check env vars before calling external APIs |
| Agentic loop without termination condition | Infinite loop if Claude never returns `end_turn` or `tool_use` — runaway API cost |
| GEO score formula weights changed without updating all five components | `40/25/20/10/5` sum to 100 — changing one without others breaks GEO scoring |
| `crawlPage()` without `browser.close()` in finally block | Browser process leak — crashes Vercel serverless after multiple requests |
| `executeToolCall()` without try/catch per tool | Single tool failure crashes entire agent session — fixed 2026-03-22 |
| URL from Claude tool input not validated before crawlPage() | SSRF risk — Claude could instruct crawl of internal services |

### 🟠 HIGH

| Rule | Why |
|------|-----|
| `fetch()` to Perplexity/OpenAI without timeout | Hangs serverless function indefinitely, costs money, blocks response |
| URL not validated before passing to Playwright | Arbitrary URL could be used to SSRF internal services |
| `analyzeSEO()` called with data from untrusted crawl without sanitizing string lengths | Very long title/description could cause regex DoS |
| Missing `try/catch` in `executeToolCall()` around individual tool calls | Single tool failure crashes entire agent session |
| Visibility `rawAnswer` stored without length limit | Unbounded string — memory issue at scale |

### 🟡 MEDIUM

| Rule | Why |
|------|-----|
| SEO score deductions hardcoded as magic numbers `15` and `5` | Should be named constants — changing one without the other breaks calibration |
| `AI_BOTS` defined separately in `crawl.ts` and `scripts/test-audit.mjs` | Duplication — adding a new engine requires updating two places |
| Missing `Content-Type: application/json` check on POST endpoints | `req.json()` throws 500 on non-JSON body instead of returning 400 |
| Playwright timeout hardcoded at `15000` | Should be configurable via env var for slow sites |
| `visibility.ts` uses `any` in Perplexity/OpenAI response parsing | Silent failures if API response shape changes |

---

## Mandatory Project Patterns

### 1. Secrets and Config

All API keys come from environment variables. Never in source.

```typescript
// CORRECT
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// WRONG
const client = new Anthropic({ apiKey: "sk-ant-abc123..." });
```

**Check:** No API keys hardcoded. All Pro endpoints guard on env var presence before calling external services.

### 2. Browser Lifecycle in Playwright

Every `chromium.launch()` must have a matching `browser.close()` in `finally`.

```typescript
// CORRECT
const browser = await chromium.launch({ headless: true });
try {
  // ... crawl
} finally {
  await browser.close();  // always runs
}

// WRONG — leaks browser process on error
const browser = await chromium.launch();
const result = await doSomething(); // throws
await browser.close(); // never reached
```

### 3. Agentic Loop Pattern

The Claude agentic loop must handle exactly two stop reasons and have a max iteration guard.

```typescript
// CORRECT
let iterations = 0;
const MAX_ITERATIONS = 10;

while (iterations < MAX_ITERATIONS) {
  iterations++;
  const response = await anthropic.messages.create({ ... });

  if (response.stop_reason === "end_turn") break;
  if (response.stop_reason === "tool_use") {
    // execute tools, push results
    continue;
  }
  break; // unexpected stop_reason
}

// WRONG — no iteration limit = infinite loop risk
while (true) { ... }
```

### 4. API Endpoint Input Validation

Every POST endpoint validates input before processing.

```typescript
// CORRECT
const { url } = await req.json();
if (!url || typeof url !== "string") {
  return NextResponse.json({ error: "url is required" }, { status: 400 });
}
try { new URL(normalizedUrl); } catch {
  return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
}

// WRONG — passes raw input to Playwright
const { url } = await req.json();
const data = await crawlPage(url);
```

### 5. GEO Score Weights

The five GEO score components must always sum to 100. Named constants required.

```typescript
// CORRECT
const GEO_WEIGHTS = {
  AI_BOTS_ALLOWED: 40,
  VALID_JSON_LD:   25,
  SITEMAP:         20,
  CANONICAL:       10,
  LLMS_TXT:         5,
} as const; // sum = 100

// WRONG — magic numbers, easy to break
if (noAiBotBlock) geoScore += 40;
if (hasJsonLd)    geoScore += 35; // now sums to 105
```

### 6. TypeScript — No `any`

All external API responses must be typed or explicitly narrowed.

```typescript
// CORRECT
interface PerplexityResponse {
  choices: Array<{ message: { content: string } }>;
  citations?: Array<{ url: string } | string>;
}
const data = await res.json() as PerplexityResponse;

// WRONG
const data: any = await res.json();
const answer = data.choices?.[0]?.message?.content;
```

### 7. Fetch with Timeout

All external API calls must have a timeout via `AbortController`.

```typescript
// CORRECT
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000);
const res = await fetch(url, { signal: controller.signal });
clearTimeout(timeout);

// WRONG — no timeout, hangs indefinitely
const res = await fetch("https://api.perplexity.ai/...", { ... });
```

---

## Score Invariants

When reviewing changes to `analyze.ts` or `visibility.ts`, verify:

### analyze.ts
- `score = Math.max(0, 100 - critical * 15 - warnings * 5)` — floor at 0, both weights present
- `geoScore` five components sum to 100: `40 + 25 + 20 + 10 + 5` (AI_BOTS + JSON-LD + sitemap + canonical + llms.txt)
- `GEO_WEIGHTS` is a named const — never use magic numbers for GEO components
- `analyzeSEO()` is pure function — no side effects, no async, no external calls
- Returns `{ score, geoScore, issues, summary }` — shape must not change without updating all consumers
- Quality checks (added 2026-03-22): noindex, viewport, lang, wordCount (<300 critical / <600 warning), H2 presence, H1-title keyword mismatch, schema rich types, internal links count

### crawl.ts
- `AI_BOTS` has exactly 9 engines — adding/removing requires updating GEO score logic and docs
- `browser.close()` always in `finally` block
- `aiBotsStatus` populated for ALL engines even if robots.txt is missing (default: `"allowed"`)
- `crawlPage()` returns `CrawlResult` with `error` field set on failure, never throws to caller
- `CrawlResult` new fields (2026-03-22): `wordCount` (visible text, nav/header/footer stripped), `schemaTypes` (flat list of all `@type` from JSON-LD + `@graph`), `lang` (html lang attr), `viewport` (bool)
- Bot names in robots.txt regex are escaped with `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`

### zap-scan.ts
- ZAP is **Pro-only** — only called from `/api/audit/route.ts`, never from `/api/audit/free`
- Returns `{ available: false }` when `ZAP_URL` or `ZAP_API_KEY` env vars are not set — no hardcoded fallback
- `pollUntil()` throws `Error('Poll timeout after Xms')` on timeout — caller handles in outer try/catch
- All ZAP API responses validated with `isRecord()` type guard before field access
- Score formula: `Math.max(0, 100 - deductions)` — same as analyze.ts (no `Math.min(100, ...)` wrapper)

### pentest-defense.ts
- Defensive checks ONLY — checks for presence of protections, does not perform attacks
- `checkPentestDefenses()` is async — uses fetch with AbortSignal.timeout()
- WAF detection via response headers (8 WAF signatures)
- Score deductions: critical=25, high=15, medium=5; WAF bonus: -10
- Grade scale same as security.ts: A≥90, B≥75, C≥60, D≥40, F<40

### visibility.ts
- `checkMention()` is pure — no async, no side effects
- `overallVisibility` is average of all results, rounded
- `topKeywords` limited to 10 entries
- `rawAnswer` must be sliced to max 500 chars before storing

---

## Review Workflow

1. **Scope check** — Identify changed files. Only review those.
2. **Secrets scan** — Any hardcoded API keys? CRITICAL if yes.
3. **Score invariants** — If `analyze.ts` changed: do weights still sum correctly?
4. **Browser lifecycle** — If `crawl.ts` changed: `finally { browser.close() }` present?
5. **Agentic loop** — If `agent/index.ts` changed: iteration limit present? Both stop reasons handled?
6. **TypeScript types** — No `any`, external responses typed
7. **Input validation** — URL validation present on all endpoints?
8. **Fetch timeouts** — All external API calls have AbortController timeout?
9. **AI_BOTS sync** — If engines added/removed: `crawl.ts` and `analyze.ts` consistent?
10. **Pentest defensive only** — If `pentest-defense.ts` changed: no active attacks, only checks for protection presence?
11. **GEO weights** — If `analyze.ts` changed: `GEO_WEIGHTS` still uses named constants, sum still = 100?
12. **ZAP tier** — If `zap-scan.ts` imported somewhere: only in `/api/audit/route.ts` (Pro), never in `/api/audit/free`?
13. **CrawlResult shape** — If `crawl.ts` fields added/removed: `free/route.ts` response object, `analyze.ts` inputs, and docs updated?
14. **Quality checks** — If `analyze.ts` quality checks changed: are they using `data.wordCount`, `data.schemaTypes`, `data.viewport`, `data.lang` (not re-crawling)?
