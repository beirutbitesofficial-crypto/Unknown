"use client";
import { useState } from "react";
import { Select } from "@/components/ui/select";

export function OrderStatusControl({ id, initial }: { id: string; initial: string }) {
  const [status, setStatus] = useState(initial); const [saving, setSaving] = useState(false);
  async function update(next: string) { const previous = status; setStatus(next); setSaving(true); const r = await fetch(`/api/orders/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) }); if (!r.ok) setStatus(previous); setSaving(false); }
  return <Select className="h-9 min-w-36" value={status} disabled={saving} onChange={(e) => update(e.target.value)}><option value="PENDING">Pending</option><option value="CONFIRMED">Confirmed</option><option value="PREPARING">Preparing</option><option value="READY">Ready</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></Select>;
}
