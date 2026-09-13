import { cookies } from "next/headers";
import { getDictionary, type AppLocale } from "@/i18n/dictionaries";

export async function getLocale(): Promise<AppLocale> {
  const value = (await cookies()).get("app_locale")?.value;
  return value === "en" ? "en" : "ar";
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, dict: getDictionary(locale), dir: locale === "ar" ? "rtl" : "ltr" as const };
}
