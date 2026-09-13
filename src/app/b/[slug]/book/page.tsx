import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicBookingForm } from "@/components/shared/public-booking-form";
import { prisma } from "@/lib/prisma";
import { withPublicTenantTransaction } from "@/server/tenancy/public";

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const website = await prisma.businessWebsite.findUnique({ where: { slug }, select: { id: true, businessId: true, status: true, title: true } });
  if (!website || website.status !== "PUBLISHED") notFound();
  const data = await withPublicTenantTransaction({ businessId: website.businessId, fn: async (tx) => {
    const [business, addon, mappings] = await Promise.all([
      tx.business.findUniqueOrThrow({ where: { id: website.businessId }, select: { name: true } }),
      tx.businessAddon.findFirst({ where: { businessId: website.businessId, status: { in: ["ACTIVE", "TRIALING", "GRACE_PERIOD"] }, addonPlan: { featureCode: "onlineBooking" } }, select: { id: true } }),
      tx.bookingResourceService.findMany({ where: { businessId: website.businessId, resource: { isActive: true }, product: { type: "SERVICE", isActive: true, isPublishedOnline: true, deletedAt: null } }, include: { resource: { select: { id: true, name: true } }, product: { select: { id: true, name: true, sellingPrice: true, currency: true } } }, orderBy: { resource: { sortOrder: "asc" } } })
    ]);
    return { business, addon, mappings };
  }});
  if (!data.addon) notFound();
  const options = data.mappings.map((m) => ({ resourceId: m.resource.id, resourceName: m.resource.name, serviceId: m.product.id, serviceName: m.product.name, price: (m.priceOverride ?? m.product.sellingPrice).toString(), currency: m.currency ?? m.product.currency }));
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-2xl space-y-6"><div><Link href={`/b/${slug}`} className="text-sm font-semibold text-slate-500">← {data.business.name}</Link><h1 className="mt-3 text-3xl font-black">Online Booking</h1></div>{options.length ? <PublicBookingForm slug={slug} options={options} /> : <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No bookable services are available yet.</div>}</div></main>;
}
