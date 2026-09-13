import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { getLocale } from "@/i18n/server";

export default async function InventoryPage() {
  const context = await requireBusinessContext(PERMISSIONS.INVENTORY_MANAGE); const locale = await getLocale(); const ar = locale === "ar";
  const rows = await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: (tx) => tx.inventoryTransaction.findMany({ where: { businessId: context.businessId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, type: true, quantityDelta: true, quantityAfter: true, createdAt: true, product: { select: { name: true } } } }) });
  return <div className="mx-auto max-w-7xl space-y-6"><PageHeader title={ar ? "المخزون" : "Inventory"} />{rows.length ? <Card><CardContent className="space-y-3 pt-5">{rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"><div><p className="text-sm font-medium">{row.product.name}</p><p className="text-xs text-slate-400">{row.type} · {new Intl.DateTimeFormat(ar ? "ar-LB" : "en-LB", { dateStyle: "short", timeStyle: "short" }).format(row.createdAt)}</p></div><div className="text-end"><p className="text-sm font-semibold">{row.quantityDelta.toString()}</p><p className="text-xs text-slate-400">{ar ? "بعد" : "After"}: {row.quantityAfter.toString()}</p></div></div>)}</CardContent></Card> : <EmptyState>{ar ? "ما في حركات مخزون بعد." : "No inventory movements yet."}</EmptyState>}</div>;
}
