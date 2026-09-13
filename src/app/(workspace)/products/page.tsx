import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";
import { getLocale } from "@/i18n/server";

export default async function ProductsPage() {
  const context = await requireBusinessContext(); const locale = await getLocale(); const ar = locale === "ar";
  const rows = await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: (tx) => tx.product.findMany({ where: { businessId: context.businessId, deletedAt: null }, orderBy: { name: "asc" }, take: 300, select: { id: true, name: true, type: true, sellingPrice: true, currency: true, stockQuantity: true, isActive: true } }) });
  return <div className="mx-auto max-w-7xl space-y-6"><PageHeader title={ar ? "المنتجات والخدمات" : "Products & Services"} />{rows.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <Card key={row.id}><CardContent className="pt-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{row.name}</p><p className="mt-1 text-xs text-slate-500">{row.type}</p></div><span className="text-sm font-bold">{row.sellingPrice.toString()} {row.currency}</span></div>{row.stockQuantity !== null ? <p className="mt-4 text-xs text-slate-500">{ar ? "المخزون" : "Stock"}: {row.stockQuantity.toString()}</p> : null}</CardContent></Card>)}</div> : <EmptyState>{ar ? "ما في منتجات أو خدمات بعد." : "No products or services yet."}</EmptyState>}</div>;
}
