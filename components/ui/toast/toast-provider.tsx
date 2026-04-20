"use client";

import { useEffect, useRef } from "react";

import { showToast, type ToastPayload } from "@/lib/toast";

import { ToastViewport } from "./toast-viewport";

const FLASH_COOKIE = "__toast";

type FlashPayload = ToastPayload & { nonce?: number };

type ToastProviderProps = {
  flashPayload?: FlashPayload | null;
};

function clearFlashCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${FLASH_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function ToastProvider({ flashPayload }: ToastProviderProps = {}) {
  const lastShownRef = useRef<string | null>(null);

  useEffect(() => {
    if (!flashPayload) return;

    const key = `${flashPayload.nonce ?? ""}:${flashPayload.title}`;
    if (lastShownRef.current === key) return;

    lastShownRef.current = key;
    const { nonce: _nonce, ...rest } = flashPayload;
    showToast(rest);
    clearFlashCookie();
  }, [flashPayload]);

  return <ToastViewport />;
}
