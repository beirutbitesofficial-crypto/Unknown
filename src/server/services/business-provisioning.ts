import { Prisma, type Currency, type Locale } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ALL_PERMISSION_KEYS, ROLE_PERMISSION_KEYS } from "@/server/rbac/permissions";

const DEFAULT_EXPENSE_CATEGORIES = [
  "Rent",
  "Electricity",
  "Generator",
  "Internet",
  "Salaries",
  "Transportation",
  "Supplies",
  "Marketing",
  "Maintenance",
  "Other"
] as const;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}


function defaultWebsiteModules(category: string) {
  const value = category.trim().toLowerCase();
  const restaurant = ["restaurant", "cafe", "café", "bakery"].some((key) => value.includes(key));
  const retail = ["supermarket", "mini market", "minimarket", "retail", "clothing", "phone shop"].some((key) => value.includes(key));
  const booking = ["clinic", "barber", "barbershop", "salon", "beauty", "physiotherapy", "consultant"].some((key) => value.includes(key));
  return { website: true, digitalMenu: restaurant, onlineOrdering: restaurant, onlineStore: retail, onlineBooking: booking };
}

async function uniqueBusinessSlug(tx: Prisma.TransactionClient, name: string) {
  const base = slugify(name) || "business";
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const exists = await tx.business.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function provisionBusinessForUser(input: {
  userId: string;
  ownerName: string;
  phone: string;
  businessName: string;
  businessCategory: string;
  preferredLanguage: Locale;
  defaultCurrency: Currency;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.current_user_id', ${input.userId}, true)`;

    const existing = await tx.businessMember.findFirst({
      where: { userId: input.userId, status: "ACTIVE", deletedAt: null },
      select: { businessId: true }
    });
    if (existing) return existing.businessId;

    for (const key of ALL_PERMISSION_KEYS) {
      await tx.permission.upsert({
        where: { key },
        create: { key },
        update: {}
      });
    }

    const plan = await tx.subscriptionPlan.findUnique({ where: { code: "CORE" } });
    if (!plan) throw new Error("Core subscription plan is not seeded. Run db:seed first.");

    await tx.user.update({
      where: { id: input.userId },
      data: { name: input.ownerName, phone: input.phone, locale: input.preferredLanguage }
    });

    const slug = await uniqueBusinessSlug(tx, input.businessName);
    const business = await tx.business.create({
      data: {
        name: input.businessName,
        slug,
        category: input.businessCategory,
        phone: input.phone
      }
    });

    await tx.businessWebsite.create({
      data: {
        businessId: business.id,
        slug,
        title: input.businessName,
        status: "DRAFT",
        modules: defaultWebsiteModules(input.businessCategory)
      }
    });

    // New tenant exists now: bind the transaction before touching any RLS-protected table.
    await tx.$queryRaw`SELECT set_config('app.current_business_id', ${business.id}, true)`;
    await tx.$queryRaw`SELECT set_config('app.current_user_id', ${input.userId}, true)`;

    await tx.businessSettings.create({
      data: {
        businessId: business.id,
        phone: input.phone,
        preferredLocale: input.preferredLanguage,
        defaultCurrency: input.defaultCurrency,
        secondaryCurrency: input.defaultCurrency === "USD" ? "LBP" : "USD"
      }
    });

    await tx.subscription.create({
      data: {
        businessId: business.id,
        planId: plan.id,
        status: "TRIALING",
        trialStartsAt: new Date(),
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }
    });

    const permissionRows = await tx.permission.findMany({
      where: { key: { in: ALL_PERMISSION_KEYS } },
      select: { id: true, key: true }
    });
    const permissionByKey = new Map(permissionRows.map((p) => [p.key, p.id]));

    const roleDefinitions = [
      ["Owner", "OWNER", ROLE_PERMISSION_KEYS.OWNER],
      ["Manager", "MANAGER", ROLE_PERMISSION_KEYS.MANAGER],
      ["Cashier", "CASHIER", ROLE_PERMISSION_KEYS.CASHIER],
      ["Employee", "EMPLOYEE", ROLE_PERMISSION_KEYS.EMPLOYEE]
    ] as const;

    const roles = new Map<string, string>();
    for (const [name, systemKey, keys] of roleDefinitions) {
      const role = await tx.role.create({
        data: {
          businessId: business.id,
          name,
          systemKey,
          isSystem: true,
          permissions: {
            create: keys.map((key) => ({ permissionId: permissionByKey.get(key)! }))
          }
        }
      });
      roles.set(systemKey, role.id);
    }

    await tx.businessMember.create({
      data: {
        businessId: business.id,
        userId: input.userId,
        roleId: roles.get("OWNER")!,
        status: "ACTIVE",
        joinedAt: new Date()
      }
    });

    await tx.category.createMany({
      data: DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
        businessId: business.id,
        name,
        kind: "EXPENSE" as const
      }))
    });

    return business.id;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
