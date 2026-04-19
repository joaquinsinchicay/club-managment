import type { Metadata } from "next";

import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";
import { texts } from "@/lib/texts";

export const metadata: Metadata = {
  title: texts.app.title,
  description: texts.app.description
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
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
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
