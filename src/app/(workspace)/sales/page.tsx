import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { getLocale } from "@/i18n/server";

export default async function SalesPage() {
  const context = await requireBusinessContext(PERMISSIONS.SALES_VIEW);
  const locale = await getLocale();
  const ar = locale === "ar";
  const sales = await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: (tx) => tx.sale.findMany({ where: { businessId: context.businessId, deletedAt: null }, orderBy: { soldAt: "desc" }, take: 100, select: { id: true, soldAt: true, total: true, currency: true, paymentStatus: true, invoice: { select: { invoiceNumber: true } }, customer: { select: { name: true } } } }) });
  return <div className="mx-auto max-w-7xl space-y-6"><PageHeader title={ar ? "المبيعات" : "Sales"} description={ar ? "آخر عمليات البيع والفواتير." : "Recent sales and invoices."} action={<Button asChild><Link href="/sales/new">{ar ? "+ عملية بيع جديدة" : "+ New Sale"}</Link></Button>} />{sales.length ? <Card><CardContent className="overflow-x-auto pt-5"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b text-start text-slate-500"><th className="pb-3 text-start">{ar ? "الفاتورة" : "Invoice"}</th><th className="pb-3 text-start">{ar ? "الزبون" : "Customer"}</th><th className="pb-3 text-start">{ar ? "التاريخ" : "Date"}</th><th className="pb-3 text-start">{ar ? "الحالة" : "Status"}</th><th className="pb-3 text-end">{ar ? "المجموع" : "Total"}</th></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id} className="border-b border-slate-100 last:border-0"><td className="py-3 font-medium">{sale.invoice?.invoiceNumber ?? "—"}</td><td>{sale.customer?.name ?? (ar ? "زبون نقدي" : "Walk-in")}</td><td>{new Intl.DateTimeFormat(ar ? "ar-LB" : "en-LB", { dateStyle: "medium", timeStyle: "short" }).format(sale.soldAt)}</td><td>{sale.paymentStatus}</td><td className="text-end font-semibold">{sale.total.toString()} {sale.currency}</td></tr>)}</tbody></table></CardContent></Card> : <EmptyState>{ar ? "ما في مبيعات بعد." : "No sales yet."}</EmptyState>}</div>;
}
