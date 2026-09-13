import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({ title, value, icon: Icon, hint }: { title: string; value: string; icon: LucideIcon; hint?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-0">
        <CardTitle>{title}</CardTitle>
        <span className="rounded-xl bg-slate-100 p-2 text-slate-600"><Icon className="size-4" /></span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-slate-950">{value}</div>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
