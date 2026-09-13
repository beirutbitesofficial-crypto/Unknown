import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { assertSameOrigin } from "@/server/security/origin";
import { AuthorizationError, requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";
const schema = z.object({ productId: z.string().cuid(), isPublishedOnline: z.boolean() });
export async function PATCH(request: Request) { try { assertSameOrigin(request); const context = await requireBusinessContext(PERMISSIONS.WEBSITE_MANAGE); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 422 }); const changed = await withTenantTransaction({ businessId: context.businessId, userId: context.userId, fn: (tx) => tx.product.updateMany({ where: { id: parsed.data.productId, businessId: context.businessId, deletedAt: null }, data: { isPublishedOnline: parsed.data.isPublishedOnline } }) }); if (changed.count !== 1) return NextResponse.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 }); return NextResponse.json({ ok: true }); } catch (error) { if (error instanceof AuthorizationError) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }); return NextResponse.json({ error: "PUBLISH_FAILED" }, { status: 400 }); } }
