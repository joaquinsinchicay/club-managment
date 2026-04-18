"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { BlockingOverlay } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import { type FeedbackToast, resolveFeedbackToast } from "@/lib/feedback";

type ToastCardProps = FeedbackToast & {
  visible: boolean;
};

function ToastToneIcon({ tone }: Pick<FeedbackToast, "tone">) {
  const sharedClassName = "size-5";

  if (tone === "success") {
    return (
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className={sharedClassName}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      >
        <circle cx="10" cy="10" r="7" />
        <path d="m6.5 10 2.2 2.2 4.8-4.8" />
      </svg>
    );
  }

  if (tone === "warning") {
    return (
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className={sharedClassName}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      >
        <path d="M10 3.5 17 16.5H3L10 3.5Z" />
        <path d="M10 7.5v4" />
        <path d="M10 14h.01" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={sharedClassName}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.5v4.5" />
      <path d="M10 13.5h.01" />
    </svg>
  );
}

function ToastCard({ message, tone, visible }: ToastCardProps) {
  return (
    <div
      role={tone === "destructive" ? "alert" : "status"}
      aria-live={tone === "destructive" ? "assertive" : "polite"}
      className={cn(
        "w-full max-w-xl rounded-toast border bg-card p-5 shadow-soft transition duration-200 sm:p-6",
        visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0",
        tone === "destructive" && "border-destructive/25 text-foreground",
        tone === "warning" && "border-warning/25 text-foreground",
        tone === "success" && "border-success/20 text-foreground"
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl border",
            tone === "destructive" && "border-destructive/25 bg-destructive/10 text-foreground",
            tone === "warning" && "border-warning/25 bg-warning/10 text-foreground",
            tone === "success" && "border-success/20 bg-success/10 text-foreground"
          )}
        >
          <ToastToneIcon tone={tone} />
        </div>
        <p className="pt-1 text-sm leading-6 text-foreground sm:text-[15px]">{message}</p>
      </div>
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
    <BlockingOverlay
      open
      className={cn("z-[60] transition duration-200", isVisible ? "opacity-100" : "opacity-0")}
      contentClassName="items-end justify-center p-3 sm:items-center sm:p-6"
    >
      <div className="w-full max-w-xl">
        <ToastCard {...activeToast} visible={isVisible} />
      </div>
    </BlockingOverlay>
  );
}
