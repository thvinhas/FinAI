export default function AccountsLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-7 w-28 animate-pulse rounded bg-zinc-800" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-zinc-800" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="h-4 w-4 animate-pulse rounded-full bg-zinc-800" />
              <div className="h-4 flex-1 animate-pulse rounded bg-zinc-800" />
            </div>
            <div className="h-6 w-24 animate-pulse rounded bg-zinc-800" />
          </div>
        ))}
      </div>
    </main>
  );
}
