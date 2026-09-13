import Link from "next/link";
import { Bell, Boxes, ChartNoAxesCombined, CreditCard, Gauge, Package, ReceiptText, Settings, ShoppingCart, Truck, UserRoundCog, UsersRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { getI18n } from "@/i18n/server";

export default async function MenuPage() {
  const { dict, locale } = await getI18n();
  const links = [["dashboard","/dashboard",Gauge],["sales","/sales",ShoppingCart],["customers","/customers",UsersRound],["debts","/debts",CreditCard],["products","/products",Package],["inventory","/inventory",Boxes],["suppliers","/suppliers",Truck],["expenses","/expenses",ReceiptText],["reports","/reports",ChartNoAxesCombined],["employees","/employees",UserRoundCog],["notifications","/notifications",Bell],["settings","/settings",Settings]] as const;
  return <div className="mx-auto max-w-3xl space-y-6"><PageHeader title={locale === "ar" ? "القائمة" : "Menu"} /><div className="grid gap-3 sm:grid-cols-2">{links.map(([key, href, Icon]) => <Link href={href} key={key}><Card className="transition hover:border-slate-300 hover:shadow-md"><CardContent className="flex items-center gap-3 pt-5"><span className="rounded-xl bg-slate-100 p-2"><Icon className="size-5" /></span><span className="font-semibold">{dict.nav[key]}</span></CardContent></Card></Link>)}</div></div>;
}
