"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { type FeedbackToast, resolveFeedbackToast } from "@/lib/feedback";

type ToastCardProps = FeedbackToast & {
  visible: boolean;
};

function ToastCard({ message, tone, visible }: ToastCardProps) {
  return (
    <div
      role={tone === "destructive" ? "alert" : "status"}
      aria-live={tone === "destructive" ? "assertive" : "polite"}
      className={cn(
        "w-full max-w-md rounded-2xl border px-4 py-3 text-sm shadow-soft transition duration-200",
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
        tone === "destructive" && "border-destructive/25 bg-card text-foreground",
        tone === "warning" && "border-warning/25 bg-card text-foreground",
        tone === "success" && "border-success/20 bg-card text-foreground"
      )}
    >
      {message}
    </div>
  );
}

export function GlobalFeedbackToast() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeToast, setActiveToast] = useState<FeedbackToast | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const resolvedToast = useMemo(() => {
    if (!pathname) {
      return null;
    }

    return resolveFeedbackToast(pathname, new URLSearchParams(searchParams.toString()));
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!resolvedToast) {
      return;
    }

    setActiveToast(resolvedToast.toast);
    setIsVisible(true);

    const nextParams = new URLSearchParams(searchParams.toString());

    for (const key of resolvedToast.consumedKeys) {
      nextParams.delete(key);
    }

    const nextQuery = nextParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    router.replace(nextUrl, { scroll: false });
  }, [pathname, resolvedToast, router, searchParams]);

  useEffect(() => {
    if (!activeToast || !isVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsVisible(false);
    }, activeToast.dismissMs ?? 4500);

    return () => window.clearTimeout(timeoutId);
  }, [activeToast, isVisible]);

  useEffect(() => {
    if (isVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveToast(null);
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [isVisible]);

  if (!activeToast) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex justify-center sm:left-auto sm:right-4 sm:top-20 sm:w-full sm:max-w-md">
      <div className="pointer-events-auto w-full">
        <ToastCard {...activeToast} visible={isVisible} />
      </div>
    </div>
  );
}
