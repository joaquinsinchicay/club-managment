import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";

import { ToastProvider } from "@/components/ui/toast";
import { FLASH_TOAST_COOKIE } from "@/lib/toast-server";
import type { ToastPayload } from "@/lib/toast";
import "./globals.css";
import { texts } from "@/lib/texts";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

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
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <ToastProvider flashPayload={flashPayload} />
        {children}
      </body>
    </html>
  );
}
