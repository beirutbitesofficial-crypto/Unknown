"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function BookingSetup({ resources, services, ar }: { resources: { id: string; name: string }[]; services: { id: string; name: string; durationMinutes: number | null }[]; ar: boolean }) {
  const [name, setName] = useState(""); const [title, setTitle] = useState(""); const [resourceId, setResourceId] = useState(resources[0]?.id ?? ""); const [productId, setProductId] = useState(services[0]?.id ?? ""); const [duration, setDuration] = useState("30"); const [message, setMessage] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function post(body: unknown) { setLoading(true); setMessage(null); try { const r = await fetch("/api/bookings/resources", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const j = await r.json(); if (!r.ok) throw new Error(j.message ?? j.error ?? "Failed"); setMessage(ar ? "تم الحفظ. حدّث الصفحة لرؤية التغيير." : "Saved. Refresh to see the change."); } catch (e) { setMessage(e instanceof Error ? e.message : "Failed"); } finally { setLoading(false); } }
  return <div className="grid gap-6 lg:grid-cols-2">
    <div className="space-y-3"><h3 className="font-bold">{ar ? "إضافة موظف / طبيب / حلاق" : "Add staff / doctor / barber"}</h3><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={ar ? "الاسم" : "Name"} /><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ar ? "الصفة (اختياري)" : "Title (optional)"} /><Button disabled={loading || !name.trim()} onClick={() => post({ kind: "resource", name, title })}>{ar ? "إضافة" : "Add resource"}</Button></div>
    <div className="space-y-3"><h3 className="font-bold">{ar ? "ربط خدمة بالحجز" : "Attach a bookable service"}</h3><Select value={resourceId} onChange={(e) => setResourceId(e.target.value)}><option value="">{ar ? "اختر الشخص" : "Choose resource"}</option>{resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select><Select value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">{ar ? "اختر الخدمة" : "Choose service"}</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select><Input type="number" min={5} max={480} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder={ar ? "المدة بالدقائق" : "Duration in minutes"} /><Button disabled={loading || !resourceId || !productId} onClick={() => post({ kind: "service", resourceId, productId, durationMinutes: Number(duration) })}>{ar ? "ربط الخدمة" : "Attach service"}</Button></div>
    {message ? <p className="text-xs text-slate-500 lg:col-span-2">{message}</p> : null}
  </div>;
}
