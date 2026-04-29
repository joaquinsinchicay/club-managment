"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { ToastEntry, ToastKind } from "@/lib/toast";
import { texts } from "@/lib/texts";

const KIND_CLASSES: Record<
  ToastKind,
  { icon: string; iconBg: string; progress: string; role: "status" | "alert"; ariaLive: "polite" | "assertive" }
> = {
  success: {
    icon: "text-ds-green",
    iconBg: "bg-ds-green/15",
    progress: "bg-ds-green",
    role: "status",
    ariaLive: "polite"
  },
  error: {
    icon: "text-ds-red",
    iconBg: "bg-ds-red/20",
    progress: "bg-ds-red",
    role: "alert",
    ariaLive: "assertive"
  },
  warning: {
    icon: "text-ds-amber",
    iconBg: "bg-ds-amber/20",
    progress: "bg-ds-amber",
    role: "status",
    ariaLive: "polite"
  },
  info: {
    icon: "text-ds-blue",
    iconBg: "bg-ds-blue/20",
    progress: "bg-ds-blue",
    role: "status",
    ariaLive: "polite"
  }
};

function KindIcon({ kind }: { kind: ToastKind }) {
  const className = "size-4";
  const common = {
    viewBox: "0 0 20 20",
    "aria-hidden": true,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  if (kind === "success") {
    return (
      <svg className={className} {...common}>
        <path d="M4 10.5 L8.5 15 L16 6" />
      </svg>
    );
  }
  if (kind === "error" || kind === "warning") {
    return (
      <svg className={className} {...common}>
        <path d="M10 3v9" />
        <path d="M10 16.5h.01" />
      </svg>
    );
  }
  return (
    <svg className={className} {...common}>
      <path d="M10 9.5v5" />
      <path d="M10 6h.01" />
    </svg>
  );
}

type ToastItemProps = {
  entry: ToastEntry;
  paused: boolean;
  onDismiss: () => void;
};

export function ToastItem({ entry, paused, onDismiss }: ToastItemProps) {
  const { kind, title, desc, meta, action, resolvedDuration } = entry;
  const variant = KIND_CLASSES[kind];
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const dismissedRef = useRef(false);

  const hasAutoDismiss = resolvedDuration > 0;

  useEffect(() => {
    if (!hasAutoDismiss || dismissedRef.current) {
      return;
    }

    function tick(now: number) {
      if (lastTickRef.current === null) {
        lastTickRef.current = now;
      }
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      if (!paused) {
        setElapsed((prev) => {
          const next = prev + delta;
          if (next >= resolvedDuration && !dismissedRef.current) {
            dismissedRef.current = true;
            queueMicrotask(onDismiss);
            return resolvedDuration;
          }
          return next;
        });
      }

      rafRef.current = window.requestAnimationFrame(tick);
    }

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      lastTickRef.current = null;
    };
  }, [hasAutoDismiss, paused, resolvedDuration, onDismiss]);

  const progress = hasAutoDismiss ? Math.min(1, elapsed / resolvedDuration) : 0;

  return (
    <div
      role={variant.role}
      aria-live={variant.ariaLive}
      className={cn(
        "relative w-full overflow-hidden rounded-card bg-ds-slate-900 text-white shadow-pop",
        "ring-1 ring-toast-bg-overlay"
      )}
    >
      <div className="flex items-start gap-3 p-4 pr-10">
        <div
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full",
            variant.iconBg,
            variant.icon
          )}
          aria-hidden
        >
          <KindIcon kind={kind} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-body font-semibold leading-5 text-white">{title}</p>
            {action ? (
              <button
                type="button"
                onClick={() => {
                  action.onClick();
                  onDismiss();
                }}
                className="shrink-0 text-label text-toast-fg hover:text-white"
              >
                {action.label}
              </button>
            ) : null}
          </div>
          {desc ? <p className="mt-0.5 text-label font-normal leading-5 text-toast-fg-default">{desc}</p> : null}
          {meta ? (
            <p className="mt-1 text-small font-mono leading-4 text-toast-fg-faint">{meta}</p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={texts.common.actions.close}
        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-btn text-toast-fg-mute hover:bg-toast-bg-overlay hover:text-white"
      >
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="m5 5 10 10" />
          <path d="m15 5-10 10" />
        </svg>
      </button>
      {hasAutoDismiss ? (
        <div className="h-[2px] w-full bg-toast-bg-overlay" aria-hidden>
          <div
            className={cn("h-full transition-[width] duration-75 ease-linear", variant.progress)}
            style={{ width: `${Math.max(0, (1 - progress) * 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
