import { AddonPurchaseCard } from "@/components/shared/addon-purchase-card";
import { PageHeader } from "@/components/shared/page-header";
import { getLocale } from "@/i18n/server";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";

export default async function AppsPage() {
  const context = await requireBusinessContext(PERMISSIONS.APPS_MANAGE);
  const ar = (await getLocale()) === "ar";
  const data = await withTenantTransaction({
    businessId: context.businessId,
    userId: context.userId,
    fn: async (tx) => {
      const [business, plans, active, subscription] = await Promise.all([
        tx.business.findUniqueOrThrow({
          where: { id: context.businessId },
          select: { category: true }
        }),
        tx.addonPlan.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: "asc" }
        }),
        tx.businessAddon.findMany({
          where: { businessId: context.businessId },
          select: { status: true, addonPlanId: true }
        }),
        tx.subscription.findUnique({
          where: { businessId: context.businessId },
          include: {
            plan: {
              select: {
                name: true,
                monthlyPriceUsd: true
              }
            }
          }
        })
      ]);
      return { business, plans, active, subscription };
    }
  });

  const category = data.business.category.toLowerCase();
  const state = new Map(data.active.map((a) => [a.addonPlanId, a.status]));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={ar ? "الاشتراك والخدمات الإضافية" : "Subscription & Add-ons"}
        description={
          ar
            ? "اشتراك واحد بسيط لكل الأعمال، وفعّل فقط الخدمات الإضافية التي تحتاجها."
            : "One simple subscription for every business, plus only the add-ons you need."
        }
      />

      <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {ar ? "الاشتراك الأساسي" : "Core subscription"}
            </p>
            <h2 className="mt-2 text-2xl font-black">
              {data.subscription?.plan.name ?? (ar ? "نظام إدارة الأعمال" : "Business OS")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {ar
                ? "يشمل نظام الإدارة الأساسي: المبيعات، العملاء، الموردين، المخزون، الديون، المصاريف، التقارير، الموظفين والصلاحيات."
                : "Includes the core business system: sales, customers, suppliers, inventory, debts, expenses, reports, employees and permissions."}
            </p>
          </div>
          <div className="sm:text-end">
            <p className="text-4xl font-black">
              {"$" + (data.subscription?.plan.monthlyPriceUsd.toString() ?? "10")}
              <span className="text-base font-semibold text-slate-400">/{ar ? "شهر" : "mo"}</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {ar ? "الخدمات الإضافية اختيارية" : "Add-ons are optional"}
            </p>
          </div>
        </div>
      </section>

      <div>
        <h2 className="text-lg font-bold">{ar ? "الخدمات الإضافية" : "Optional add-ons"}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {ar
            ? "كل خدمة إلها اشتراك مستقل وما بتدفع عليها إلا إذا فعلتها."
            : "Each service is billed separately only when you activate it."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.plans.map((plan) => {
          const cats = Array.isArray(plan.applicableCategories)
            ? plan.applicableCategories.filter((x): x is string => typeof x === "string")
            : [];
          const recommended =
            cats.length === 0 ||
            cats.some((x) => category.includes(x.toLowerCase()));

          return (
            <AddonPurchaseCard
              key={plan.id}
              code={plan.code}
              name={plan.name}
              description={plan.description}
              monthlyPrice={plan.monthlyPriceUsd.toString()}
              status={state.get(plan.id) ? String(state.get(plan.id)) : null}
              recommended={recommended}
              ar={ar}
            />
          );
        })}
      </div>
    </div>
  );
}
