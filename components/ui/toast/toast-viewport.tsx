"use client";

import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";
import { dismissToast, useToastEntries } from "@/lib/toast";

import { ToastItem } from "./toast";

export function ToastViewport() {
  const entries = useToastEntries();
  const [hovered, setHovered] = useState(false);

  const handleDismiss = useCallback((id: string) => {
    dismissToast(id);
  }, []);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
      className={cn(
        "pointer-events-none fixed z-[80] flex flex-col-reverse gap-2",
        // Mobile: bottom center con gutter 16px
        "inset-x-4 bottom-5",
        // Desktop: bottom-right 24px, ancho fijo
        "sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px]"
      )}
    >
      {entries.map((entry) => (
        <div key={entry.id} className="pointer-events-auto animate-toast-in">
          <ToastItem
            entry={entry}
            paused={hovered}
            onDismiss={() => handleDismiss(entry.id)}
          />
        </div>
      ))}
    </div>
  );
}
