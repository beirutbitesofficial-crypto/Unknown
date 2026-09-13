import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { assertSameOrigin } from "@/server/security/origin";
import { AuthorizationError, requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";

const schema = z.object({ status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]) });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { assertSameOrigin(request); const context = await requireBusinessContext(PERMISSIONS.ONLINE_ORDERS_MANAGE); const { id } = await params; const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 422 }); await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: async (tx) => { const order = await tx.onlineOrder.findFirst({ where: { id, businessId: context.businessId }, select: { id: true, status: true } }); if (!order) throw new Error("ORDER_NOT_FOUND"); await tx.onlineOrder.update({ where: { id }, data: { status: parsed.data.status } }); await tx.auditLog.create({ data: { businessId: context.businessId, memberId: context.memberId, action: "online_order.status_changed", entityType: "OnlineOrder", entityId: id, metadata: { from: order.status, to: parsed.data.status } } }); } }); return NextResponse.json({ ok: true }); } catch (error) { if (error instanceof AuthorizationError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }); return NextResponse.json({ error: "ORDER_UPDATE_FAILED", message: error instanceof Error ? error.message : "Failed" }, { status: 400 }); }
}
