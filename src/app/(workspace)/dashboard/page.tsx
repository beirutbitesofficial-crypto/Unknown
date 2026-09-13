import { redirect } from "next/navigation";
import { BanknoteArrowDown, BanknoteArrowUp, CircleDollarSign, HandCoins, ReceiptText, ShoppingBag, WalletCards } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardChart } from "@/components/dashboard/dashboard-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ensureBusinessForCurrentUser } from "@/server/services/ensure-business";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { requireBusinessContext } from "@/server/tenancy/context";
import { getDashboardSummary } from "@/server/services/dashboard";
import { getI18n } from "@/i18n/server";
import { prisma } from "@/lib/prisma";

function money(value: string, currency: "USD" | "LBP") {
  const n = Number(value);
  return new Intl.NumberFormat(currency === "LBP" ? "ar-LB" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "LBP" ? 0 : 2
  }).format(n);
}

export default async function DashboardPage() {
  const businessId = await ensureBusinessForCurrentUser();
  const context = await requireBusinessContext(PERMISSIONS.DASHBOARD_VIEW);

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { onboardingCompletedAt: true }
  });
  if (!business?.onboardingCompletedAt) redirect("/onboarding");

  const [summary, { dict, locale }] = await Promise.all([getDashboardSummary(context), getI18n()]);
  const d = dict.dashboard;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{d.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{locale === "ar" ? "أهم أرقام شغلك، من دون تعقيد." : "Your key business numbers, without the clutter."}</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title={d.todaySales} value={money(summary.today.sales, summary.currency)} icon={ShoppingBag} />
        <MetricCard title={d.todayExpenses} value={money(summary.today.expenses, summary.currency)} icon={BanknoteArrowDown} />
        <MetricCard title={d.todayProfit} value={money(summary.today.profit, summary.currency)} icon={CircleDollarSign} />
        <MetricCard title={d.transactions} value={String(summary.today.transactions)} icon={ReceiptText} />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard title={d.monthRevenue} value={money(summary.month.revenue, summary.currency)} icon={BanknoteArrowUp} />
        <MetricCard title={d.monthExpenses} value={money(summary.month.expenses, summary.currency)} icon={BanknoteArrowDown} />
        <MetricCard title={d.monthProfit} value={money(summary.month.netProfit, summary.currency)} icon={WalletCards} />
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader><CardTitle>{locale === "ar" ? "آخر 7 أيام" : "Last 7 days"}</CardTitle></CardHeader>
          <CardContent><DashboardChart data={summary.chart} labels={{ sales: locale === "ar" ? "مبيعات" : "Sales", expenses: locale === "ar" ? "مصاريف" : "Expenses", profit: locale === "ar" ? "ربح" : "Profit" }} /></CardContent>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <MetricCard title={d.customersOwe} value={money(summary.receivables, summary.currency)} icon={HandCoins} />
          <MetricCard title={d.suppliersOwed} value={money(summary.payables, summary.currency)} icon={BanknoteArrowDown} />
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>{d.lowStock}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {summary.lowStock.length ? summary.lowStock.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium">{item.name}</span><span className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">{item.stock} / {item.minimum}</span></div>) : <p className="text-sm text-slate-500">{d.empty}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{d.bestSellers}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {summary.bestSellers.length ? summary.bestSellers.map((item, index) => <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium">{item.name}</span><span className="text-slate-500">{item.quantity}</span></div>) : <p className="text-sm text-slate-500">{d.empty}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{d.recentTransactions}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {summary.recentTransactions.length ? summary.recentTransactions.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.description ?? item.type}</p><p className="text-xs text-slate-400">{new Intl.DateTimeFormat(locale === "ar" ? "ar-LB" : "en-LB", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.occurredAt))}</p></div><span className={`text-sm font-semibold ${item.direction === "IN" ? "text-emerald-700" : "text-slate-700"}`}>{item.direction === "IN" ? "+" : "−"}{money(item.amount, item.currency)}</span></div>) : <p className="text-sm text-slate-500">{d.empty}</p>}
          </CardContent>
        </Card>
      </section>

      {(summary.dataQuality.conversionWarnings > 0 || summary.dataQuality.missingCostLines > 0) ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{locale === "ar" ? "بعض أرقام الربح بدها سعر صرف أو كلفة منتج حتى تكون أدق." : "Some profit figures need an exchange rate or product cost to be fully accurate."}</div> : null}
    </div>
  );
}
