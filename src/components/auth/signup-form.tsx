"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const categories = ["Restaurant / Café", "Mini Market", "Retail Store", "Clothing", "Beauty Salon", "Barbershop", "Clinic", "Phone Shop", "Services", "Freelancer", "Agency", "Other"];

export function SignupForm({ locale }: { locale: "ar" | "en" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const ar = locale === "ar";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      setError(ar ? "راجع المعلومات وحاول من جديد." : "Review the details and try again.");
      setBusy(false);
      return;
    }

    const { authClient } = await import("@/lib/auth-client");
    const result = await authClient.signUp.email({
      name: String(body.ownerName),
      email: String(body.email),
      password: String(body.password)
    });
    if (result.error) {
      setError(ar ? "ما قدرنا ننشئ الحساب. جرّب بعد شوي أو سجّل دخول إذا عندك حساب." : "We could not create the account. Try again later or sign in if you already have an account.");
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
          {ar ? "تم إنشاء الحساب. افتح الإيميل واضغط رابط التفعيل، وبعدها سجّل دخولك لنكمّل إعداد المحل." : "Account created. Open your email and verify your address, then sign in to finish business setup."}
        </div>
        <Button asChild className="w-full"><Link href="/login">{ar ? "الذهاب لتسجيل الدخول" : "Go to sign in"}</Link></Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><Label>{ar ? "اسم صاحب العمل" : "Owner name"}</Label><Input name="ownerName" required minLength={2} /></div>
      <div><Label>{ar ? "اسم العمل" : "Business name"}</Label><Input name="businessName" required minLength={2} /></div>
      <div><Label>{ar ? "رقم الهاتف" : "Phone number"}</Label><Input name="phone" inputMode="tel" placeholder="+961…" required /></div>
      <div><Label>{ar ? "البريد الإلكتروني" : "Email"}</Label><Input name="email" type="email" required autoComplete="email" /></div>
      <div><Label>{ar ? "كلمة السر" : "Password"}</Label><Input name="password" type="password" required minLength={10} autoComplete="new-password" /></div>
      <div><Label>{ar ? "نوع العمل" : "Business category"}</Label><Select name="businessCategory" required>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</Select></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>{ar ? "اللغة" : "Language"}</Label><Select name="preferredLanguage" defaultValue={ar ? "AR" : "EN"}><option value="AR">العربية</option><option value="EN">English</option></Select></div>
        <div><Label>{ar ? "العملة الأساسية" : "Default currency"}</Label><Select name="defaultCurrency" defaultValue="USD"><option value="USD">USD</option><option value="LBP">LBP</option></Select></div>
      </div>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={busy}>{busy ? (ar ? "جارٍ إنشاء الحساب…" : "Creating account…") : (ar ? "إنشاء حساب" : "Create account")}</Button>\n      <p className="text-center text-xs leading-5 text-slate-500">{ar ? "تجربة مجانية 14 يوم، بعدها 10$ بالشهر. الخدمات الإضافية اختيارية وتتحاسب بشكل منفصل." : "14-day free trial, then $10/month. Optional add-ons are billed separately."}</p>
      <p className="text-center text-sm text-slate-500">{ar ? "عندك حساب؟" : "Already have an account?"} <Link className="font-semibold text-slate-950" href="/login">{ar ? "سجّل دخول" : "Sign in"}</Link></p>
    </form>
  );
}
