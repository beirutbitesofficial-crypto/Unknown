import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";
import { getLocale } from "@/i18n/server";

export default async function NotificationsPage() {
  const context = await requireBusinessContext(); const locale = await getLocale(); const ar = locale === "ar";
  const rows = await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: (tx) => tx.notification.findMany({ where: { businessId: context.businessId }, orderBy: { createdAt: "desc" }, take: 100 }) });
  return <div className="mx-auto max-w-5xl space-y-6"><PageHeader title={ar ? "الإشعارات" : "Notifications"} />{rows.length ? <Card><CardContent className="space-y-4 pt-5">{rows.map((row) => <div key={row.id} className="border-b border-slate-100 pb-4 last:border-0"><div className="flex items-start justify-between gap-3"><p className="font-semibold">{row.title}</p><span className="text-xs text-slate-400">{row.readAt ? (ar ? "مقروء" : "Read") : (ar ? "جديد" : "New")}</span></div><p className="mt-1 text-sm leading-6 text-slate-500">{row.body}</p></div>)}</CardContent></Card> : <EmptyState>{ar ? "ما في إشعارات." : "No notifications."}</EmptyState>}</div>;
}
