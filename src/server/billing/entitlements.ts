import { DateTime } from "luxon";
import type { BusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";

export class SubscriptionError extends Error {
  constructor(message: string, public readonly code: "SUBSCRIPTION_INACTIVE" | "FEATURE_NOT_AVAILABLE" | "LIMIT_REACHED") {
    super(message);
  }
}

type EntitlementSnapshot = {
  status: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
};

export async function getEntitlements(context: BusinessContext): Promise<EntitlementSnapshot> {
  return withTenantTransaction({
    businessId: context.businessId,
    userId: context.userId,
    fn: async (tx) => {
      const [subscription, addons] = await Promise.all([
        tx.subscription.findUnique({
          where: { businessId: context.businessId },
          include: { plan: { select: { featureFlags: true, limits: true } } }
        }),
        tx.businessAddon.findMany({
          where: { businessId: context.businessId },
          include: { addonPlan: { select: { featureCode: true } } }
        })
      ]);
      if (!subscription) throw new SubscriptionError("Subscription is missing.", "SUBSCRIPTION_INACTIVE");

      const now = DateTime.utc();
      const active =
        subscription.status === "ACTIVE" ||
        (subscription.status === "TRIALING" && subscription.trialEndsAt && DateTime.fromJSDate(subscription.trialEndsAt) > now) ||
        (subscription.status === "GRACE_PERIOD" && subscription.gracePeriodEndsAt && DateTime.fromJSDate(subscription.gracePeriodEndsAt) > now);

      if (!active) throw new SubscriptionError("Subscription is not active.", "SUBSCRIPTION_INACTIVE");

      const features = { ...((subscription.plan.featureFlags ?? {}) as Record<string, boolean>) };
      for (const addon of addons) {
        const addonActive =
          addon.status === "ACTIVE" ||
          (addon.status === "TRIALING" && addon.trialEndsAt && DateTime.fromJSDate(addon.trialEndsAt) > now) ||
          (addon.status === "GRACE_PERIOD" && addon.gracePeriodEndsAt && DateTime.fromJSDate(addon.gracePeriodEndsAt) > now);
        if (addonActive) features[addon.addonPlan.featureCode] = true;
      }

      return {
        status: subscription.status,
        features,
        limits: (subscription.plan.limits ?? {}) as Record<string, number>
      };
    }
  });
}

export async function requireFeature(context: BusinessContext, feature: string) {
  const entitlements = await getEntitlements(context);
  if (!entitlements.features[feature]) {
    throw new SubscriptionError(`Feature '${feature}' is not available on the current plan.`, "FEATURE_NOT_AVAILABLE");
  }
  return entitlements;
}
