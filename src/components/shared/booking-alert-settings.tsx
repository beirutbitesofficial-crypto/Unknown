"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BookingAlertSettings({ initialNumber, providerReady, ar }: { initialNumber: string | null; providerReady: boolean; ar: boolean }) {
  const [number, setNumber] = useState(initialNumber ? `+${initialNumber}` : ""); const [message, setMessage] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function save() { setLoading(true); setMessage(null); try { const r = await fetch("/api/bookings/notifications", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ bookingWhatsapp: number }) }); const j = await r.json(); if (!r.ok) throw new Error(j.message ?? j.error ?? "Failed"); setNumber(j.bookingWhatsapp ? `+${j.bookingWhatsapp}` : ""); setMessage(ar ? "تم الحفظ." : "Saved."); } catch (e) { setMessage(e instanceof Error ? e.message : "Failed"); } finally { setLoading(false); } }
  return <div className="space-y-3">
    <p className="text-sm text-slate-600">{ar ? "رقم الواتساب يلي بتوصله رسالة عند كل حجز جديد." : "WhatsApp number that receives a message for every new booking."}</p>
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><Input dir="ltr" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+961 3 123 456" /><Button disabled={loading} onClick={save}>{ar ? "حفظ" : "Save"}</Button></div>
    {!providerReady ? <p className="text-xs text-amber-700">{ar ? "خدمة الواتساب غير مفعّلة على المنصة بعد، الرسائل رح تبلش توصل بس تتفعّل." : "WhatsApp delivery is not configured on the platform yet; alerts start once it is."}</p> : null}
    {message ? <p className="text-xs text-slate-500">{message}</p> : null}
  </div>;
}
