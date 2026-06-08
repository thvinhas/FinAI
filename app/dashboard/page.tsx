import { Suspense } from "react";
import type { Metadata } from "next";
import { getDashboardData } from "@/actions/transactions";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import MonthPicker from "./MonthPicker";
import DashboardCharts from "./DashboardCharts";

export const metadata: Metadata = {
  title: "Dashboard - FinApp",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  const params = await searchParams;
  let year = new Date().getFullYear();
  let month = new Date().getMonth();

  if (params.m) {
    const parts = params.m.split("-");
    if (parts.length === 2) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
    }
  }

  return (
    <>
      <Header userName={user?.email} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Suspense
          fallback={
            <div>
              <div className="mb-6 flex items-center justify-between gap-4">
                <div className="h-6 w-32 animate-pulse rounded bg-zinc-800 sm:h-8" />
                <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-800" />
              </div>
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-zinc-800 sm:h-12 sm:w-12" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-20 animate-pulse rounded bg-zinc-800" />
                      <div className="h-5 w-28 animate-pulse rounded bg-zinc-800 sm:h-7" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mb-6 grid gap-6 lg:grid-cols-2">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
                    <div className="mb-4 h-5 w-32 animate-pulse rounded bg-zinc-800" />
                    <div className="flex h-[280px] items-center justify-center">
                      <div className="h-48 w-48 animate-pulse rounded-full bg-zinc-800/50" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
                    <div className="mb-4 h-5 w-36 animate-pulse rounded bg-zinc-800" />
                    <div className="flex h-[240px] items-center justify-center">
                      <div className="h-36 w-36 animate-pulse rounded-full bg-zinc-800/50" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <DashboardContent year={year} month={month} />
        </Suspense>
      </main>
    </>
  );
}

async function DashboardContent({ year, month }: { year: number; month: number }) {
  const data = await getDashboardData(year, month);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-white sm:text-2xl">
          Dashboard
        </h1>
        <MonthPicker year={year} month={month} />
      </div>

      <DashboardCharts data={data} />
    </>
  );
}
