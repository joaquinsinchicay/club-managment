import type { Metadata } from "next";
import { Suspense } from "react";

import { GlobalFeedbackToast } from "@/components/ui/global-feedback-toast";
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
      <body>
        <Suspense fallback={null}>
          <GlobalFeedbackToast />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
