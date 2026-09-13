"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function WebsiteSettingsForm({ status, templateCode, templates, ar }: { status: string; templateCode: string | null; templates: { code: string; name: string }[]; ar: boolean }) {
  const [nextStatus, setNextStatus] = useState(status);
  const [nextTemplate, setNextTemplate] = useState(templateCode ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true); setMessage(null);
    try {
      const response = await fetch("/api/website", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: nextStatus, templateCode: nextTemplate || null }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? body.error ?? "Unable to update website");
      setMessage(ar ? "تم حفظ إعدادات الموقع." : "Website settings saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save"); }
    finally { setSaving(false); }
  }
  return <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
    <Select value={nextTemplate} onChange={(e) => setNextTemplate(e.target.value)}><option value="">{ar ? "بدون قالب" : "No template"}</option>{templates.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}</Select>
    <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}><option value="DRAFT">{ar ? "مسودة" : "Draft"}</option><option value="PUBLISHED">{ar ? "منشور" : "Published"}</option><option value="PAUSED">{ar ? "متوقف" : "Paused"}</option></Select>
    <Button onClick={save} disabled={saving}>{saving ? (ar ? "حفظ..." : "Saving...") : (ar ? "حفظ" : "Save")}</Button>
    {message ? <p className="text-xs text-slate-500 sm:col-span-3">{message}</p> : null}
  </div>;
}
