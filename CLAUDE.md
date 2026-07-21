# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

FinApp — a personal finance tracker (Next.js 16 App Router + Supabase + TanStack Table). UI copy and locale formatting are in Portuguese (pt-BR/pt-PT); domain terms use Portuguese words throughout the codebase (`receita` = income, `despesa` = expense, `transferencia` = transfer, `contas` = accounts).

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint
npx tsc --noEmit # typecheck (no dedicated script; project uses strict TS)
```

There is no test suite/runner configured in this repo.

### Telegram bot (local dev)

The Telegram integration receives updates via webhook (`app/api/telegram/webhook/route.ts`), which doesn't work on localhost. For local testing, run the poller which forwards `getUpdates` to the local webhook endpoint:

```bash
node scripts/telegram-poll.mjs   # reads TELEGRAM_BOT_TOKEN from .env.local, forwards to localhost:3000/api/telegram/webhook
```

### Supabase

Migrations live in `supabase/migrations/` and deploy automatically via `.github/workflows/deploy-supabase.yml` when files under that path are pushed to `main` (runs `supabase db push` against the linked project). There's no local-apply command wired into `package.json` — use the `supabase` CLI directly (`supabase db push`, `supabase migration new ...`) if working against migrations locally.

## Architecture

### Not the Next.js you know

This project runs Next.js 16, which has real breaking changes from earlier versions. Before writing routing/middleware/caching code, check `node_modules/next/dist/docs/` for current behavior rather than relying on training data. The concrete gotcha already hit in this repo: route interception/auth guarding is done via **`proxy.ts`** exporting `async function proxy` (config uses a `matcher`), not the deprecated `middleware.ts`.

### Route structure & auth

- `app/(app)/` is a route group for all authenticated pages (dashboard, transactions, accounts, categories, import, settings) and shares `app/(app)/layout.tsx`, which fetches the current user server-side and wraps children in `AppShell`.
- `proxy.ts` is the single auth gate: it runs on every request except `/_next` and `/api`, reads the Supabase session, and redirects unauthenticated users to `/login` (and authenticated users away from `/login` to `/dashboard`).
- `app/login/page.tsx` and `app/auth/callback/route.ts` handle the unauthenticated flow; `actions/auth.ts` has the `signInWithEmail` / `signUp` / `signOut` server actions.

### Supabase client layers

Three separate client constructors exist under `lib/supabase/` — use the one matching context, don't mix them up:
- `server.ts` — `createClient()` (async, uses `next/headers` cookies) for Server Components and server actions.
- `browser.ts` — `createClient()` (sync) for Client Components.
- `proxy.ts` — `createClient(request)` for use inside `proxy.ts` only (reads cookies off `NextRequest`).
- `admin.ts` — `createAdminClient()` uses the service-role key, bypasses RLS. Only use where RLS must be intentionally bypassed (e.g. the Telegram bot, which authenticates via linked account rather than a Supabase session).

### Data layer: server actions, not API routes

Nearly all reads/writes go through `"use server"` action files in `actions/` (`transactions.ts`, `accounts.ts`, `categories.ts`, `import.ts`, `import-keywords.ts`, `import-ignore-keywords.ts`, `import-transfer-mappings.ts`, `auth.ts`, `telegram.ts`), called directly from Server/Client Components. They call `revalidatePath(...)` on the affected routes after mutations instead of using a client cache layer. The only real API route is the Telegram webhook (`app/api/telegram/webhook/route.ts`); `app/auth/callback/route.ts` handles the OAuth/magic-link redirect.

**Account balances are denormalized**, not computed from transactions. Every action that inserts/updates/deletes a transaction (`actions/transactions.ts`) must also manually adjust `accounts.balance` by the correct delta — including reversing both legs of a `transferencia` on delete. When touching transaction mutations, preserve this balance bookkeeping.

### Database schema (Supabase/Postgres)

Core tables: `accounts`, `categories`, `transactions` (see `supabase/migrations/20250614000005_core_tables.sql`), plus import-support tables (`import_keywords`, `import_ignore_keywords`, `import_transfer_mappings`, `import_logs`) and a `telegram` migration for bot account linking. Every table has RLS enabled with an identical `auth.uid() = user_id` policy for full CRUD — new tables should follow this pattern. `types/database.ts` hand-maintains the TS interfaces matching these tables (not auto-generated).

### Statement import pipeline (`app/(app)/import/`)

Multi-step flow for importing bank statements (CSV/OFX/PDF):
1. `parser.ts` — parses CSV/OFX and normalizes dates; PDF text goes to the LLM instead.
2. `llm.ts` (server-only, uses `groq-sdk` with `llama-3.1-8b-instant`) — `extractFromPDFText` turns raw PDF text into transactions; `classifyWithLLM`/`classifyBatchWithLLM` assign categories by name-matching the model's free-text answer back to known categories.
3. `categorizer.ts` — rule-based categorization (keywords) that runs before/alongside the LLM path.
4. `ImportForm.tsx` → `ImportPreview.tsx` — user reviews parsed transactions before committing via `actions/import.ts`.
5. `TransferMappingManager.tsx` / `IgnoreKeywordManager.tsx` / `KeywordManager.tsx` manage the supporting lookup tables (`import_transfer_mappings`, `import_ignore_keywords`, keyword-to-category rules) used to auto-classify future imports.

GROQ_API_KEY is optional at runtime — LLM functions degrade gracefully (return empty results with an `error` field) when unset, so the rule-based categorizer must keep working standalone.

### Telegram bot integration

`lib/telegram/bot.ts` wires a `grammy` `Bot` singleton (lazy-initialized on first `getBot()` call, since it's constructed inside a serverless route handler). `lib/telegram/handlers.ts` implements commands (`/start`, `/link`, `/contas`) and message/callback handlers; `lib/telegram/receipt.ts` handles receipt photo parsing. The bot links a Telegram user to a Supabase user account (`actions/telegram.ts`) and then uses `createAdminClient()` (service-role, bypasses RLS) to read/write on that linked user's behalf, since the bot has no Supabase auth session of its own.

### UI conventions

- shadcn/ui config (`components.json`) targets the `base-nova` style with the `neutral` base color; primitives live in `components/ui/` (generated/vendored, e.g. `button.tsx`, `dialog.tsx`, `command.tsx`) and app-specific composed components sit directly in `components/` (`DataTable.tsx`, `SummaryCard.tsx`, `AppShell.tsx`, etc.). Path alias `@/*` maps to the repo root.
- Tables use `@tanstack/react-table` (see `components/DataTable.tsx`); `MobileTransactionCards.tsx` is the small-viewport alternative to the transactions table.
- Theming is dark-by-default (`app/layout.tsx` sets `data-theme="dark"` on `<html>` with an inline script reading `localStorage("theme")` before hydration to avoid flash); `ThemeProvider.tsx` manages runtime toggling.
- Currency is EUR, formatted via `lib/format.ts` (`formatCurrency`/`parseCurrency` handle both `.` and `,` decimal separators for input parsing); dates are formatted pt-BR (`formatDate`).
- Fonts: Manrope (`--font-heading`) and Inter (`--font-sans`) via `next/font/google`, both loaded once in the root layout.
