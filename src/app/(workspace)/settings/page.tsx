import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { getLocale } from "@/i18n/server";

export default async function SettingsPage() {
  const context = await requireBusinessContext(PERMISSIONS.SETTINGS_MANAGE); const locale = await getLocale(); const ar = locale === "ar";
  const data = await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: async (tx) => ({ business: await tx.business.findUniqueOrThrow({ where: { id: context.businessId }, select: { name: true, category: true, phone: true, email: true } }), settings: await tx.businessSettings.findUniqueOrThrow({ where: { businessId: context.businessId } }) }) });
  const fields = [[ar ? "اسم العمل" : "Business name", data.business.name], [ar ? "الفئة" : "Category", data.business.category], [ar ? "الهاتف" : "Phone", data.settings.phone ?? data.business.phone ?? "—"], ["WhatsApp", data.settings.whatsapp ?? "—"], [ar ? "العملة الأساسية" : "Default currency", data.settings.defaultCurrency], [ar ? "سعر الصرف" : "USD/LBP rate", data.settings.usdToLbpRate?.toString() ?? "—"], [ar ? "اللغة" : "Language", data.settings.preferredLocale], [ar ? "المنطقة الزمنية" : "Timezone", data.settings.timezone]];
  return <div className="mx-auto max-w-5xl space-y-6"><PageHeader title={ar ? "الإعدادات" : "Settings"} /><Card><CardHeader><CardTitle>{ar ? "إعدادات العمل" : "Business settings"}</CardTitle></CardHeader><CardContent className="divide-y divide-slate-100">{fields.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-slate-500">{label}</span><span className="font-medium text-end">{value}</span></div>)}</CardContent></Card></div>;
}
