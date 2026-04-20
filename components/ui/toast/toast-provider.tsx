"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { showToast, type ToastPayload } from "@/lib/toast";

import { ToastViewport } from "./toast-viewport";

const FLASH_COOKIE = "__toast";

function readAndClearFlashCookie(): ToastPayload | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${FLASH_COOKIE}=`));

  if (!match) {
    return null;
  }

  const rawValue = match.slice(FLASH_COOKIE.length + 1);
  document.cookie = `${FLASH_COOKIE}=; path=/; max-age=0; samesite=lax`;

  try {
    const decoded = decodeURIComponent(rawValue);
    const parsed = JSON.parse(decoded) as ToastPayload;
    if (parsed && typeof parsed.title === "string" && typeof parsed.kind === "string") {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function ToastProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const payload = readAndClearFlashCookie();
    if (payload) {
      showToast(payload);
    }
  }, [pathname, searchParams]);

  return <ToastViewport />;
}
