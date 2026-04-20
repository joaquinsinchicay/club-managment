import type { Metadata } from "next";
import { cookies } from "next/headers";

import { ToastProvider } from "@/components/ui/toast";
import { FLASH_TOAST_COOKIE } from "@/lib/toast-server";
import type { ToastPayload } from "@/lib/toast";
import "./globals.css";
import { texts } from "@/lib/texts";

export const metadata: Metadata = {
  title: texts.app.title,
  description: texts.app.description
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

type FlashPayload = ToastPayload & { nonce?: number };

function readFlashPayload(): FlashPayload | null {
  const raw = cookies().get(FLASH_TOAST_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as FlashPayload;
    if (parsed && typeof parsed.title === "string" && typeof parsed.kind === "string") {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const flashPayload = readFlashPayload();

  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider flashPayload={flashPayload} />
        {children}
      </body>
    </html>
  );
}
