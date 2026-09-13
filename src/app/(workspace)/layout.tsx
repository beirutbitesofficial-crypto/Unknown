import { requireSession } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  const { dict } = await getI18n();
  return <WorkspaceShell dict={dict}>{children}</WorkspaceShell>;
}
