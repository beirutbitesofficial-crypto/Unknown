"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ locale }: { locale: "ar" | "en" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ar = locale === "ar";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(data.get("email")),
      password: String(data.get("password")),
      callbackURL: "/onboarding"
    });
    if (result.error) {
      setError(ar ? "تعذّر تسجيل الدخول. تأكد من البريد وكلمة السر وتفعيل الإيميل." : "Unable to sign in. Check your credentials and email verification.");
      setBusy(false);
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><Label htmlFor="email">{ar ? "البريد الإلكتروني" : "Email"}</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
      <div><Label htmlFor="password">{ar ? "كلمة السر" : "Password"}</Label><Input id="password" name="password" type="password" autoComplete="current-password" required /></div>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={busy}>{busy ? (ar ? "جارٍ الدخول…" : "Signing in…") : (ar ? "تسجيل الدخول" : "Sign in")}</Button>
      <div className="flex items-center justify-between text-sm">
        <Link className="text-slate-600 hover:text-slate-950" href="/forgot-password">{ar ? "نسيت كلمة السر؟" : "Forgot password?"}</Link>
        <Link className="font-semibold text-slate-950" href="/signup">{ar ? "إنشاء حساب" : "Create account"}</Link>
      </div>
    </form>
  );
}
