import { NextResponse } from "next/server";
import { createSaleSchema } from "@/lib/validation/sale";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { AuthorizationError, requireBusinessContext } from "@/server/tenancy/context";
import { createSale } from "@/server/services/sales";
import { assertSameOrigin } from "@/server/security/origin";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireBusinessContext(PERMISSIONS.SALES_CREATE);
    const parsed = createSaleSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 422 });
    }
    return NextResponse.json(await createSale(context, parsed.data), { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Unable to create sale";
    return NextResponse.json({ error: "SALE_FAILED", message }, { status: 400 });
  }
}
