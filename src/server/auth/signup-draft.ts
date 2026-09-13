import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import type { SignupInput } from "@/lib/validation/signup";

type SignupDraft = Omit<SignupInput, "password"> & { exp: number };

function sign(encoded: string) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(encoded).digest("base64url");
}

export function createSignupDraft(input: Omit<SignupInput, "password">) {
  const payload: SignupDraft = {
    ...input,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function parseSignupDraft(value?: string): SignupDraft | null {
  if (!value) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SignupDraft;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
