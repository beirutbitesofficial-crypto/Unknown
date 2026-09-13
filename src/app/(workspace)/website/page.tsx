import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { WebsiteSettingsForm } from "@/components/shared/website-settings-form";
import { CatalogPublishControl } from "@/components/shared/catalog-publish-control";
import { getLocale } from "@/i18n/server";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";

export default async function WebsitePage() {
  const context = await requireBusinessContext(PERMISSIONS.WEBSITE_MANAGE); const ar = (await getLocale()) === "ar";
  const data = await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: async (tx) => {
    let website = await tx.businessWebsite.findUnique({ where: { businessId: context.businessId }, include: { template: { select: { code: true, name: true } } } });
    if (!website) {
      const business = await tx.business.findUniqueOrThrow({ where: { id: context.businessId }, select: { slug: true, name: true } });
      website = await tx.businessWebsite.create({ data: { businessId: context.businessId, slug: business.slug, title: business.name, status: "DRAFT", modules: { website: true } }, include: { template: { select: { code: true, name: true } } } });
    }
    const [templates, addons, products] = await Promise.all([
      tx.websiteTemplate.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { code: true, name: true } }),
      tx.businessAddon.findMany({ where: { businessId: context.businessId, status: { in: ["ACTIVE", "TRIALING", "GRACE_PERIOD"] } }, include: { addonPlan: { select: { name: true, featureCode: true } } } }),
      tx.product.findMany({ where: { businessId: context.businessId, isActive: true, deletedAt: null }, orderBy: { name: "asc" }, take: 500, select: { id: true, name: true, isPublishedOnline: true } })
    ]);
    return { website, templates, addons, products };
  }});
  if (!data.website) return null;
  const publicPath = `/b/${data.website.slug}`;
  return <div className="mx-auto max-w-5xl space-y-6"><PageHeader title={ar ? "الموقع الإلكتروني" : "Website"} description={ar ? "نفس بيانات منتجاتك وخدماتك بتغذّي الموقع العام بدون إدخال مزدوج." : "Your existing products and services power the public site without duplicate data entry."} action={data.website.status === "PUBLISHED" ? <Link className="text-sm font-semibold underline" href={publicPath} target="_blank">{ar ? "فتح الموقع" : "Open site"}</Link> : undefined} />
    <Card><CardHeader><CardTitle>{ar ? "النشر والقالب" : "Publishing & template"}</CardTitle></CardHeader><CardContent className="space-y-4"><WebsiteSettingsForm status={data.website.status} templateCode={data.website.template?.code ?? null} templates={data.templates} ar={ar} /><p className="text-xs text-slate-500">{ar ? "الرابط" : "Public URL"}: <span dir="ltr">{publicPath}</span></p></CardContent></Card>
    <Card><CardHeader><CardTitle>{ar ? "الخدمات المفعّلة" : "Enabled modules"}</CardTitle></CardHeader><CardContent>{data.addons.length ? <div className="flex flex-wrap gap-2">{data.addons.map((a) => <span key={a.addonPlan.featureCode} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{a.addonPlan.name}</span>)}</div> : <p className="text-sm text-slate-500">{ar ? "ما في خدمات إضافية مفعّلة بعد." : "No add-ons are active yet."}</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>{ar ? "المنتجات والخدمات الظاهرة أونلاين" : "Public catalog"}</CardTitle></CardHeader><CardContent><div className="grid gap-2 sm:grid-cols-2">{data.products.map((p) => <CatalogPublishControl key={p.id} productId={p.id} initial={p.isPublishedOnline} name={p.name} />)}</div>{!data.products.length ? <p className="text-sm text-slate-500">{ar ? "أضف منتجات أو خدمات أولاً." : "Add products or services first."}</p> : null}</CardContent></Card>
  </div>;
}
