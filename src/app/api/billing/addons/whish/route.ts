import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { assertSameOrigin } from "@/server/security/origin";
import { AuthorizationError, requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";

const schema = z.object({ addonCode: z.string().min(2).max(64) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireBusinessContext(PERMISSIONS.APPS_MANAGE);
    if (!env.WHISH_MERCHANT_RECIPIENT) return NextResponse.json({ error: "WHISH_NOT_CONFIGURED", message: "Whish merchant recipient is not configured yet." }, { status: 503 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 422 });

    const result = await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: async (tx) => {
      const addonPlan = await tx.addonPlan.findUnique({ where: { code: parsed.data.addonCode } });
      if (!addonPlan || !addonPlan.isActive) throw new Error("ADDON_NOT_FOUND");
      const existing = await tx.businessAddon.findUnique({ where: { businessId_addonPlanId: { businessId: context.businessId, addonPlanId: addonPlan.id } } });
      if (existing && ["ACTIVE", "TRIALING", "GRACE_PERIOD"].includes(existing.status)) throw new Error("ADDON_ALREADY_ACTIVE");
      const businessAddon = existing ?? await tx.businessAddon.create({ data: { businessId: context.businessId, addonPlanId: addonPlan.id, status: "PAST_DUE", provider: "WHISH_MANUAL" } });
      const payment = await tx.addonPayment.create({ data: { businessId: context.businessId, businessAddonId: businessAddon.id, provider: "WHISH_MANUAL", amountUsd: addonPlan.monthlyPriceUsd, status: "PENDING" } });
      await tx.auditLog.create({ data: { businessId: context.businessId, memberId: context.memberId, action: "addon.payment_started", entityType: "AddonPayment", entityId: payment.id, metadata: { addonCode: addonPlan.code, provider: "WHISH_MANUAL" } } });
      return { paymentId: payment.id, amountUsd: addonPlan.monthlyPriceUsd.toString() };
    }});
    return NextResponse.json({ ...result, recipient: env.WHISH_MERCHANT_RECIPIENT });
  } catch (error) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    const message = error instanceof Error ? error.message : "Unable to start Whish payment";
    return NextResponse.json({ error: "WHISH_PAYMENT_FAILED", message }, { status: 400 });
  }
}
