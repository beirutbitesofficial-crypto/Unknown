import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * All tenant-sensitive write services should execute inside this wrapper.
 * The set_config values are consumed by PostgreSQL RLS policies in prisma/rls.sql.
 */
export async function withTenantTransaction<T>(input: {
  businessId: string;
  userId: string;
  fn: (tx: Prisma.TransactionClient) => Promise<T>;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.current_business_id', ${input.businessId}, true)`;
    await tx.$queryRaw`SELECT set_config('app.current_user_id', ${input.userId}, true)`;
    return input.fn(tx);
  });
}
