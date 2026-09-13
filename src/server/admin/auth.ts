import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requirePlatformAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("UNAUTHENTICATED");
  const admin = await prisma.platformAdmin.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true, isActive: true }
  });
  if (!admin?.isActive) throw new Error("FORBIDDEN");
  return { userId: session.user.id, adminId: admin.id, role: admin.role };
}

export async function requireBusinessFinancialAccess(input: { businessId: string; adminUserId: string }) {
  const grant = await prisma.businessAccessGrant.findFirst({
    where: {
      businessId: input.businessId,
      adminUserId: input.adminUserId,
      scope: "FINANCIAL_READ",
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    select: { id: true, reason: true, expiresAt: true }
  });
  if (!grant) throw new Error("FINANCIAL_ACCESS_GRANT_REQUIRED");
  return grant;
}
