export type BillingCheckoutInput = {
  businessId: string;
  planCode: string;
  interval: "MONTHLY" | "YEARLY";
  successUrl: string;
  cancelUrl: string;
};

export type BillingCheckoutResult = {
  provider: string;
  checkoutUrl: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
};

export type BillingWebhookEvent = {
  eventId: string;
  type: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  providerPaymentId?: string;
  occurredAt: Date;
  payload: unknown;
};

/** Payment providers must implement this contract; domain subscription logic never imports a vendor SDK directly. */
export interface BillingProvider {
  readonly name: string;
  createCheckout(input: BillingCheckoutInput): Promise<BillingCheckoutResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  parseWebhook(request: Request): Promise<BillingWebhookEvent>;
}

const providers = new Map<string, BillingProvider>();

export function registerBillingProvider(provider: BillingProvider) {
  providers.set(provider.name, provider);
}

export function getBillingProvider(name: string) {
  const provider = providers.get(name);
  if (!provider) throw new Error(`Billing provider '${name}' is not registered.`);
  return provider;
}
