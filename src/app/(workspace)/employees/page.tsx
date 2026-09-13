import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { getLocale } from "@/i18n/server";

export default async function EmployeesPage() {
  const context = await requireBusinessContext(PERMISSIONS.EMPLOYEES_MANAGE); const locale = await getLocale(); const ar = locale === "ar";
  const rows = await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: (tx) => tx.businessMember.findMany({ where: { businessId: context.businessId, deletedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true, status: true, user: { select: { name: true, email: true, phone: true } }, role: { select: { name: true } } } }) });
  return <div className="mx-auto max-w-7xl space-y-6"><PageHeader title={ar ? "الموظفون" : "Employees"} />{rows.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <Card key={row.id}><CardContent className="pt-5"><p className="font-semibold">{row.user.name}</p><p className="mt-1 text-sm text-slate-500">{row.user.email}</p><div className="mt-4 flex items-center justify-between text-xs"><span className="rounded-lg bg-slate-100 px-2 py-1">{row.role.name}</span><span className="text-slate-400">{row.status}</span></div></CardContent></Card>)}</div> : <EmptyState>{ar ? "ما في موظفين بعد." : "No employees yet."}</EmptyState>}</div>;
}
