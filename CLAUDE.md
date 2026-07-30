# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

FinAI ("fin") — personal finance tracker. Next.js 16 (App Router) + React 19 + Supabase (Postgres/Auth) + Tailwind v4. Server Actions do almost all data mutation; there is close to no client-side API layer.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build
npm run start
npm run lint      # eslint (flat config, eslint.config.mjs)
```

No test suite/framework is configured in this repo.

Supabase is managed via the CLI against `supabase/` (config in `supabase/config.toml`, migrations in `supabase/migrations/`). Migrations auto-deploy to the linked project on push to `main` via `.github/workflows/deploy-supabase.yml` (`supabase db push`) — don't rely on manually running this in prod; just add a migration file.

Telegram bot local testing: `node scripts/telegram-poll.mjs` polls Telegram's `getUpdates` and forwards updates to the local `/api/telegram/webhook` route (used instead of a public webhook URL during dev). Reads `TELEGRAM_BOT_TOKEN` from `.env.local`.

## Required environment variables

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` (LLM extraction/classification, feature degrades gracefully to `null`/no-op if absent), `TELEGRAM_BOT_TOKEN`.

## Architecture

### Auth & request flow
- `proxy.ts` (Next 16's replacement for the deprecated `middleware.ts` — see AGENTS.md) gates every route except `/_next` and `/api`: unauthenticated users are bounced to `/login`, authenticated users are bounced away from `/login` to `/dashboard`.
- Three Supabase client constructors, each for a different context — don't cross-use them:
  - `lib/supabase/server.ts` — Server Components/Actions, cookie-based session (RLS-scoped as the logged-in user).
  - `lib/supabase/proxy.ts` — used only inside `proxy.ts` for session refresh on every request.
  - `lib/supabase/admin.ts` — service-role client, bypasses RLS. Only used from the Telegram bot code path (`lib/telegram/*`), since Telegram requests aren't authenticated via Supabase cookies.
- Server Actions live in `actions/*.ts` (`"use server"`), one file per domain: `accounts`, `categories`, `transactions`, `import`, `import-keywords`, `import-ignore-keywords`, `import-transfer-mappings`, `telegram`, `auth`.

### Data model (`types/database.ts`, `supabase/migrations/`)
Core tables: `accounts`, `categories`, `transactions`. A transaction is one of `receita` (income) / `despesa` (expense) / `transferencia` (transfer between two of the user's own accounts, using `account_id` + `destination_account_id`). Account balances are denormalized (`accounts.balance`) and updated manually by every code path that inserts/deletes/edits a transaction — there is no DB trigger doing this, so any new transaction-mutating action must update balances itself.

Supporting tables for the import flow: `import_keywords` (user-defined transfer detection keywords), `import_ignore_keywords` (noise/garbage line filtering), `import_transfer_mappings` (remembers which account a recurring transfer description belongs to), `import_logs`.

Telegram integration tables: `telegram_links` (chat_id ↔ user_id, established via a one-time `/link TOKEN` command), `telegram_conversations` (single-row-per-chat state machine holding an in-progress transaction draft through the account-selection/confirm steps).

### Statement import pipeline (`app/import/`)
This is the most complex feature in the codebase, split across several single-purpose modules that are meant to be used together, not independently:
1. **`parser.ts`** — pure functions, no I/O. Detects file format (`detectFormat`: csv/ofx by extension or content sniffing), parses CSV (via Papa Parse, with header auto-detection in `autoDetectMapping`) or OFX (custom tag extraction, no library), normalizes dates/currency (`parseDate`/`parseCurrency` handle multiple locale formats), strips known noise prefixes from descriptions (`cleanDescription`), and heuristically classifies transfers (`isTransfer` against a builtin + user-supplied keyword list) and garbage/summary lines (`filterGarbage` against a builtin + user-supplied keyword list).
2. **`llm.ts`** (`"server-only"`) — Groq (`llama-3.1-8b-instant`) fallback path for PDF statements that can't be parsed structurally: `extractFromPDFText` prompts the LLM to return a JSON transaction array (input truncated to 20k chars), `classifyBatchWithLLM`/`classifyWithLLM` ask the LLM to assign a category to already-parsed transactions when keyword-based categorization (`categorizer.ts`) doesn't find a match. Every function no-ops (empty result / `null`) when `GROQ_API_KEY` is unset — never make this a hard error.
3. **`categorizer.ts`** — builds a word→category frequency map from the user's transaction history (`buildKeywordMap`, requires ≥2 prior occurrences to trust a word) and applies it to new descriptions (`applyKeywordMap`) before falling back to the LLM.
4. **`actions/import.ts`** — orchestrates the actual DB write: separates transfers from regular transactions, validates transfer counterpart accounts exist, de-duplicates against existing transactions (by `description`+`date`, and additionally by amount+date+counterpart-account for transfers), applies balance deltas to one or both accounts, and logs to `import_logs`. Accepts a `force` flag to bypass dedup. `checkDuplicates` is a dry-run precursor used by the UI (`ImportPreview.tsx`) to warn before committing.

When touching this pipeline, keep in mind the four-stage separation (parse → classify → dedupe-check → commit) — UI components (`ImportForm.tsx`, `ImportPreview.tsx`) drive these stages independently rather than the server doing it all in one call.

### Telegram bot (`lib/telegram/`, `app/api/telegram/webhook/route.ts`, `actions/telegram.ts`)
Grammy-based bot, single webhook route. `handlers.ts` implements: `/start`, `/link TOKEN` (account linking), `/contas` (list balances), free-text or photo messages (`receipt.ts` does photo→transaction extraction) which land in a `telegram_conversations` row driving an inline-keyboard account-selection → LLM auto-categorization → confirm flow (`handleCallback`). Uses the admin (service-role) Supabase client throughout since there's no user session — always scope queries by `chat_id`/`user_id` manually since RLS won't help here.

### UI conventions
- `components/ui/*` are shadcn/base-ui primitives (`components.json`: style `base-nova`, baseColor `neutral`); `components/*.tsx` (top-level) are app-specific composed components (e.g. `DataTable`, `SearchSelect`, `CurrencyInput`).
- Route folders under `app/` follow the standard App Router convention of colocating a page's client components directly in its folder (e.g. `app/import/ImportForm.tsx`, `app/dashboard/DashboardCharts.tsx`) rather than a shared `components/` tree.
- Portuguese is the UI/user-facing language throughout (error strings, labels, bot messages) — match this in any user-facing string you add.
