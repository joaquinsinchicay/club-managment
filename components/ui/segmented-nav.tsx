"use client";

import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Segmented control horizontal — pills alineadas dentro de un contenedor slate.
 *
 * Dos modos de uso según el tipo de item:
 *  - Link: cada item tiene `href`. Se renderiza como `<Link>` y la pill activa usa
 *    `aria-current="page"`. Ideal para sub-navegación entre rutas (p. ej. tabs del módulo RRHH).
 *  - Button: cada item tiene `onClick`. Se renderiza como `<button>` con `aria-pressed`.
 *    Ideal para sub-tabs que alternan estado en cliente (p. ej. tabs internos del dashboard de Tesorería).
 *
 * La variante se infiere por item: dentro del mismo `items[]` se pueden mezclar si hace falta.
 */

type BaseItem = {
  id: string;
  label: ReactNode;
  disabled?: boolean;
};

type LinkItem = BaseItem & { href: LinkProps["href"]; onClick?: never };
type ButtonItem = BaseItem & { onClick: () => void; href?: never };

export type SegmentedNavItem = LinkItem | ButtonItem;

type SegmentedNavProps = {
  items: SegmentedNavItem[];
  activeId: string;
  ariaLabel: string;
  className?: string;
};

const CONTAINER_CLASS = "flex gap-0.5 rounded-card bg-slate-100 p-0.75";
const ITEM_BASE_CLASS =
  "flex-1 rounded-[7px] px-2.5 py-2 text-center text-xs font-semibold tracking-tight transition whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20";
const ITEM_ACTIVE_CLASS = "bg-white text-foreground shadow-sm";
const ITEM_INACTIVE_CLASS = "text-slate-600 hover:text-foreground disabled:opacity-50";

export function SegmentedNav({ items, activeId, ariaLabel, className }: SegmentedNavProps) {
  return (
    <nav aria-label={ariaLabel} className={cn(CONTAINER_CLASS, className)}>
      {items.map((item) => {
        const isActive = item.id === activeId;
        const itemClass = cn(ITEM_BASE_CLASS, isActive ? ITEM_ACTIVE_CLASS : ITEM_INACTIVE_CLASS);

        if ("href" in item && item.href !== undefined) {
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={itemClass}
            >
              {item.label}
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            disabled={item.disabled}
            aria-pressed={isActive}
            className={itemClass}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
