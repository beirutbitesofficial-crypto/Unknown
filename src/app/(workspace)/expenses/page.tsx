import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { getLocale } from "@/i18n/server";

export default async function ExpensesPage() {
  const context = await requireBusinessContext(PERMISSIONS.EXPENSES_MANAGE); const locale = await getLocale(); const ar = locale === "ar";
  const rows = await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: (tx) => tx.expense.findMany({ where: { businessId: context.businessId, deletedAt: null }, orderBy: { expenseDate: "desc" }, take: 200, select: { id: true, title: true, amount: true, currency: true, expenseDate: true, category: { select: { name: true } } } }) });
  return <div className="mx-auto max-w-7xl space-y-6"><PageHeader title={ar ? "المصاريف" : "Expenses"} />{rows.length ? <Card><CardContent className="space-y-3 pt-5">{rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"><div><p className="text-sm font-medium">{row.title}</p><p className="text-xs text-slate-400">{row.category?.name ?? (ar ? "بدون فئة" : "Uncategorized")} · {new Intl.DateTimeFormat(ar ? "ar-LB" : "en-LB", { dateStyle: "medium" }).format(row.expenseDate)}</p></div><span className="font-semibold">{row.amount.toString()} {row.currency}</span></div>)}</CardContent></Card> : <EmptyState>{ar ? "ما في مصاريف بعد." : "No expenses yet."}</EmptyState>}</div>;
}
