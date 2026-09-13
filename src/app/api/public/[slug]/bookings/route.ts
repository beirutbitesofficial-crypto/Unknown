import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { bookingConflicts, localRangeForBooking } from "@/server/services/booking";
import { withPublicTenantTransaction } from "@/server/tenancy/public";

const schema = z.object({ serviceId: z.string().cuid(), resourceId: z.string().cuid(), startAt: z.string().datetime(), customerName: z.string().trim().min(2).max(100), customerPhone: z.string().trim().min(6).max(30), whatsapp: z.string().trim().max(30).optional(), email: z.string().email().max(200).optional(), notes: z.string().trim().max(800).optional() });
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params; const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 422 });
    const website = await prisma.businessWebsite.findUnique({ where: { slug }, select: { id: true, businessId: true, status: true } }); if (!website || website.status !== "PUBLISHED") return NextResponse.json({ error: "SITE_NOT_FOUND" }, { status: 404 });
    const result = await withPublicTenantTransaction({ businessId: website.businessId, serializable: true, fn: async (tx) => {
      const [addon, settings, mapping] = await Promise.all([
        tx.businessAddon.findFirst({ where: { businessId: website.businessId, status: { in: ["ACTIVE", "TRIALING", "GRACE_PERIOD"] }, addonPlan: { featureCode: "onlineBooking" } }, select: { id: true } }),
        tx.businessSettings.findUnique({ where: { businessId: website.businessId }, select: { timezone: true } }),
        tx.bookingResourceService.findFirst({ where: { businessId: website.businessId, resourceId: parsed.data.resourceId, productId: parsed.data.serviceId, resource: { isActive: true }, product: { isActive: true, isPublishedOnline: true, deletedAt: null } }, include: { resource: true, product: true } })
      ]);
      if (!addon) throw new Error("BOOKING_NOT_ENABLED"); if (!settings || !mapping) throw new Error("SERVICE_NOT_AVAILABLE");
      const start = DateTime.fromISO(parsed.data.startAt, { setZone: true }).toUTC(); if (!start.isValid || start <= DateTime.utc()) throw new Error("INVALID_START_TIME");
      const local = start.setZone(settings.timezone); const duration = mapping.durationMinutes ?? mapping.product.durationMinutes ?? 30; const candidates = localRangeForBooking({ date: local.toISODate()!, timezone: settings.timezone, weekday: local.weekday, schedule: mapping.resource.weeklySchedule, durationMinutes: duration, bufferMinutes: mapping.resource.bookingBufferMinutes });
      const valid = candidates.find((c) => DateTime.fromISO(c.startAt).toMillis() === start.toMillis()); if (!valid) throw new Error("TIME_NOT_IN_SCHEDULE");
      const end = new Date(valid.endAt); if (await bookingConflicts(tx, { businessId: website.businessId, resourceId: mapping.resourceId, startAt: start.toJSDate(), endAt: end })) throw new Error("TIME_NO_LONGER_AVAILABLE");
      let customer = await tx.customer.findFirst({ where: { businessId: website.businessId, phone: parsed.data.customerPhone, deletedAt: null }, select: { id: true } });
      if (!customer) customer = await tx.customer.create({ data: { businessId: website.businessId, name: parsed.data.customerName, phone: parsed.data.customerPhone, whatsapp: parsed.data.whatsapp, email: parsed.data.email }, select: { id: true } });
      const price = mapping.priceOverride ?? mapping.product.sellingPrice; const currency = mapping.currency ?? mapping.product.currency;
      const booking = await tx.booking.create({ data: { businessId: website.businessId, websiteId: website.id, customerId: customer.id, resourceId: mapping.resourceId, productId: mapping.productId, status: "CONFIRMED", startAt: start.toJSDate(), endAt: end, customerName: parsed.data.customerName, customerPhone: parsed.data.customerPhone, whatsapp: parsed.data.whatsapp, email: parsed.data.email, notes: parsed.data.notes, price, currency } });
      await tx.notification.create({ data: { businessId: website.businessId, type: "SYSTEM", title: "New online booking", body: `${parsed.data.customerName} booked ${mapping.product.name}.`, data: { bookingId: booking.id } } });
      return { bookingId: booking.id, bookingCode: booking.id.slice(-8).toUpperCase() };
    }});
    return NextResponse.json(result, { status: 201 });
  } catch (error) { return NextResponse.json({ error: "BOOKING_FAILED", message: error instanceof Error ? error.message : "Unable to create booking" }, { status: 400 }); }
}
