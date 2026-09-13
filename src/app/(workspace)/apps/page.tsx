import { AddonPurchaseCard } from "@/components/shared/addon-purchase-card";
import { PageHeader } from "@/components/shared/page-header";
import { getLocale } from "@/i18n/server";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";

export default async function AppsPage() {
  const context = await requireBusinessContext(PERMISSIONS.APPS_MANAGE);
  const ar = (await getLocale()) === "ar";
  const data = await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: async (tx) => {
    const [business, plans, active] = await Promise.all([
      tx.business.findUniqueOrThrow({ where: { id: context.businessId }, select: { category: true } }),
      tx.addonPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      tx.businessAddon.findMany({ where: { businessId: context.businessId }, select: { status: true, addonPlanId: true } })
    ]);
    return { business, plans, active };
  }});
  const category = data.business.category.toLowerCase();
  const state = new Map(data.active.map((a) => [a.addonPlanId, a.status]));
  return <div className="mx-auto max-w-7xl space-y-6">
    <PageHeader title={ar ? "الخدمات والإضافات" : "Apps & Add-ons"} description={ar ? "فعّل فقط الخدمات التي يحتاجها عملك، وكل خدمة لها اشتراك مستقل." : "Activate only the services your business needs. Each add-on has independent billing."} />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.plans.map((plan) => {
      const cats = Array.isArray(plan.applicableCategories) ? plan.applicableCategories.filter((x): x is string => typeof x === "string") : [];
      const recommended = cats.length === 0 || cats.some((x) => category.includes(x.toLowerCase()));
      return <AddonPurchaseCard key={plan.id} code={plan.code} name={plan.name} description={plan.description} monthlyPrice={plan.monthlyPriceUsd.toString()} status={state.get(plan.id) ? String(state.get(plan.id)) : null} recommended={recommended} ar={ar} />;
    })}</div>
  </div>;
}
