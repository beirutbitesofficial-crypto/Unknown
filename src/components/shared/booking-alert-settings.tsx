"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BookingAlertSettings({ initialNumber, ar }: { initialNumber: string | null; ar: boolean }) {
  const [number, setNumber] = useState(initialNumber ? `+${initialNumber}` : ""); const [message, setMessage] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function save() { setLoading(true); setMessage(null); try { const r = await fetch("/api/bookings/notifications", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ bookingWhatsapp: number }) }); const j = await r.json(); if (!r.ok) throw new Error(j.message ?? j.error ?? "Failed"); setNumber(j.bookingWhatsapp ? `+${j.bookingWhatsapp}` : ""); setMessage(ar ? "تم الحفظ." : "Saved."); } catch (e) { setMessage(e instanceof Error ? e.message : "Failed"); } finally { setLoading(false); } }
  return <div className="space-y-3">
    <p className="text-sm text-slate-600">{ar ? "بعد الحجز، بينفتح واتساب الزبون على هالرقم والرسالة جاهزة، وهو بيكبس إرسال." : "After booking, the customer's WhatsApp opens on this number with the booking details ready; they press Send."}</p>
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><Input dir="ltr" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+961 3 123 456" /><Button disabled={loading} onClick={save}>{ar ? "حفظ" : "Save"}</Button></div>
    {message ? <p className="text-xs text-slate-500">{message}</p> : null}
  </div>;
}
