import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getLocale } from "@/i18n/server";

export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  return <AuthShell title={ar ? "نسيت كلمة السر؟" : "Forgot password?"} subtitle={ar ? "حط إيميلك ومنبعتلك رابط آمن لتغييرها." : "Enter your email and we’ll send a secure reset link."}><ForgotPasswordForm locale={locale} /></AuthShell>;
}
