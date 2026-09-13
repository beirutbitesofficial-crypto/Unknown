import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/server/admin/auth";
import { assertSameOrigin } from "@/server/security/origin";

const schema = z.object({ businessId: z.string().cuid(), approved: z.boolean(), note: z.string().trim().max(500).optional() });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request); const admin = await requirePlatformAdmin(); const { id } = await params; const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 422 });
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_business_id', ${parsed.data.businessId}, true)`; await tx.$queryRaw`SELECT set_config('app.current_user_id', ${admin.userId}, true)`;
      const payment = await tx.addonPayment.findFirst({ where: { id, businessId: parsed.data.businessId, provider: "WHISH_MANUAL", status: "REFERENCE_SUBMITTED" }, include: { businessAddon: true } }); if (!payment) throw new Error("PAYMENT_NOT_FOUND");
      if (parsed.data.approved) {
        const starts = new Date(); const ends = new Date(starts); ends.setUTCMonth(ends.getUTCMonth() + 1);
        await tx.addonPayment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt: starts, metadata: { ...(typeof payment.metadata === "object" && payment.metadata && !Array.isArray(payment.metadata) ? payment.metadata : {}), verifiedBy: admin.userId, verificationNote: parsed.data.note ?? null } } });
        await tx.businessAddon.update({ where: { id: payment.businessAddonId }, data: { status: "ACTIVE", provider: "WHISH_MANUAL", currentPeriodStartsAt: starts, currentPeriodEndsAt: ends, gracePeriodEndsAt: null } });
      } else {
        await tx.addonPayment.update({ where: { id: payment.id }, data: { status: "REJECTED", metadata: { ...(typeof payment.metadata === "object" && payment.metadata && !Array.isArray(payment.metadata) ? payment.metadata : {}), rejectedBy: admin.userId, verificationNote: parsed.data.note ?? null } } });
      }
      await tx.adminAuditLog.create({ data: { actorUserId: admin.userId, action: parsed.data.approved ? "addon_payment.approved" : "addon_payment.rejected", targetType: "AddonPayment", targetId: payment.id, reason: parsed.data.note, metadata: { businessId: parsed.data.businessId } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ ok: true });
  } catch (error) { const message = error instanceof Error ? error.message : "Verification failed"; return NextResponse.json({ error: "VERIFY_FAILED", message }, { status: message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 400 }); }
}
