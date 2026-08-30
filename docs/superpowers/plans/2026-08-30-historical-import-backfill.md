# Historical Import Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let statement imports include transactions dated before the account's last import cutoff (previously silently hidden) without double-counting against the manual "Ajuste de Saldo" balance correction.

**Architecture:** `actions/import.ts` learns the account's last-import cutoff date and splits already-deduped regular (receita/despesa) transactions into "current" (affects `accounts.balance` as today) and "historical" (inserted for the record, balance untouched). Historical net movement is used to shrink or delete the account's most recent "Ajuste de Saldo" transaction via a new shared helper in `lib/balance-adjustment.ts`. On the client, `ImportForm.tsx` stops hiding pre-cutoff rows and instead flags them; `ImportPreview.tsx` renders a badge on flagged rows.

**Tech Stack:** Next.js 16 Server Actions, Supabase (Postgres), no test framework in this repo — verification is `npx tsc --noEmit`, `npm run lint`, and manual QA via `npm run dev`.

**Spec:** `docs/superpowers/specs/2026-08-30-historical-import-backfill-design.md`

## Global Constraints

- Scope is receita/despesa only. Transferências keep today's behavior even when dated before the cutoff (spec §"Escopo" and §5).
- Only the single most recent "Ajuste de Saldo" transaction on the account is ever touched — older ones are left alone (spec §"Fora de escopo").
- If no "Ajuste de Saldo" transaction exists on the account, historical transactions are still inserted without touching `accounts.balance` — this is a no-op reconciliation, not an error (spec §4 step 3).
- No test framework exists in this repo (`CLAUDE.md`). Every task's verification is `npx tsc --noEmit` + `npm run lint`; deep behavioral verification happens in Task 5's manual QA pass.
- Portuguese user-facing strings throughout, matching existing copy style (`AGENTS.md`/`CLAUDE.md`).

---

## Task 1: Extract and extend the balance-adjustment helper

**Files:**
- Create: `lib/balance-adjustment.ts`
- Reference (don't modify yet): `actions/accounts.ts:164-190` (current `ensureAdjustmentCategory`, being moved in Task 2)

**Interfaces:**
- Produces: `ensureAdjustmentCategory(userId: string, type: "receita" | "despesa"): Promise<string | null>` — identical behavior/signature to the function currently private in `actions/accounts.ts`.
- Produces: `reconcileHistoricalBalanceAdjustment(userId: string, accountId: string, historicalNet: number): Promise<void>` — shrinks/deletes/flips the account's latest "Ajuste de Saldo" transaction by `historicalNet` (signed: positive = net receita, negative = net despesa). No-ops if `historicalNet` is ~0 or no adjustment transaction exists.

- [ ] **Step 1: Write `lib/balance-adjustment.ts`**

```ts
import { createClient } from "@/lib/supabase/server"

const ADJUSTMENT_CATEGORY_NAME = "Ajuste de Saldo"

export async function ensureAdjustmentCategory(
  userId: string,
  type: "receita" | "despesa"
): Promise<string | null> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", ADJUSTMENT_CATEGORY_NAME)
    .eq("type", type)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: ADJUSTMENT_CATEGORY_NAME,
      type,
      color: "#f59e0b",
      icon: "wallet",
    })
    .select("id")
    .single()

  return created?.id ?? null
}

// Transações históricas (data anterior ao corte de import) não mexem no
// saldo da conta — esse gap já foi absorvido por um ajuste manual anterior.
// Em vez disso, abate o valor delas do ajuste mais recente, encolhendo aos
// poucos o "balde genérico" conforme dados reais vão sendo preenchidos.
export async function reconcileHistoricalBalanceAdjustment(
  userId: string,
  accountId: string,
  historicalNet: number
): Promise<void> {
  if (Math.abs(historicalNet) < 0.001) return

  const supabase = await createClient()

  const { data: adjustment } = await supabase
    .from("transactions")
    .select("id, amount, type, categories!inner(name)")
    .eq("account_id", accountId)
    .eq("categories.name", ADJUSTMENT_CATEGORY_NAME)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!adjustment) return

  const signed = adjustment.type === "receita" ? Number(adjustment.amount) : -Number(adjustment.amount)
  const newSigned = signed - historicalNet

  if (Math.abs(newSigned) < 0.01) {
    await supabase.from("transactions").delete().eq("id", adjustment.id)
    return
  }

  const newType: "receita" | "despesa" = newSigned > 0 ? "receita" : "despesa"
  const categoryId = await ensureAdjustmentCategory(userId, newType)

  await supabase
    .from("transactions")
    .update({
      amount: Math.abs(newSigned),
      type: newType,
      category_id: categoryId,
    })
    .eq("id", adjustment.id)
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `lib/balance-adjustment.ts`. (Errors in unrelated pre-existing files, if any, are not in scope.)

- [ ] **Step 3: Lint**

Run: `npx eslint lib/balance-adjustment.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/balance-adjustment.ts
git commit -m "feat: add shared balance-adjustment helper with historical reconciliation"
```

---

## Task 2: Point `actions/accounts.ts` at the shared helper

**Files:**
- Modify: `actions/accounts.ts:1-6` (imports), `actions/accounts.ts:129-190` (`adjustAccountBalance` body + old `ensureAdjustmentCategory`)

**Interfaces:**
- Consumes: `ensureAdjustmentCategory` from `lib/balance-adjustment.ts` (Task 1).
- No change to `adjustAccountBalance`'s exported signature or behavior.

- [ ] **Step 1: Add the import**

In `actions/accounts.ts`, change:

```ts
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parseCurrency } from "@/lib/format";
import type { Account } from "@/types/database";
```

to:

```ts
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parseCurrency } from "@/lib/format";
import { ensureAdjustmentCategory } from "@/lib/balance-adjustment";
import type { Account } from "@/types/database";
```

- [ ] **Step 2: Delete the local `ensureAdjustmentCategory` definition**

Remove this whole function from `actions/accounts.ts` (currently lines 164-190, right after `adjustAccountBalance`'s closing brace):

```ts
async function ensureAdjustmentCategory(userId: string, type: "receita" | "despesa"): Promise<string | null> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Ajuste de Saldo")
    .eq("type", type)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: "Ajuste de Saldo",
      type,
      color: "#f59e0b",
      icon: "wallet",
    })
    .select("id")
    .single();

  return created?.id ?? null;
}
```

`adjustAccountBalance`'s call site (`const categoryId = await ensureAdjustmentCategory(user.id, type);`) stays exactly as-is — it now resolves to the imported function.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `actions/accounts.ts`.

- [ ] **Step 4: Lint**

Run: `npx eslint actions/accounts.ts`
Expected: no errors.

- [ ] **Step 5: Manual regression check**

Run `npm run dev`, go to `/accounts`, use "Ajustar saldo" on any account with "Criar transação de ajuste" checked, submit a new balance different from the current one. Confirm: a transaction with category "Ajuste de Saldo" is created (same as before this change) and the account balance updates to the new value. This confirms the extraction didn't change behavior.

- [ ] **Step 6: Commit**

```bash
git add actions/accounts.ts
git commit -m "refactor: move ensureAdjustmentCategory to lib/balance-adjustment"
```

---

## Task 3: Backend — cutoff detection, balance split, and reconciliation in `actions/import.ts`

**Files:**
- Modify: `actions/import.ts:1-6` (imports), `actions/import.ts:35-41` (after account fetch), `actions/import.ts:155-158` (regularDelta), `actions/import.ts:202-207` (balance update block)

**Interfaces:**
- Consumes: `reconcileHistoricalBalanceAdjustment` from `lib/balance-adjustment.ts` (Task 1).
- No change to `importTransactions`'s exported signature (`accountId, transactions, force`) or return shape — client code (Task 4) doesn't need to change how it calls this action.

- [ ] **Step 1: Add the import**

In `actions/import.ts`, change:

```ts
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { ParsedTransaction } from "@/types/import"
import { extractFromPDFText, classifyBatchWithLLM } from "@/app/(app)/import/llm"
```

to:

```ts
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { ParsedTransaction } from "@/types/import"
import { extractFromPDFText, classifyBatchWithLLM } from "@/app/(app)/import/llm"
import { reconcileHistoricalBalanceAdjustment } from "@/lib/balance-adjustment"
```

- [ ] **Step 2: Detect the cutoff date, right after the account is fetched**

Change:

```ts
  if (!account) return { error: "Conta não encontrada" }

  const transfers = transactions.filter((t) => t.type === "transferencia")
```

to:

```ts
  if (!account) return { error: "Conta não encontrada" }

  const { data: lastLog } = await supabase
    .from("import_logs")
    .select("created_at")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  // Transações datadas antes do último import dessa conta: o saldo atual já
  // reflete esse período via um "Ajuste de Saldo" anterior (se existir), então
  // essas transações não devem mexer no saldo de novo — só no ajuste.
  const cutoffDate = lastLog?.created_at ? lastLog.created_at.split("T")[0] : null

  const transfers = transactions.filter((t) => t.type === "transferencia")
```

- [ ] **Step 3: Split `toImportRegular` into current vs. historical, before computing the balance delta**

Change:

```ts
  const regularDelta = toImportRegular.reduce(
    (acc, t) => acc + (t.type === "receita" ? t.amount : -t.amount),
    0
  )
```

to:

```ts
  const currentRegular = cutoffDate
    ? toImportRegular.filter((t) => t.date >= cutoffDate)
    : toImportRegular
  const historicalRegular = cutoffDate
    ? toImportRegular.filter((t) => t.date < cutoffDate)
    : []

  const regularDelta = currentRegular.reduce(
    (acc, t) => acc + (t.type === "receita" ? t.amount : -t.amount),
    0
  )
```

- [ ] **Step 4: Reconcile the adjustment transaction right after the balance update**

Change:

```ts
  if (regularDelta !== 0) {
    await supabase
      .from("accounts")
      .update({ balance: Number(account.balance) + regularDelta })
      .eq("id", accountId)
  }

  for (const t of toImportTransfers) {
```

to:

```ts
  if (regularDelta !== 0) {
    await supabase
      .from("accounts")
      .update({ balance: Number(account.balance) + regularDelta })
      .eq("id", accountId)
  }

  if (historicalRegular.length > 0) {
    const historicalNet = historicalRegular.reduce(
      (acc, t) => acc + (t.type === "receita" ? t.amount : -t.amount),
      0
    )
    await reconcileHistoricalBalanceAdjustment(user.id, accountId, historicalNet)
  }

  for (const t of toImportTransfers) {
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `actions/import.ts`.

- [ ] **Step 6: Lint**

Run: `npx eslint actions/import.ts`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add actions/import.ts
git commit -m "feat: skip balance delta for historical import rows, reconcile against Ajuste de Saldo"
```

---

## Task 4: Frontend — stop hiding historical rows, flag them instead

**Files:**
- Modify: `app/(app)/import/ImportForm.tsx:105-113` (visibleTransactions/hiddenCount), `app/(app)/import/ImportForm.tsx:526-535` (header count text), `app/(app)/import/ImportForm.tsx:689-697` (ImportPreview usage), `app/(app)/import/ImportForm.tsx:700-711` (footer count text)
- Modify: `app/(app)/import/ImportPreview.tsx:21-37` (props), `app/(app)/import/ImportPreview.tsx:151-153` (map body), `app/(app)/import/ImportPreview.tsx:176-190` (description cell badge)

**Interfaces:**
- Consumes: none new (uses existing `lastImportDates` prop already threaded into `ImportForm`).
- Produces: `ImportPreview` accepts a new optional prop `historicalKeys?: Set<string>`, same shape/convention as the existing `duplicateKeys?: Set<string>` (keyed by `` `${date}|${description}` ``).

- [ ] **Step 1: Stop filtering by date in `ImportForm.tsx`, compute `historicalKeys` instead**

Change:

```tsx
  const visibleTransactions = useMemo(() => {
    if (!accountId) return categorizedTransactions
    const lastDate = lastImportDates[accountId]
    if (!lastDate) return categorizedTransactions
    const datePart = lastDate.split("T")[0]
    return categorizedTransactions.filter((t) => t.date >= datePart)
  }, [categorizedTransactions, accountId, lastImportDates])

  const hiddenCount = transactions.length - visibleTransactions.length
```

to:

```tsx
  const visibleTransactions = categorizedTransactions

  const cutoffDate = accountId ? lastImportDates[accountId]?.split("T")[0] ?? null : null

  const historicalKeys = useMemo(() => {
    if (!cutoffDate) return new Set<string>()
    const keys = new Set<string>()
    for (const t of visibleTransactions) {
      if (t.type !== "transferencia" && t.date < cutoffDate) {
        keys.add(`${t.date}|${t.description}`)
      }
    }
    return keys
  }, [visibleTransactions, cutoffDate])
```

- [ ] **Step 2: Remove the two now-dead `hiddenCount` UI blocks**

Change the header text block:

```tsx
            <p className="text-xs text-muted-foreground">
              {visibleTransactions.length} transação
              {visibleTransactions.length !== 1 ? "ões" : ""} encontrada
              {visibleTransactions.length !== 1 ? "s" : ""}
              {hiddenCount > 0 && (
                <span className="ml-1 text-faint">
                  ({hiddenCount} anteriores ao último import ignoradas)
                </span>
              )}
            </p>
```

to:

```tsx
            <p className="text-xs text-muted-foreground">
              {visibleTransactions.length} transação
              {visibleTransactions.length !== 1 ? "ões" : ""} encontrada
              {visibleTransactions.length !== 1 ? "s" : ""}
            </p>
```

And the sticky footer text block:

```tsx
          <p className="text-sm text-muted-foreground">
            {visibleTransactions.length} transação
            {visibleTransactions.length !== 1 ? "ões" : ""}
            {hiddenCount > 0 && (
              <span className="ml-2 text-xs text-faint">
                ({hiddenCount} ocultadas)
              </span>
            )}
            {accountId &&
              ` → ${accounts.find((a) => a.id === accountId)?.name ?? ""}`}
          </p>
```

to:

```tsx
          <p className="text-sm text-muted-foreground">
            {visibleTransactions.length} transação
            {visibleTransactions.length !== 1 ? "ões" : ""}
            {accountId &&
              ` → ${accounts.find((a) => a.id === accountId)?.name ?? ""}`}
          </p>
```

- [ ] **Step 3: Pass `historicalKeys` down to `ImportPreview`**

Change:

```tsx
      <ImportPreview
        transactions={visibleTransactions}
        categories={categories}
        accounts={accounts}
        accountId={accountId}
        onUpdate={updateTransaction}
        onRemove={removeTransaction}
        duplicateKeys={duplicateKeys}
      />
```

to:

```tsx
      <ImportPreview
        transactions={visibleTransactions}
        categories={categories}
        accounts={accounts}
        accountId={accountId}
        onUpdate={updateTransaction}
        onRemove={removeTransaction}
        duplicateKeys={duplicateKeys}
        historicalKeys={historicalKeys}
      />
```

- [ ] **Step 4: Accept the new prop in `ImportPreview.tsx`**

Change:

```tsx
export default function ImportPreview({
  transactions,
  categories,
  accounts,
  accountId,
  onUpdate,
  onRemove,
  duplicateKeys,
}: {
  transactions: ParsedTransaction[]
  categories: Category[]
  accounts: Account[]
  accountId: string
  onUpdate: (index: number, updates: Partial<ParsedTransaction>) => void
  onRemove: (index: number) => void
  duplicateKeys?: Set<string>
}) {
```

to:

```tsx
export default function ImportPreview({
  transactions,
  categories,
  accounts,
  accountId,
  onUpdate,
  onRemove,
  duplicateKeys,
  historicalKeys,
}: {
  transactions: ParsedTransaction[]
  categories: Category[]
  accounts: Account[]
  accountId: string
  onUpdate: (index: number, updates: Partial<ParsedTransaction>) => void
  onRemove: (index: number) => void
  duplicateKeys?: Set<string>
  historicalKeys?: Set<string>
}) {
```

- [ ] **Step 5: Compute `isHistorical` alongside `isDuplicate`**

Change:

```tsx
        {transactions.map((tx, i) => {
          const isDuplicate = duplicateKeys?.has(`${tx.date}|${tx.description}`) ?? false
          return (
```

to:

```tsx
        {transactions.map((tx, i) => {
          const isDuplicate = duplicateKeys?.has(`${tx.date}|${tx.description}`) ?? false
          const isHistorical = historicalKeys?.has(`${tx.date}|${tx.description}`) ?? false
          return (
```

- [ ] **Step 6: Render the "Histórica" badge next to the "Duplicada" one**

Change:

```tsx
              <div className="flex w-full items-center gap-1.5">
                <input
                  type="text"
                  value={tx.description}
                  onChange={(e) =>
                    onUpdate(i, { description: e.target.value })
                  }
                  className={miniInputClass}
                />
                {isDuplicate && (
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-negative px-2 py-0.5 text-[10px] font-bold text-background">
                    Duplicada
                  </span>
                )}
              </div>
```

to:

```tsx
              <div className="flex w-full items-center gap-1.5">
                <input
                  type="text"
                  value={tx.description}
                  onChange={(e) =>
                    onUpdate(i, { description: e.target.value })
                  }
                  className={miniInputClass}
                />
                {isDuplicate && (
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-negative px-2 py-0.5 text-[10px] font-bold text-background">
                    Duplicada
                  </span>
                )}
                {isHistorical && (
                  <span
                    title="Anterior ao último import — não mexe no saldo, só abate o ajuste de saldo"
                    className="shrink-0 whitespace-nowrap rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                  >
                    Histórica
                  </span>
                )}
              </div>
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `ImportForm.tsx` or `ImportPreview.tsx`.

- [ ] **Step 8: Lint**

Run: `npx eslint "app/(app)/import/ImportForm.tsx" "app/(app)/import/ImportPreview.tsx"`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add "app/(app)/import/ImportForm.tsx" "app/(app)/import/ImportPreview.tsx"
git commit -m "feat: show historical import rows with a badge instead of hiding them"
```

---

## Task 5: End-to-end manual QA

**Files:** none (verification only)

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: build succeeds with no type or lint errors.

- [ ] **Step 2: Seed a reconciliation scenario**

Run `npm run dev`, open the app:
1. Create a fresh test account (e.g. "QA Histórico") with an initial balance of `0`.
2. Go to `/import`, import a small CSV/pasted-text statement with 1-2 recent transactions into that account (this creates the account's first `import_logs` row — the cutoff — and its resulting balance, call it `B0`).
3. Go to `/accounts`, use "Ajustar saldo" on the test account: set the new balance to `B0 + 50`, with "Criar transação de ajuste" checked. Confirm a "Ajuste de Saldo" transaction is created with `type=receita`, `amount=50`, and the account balance is now `B0 + 50`.

- [ ] **Step 3: Import a historical transaction and confirm it doesn't move the balance**

Go to `/import` again, import a new statement for the same account containing exactly one transaction dated *before* the first import's date, a `despesa` of `20`. Confirm in the preview:
- The row is visible (not silently dropped).
- The row shows the "Histórica" badge.

Import it. Confirm afterward:
- On `/accounts`: balance is still `B0 + 50` (unchanged by the historical row).
- On `/transactions`: the despesa of `20` is present, dated in the past.
- The "Ajuste de Saldo" transaction now has `type=receita`, `amount=70`. (Formula: `signed = +50` since it was a receita; `historicalNet = -20` since the historical row was a despesa; `newSigned = signed - historicalNet = 50 - (-20) = 70`, still positive so it stays a receita.)

- [ ] **Step 4: Confirm the zero-out case**

Import one more historical statement for the same account with a single `despesa` of `70`, dated before the cutoff. `signed = +70`, `historicalNet = -70`, `newSigned = 70 - (-70) = 140` — that grows the adjustment, it doesn't zero it. To actually hit the zero-out path, use a historical `receita` of `70` instead: `historicalNet = +70`, `newSigned = 70 - 70 = 0`. Confirm the "Ajuste de Saldo" transaction is deleted entirely (not left at `amount=0`), and the account balance is still unchanged (`B0 + 50`).

- [ ] **Step 5: Confirm accounts with no adjustment are unaffected**

On an account that has never had a manual "Ajuste de Saldo", import a statement with a transaction dated before that account's last import. Confirm: the transaction is inserted, shows the "Histórica" badge, balance is unchanged, and no error occurs (silent no-op, per Global Constraints).

- [ ] **Step 6: Confirm transfers are unaffected**

Import a transfer-classified row dated before the cutoff into an account with two linked accounts. Confirm it behaves exactly as before this change (moves both accounts' balances, no "Histórica" badge, no adjustment interaction).

- [ ] **Step 7: Clean up**

Archive or delete the "QA Histórico" test account and its transactions created during this QA pass.
