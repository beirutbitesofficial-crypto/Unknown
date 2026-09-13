import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { requireFeature } from "@/server/billing/entitlements";
import { defaultWeeklySchedule } from "@/server/services/booking";
import { assertSameOrigin } from "@/server/security/origin";
import { AuthorizationError, requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("resource"), name: z.string().trim().min(1).max(100), title: z.string().trim().max(100).optional().default("") }),
  z.object({ kind: z.literal("service"), resourceId: z.string().cuid(), productId: z.string().cuid(), durationMinutes: z.number().int().min(5).max(480) })
]);
export async function POST(request: Request) {
  try {
    assertSameOrigin(request); const context = await requireBusinessContext(PERMISSIONS.BOOKINGS_MANAGE); await requireFeature(context, "onlineBooking");
    const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 422 });
    const result = await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: async (tx) => {
      if (parsed.data.kind === "resource") return tx.bookingResource.create({ data: { businessId: context.businessId, name: parsed.data.name, title: parsed.data.title || null, weeklySchedule: defaultWeeklySchedule() }, select: { id: true } });
      const [resource, product] = await Promise.all([
        tx.bookingResource.findFirst({ where: { id: parsed.data.resourceId, businessId: context.businessId, isActive: true }, select: { id: true } }),
        tx.product.findFirst({ where: { id: parsed.data.productId, businessId: context.businessId, type: "SERVICE", isActive: true, deletedAt: null }, select: { id: true } })
      ]);
      if (!resource || !product) throw new Error("RESOURCE_OR_SERVICE_NOT_FOUND");
      await tx.product.update({ where: { id: product.id }, data: { isPublishedOnline: true, durationMinutes: parsed.data.durationMinutes } });
      return tx.bookingResourceService.upsert({ where: { resourceId_productId: { resourceId: resource.id, productId: product.id } }, create: { businessId: context.businessId, resourceId: resource.id, productId: product.id, durationMinutes: parsed.data.durationMinutes }, update: { durationMinutes: parsed.data.durationMinutes }, select: { id: true } });
    }});
    return NextResponse.json(result, { status: 201 });
  } catch (error) { if (error instanceof AuthorizationError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }); return NextResponse.json({ error: "BOOKING_SETUP_FAILED", message: error instanceof Error ? error.message : "Failed" }, { status: 400 }); }
}
