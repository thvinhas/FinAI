import { getDashboardData } from "@/actions/transactions";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import DashboardCharts from "./DashboardCharts";
import Link from "next/link";
import { Building2, Wallet, PiggyBank, CreditCard } from "lucide-react";

const accountIcons: Record<string, React.ReactNode> = {
  checking: <Building2 size={16} />,
  savings: <PiggyBank size={16} />,
  cash: <Wallet size={16} />,
  credit: <CreditCard size={16} />,
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const data = await getDashboardData();

  return (
    <>
      <Header userName={user?.email} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-xl font-bold text-white sm:mb-8 sm:text-2xl">Dashboard</h1>

        <div className="mb-6 grid gap-3 sm:mb-8 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
            <p className="text-xs text-zinc-400 sm:text-sm">Saldo Total</p>
            <p
              className={`mt-1 text-xl font-bold sm:mt-2 sm:text-3xl ${
                data.saldoTotal >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              R$ {data.saldoTotal.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
            <p className="text-xs text-zinc-400 sm:text-sm">Receitas (mês)</p>
            <p className="mt-1 text-xl font-bold text-emerald-400 sm:mt-2 sm:text-3xl">
              R$ {data.receitas.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
            <p className="text-xs text-zinc-400 sm:text-sm">Despesas (mês)</p>
            <p className="mt-1 text-xl font-bold text-red-400 sm:mt-2 sm:text-3xl">
              R$ {data.despesas.toFixed(2)}
            </p>
          </div>
        </div>

        {data.accounts.length > 0 && (
          <div className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Contas</h2>
              <Link
                href="/accounts"
                className="text-sm text-indigo-400 hover:underline"
              >
                Ver todas
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span style={{ color: acc.color }}>
                      {accountIcons[acc.type] ?? <Wallet size={16} />}
                    </span>
                    <span className="truncate text-sm text-zinc-400">{acc.name}</span>
                  </div>
                  <p
                    className={`text-base font-bold sm:text-lg ${
                      Number(acc.balance) >= 0
                        ? "text-white"
                        : "text-red-400"
                    }`}
                  >
                    R$ {Number(acc.balance).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <DashboardCharts data={data} />
      </main>
    </>
  );
}
