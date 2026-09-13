"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LanguageSwitch() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function switchLocale() {
    setBusy(true);
    const current = document.documentElement.lang === "en" ? "en" : "ar";
    const locale = current === "ar" ? "en" : "ar";
    await fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale })
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <Button variant="ghost" size="sm" onClick={switchLocale} disabled={busy} aria-label="Switch language">
      <Languages className="size-4" />
      <span>{busy ? "…" : "AR / EN"}</span>
    </Button>
  );
}
