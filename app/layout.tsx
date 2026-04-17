import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";

import { GlobalFeedbackToast } from "@/components/ui/global-feedback-toast";
import "./globals.css";
import { texts } from "@/lib/texts";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: texts.app.title,
  description: texts.app.description
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Suspense fallback={null}>
          <GlobalFeedbackToast />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
