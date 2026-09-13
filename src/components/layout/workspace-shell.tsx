import Link from "next/link";
import {
  Bell, Boxes, CalendarDays, ChartNoAxesCombined, CircleDollarSign, CreditCard, Gauge, Globe2, Landmark,
  Package, PlugZap, ReceiptText, Settings, ShoppingBag, ShoppingCart, Truck, UserRoundCog, UsersRound
} from "lucide-react";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { LogoutButton } from "@/components/layout/logout-button";
import { Button } from "@/components/ui/button";
import type { getDictionary } from "@/i18n/dictionaries";

type Dict = ReturnType<typeof getDictionary>;

const nav = [
  ["dashboard", "/dashboard", Gauge],
  ["sales", "/sales", ShoppingCart],
  ["customers", "/customers", UsersRound],
  ["debts", "/debts", CreditCard],
  ["products", "/products", Package],
  ["inventory", "/inventory", Boxes],
  ["suppliers", "/suppliers", Truck],
  ["expenses", "/expenses", ReceiptText],
  ["reports", "/reports", ChartNoAxesCombined],
  ["employees", "/employees", UserRoundCog],
  ["bookings", "/bookings", CalendarDays],
  ["onlineOrders", "/orders", ShoppingBag],
  ["website", "/website", Globe2],
  ["apps", "/apps", PlugZap],
  ["notifications", "/notifications", Bell],
  ["settings", "/settings", Settings]
] as const;

export function WorkspaceShell({ children, dict }: { children: React.ReactNode; dict: Dict }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 border-e border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 px-5">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white"><Landmark className="size-5" /></span>
          <span className="text-lg font-bold">Ledgerly</span>
        </div>
        <div className="px-4 pb-4"><Button asChild className="w-full"><Link href="/sales/new"><CircleDollarSign className="size-4" />{dict.common.newSale}</Link></Button></div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
          {nav.map(([key, href, Icon]) => <Link key={key} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"><Icon className="size-4" />{dict.nav[key]}</Link>)}
        </nav>
      </aside>

      <div className="lg:ps-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold lg:hidden"><Landmark className="size-5" />Ledgerly</Link>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-1"><LanguageSwitch /><LogoutButton /></div>
        </header>
        <main className="px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-8">{children}</main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pt-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {[nav[0], nav[1], nav[2], nav[4]].map(([key, href, Icon]) => <Link key={key} href={href} className="flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium text-slate-600"><Icon className="size-5" /><span className="max-w-16 truncate">{dict.nav[key]}</span></Link>)}
          <Link href="/menu" className="flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium text-slate-600"><Settings className="size-5" /><span>{dict.common.menu}</span></Link>
        </div>
      </nav>
    </div>
  );
}
