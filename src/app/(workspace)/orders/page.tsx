import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { OrderStatusControl } from "@/components/shared/order-status-control";
import { getLocale } from "@/i18n/server";
import { getEntitlements } from "@/server/billing/entitlements";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";

export default async function OrdersPage() {
  const context = await requireBusinessContext(PERMISSIONS.ONLINE_ORDERS_MANAGE); const ar = (await getLocale()) === "ar"; const entitlements = await getEntitlements(context); const enabled = entitlements.features.onlineStore || entitlements.features.onlineOrdering;
  const orders = enabled ? await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: (tx) => tx.onlineOrder.findMany({ where: { businessId: context.businessId }, orderBy: { createdAt: "desc" }, take: 150, include: { items: { select: { itemNameSnapshot: true, quantity: true } } } }) }) : [];
  return <div className="mx-auto max-w-7xl space-y-6"><PageHeader title={ar ? "الطلبات الأونلاين" : "Online Orders"} description={enabled ? (ar ? "طلبات الموقع والمتجر الرقمي." : "Orders received from your public menu/store.") : (ar ? "فعّل Online Store أو Online Ordering من الخدمات." : "Activate Online Store or Online Ordering from Apps & Add-ons.")} />{orders.length ? <div className="space-y-3">{orders.map((o) => <Card key={o.id}><CardContent className="grid gap-3 pt-5 md:grid-cols-[1.4fr_1fr_auto] md:items-center"><div><p className="font-bold">{o.orderNumber} · {o.customerName}</p><p className="mt-1 text-xs text-slate-500">{o.customerPhone} · {o.fulfillment} · {o.items.map((i) => `${i.quantity.toString()}× ${i.itemNameSnapshot}`).join(", ")}</p></div><div><p className="font-bold">{o.total.toString()} {o.currency}</p><p className="text-xs text-slate-500">{new Intl.DateTimeFormat(ar ? "ar-LB" : "en-LB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Beirut" }).format(o.createdAt)}</p></div><OrderStatusControl id={o.id} initial={o.status} /></CardContent></Card>)}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">{enabled ? (ar ? "ما في طلبات أونلاين بعد." : "No online orders yet.") : (ar ? "الخدمة غير مفعّلة." : "The feature is not active.")}</div>}</div>;
}
