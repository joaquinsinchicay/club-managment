import Link, { type LinkProps } from "next/link";
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";

import {
  buttonClass,
  type ButtonRadius,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/button";

// Re-exportados como alias para que los consumers puedan importar
// `LinkButtonVariant` y obtener semantica de "link estilo boton" sin
// duplicar el set de variantes.
export type LinkButtonVariant = ButtonVariant;
export type LinkButtonSize = ButtonSize;
export type LinkButtonRadius = ButtonRadius;

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
    variant = "primary",
    size = "md",
    radius = "card",
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
