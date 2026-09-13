import { env } from "@/lib/env";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return; // Non-browser clients may omit Origin; auth/authorization still applies.
  const expected = new URL(env.NEXT_PUBLIC_APP_URL).origin;
  if (origin !== expected) throw new Error("UNTRUSTED_ORIGIN");
}
