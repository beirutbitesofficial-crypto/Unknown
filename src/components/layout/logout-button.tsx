"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }
  return <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout"><LogOut className="size-4" /></Button>;
}
