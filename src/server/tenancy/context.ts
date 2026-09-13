import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { PermissionKey } from "@/server/rbac/permissions";

export type BusinessContext = {
  userId: string;
  businessId: string;
  memberId: string;
  role: string;
  permissions: Set<string>;
};

export class AuthorizationError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getBusinessContext(): Promise<BusinessContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const cookieStore = await cookies();
  const selectedBusinessId = cookieStore.get("active_business_id")?.value;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.current_user_id', ${session.user.id}, true)`;
    if (selectedBusinessId) {
      await tx.$queryRaw`SELECT set_config('app.current_business_id', ${selectedBusinessId}, true)`;
    }

    const membership = await tx.businessMember.findFirst({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
        deletedAt: null,
        ...(selectedBusinessId ? { businessId: selectedBusinessId } : {})
      },
      select: { id: true, businessId: true, roleId: true }
    });
    if (!membership) return null;

    await tx.$queryRaw`SELECT set_config('app.current_business_id', ${membership.businessId}, true)`;

    const [business, role] = await Promise.all([
      tx.business.findFirst({
        where: { id: membership.businessId, status: "ACTIVE", deletedAt: null },
        select: { id: true }
      }),
      tx.role.findFirst({
        where: { id: membership.roleId, businessId: membership.businessId },
        select: {
          name: true,
          permissions: { select: { permission: { select: { key: true } } } }
        }
      })
    ]);
    if (!business || !role) return null;

    return {
      userId: session.user.id,
      businessId: membership.businessId,
      memberId: membership.id,
      role: role.name,
      permissions: new Set(role.permissions.map((p) => p.permission.key))
    };
  });
}

export async function requireBusinessContext(permission?: PermissionKey) {
  const context = await getBusinessContext();
  if (!context) throw new AuthorizationError("No active business membership");
  if (permission && !context.permissions.has(permission)) {
    throw new AuthorizationError(`Missing permission: ${permission}`);
  }
  return context;
}
