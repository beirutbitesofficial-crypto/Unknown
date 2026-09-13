import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { getEntitlements } from "@/server/billing/entitlements";
import { assertSameOrigin } from "@/server/security/origin";
import { AuthorizationError, requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";

const schema = z.object({ status: z.enum(["DRAFT", "PUBLISHED", "PAUSED"]), templateCode: z.string().max(64).nullable() });
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request); const context = await requireBusinessContext(PERMISSIONS.WEBSITE_MANAGE);
    const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 422 });
    if (parsed.data.status === "PUBLISHED") {
      const entitlements = await getEntitlements(context);
      const allowed = ["businessWebsite", "digitalMenu", "onlineOrdering", "onlineStore", "onlineBooking"].some((key) => entitlements.features[key]);
      if (!allowed) return NextResponse.json({ error: "ADDON_REQUIRED", message: "Activate a website, menu, store, ordering or booking add-on before publishing." }, { status: 402 });
    }
    await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: async (tx) => {
      const template = parsed.data.templateCode ? await tx.websiteTemplate.findUnique({ where: { code: parsed.data.templateCode }, select: { id: true } }) : null;
      if (parsed.data.templateCode && !template) throw new Error("TEMPLATE_NOT_FOUND");
      await tx.businessWebsite.update({ where: { businessId: context.businessId }, data: { status: parsed.data.status, templateId: template?.id ?? null, publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : undefined } });
      await tx.auditLog.create({ data: { businessId: context.businessId, memberId: context.memberId, action: "website.updated", entityType: "BusinessWebsite", metadata: parsed.data } });
    }});
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "WEBSITE_UPDATE_FAILED", message: error instanceof Error ? error.message : "Unable to update website" }, { status: 400 });
  }
}
