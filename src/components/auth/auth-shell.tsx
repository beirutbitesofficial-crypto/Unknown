import Link from "next/link";
import { Landmark } from "lucide-react";
import { LanguageSwitch } from "@/components/layout/language-switch";

export function AuthShell({ children, title, subtitle }: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:py-12">
      <div className="mx-auto flex max-w-md justify-end pb-4">
        <LanguageSwitch />
      </div>
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Landmark className="size-5" />
          </span>
          <span className="text-xl font-bold tracking-tight">Ledgerly</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
        <div className="mt-7">{children}</div>
      </div>
    </main>
  );
}
