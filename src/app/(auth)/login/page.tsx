import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getLocale } from "@/i18n/server";

export default async function LoginPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  return <AuthShell title={ar ? "أهلاً فيك" : "Welcome back"} subtitle={ar ? "سجّل دخولك لتدير شغلك من مكان واحد." : "Sign in to manage your business from one place."}><LoginForm locale={locale} /></AuthShell>;
}
