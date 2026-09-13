import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { getLocale } from "@/i18n/server";

export default async function DebtsPage() {
  const context = await requireBusinessContext(PERMISSIONS.DEBTS_MANAGE); const locale = await getLocale(); const ar = locale === "ar";
  const rows = await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: (tx) => tx.debt.findMany({ where: { businessId: context.businessId, deletedAt: null }, orderBy: [{ status: "asc" }, { dueDate: "asc" }], take: 200, select: { id: true, direction: true, balanceRemaining: true, currency: true, status: true, dueDate: true, customer: { select: { name: true } }, supplier: { select: { name: true } } } }) });
  return <div className="mx-auto max-w-7xl space-y-6"><PageHeader title={ar ? "الديون" : "Debts"} description={ar ? "اللي إلك عند الزبائن واللي عليك للموردين." : "Customer receivables and supplier payables."} />{rows.length ? <div className="grid gap-3 md:grid-cols-2">{rows.map((row) => <Card key={row.id}><CardContent className="pt-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{row.customer?.name ?? row.supplier?.name ?? "—"}</p><p className="mt-1 text-xs text-slate-500">{row.direction === "RECEIVABLE" ? (ar ? "الزبون عليه" : "Customer owes you") : (ar ? "عليك للمورد" : "You owe supplier")}</p></div><span className="text-base font-bold">{row.balanceRemaining.toString()} {row.currency}</span></div><div className="mt-4 flex justify-between text-xs text-slate-400"><span>{row.status}</span><span>{row.dueDate ? new Intl.DateTimeFormat(ar ? "ar-LB" : "en-LB", { dateStyle: "medium" }).format(row.dueDate) : "—"}</span></div></CardContent></Card>)}</div> : <EmptyState>{ar ? "ما في ديون مسجلة." : "No debts recorded."}</EmptyState>}</div>;
}
