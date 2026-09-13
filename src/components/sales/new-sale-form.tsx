"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Product = { id: string; name: string; type: "PRODUCT" | "SERVICE"; price: number; currency: "USD" | "LBP"; stock: number | null };
type Customer = { id: string; name: string; phone: string | null };
type Line = { key: string; productId: string; quantity: number };

export function NewSaleForm({
  products,
  customers,
  defaultCurrency,
  usdToLbpRate,
  locale
}: {
  products: Product[];
  customers: Customer[];
  defaultCurrency: "USD" | "LBP";
  usdToLbpRate: number;
  locale: "ar" | "en";
}) {
  const router = useRouter();
  const ar = locale === "ar";
  const [currency, setCurrency] = useState<"USD" | "LBP">(defaultCurrency);
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [paymentCurrency, setPaymentCurrency] = useState<"USD" | "LBP">(defaultCurrency);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [lines, setLines] = useState<Line[]>([{ key: crypto.randomUUID(), productId: products[0]?.id ?? "", quantity: 1 }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  function convert(amount: number, from: "USD" | "LBP", to: "USD" | "LBP") {
    if (from === to) return amount;
    return from === "USD" ? amount * usdToLbpRate : amount / usdToLbpRate;
  }

  const subtotal = lines.reduce((sum, line) => {
    const product = byId.get(line.productId);
    return product ? sum + convert(product.price, product.currency, currency) * Math.max(0, line.quantity) : sum;
  }, 0);
  const total = Math.max(0, subtotal - Math.max(0, discount));
  const paidInSaleCurrency = convert(Math.max(0, paid), paymentCurrency, currency);
  const remaining = Math.max(0, total - paidInSaleCurrency);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  }

  async function submit() {
    setError(null);
    if (!lines.length || lines.some((line) => !line.productId || line.quantity <= 0)) return setError(ar ? "تأكد من المنتجات والكميات." : "Check products and quantities.");
    if (remaining > 0.0001 && !customerId) return setError(ar ? "اختار زبون إذا رح يبقى مبلغ عليه." : "Select a customer if any amount will remain unpaid.");
    if (paidInSaleCurrency - total > 0.0001) return setError(ar ? "المبلغ المدفوع أكبر من المجموع." : "Paid amount is greater than the total.");

    setBusy(true);
    const response = await fetch("/api/sales", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerId: customerId || null,
        currency,
        discountAmount: String(discount || 0),
        items: lines.map((line) => ({ productId: line.productId, quantity: String(line.quantity) })),
        payments: paid > 0 ? [{ amount: String(paid), currency: paymentCurrency, method: paymentMethod }] : []
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.message ?? (ar ? "تعذّر حفظ عملية البيع." : "Unable to save the sale."));
      setBusy(false);
      return;
    }
    router.push(`/sales?created=${encodeURIComponent(result.invoiceNumber)}`);
    router.refresh();
  }

  if (!products.length) {
    return <Card><CardContent className="pt-5 text-sm text-slate-500">{ar ? "ضيف منتج أو خدمة أولاً قبل إنشاء عملية بيع." : "Add a product or service before creating a sale."}</CardContent></Card>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_0.8fr]">
      <Card>
        <CardHeader><CardTitle>{ar ? "الأصناف" : "Items"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line) => {
            const product = byId.get(line.productId);
            return <div key={line.key} className="grid gap-2 rounded-2xl border border-slate-200 p-3 sm:grid-cols-[1fr_130px_44px] sm:items-end">
              <div><Label>{ar ? "منتج / خدمة" : "Product / Service"}</Label><Select value={line.productId} onChange={(e) => updateLine(line.key, { productId: e.target.value })}>{products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.price} {p.currency}{p.stock !== null ? ` · ${ar ? "مخزون" : "stock"} ${p.stock}` : ""}</option>)}</Select></div>
              <div><Label>{ar ? "الكمية" : "Quantity"}</Label><div className="flex"><Button type="button" variant="outline" size="icon" className="rounded-e-none" onClick={() => updateLine(line.key, { quantity: Math.max(0.001, line.quantity - 1) })}><Minus className="size-4" /></Button><Input className="rounded-none text-center" type="number" min="0.001" step="0.001" value={line.quantity} onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) })} /><Button type="button" variant="outline" size="icon" className="rounded-s-none" onClick={() => updateLine(line.key, { quantity: line.quantity + 1 })}><Plus className="size-4" /></Button></div></div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setLines((current) => current.filter((x) => x.key !== line.key))} disabled={lines.length === 1}><Trash2 className="size-4" /></Button>
              {product ? <p className="text-xs text-slate-400 sm:col-span-3">{ar ? "تقريباً" : "Approx."}: {convert(product.price, product.currency, currency).toFixed(currency === "LBP" ? 0 : 2)} {currency} × {line.quantity}</p> : null}
            </div>;
          })}
          <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, { key: crypto.randomUUID(), productId: products[0]?.id ?? "", quantity: 1 }])}><Plus className="size-4" />{ar ? "إضافة صنف" : "Add item"}</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>{ar ? "الدفع" : "Payment"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>{ar ? "الزبون" : "Customer"}</Label><Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">{ar ? "زبون نقدي" : "Walk-in customer"}</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>)}</Select></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>{ar ? "عملة البيع" : "Sale currency"}</Label><Select value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "LBP")}><option value="USD">USD</option><option value="LBP">LBP</option></Select></div><div><Label>{ar ? "حسم" : "Discount"}</Label><Input type="number" min="0" step="0.0001" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></div></div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm"><div className="flex justify-between"><span className="text-slate-500">{ar ? "المجموع" : "Total"}</span><strong>{total.toFixed(currency === "LBP" ? 0 : 2)} {currency}</strong></div><div className="mt-2 flex justify-between"><span className="text-slate-500">{ar ? "الباقي" : "Remaining"}</span><strong>{remaining.toFixed(currency === "LBP" ? 0 : 2)} {currency}</strong></div></div>
            <div><Label>{ar ? "المدفوع الآن" : "Paid now"}</Label><Input type="number" min="0" step="0.0001" value={paid} onChange={(e) => setPaid(Number(e.target.value))} /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>{ar ? "عملة الدفع" : "Payment currency"}</Label><Select value={paymentCurrency} onChange={(e) => setPaymentCurrency(e.target.value as "USD" | "LBP")}><option value="USD">USD</option><option value="LBP">LBP</option></Select></div><div><Label>{ar ? "طريقة الدفع" : "Method"}</Label><Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="CASH">Cash</option><option value="CARD">Card</option><option value="WHISH">Whish</option><option value="OMT">OMT</option><option value="BANK_TRANSFER">Bank transfer</option><option value="OTHER">Other</option></Select></div></div>
            {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <Button className="w-full" size="lg" onClick={submit} disabled={busy}>{busy ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ عملية البيع" : "Complete sale")}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
