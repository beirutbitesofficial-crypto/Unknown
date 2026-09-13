"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: string;
  status: string | null;
  recommended: boolean;
  ar: boolean;
};

type Checkout = { paymentId: string; recipient: string; amountUsd: string };

export function AddonPurchaseCard({ code, name, description, monthlyPrice, status, recommended, ar }: Props) {
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const active = status === "ACTIVE" || status === "TRIALING" || status === "GRACE_PERIOD";

  async function startWhish() {
    setLoading(true); setMessage(null);
    try {
      const response = await fetch("/api/billing/addons/whish", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ addonCode: code })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? body.error ?? "Unable to start payment");
      setCheckout(body);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Payment failed"); }
    finally { setLoading(false); }
  }

  async function submitReference() {
    if (!checkout || !reference.trim()) return;
    setLoading(true); setMessage(null);
    try {
      const response = await fetch("/api/billing/addons/whish/reference", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId: checkout.paymentId, reference: reference.trim() })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? body.error ?? "Unable to submit reference");
      setMessage(ar ? "تم إرسال المرجع. الخدمة ستتفعّل بعد التحقق من الدفعة." : "Reference submitted. The add-on activates after payment verification.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to submit reference"); }
    finally { setLoading(false); }
  }

  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{name}</h3>{recommended ? <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-bold text-white">{ar ? "مناسب لنشاطك" : "Recommended"}</span> : null}</div><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div>
      {active ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" /> : null}
    </div>
    <div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-2xl font-black">${monthlyPrice}</p><p className="text-xs text-slate-500">/{ar ? "شهر" : "month"}</p></div><span className="text-xs font-semibold text-slate-500">{status ?? (ar ? "غير مفعّل" : "Not active")}</span></div>
    {!active && !checkout ? <Button className="mt-5 w-full" onClick={startWhish} disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : <WalletCards className="size-4" />}{ar ? "ادفع عبر Whish" : "Pay with Whish"}</Button> : null}
    {checkout ? <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm"><p className="font-semibold">{ar ? "حوّل عبر Whish إلى" : "Send via Whish to"}: <span dir="ltr">{checkout.recipient}</span></p><p>{ar ? "المبلغ" : "Amount"}: <strong>${checkout.amountUsd}</strong></p><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={ar ? "رقم / مرجع عملية Whish" : "Whish transaction reference"} /><Button className="w-full" variant="outline" onClick={submitReference} disabled={loading || !reference.trim()}>{ar ? "إرسال المرجع للتحقق" : "Submit reference for verification"}</Button></div> : null}
    {message ? <p className="mt-3 text-xs leading-5 text-slate-600">{message}</p> : null}
  </div>;
}
