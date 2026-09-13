"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Option = { resourceId: string; resourceName: string; serviceId: string; serviceName: string; price: string; currency: string };
type Slot = { startAt: string; endAt: string; label: string };

export function PublicBookingForm({ slug, options }: { slug: string; options: Option[] }) {
  const serviceIds = [...new Set(options.map((o) => o.serviceId))];
  const [serviceId, setServiceId] = useState(serviceIds[0] ?? "");
  const resourceOptions = useMemo(() => options.filter((o) => o.serviceId === serviceId), [options, serviceId]);
  const [resourceId, setResourceId] = useState(resourceOptions[0]?.resourceId ?? "");
  const [date, setDate] = useState(""); const [slots, setSlots] = useState<Slot[]>([]); const [slot, setSlot] = useState("");
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [whatsapp, setWhatsapp] = useState(""); const [notes, setNotes] = useState(""); const [message, setMessage] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  function changeService(value: string) { setServiceId(value); const first = options.find((o) => o.serviceId === value); setResourceId(first?.resourceId ?? ""); setSlots([]); setSlot(""); }
  async function loadSlots() { if (!serviceId || !resourceId || !date) return; setLoading(true); setMessage(null); try { const qs = new URLSearchParams({ serviceId, resourceId, date }); const r = await fetch(`/api/public/${slug}/availability?${qs}`); const j = await r.json(); if (!r.ok) throw new Error(j.message ?? j.error ?? "Unable to load times"); setSlots(j.slots); setSlot(""); } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to load times"); } finally { setLoading(false); } }
  async function submit() { if (!slot || !name.trim() || !phone.trim()) return; setLoading(true); setMessage(null); try { const r = await fetch(`/api/public/${slug}/bookings`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ serviceId, resourceId, startAt: slot, customerName: name, customerPhone: phone, whatsapp: whatsapp || undefined, notes: notes || undefined }) }); const j = await r.json(); if (!r.ok) throw new Error(j.message ?? j.error ?? "Unable to book"); setMessage(`Booking confirmed: ${j.bookingCode}`); } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to book"); } finally { setLoading(false); } }
  const selectedService = options.find((o) => o.serviceId === serviceId);
  return <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div><h2 className="text-xl font-black">Book an appointment</h2><p className="mt-1 text-sm text-slate-500">Choose a service, staff member and available time.</p></div>
    <Select value={serviceId} onChange={(e) => changeService(e.target.value)}>{serviceIds.map((id) => { const o = options.find((x) => x.serviceId === id)!; return <option key={id} value={id}>{o.serviceName} · {o.price} {o.currency}</option>; })}</Select>
    <Select value={resourceId} onChange={(e) => { setResourceId(e.target.value); setSlots([]); setSlot(""); }}>{resourceOptions.map((o) => <option key={o.resourceId} value={o.resourceId}>{o.resourceName}</option>)}</Select>
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><Input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => { setDate(e.target.value); setSlots([]); setSlot(""); }} /><Button variant="outline" onClick={loadSlots} disabled={loading || !date}>Check times</Button></div>
    {slots.length ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.map((s) => <button key={s.startAt} type="button" onClick={() => setSlot(s.startAt)} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${slot === s.startAt ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white"}`}>{s.label}</button>)}</div> : date ? <p className="text-xs text-slate-500">No available times loaded yet.</p> : null}
    <div className="grid gap-3 sm:grid-cols-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" /><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" /><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp (optional)" /><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason / notes (optional)" /></div>
    {selectedService ? <p className="text-xs text-slate-500">Price: {selectedService.price} {selectedService.currency}. Payment/deposit rules are controlled by the business.</p> : null}
    <Button className="w-full" onClick={submit} disabled={loading || !slot || !name.trim() || !phone.trim()}>{loading ? "Processing..." : "Confirm booking"}</Button>
    {message ? <p className="text-sm font-medium text-slate-700">{message}</p> : null}
  </div>;
}
