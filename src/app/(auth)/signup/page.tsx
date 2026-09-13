import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { getLocale } from "@/i18n/server";

export default async function SignupPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  return <AuthShell title={ar ? "أنشئ مساحة عملك" : "Create your workspace"} subtitle={ar ? "دقيقتين وبصير عندك نظام مرتب للمبيعات والمصاريف والديون." : "Set up sales, expenses, debts and more in a few minutes."}><SignupForm locale={locale} /></AuthShell>;
}
