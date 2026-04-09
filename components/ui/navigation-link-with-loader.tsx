"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentPropsWithoutRef, type MouseEvent, type ReactNode, useState } from "react";

import { Spinner } from "@/components/ui/pending-form";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type NavigationLinkWithLoaderProps = LinkProps &
  Omit<ComponentPropsWithoutRef<"a">, keyof LinkProps | "children"> & {
    children: ReactNode;
    loadingLabel?: string;
  };

function shouldHandleNavigation(event: MouseEvent<HTMLAnchorElement>) {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

export function NavigationLinkWithLoader({
  children,
  className,
  href,
  loadingLabel = texts.dashboard.treasury.navigation_loading,
  onClick,
  replace,
  scroll,
  ...props
}: NavigationLinkWithLoaderProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const hrefValue = typeof href === "string" ? href : href.toString();

  return (
    <>
      {isNavigating ? (
        <div
          aria-busy="true"
          aria-live="polite"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4"
          role="status"
        >
          <div className="flex w-full max-w-sm items-center justify-center gap-3 rounded-[28px] border border-border bg-card px-6 py-5 text-sm font-semibold text-foreground shadow-soft">
            <Spinner className="size-5" />
            <span>{loadingLabel}</span>
          </div>
        </div>
      ) : null}

      <Link
        {...props}
        aria-disabled={isNavigating}
        className={cn("disabled:pointer-events-none", className)}
        href={href}
        onClick={(event) => {
          onClick?.(event);

          if (!shouldHandleNavigation(event)) {
            return;
          }

          event.preventDefault();

          if (isNavigating) {
            return;
          }

          setIsNavigating(true);

          if (replace) {
            router.replace(hrefValue, { scroll });
            return;
          }

          router.push(hrefValue, { scroll });
        }}
      >
        {children}
      </Link>
    </>
  );
}
