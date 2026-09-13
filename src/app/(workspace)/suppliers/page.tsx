import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { getLocale } from "@/i18n/server";

export default async function SuppliersPage() {
  const context = await requireBusinessContext(PERMISSIONS.SUPPLIERS_MANAGE); const locale = await getLocale(); const ar = locale === "ar";
  const rows = await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: (tx) => tx.supplier.findMany({ where: { businessId: context.businessId, deletedAt: null }, orderBy: { name: "asc" }, take: 200, select: { id: true, name: true, phone: true, whatsapp: true, _count: { select: { debts: true } } } }) });
  return <div className="mx-auto max-w-7xl space-y-6"><PageHeader title={ar ? "الموردون" : "Suppliers"} />{rows.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <Card key={row.id}><CardContent className="pt-5"><p className="font-semibold">{row.name}</p><p className="mt-1 text-sm text-slate-500">{row.phone ?? row.whatsapp ?? "—"}</p><p className="mt-3 text-xs text-slate-400">{row._count.debts} {ar ? "قيود دين" : "debt records"}</p></CardContent></Card>)}</div> : <EmptyState>{ar ? "ما في موردين بعد." : "No suppliers yet."}</EmptyState>}</div>;
}
