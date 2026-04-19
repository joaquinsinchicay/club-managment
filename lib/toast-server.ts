import { cookies } from "next/headers";

import type { ToastPayload } from "@/lib/toast";

export const FLASH_TOAST_COOKIE = "__toast";

export type FlashToastPayload = Omit<ToastPayload, "action">;

export function flashToast(payload: FlashToastPayload): void {
  cookies().set(FLASH_TOAST_COOKIE, JSON.stringify(payload), {
    path: "/",
    maxAge: 10,
    httpOnly: false,
    sameSite: "lax"
  });
}
