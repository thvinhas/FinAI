export default function TransactionsLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-7 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-zinc-800" />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6"
          >
            <div className="h-10 w-10 animate-pulse rounded-lg bg-zinc-800 sm:h-12 sm:w-12" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-800" />
              <div className="h-5 w-24 animate-pulse rounded bg-zinc-800 sm:h-7" />
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 flex gap-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-9 w-44 animate-pulse rounded-lg bg-zinc-800"
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <div className="bg-zinc-900 px-4 py-3">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-4 w-16 animate-pulse rounded bg-zinc-800"
              />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex gap-4 border-t border-zinc-800 px-4 py-4"
          >
            {[1, 2, 3, 4, 5].map((j) => (
              <div
                key={j}
                className={`h-4 animate-pulse rounded bg-zinc-800/50 ${
                  j === 0 ? "w-20" : j === 1 ? "w-32 flex-1" : j === 4 ? "w-24" : "w-16"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
