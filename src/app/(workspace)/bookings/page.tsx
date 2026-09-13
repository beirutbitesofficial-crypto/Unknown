import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { BookingSetup } from "@/components/shared/booking-setup";
import { getLocale } from "@/i18n/server";
import { getEntitlements } from "@/server/billing/entitlements";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";

export default async function BookingsPage() {
  const context = await requireBusinessContext(PERMISSIONS.BOOKINGS_MANAGE); const ar = (await getLocale()) === "ar";
  const entitlements = await getEntitlements(context);
  if (!entitlements.features.onlineBooking) return <div className="mx-auto max-w-4xl space-y-6"><PageHeader title={ar ? "الحجوزات" : "Bookings"} /><Card><CardContent className="pt-6"><p className="text-sm text-slate-600">{ar ? "فعّل خدمة Online Booking لتظهر صفحة الحجز العامة وإدارة المواعيد." : "Activate Online Booking to enable the public booking page and appointment management."}</p><Link href="/apps" className="mt-4 inline-block text-sm font-bold underline">{ar ? "فتح الخدمات والإضافات" : "Open Apps & Add-ons"}</Link></CardContent></Card></div>;
  const data = await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: async (tx) => {
    const [resources, services, bookings, website] = await Promise.all([
      tx.bookingResource.findMany({ where: { businessId: context.businessId, isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, title: true, services: { select: { product: { select: { name: true } } } } } }),
      tx.product.findMany({ where: { businessId: context.businessId, type: "SERVICE", isActive: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, durationMinutes: true } }),
      tx.booking.findMany({ where: { businessId: context.businessId, startAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, orderBy: { startAt: "asc" }, take: 100, select: { id: true, customerName: true, customerPhone: true, startAt: true, endAt: true, status: true, resource: { select: { name: true } }, product: { select: { name: true } } } }),
      tx.businessWebsite.findUnique({ where: { businessId: context.businessId }, select: { slug: true, status: true } })
    ]); return { resources, services, bookings, website };
  }});
  return <div className="mx-auto max-w-7xl space-y-6"><PageHeader title={ar ? "الحجوزات" : "Bookings"} description={ar ? "إدارة الأطباء، الحلاقين، الموظفين والخدمات القابلة للحجز." : "Manage bookable staff, services and appointments."} action={data.website?.status === "PUBLISHED" ? <Link className="text-sm font-bold underline" href={`/b/${data.website.slug}/book`} target="_blank">{ar ? "فتح صفحة الحجز" : "Open booking page"}</Link> : undefined} />
    <Card><CardHeader><CardTitle>{ar ? "إعداد الحجز" : "Booking setup"}</CardTitle></CardHeader><CardContent><BookingSetup resources={data.resources.map(({ id, name }) => ({ id, name }))} services={data.services} ar={ar} /></CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]"><Card><CardHeader><CardTitle>{ar ? "الفريق" : "Resources"}</CardTitle></CardHeader><CardContent className="space-y-3">{data.resources.length ? data.resources.map((r) => <div key={r.id} className="rounded-xl border border-slate-100 p-3"><p className="font-semibold">{r.name}</p><p className="text-xs text-slate-500">{r.title ?? "—"}</p><p className="mt-2 text-xs text-slate-500">{r.services.map((s) => s.product.name).join(" · ") || (ar ? "لا خدمات مربوطة" : "No services attached")}</p></div>) : <p className="text-sm text-slate-500">{ar ? "أضف أول شخص قابل للحجز." : "Add your first bookable resource."}</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>{ar ? "المواعيد" : "Appointments"}</CardTitle></CardHeader><CardContent className="space-y-3">{data.bookings.length ? data.bookings.map((b) => <div key={b.id} className="flex flex-col gap-1 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{b.customerName} · {b.product.name}</p><p className="text-xs text-slate-500">{b.resource.name} · {b.customerPhone}</p></div><div className="text-start sm:text-end"><p className="text-sm font-medium">{new Intl.DateTimeFormat(ar ? "ar-LB" : "en-LB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Beirut" }).format(b.startAt)}</p><p className="text-xs text-slate-500">{b.status}</p></div></div>) : <p className="text-sm text-slate-500">{ar ? "ما في حجوزات بعد." : "No bookings yet."}</p>}</CardContent></Card></div>
  </div>;
}
