import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getI18n } from "@/i18n/server";

export const metadata: Metadata = {
  title: { default: "Ledgerly", template: "%s · Ledgerly" },
  description: "Simple business management for Lebanon",
  applicationName: "Ledgerly",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Ledgerly" },
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale, dir } = await getI18n();
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
