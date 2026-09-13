import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function withPublicTenantTransaction<T>(input: { businessId: string; fn: (tx: Prisma.TransactionClient) => Promise<T>; serializable?: boolean }) {
  const run = async (tx: Prisma.TransactionClient) => {
    await tx.$queryRaw`SELECT set_config('app.current_business_id', ${input.businessId}, true)`;
    await tx.$queryRaw`SELECT set_config('app.current_user_id', 'public', true)`;
    return input.fn(tx);
  };
  return input.serializable
    ? prisma.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    : prisma.$transaction(run);
}
