"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentPropsWithoutRef, type MouseEvent, type ReactNode, useState } from "react";

import { Spinner } from "@/components/ui/pending-form";
import { dashboard as txtDashboard } from "@/lib/texts";
import { cn } from "@/lib/utils";

type NavigationLinkWithLoaderProps = LinkProps &
  Omit<ComponentPropsWithoutRef<"a">, keyof LinkProps | "children"> & {
    children: ReactNode;
    loadingLabel?: string;
    loadingClassName?: string;
    loadingSpinnerClassName?: string;
    loadingContentClassName?: string;
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
  loadingLabel = txtDashboard.treasury.navigation_loading,
  loadingClassName,
  loadingSpinnerClassName,
  loadingContentClassName,
  onClick,
  replace,
  scroll,
  ...props
}: NavigationLinkWithLoaderProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const hrefValue = typeof href === "string" ? href : href.toString();

  return (
    <Link
      {...props}
      aria-disabled={isNavigating}
      className={cn(
        "disabled:pointer-events-none",
        isNavigating && "pointer-events-none opacity-70",
        className
      )}
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
      {isNavigating ? (
        <span className={cn("inline-flex items-center gap-2", loadingClassName)}>
          <Spinner className={cn("size-4", loadingSpinnerClassName)} />
          <span className={loadingContentClassName}>{loadingLabel}</span>
        </span>
      ) : (
        children
      )}
    </Link>
  );
}
