import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ALL_PERMISSION_KEYS } from "../src/server/rbac/permissions";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const plans = [
  {
    code: "CORE",
    name: "Business OS",
    description: "Complete core business management subscription. Industry-specific public modules are sold separately as add-ons.",
    monthlyPriceUsd: 10,
    sortOrder: 10,
    featureFlags: {
      sales: true,
      customers: true,
      crm: true,
      expenses: true,
      basicReports: true,
      inventory: true,
      debts: true,
      suppliers: true,
      purchases: true,
      accounting: true,
      advancedReports: true,
      whatsappTools: true,
      advancedPermissions: true,
      employees: true,
      hr: true,
      projects: true,
      pos: true,
      automations: true,
      documents: true
    },
    limits: { users: 25, branches: 10 }
  }
] as const;

const addons = [
  { code: "DIGITAL_MENU", name: "Digital Menu", description: "Public QR menu with Arabic/English support.", monthlyPriceUsd: 5, featureCode: "digitalMenu", applicableCategories: ["restaurant", "cafe", "bakery"], sortOrder: 10 },
  { code: "ONLINE_ORDERING", name: "Online Ordering", description: "Takeaway, delivery and dine-in online orders.", monthlyPriceUsd: 10, featureCode: "onlineOrdering", applicableCategories: ["restaurant", "cafe", "bakery"], sortOrder: 20 },
  { code: "ONLINE_STORE", name: "Online Store", description: "Product catalog, cart and online orders for retail businesses.", monthlyPriceUsd: 15, featureCode: "onlineStore", applicableCategories: ["supermarket", "mini market", "retail", "clothing", "phone shop"], sortOrder: 30 },
  { code: "ONLINE_BOOKING", name: "Online Booking", description: "Appointments, staff availability and online booking.", monthlyPriceUsd: 8, featureCode: "onlineBooking", applicableCategories: ["clinic", "barber", "barbershop", "salon", "beauty salon", "physiotherapy", "consultant"], sortOrder: 40 },
  { code: "BUSINESS_WEBSITE", name: "Business Website", description: "Hosted public website with template and custom-domain support.", monthlyPriceUsd: 10, featureCode: "businessWebsite", applicableCategories: [], sortOrder: 50 }
] as const;

const websiteTemplates = [
  { code: "RESTAURANT_MODERN", name: "Restaurant Modern", kind: "RESTAURANT", description: "Clean menu-first template for restaurants and cafés.", categoryTags: ["restaurant", "cafe"], themeConfig: { layout: "menu-first", radius: "xl", density: "comfortable" }, sortOrder: 10 },
  { code: "RETAIL_MODERN", name: "Retail Modern", kind: "RETAIL", description: "Product-first storefront for supermarkets and retail.", categoryTags: ["supermarket", "mini market", "retail", "clothing", "phone shop"], themeConfig: { layout: "catalog", radius: "xl", density: "comfortable" }, sortOrder: 20 },
  { code: "BOOKING_CLEAN", name: "Booking Clean", kind: "BOOKING", description: "Appointment-first template for clinics, barbers and salons.", categoryTags: ["clinic", "barber", "barbershop", "salon", "beauty salon", "physiotherapy"], themeConfig: { layout: "booking-first", radius: "xl", density: "comfortable" }, sortOrder: 30 },
  { code: "BUSINESS_MINIMAL", name: "Business Minimal", kind: "GENERAL", description: "Minimal company website for service businesses and freelancers.", categoryTags: [], themeConfig: { layout: "services", radius: "xl", density: "comfortable" }, sortOrder: 40 }
] as const;

async function main() {
  for (const key of ALL_PERMISSION_KEYS) {
    await prisma.permission.upsert({ where: { key }, create: { key }, update: {} });
  }

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      create: plan,
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPriceUsd: plan.monthlyPriceUsd,
        sortOrder: plan.sortOrder,
        featureFlags: plan.featureFlags,
        limits: plan.limits,
        isActive: true
      }
    });
  }

  // The product now has one base subscription only. Preserve old rows for
  // financial/history integrity, but stop offering them and migrate tenants.
  const corePlan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: "CORE" } });
  const legacyPlans = await prisma.subscriptionPlan.findMany({
    where: { code: { in: ["STARTER", "PRO", "BUSINESS"] } },
    select: { id: true }
  });
  if (legacyPlans.length) {
    const legacyIds = legacyPlans.map((plan) => plan.id);
    await prisma.subscription.updateMany({
      where: { planId: { in: legacyIds } },
      data: { planId: corePlan.id }
    });
    await prisma.subscriptionPlan.updateMany({
      where: { id: { in: legacyIds } },
      data: { isActive: false }
    });
  }

  for (const addon of addons) {
    await prisma.addonPlan.upsert({
      where: { code: addon.code },
      create: addon,
      update: {
        name: addon.name,
        description: addon.description,
        monthlyPriceUsd: addon.monthlyPriceUsd,
        featureCode: addon.featureCode,
        applicableCategories: addon.applicableCategories,
        sortOrder: addon.sortOrder,
        isActive: true
      }
    });
  }

  for (const template of websiteTemplates) {
    await prisma.websiteTemplate.upsert({
      where: { code: template.code },
      create: template,
      update: {
        name: template.name,
        kind: template.kind,
        description: template.description,
        categoryTags: template.categoryTags,
        themeConfig: template.themeConfig,
        sortOrder: template.sortOrder,
        isActive: true
      }
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
