import Link, { type LinkProps } from "next/link";
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";

import { buttonClass } from "@/components/ui/button";

type LinkButtonVariant = "primary" | "secondary" | "destructive" | "dark";
type LinkButtonSize = "sm" | "md";
type LinkButtonRadius = "btn" | "xl";

type LinkButtonProps = Omit<LinkProps, "href"> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "children"> & {
    href: LinkProps["href"];
    variant?: LinkButtonVariant;
    size?: LinkButtonSize;
    radius?: LinkButtonRadius;
    fullWidth?: boolean;
    external?: boolean;
    children: ReactNode;
  };

export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(function LinkButton(
  {
    href,
    variant = "secondary",
    size = "md",
    radius = "xl",
    fullWidth = false,
    external = false,
    className,
    children,
    target,
    rel,
    ...rest
  },
  ref,
) {
  const composedClassName = buttonClass({ variant, size, radius, fullWidth, className });
  const composedTarget = external ? target ?? "_blank" : target;
  const composedRel = external ? rel ?? "noopener noreferrer" : rel;

  return (
    <Link
      ref={ref}
      href={href}
      className={composedClassName}
      target={composedTarget}
      rel={composedRel}
      {...rest}
    >
      {children}
    </Link>
  );
});
