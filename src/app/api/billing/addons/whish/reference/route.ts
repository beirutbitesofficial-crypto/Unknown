import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { assertSameOrigin } from "@/server/security/origin";
import { AuthorizationError, requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";

const schema = z.object({ paymentId: z.string().min(8), reference: z.string().trim().min(3).max(120) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireBusinessContext(PERMISSIONS.APPS_MANAGE);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 422 });
    await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: async (tx) => {
      const payment = await tx.addonPayment.findFirst({ where: { id: parsed.data.paymentId, businessId: context.businessId, provider: "WHISH_MANUAL", status: "PENDING" } });
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");
      await tx.addonPayment.update({ where: { id: payment.id }, data: { status: "REFERENCE_SUBMITTED", metadata: { whishReference: parsed.data.reference, submittedAt: new Date().toISOString() } } });
      await tx.auditLog.create({ data: { businessId: context.businessId, memberId: context.memberId, action: "addon.whish_reference_submitted", entityType: "AddonPayment", entityId: payment.id, metadata: { reference: parsed.data.reference } } });
    }});
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    const message = error instanceof Error ? error.message : "Unable to submit reference";
    return NextResponse.json({ error: "REFERENCE_FAILED", message }, { status: 400 });
  }
}
