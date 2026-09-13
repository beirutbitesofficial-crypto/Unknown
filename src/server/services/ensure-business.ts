import { cookies } from "next/headers";
import { requireSession } from "@/server/auth/session";
import { parseSignupDraft } from "@/server/auth/signup-draft";
import { provisionBusinessForUser } from "@/server/services/business-provisioning";
import { getBusinessContext } from "@/server/tenancy/context";

export async function ensureBusinessForCurrentUser() {
  const session = await requireSession();
  const existingContext = await getBusinessContext();
  if (existingContext) return existingContext.businessId;

  const cookieStore = await cookies();
  const draft = parseSignupDraft(cookieStore.get("business_signup_draft")?.value);
  if (!draft || draft.email !== session.user.email) {
    throw new Error("Business signup draft is missing or does not match the signed-in account.");
  }

  const businessId = await provisionBusinessForUser({
    userId: session.user.id,
    ownerName: draft.ownerName,
    phone: draft.phone,
    businessName: draft.businessName,
    businessCategory: draft.businessCategory,
    preferredLanguage: draft.preferredLanguage,
    defaultCurrency: draft.defaultCurrency
  });

  cookieStore.delete("business_signup_draft");
  cookieStore.set("active_business_id", businessId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 60 * 60
  });

  return businessId;
}
