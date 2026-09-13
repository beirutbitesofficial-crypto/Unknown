import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { PublicCatalog } from "@/components/shared/public-catalog";
import { prisma } from "@/lib/prisma";
import { withPublicTenantTransaction } from "@/server/tenancy/public";

export default async function PublicBusinessSite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const website = await prisma.businessWebsite.findUnique({ where: { slug }, include: { template: { select: { name: true, kind: true } } } }); if (!website || website.status !== "PUBLISHED") notFound();
  const data = await withPublicTenantTransaction({ businessId: website.businessId, fn: async (tx) => {
    const [business, settings, addons, products] = await Promise.all([
      tx.business.findUniqueOrThrow({ where: { id: website.businessId }, select: { name: true, category: true } }),
      tx.businessSettings.findUnique({ where: { businessId: website.businessId }, select: { logoUrl: true, address: true, phone: true, whatsapp: true } }),
      tx.businessAddon.findMany({ where: { businessId: website.businessId, status: { in: ["ACTIVE", "TRIALING", "GRACE_PERIOD"] } }, include: { addonPlan: { select: { featureCode: true } } } }),
      tx.product.findMany({ where: { businessId: website.businessId, isActive: true, isPublishedOnline: true, deletedAt: null }, orderBy: [{ onlineSortOrder: "asc" }, { name: "asc" }], take: 500, select: { id: true, name: true, description: true, sellingPrice: true, currency: true, imageUrl: true, stockQuantity: true, type: true } })
    ]); return { business, settings, addons, products };
  }});
  const features = new Set(data.addons.map((a) => a.addonPlan.featureCode)); const showCatalog = features.has("digitalMenu") || features.has("onlineOrdering") || features.has("onlineStore"); const ordering = features.has("onlineOrdering") || features.has("onlineStore");
  return <main className="min-h-screen bg-slate-50"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5"><div className="flex items-center gap-3">{data.settings?.logoUrl ? <img src={data.settings.logoUrl} alt="" className="size-12 rounded-2xl object-cover" /> : <div className="size-12 rounded-2xl bg-slate-950" />}<div><h1 className="text-xl font-black">{website.title ?? data.business.name}</h1><p className="text-xs text-slate-500">{website.tagline ?? data.business.category}</p></div></div>{features.has("onlineBooking") ? <Link href={`/b/${slug}/book`} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"><CalendarDays className="size-4" />Book</Link> : null}</div></header><div className="mx-auto max-w-6xl space-y-8 px-4 py-8"><section className="rounded-[2rem] bg-slate-950 p-7 text-white sm:p-10"><p className="text-sm text-slate-300">{data.business.category}</p><h2 className="mt-2 max-w-3xl text-3xl font-black sm:text-5xl">{website.title ?? data.business.name}</h2>{data.settings?.address ? <p className="mt-4 text-sm text-slate-300">{data.settings.address}</p> : null}</section>{showCatalog ? <PublicCatalog slug={slug} orderingEnabled={ordering} products={data.products.map((p) => ({ id: p.id, name: p.name, description: p.description, price: p.sellingPrice.toString(), currency: p.currency, imageUrl: p.imageUrl, stock: p.stockQuantity?.toString() ?? null, type: p.type }))} /> : <section className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">This business has not enabled a public catalog yet.</section>}</div></main>;
}
