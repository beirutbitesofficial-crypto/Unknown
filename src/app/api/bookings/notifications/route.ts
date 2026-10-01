import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { requireFeature } from "@/server/billing/entitlements";
import { normalizeWhatsappNumber } from "@/server/notifications/whatsapp";
import { assertSameOrigin } from "@/server/security/origin";
import { AuthorizationError, requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";

const schema = z.object({ bookingWhatsapp: z.string().trim().max(30) });
export async function PUT(request: Request) {
  try {
    assertSameOrigin(request); const context = await requireBusinessContext(PERMISSIONS.BOOKINGS_MANAGE); await requireFeature(context, "onlineBooking");
    const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 422 });
    const number = parsed.data.bookingWhatsapp ? normalizeWhatsappNumber(parsed.data.bookingWhatsapp) : null;
    if (parsed.data.bookingWhatsapp && !number) return NextResponse.json({ error: "INVALID_INPUT", message: "INVALID_WHATSAPP_NUMBER" }, { status: 422 });
    await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: async (tx) => {
      const settings = await tx.businessSettings.findUniqueOrThrow({ where: { businessId: context.businessId }, select: { notificationSettings: true } });
      const current = settings.notificationSettings && typeof settings.notificationSettings === "object" && !Array.isArray(settings.notificationSettings) ? settings.notificationSettings as Prisma.JsonObject : {};
      await tx.businessSettings.update({ where: { businessId: context.businessId }, data: { notificationSettings: { ...current, bookingWhatsapp: number } } });
    }});
    return NextResponse.json({ bookingWhatsapp: number });
  } catch (error) { if (error instanceof AuthorizationError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }); return NextResponse.json({ error: "BOOKING_NOTIFICATIONS_FAILED", message: error instanceof Error ? error.message : "Failed" }, { status: 400 }); }
}
