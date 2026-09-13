"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm({ locale }: { locale: "ar" | "en" }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const ar = locale === "ar";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    await authClient.requestPasswordReset({
      email: String(data.get("email")),
      redirectTo: `${window.location.origin}/reset-password`
    });
    setDone(true);
    setBusy(false);
  }
  if (done) return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{ar ? "إذا الإيميل موجود، رح يوصلك رابط تغيير كلمة السر." : "If the email exists, a password reset link has been sent."}</p>;
  return <form onSubmit={submit} className="space-y-4"><div><Label>{ar ? "البريد الإلكتروني" : "Email"}</Label><Input name="email" type="email" required /></div><Button className="w-full" disabled={busy}>{busy ? "…" : (ar ? "إرسال الرابط" : "Send reset link")}</Button></form>;
}
