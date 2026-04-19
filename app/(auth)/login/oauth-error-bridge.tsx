"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { showError } from "@/lib/toast";
import { texts } from "@/lib/texts";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_cancelled: texts.auth.login.oauth_cancelled,
  oauth_generic_error: texts.auth.login.oauth_generic_error
};

export function OAuthErrorBridge() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const consumedRef = useRef(false);

  useEffect(() => {
    if (consumedRef.current) {
      return;
    }

    const errorCode = searchParams.get("error");
    if (!errorCode) {
      return;
    }

    consumedRef.current = true;

    const title = ERROR_MESSAGES[errorCode] ?? texts.common.toast.generic_error_title;
    showError({ title });

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("error");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
