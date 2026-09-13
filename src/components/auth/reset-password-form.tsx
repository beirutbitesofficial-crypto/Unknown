"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({ locale }: { locale: "ar" | "en" }) {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ar = locale === "ar";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return setError(ar ? "الرابط غير صالح." : "Invalid reset link.");
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const result = await authClient.resetPassword({ newPassword: String(data.get("password")), token });
    if (result.error) {
      setError(ar ? "الرابط منتهي أو غير صالح." : "The reset link is invalid or expired.");
      setBusy(false);
      return;
    }
    router.push("/login");
  }
  return <form onSubmit={submit} className="space-y-4"><div><Label>{ar ? "كلمة السر الجديدة" : "New password"}</Label><Input name="password" type="password" minLength={10} required /></div>{error ? <p className="text-sm text-red-600">{error}</p> : null}<Button className="w-full" disabled={busy}>{busy ? "…" : (ar ? "تغيير كلمة السر" : "Reset password")}</Button></form>;
}
