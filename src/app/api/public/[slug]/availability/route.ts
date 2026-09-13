import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { bookingConflicts, localRangeForBooking } from "@/server/services/booking";
import { withPublicTenantTransaction } from "@/server/tenancy/public";

const querySchema = z.object({ serviceId: z.string().cuid(), resourceId: z.string().cuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params; const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams)); if (!parsed.success) return NextResponse.json({ error: "INVALID_QUERY" }, { status: 422 });
    const website = await prisma.businessWebsite.findUnique({ where: { slug }, select: { id: true, businessId: true, status: true } });
    if (!website || website.status !== "PUBLISHED") return NextResponse.json({ error: "SITE_NOT_FOUND" }, { status: 404 });
    const slots = await withPublicTenantTransaction({ businessId: website.businessId, fn: async (tx) => {
      const [addon, settings, mapping] = await Promise.all([
        tx.businessAddon.findFirst({ where: { businessId: website.businessId, status: { in: ["ACTIVE", "TRIALING", "GRACE_PERIOD"] }, addonPlan: { featureCode: "onlineBooking" } }, select: { id: true } }),
        tx.businessSettings.findUnique({ where: { businessId: website.businessId }, select: { timezone: true } }),
        tx.bookingResourceService.findFirst({ where: { businessId: website.businessId, resourceId: parsed.data.resourceId, productId: parsed.data.serviceId, resource: { isActive: true }, product: { isActive: true, isPublishedOnline: true, deletedAt: null } }, include: { resource: { select: { weeklySchedule: true, bookingBufferMinutes: true } }, product: { select: { durationMinutes: true } } } })
      ]);
      if (!addon) throw new Error("BOOKING_NOT_ENABLED"); if (!settings || !mapping) throw new Error("SERVICE_NOT_AVAILABLE");
      const localDay = DateTime.fromISO(parsed.data.date, { zone: settings.timezone }); if (!localDay.isValid) throw new Error("INVALID_DATE");
      const candidates = localRangeForBooking({ date: parsed.data.date, timezone: settings.timezone, weekday: localDay.weekday, schedule: mapping.resource.weeklySchedule, durationMinutes: mapping.durationMinutes ?? mapping.product.durationMinutes ?? 30, bufferMinutes: mapping.resource.bookingBufferMinutes });
      const now = DateTime.utc(); const available = [];
      for (const candidate of candidates) {
        if (DateTime.fromISO(candidate.startAt) <= now) continue;
        const conflict = await bookingConflicts(tx, { businessId: website.businessId, resourceId: parsed.data.resourceId, startAt: new Date(candidate.startAt), endAt: new Date(candidate.endAt) });
        if (!conflict) available.push(candidate);
      }
      return available;
    }});
    return NextResponse.json({ slots });
  } catch (error) { return NextResponse.json({ error: "AVAILABILITY_FAILED", message: error instanceof Error ? error.message : "Unable to load availability" }, { status: 400 }); }
}
