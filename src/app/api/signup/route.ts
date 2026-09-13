import { NextResponse } from "next/server";
import { signupSchema } from "@/lib/validation/signup";
import { createSignupDraft } from "@/server/auth/signup-draft";
import { normalizeLebanesePhone } from "@/lib/utils";

/**
 * Stores only a signed HttpOnly business-provisioning draft.
 * Account creation itself goes through Better Auth's client endpoint so its
 * database-backed rate limiting remains effective.
 */
export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 422 });
  }

  const input = { ...parsed.data, phone: normalizeLebanesePhone(parsed.data.phone) };
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    "business_signup_draft",
    createSignupDraft({
      ownerName: input.ownerName,
      businessName: input.businessName,
      phone: input.phone,
      email: input.email,
      businessCategory: input.businessCategory,
      preferredLanguage: input.preferredLanguage,
      defaultCurrency: input.defaultCurrency
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60
    }
  );
  return response;
}
