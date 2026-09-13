import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ locale: z.enum(["ar", "en"]) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_LOCALE" }, { status: 422 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("app_locale", parsed.data.locale, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 60 * 60
  });
  return response;
}
