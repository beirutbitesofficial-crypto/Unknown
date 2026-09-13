import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getLocale } from "@/i18n/server";

export default async function ResetPasswordPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  return <AuthShell title={ar ? "كلمة سر جديدة" : "Choose a new password"} subtitle={ar ? "اختار كلمة سر قوية ومختلفة." : "Use a strong password you do not reuse elsewhere."}><Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-slate-100" />}><ResetPasswordForm locale={locale} /></Suspense></AuthShell>;
}
