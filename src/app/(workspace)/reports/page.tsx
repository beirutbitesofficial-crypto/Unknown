import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { requireBusinessContext } from "@/server/tenancy/context";
import { getDashboardSummary } from "@/server/services/dashboard";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { getLocale } from "@/i18n/server";

export default async function ReportsPage() {
  const context = await requireBusinessContext(PERMISSIONS.REPORTS_VIEW); const locale = await getLocale(); const ar = locale === "ar"; const summary = await getDashboardSummary(context);
  const rows = [[ar ? "إيرادات الشهر" : "Monthly revenue", summary.month.revenue], [ar ? "مصاريف الشهر" : "Monthly expenses", summary.month.expenses], [ar ? "صافي الربح" : "Net profit", summary.month.netProfit], [ar ? "ديون الزبائن" : "Customer receivables", summary.receivables], [ar ? "مستحقات الموردين" : "Supplier payables", summary.payables]];
  return <div className="mx-auto max-w-5xl space-y-6"><PageHeader title={ar ? "التقارير" : "Reports"} description={ar ? "ملخّص حي من البيانات الحقيقية." : "Live summary from real business data."} /><Card><CardHeader><CardTitle>{ar ? "ملخّص الشهر" : "Monthly summary"}</CardTitle></CardHeader><CardContent className="divide-y divide-slate-100">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between py-4"><span className="text-sm text-slate-500">{label}</span><span className="font-bold">{value} {summary.currency}</span></div>)}</CardContent></Card></div>;
}
