"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { formatLocalizedAmount } from "@/lib/amounts";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────────────
 * DataTable — primitivo canónico de listas tabulares.
 *
 * Mobile-first: el shell exterior es único (rounded-shell + bg-card), las
 * filas siempre son planas con divider. En desktop (≥ md) el contenido de la
 * fila puede usar CSS grid si se setea `gridColumns`, y un header opcional
 * comparte la misma plantilla de columnas.
 *
 * Principios:
 *  - Tokens únicamente (radios / tipografía / sombras desde tailwind.config)
 *  - Sin CVA. Helpers + cn() al estilo Button / Modal.
 *  - Sin escape-hatch implícito: className opcional en cada nivel.
 * ────────────────────────────────────────────────────────────────────────── */

type Density = "compact" | "comfortable";
type CellAlign = "left" | "right" | "center";

const rowPaddingClasses: Record<Density, string> = {
  compact: "px-4 py-3",
  comfortable: "px-4 py-4 md:px-5",
};

const rowTextClasses: Record<Density, string> = {
  compact: "text-label",
  comfortable: "text-body",
};

const alignClasses: Record<CellAlign, string> = {
  left: "text-left justify-self-start",
  right: "text-right justify-self-end",
  center: "text-center justify-self-center",
};

/* ── DataTable root ──────────────────────────────────────────────────────── */

type DataTableContextValue = {
  density: Density;
  gridColumns?: string;
};

type DataTableProps = HTMLAttributes<HTMLDivElement> & {
  density?: Density;
  /** grid-template-columns aplicado en md+ a `DataTableHeader` y `DataTableRow`. */
  gridColumns?: string;
};

export function DataTable({
  density = "comfortable",
  gridColumns,
  className,
  children,
  ...rest
}: DataTableProps) {
  return (
    <div
      {...rest}
      data-density={density}
      data-grid-columns={gridColumns ? "true" : undefined}
      className={cn(
        "overflow-hidden rounded-shell border border-border bg-card",
        className,
      )}
      style={
        gridColumns
          ? ({ "--data-table-grid": gridColumns } as React.CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}

/* ── Header (desktop-only) ──────────────────────────────────────────────── */

type DataTableHeaderProps = HTMLAttributes<HTMLDivElement>;

export function DataTableHeader({ className, children, ...rest }: DataTableHeaderProps) {
  return (
    <div
      {...rest}
      className={cn(
        "hidden border-b border-border/60 bg-secondary/20 px-4 py-3 md:grid md:items-center md:gap-4 md:px-5",
        className,
      )}
      style={{ gridTemplateColumns: "var(--data-table-grid)" }}
    >
      {children}
    </div>
  );
}

type DataTableHeadCellProps = HTMLAttributes<HTMLSpanElement> & {
  align?: CellAlign;
};

export function DataTableHeadCell({
  align = "left",
  className,
  children,
  ...rest
}: DataTableHeadCellProps) {
  return (
    <span
      {...rest}
      className={cn(
        "text-eyebrow font-semibold uppercase text-muted-foreground",
        alignClasses[align],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Body ───────────────────────────────────────────────────────────────── */

type DataTableBodyProps = HTMLAttributes<HTMLDivElement>;

export function DataTableBody({ className, children, ...rest }: DataTableBodyProps) {
  return (
    <div {...rest} className={cn("divide-y divide-border/60", className)}>
      {children}
    </div>
  );
}

/* ── Row ────────────────────────────────────────────────────────────────── */

type DataTableRowCommon = {
  density?: Density;
  /** Cuando es true, `DataTableActions` hace reveal on hover/focus. */
  hoverReveal?: boolean;
  /** Si el `DataTable` tiene `gridColumns`, la fila usa ese grid en md+. */
  useGrid?: boolean;
};

type DataTableRowDivProps = HTMLAttributes<HTMLDivElement> &
  DataTableRowCommon & { as?: "div" | "article" };

type DataTableRowButtonProps = ComponentPropsWithoutRef<"button"> &
  DataTableRowCommon & { as: "button" };

type DataTableRowProps = DataTableRowDivProps | DataTableRowButtonProps;

function resolveRowClassName({
  density = "comfortable",
  hoverReveal = false,
  useGrid = true,
  interactive,
  className,
}: {
  density?: Density;
  hoverReveal?: boolean;
  useGrid?: boolean;
  interactive: boolean;
  className?: string;
}) {
  return cn(
    "block w-full text-left transition-colors",
    rowPaddingClasses[density],
    rowTextClasses[density],
    interactive && "cursor-pointer hover:bg-secondary/40 focus-visible:bg-secondary/40 focus:outline-none",
    !interactive && "hover:bg-secondary/30",
    hoverReveal && "group",
    useGrid &&
      "md:grid md:items-center md:gap-4 md:[grid-template-columns:var(--data-table-grid)]",
    className,
  );
}

export const DataTableRow = forwardRef<
  HTMLElement,
  DataTableRowProps
>(function DataTableRow(props, ref) {
  const {
    density = "comfortable",
    hoverReveal = false,
    useGrid = true,
    className,
    children,
    ...rest
  } = props as DataTableRowProps & { children?: ReactNode };

  const resolvedClass = resolveRowClassName({
    density,
    hoverReveal,
    useGrid,
    interactive: "as" in props && props.as === "button",
    className,
  });

  if ("as" in props && props.as === "button") {
    const { as: _as, ...btnRest } = rest as DataTableRowButtonProps;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={btnRest.type ?? "button"}
        className={resolvedClass}
        {...btnRest}
      >
        {children}
      </button>
    );
  }

  const { as = "div", ...divRest } = rest as DataTableRowDivProps;
  const Tag = as;
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={resolvedClass}
      {...(divRest as HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </Tag>
  );
});

/* ── Cell ───────────────────────────────────────────────────────────────── */

type DataTableCellProps = HTMLAttributes<HTMLDivElement> & {
  align?: CellAlign;
};

export function DataTableCell({
  align = "left",
  className,
  children,
  ...rest
}: DataTableCellProps) {
  return (
    <div
      {...rest}
      className={cn("min-w-0", alignClasses[align], className)}
    >
      {children}
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────────────── */

type DataTableEmptyProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function DataTableEmpty({ title, description, icon, action, className }: DataTableEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-shell border border-dashed border-border bg-card px-6 py-8 text-center",
        className,
      )}
    >
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <p className="text-label font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="text-small text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/* ── Chip ───────────────────────────────────────────────────────────────── */

type ChipTone = "neutral" | "income" | "expense" | "warning" | "info";

const chipToneClasses: Record<ChipTone, string> = {
  neutral: "bg-secondary/60 text-foreground",
  income: "bg-ds-green-050 text-ds-green-700",
  expense: "bg-ds-red-050 text-ds-red-700",
  warning: "bg-ds-amber-050 text-ds-amber-700",
  info: "bg-ds-blue-050 text-ds-blue-700",
};

type DataTableChipProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: ChipTone;
};

export function DataTableChip({
  tone = "neutral",
  className,
  children,
  ...rest
}: DataTableChipProps) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex items-center rounded-chip px-2 py-0.5 text-small font-semibold",
        chipToneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Amount ─────────────────────────────────────────────────────────────── */

type AmountType = "ingreso" | "egreso" | "neutral";

const amountToneClasses: Record<AmountType, string> = {
  ingreso: "text-ds-green-700",
  egreso: "text-ds-red-700",
  neutral: "text-foreground",
};

const amountSignMap: Record<AmountType, string> = {
  ingreso: "+",
  egreso: "-",
  neutral: "",
};

type DataTableAmountProps = HTMLAttributes<HTMLSpanElement> & {
  type: AmountType;
  currencyCode: string;
  amount: number;
  /** Tamaño display para montos destacados (p. ej. MovementList desktop). */
  size?: "inline" | "display";
};

export function DataTableAmount({
  type,
  currencyCode,
  amount,
  size = "inline",
  className,
  ...rest
}: DataTableAmountProps) {
  const symbol = currencyCode === "ARS" ? "$" : currencyCode === "USD" ? "US$" : currencyCode;
  const sign = amountSignMap[type];
  const sizeClass =
    size === "display"
      ? "text-[1.7rem] leading-none tracking-tight"
      : "text-label";

  return (
    <span
      {...rest}
      className={cn(
        "font-semibold tabular-nums whitespace-nowrap",
        sizeClass,
        amountToneClasses[type],
        className,
      )}
    >
      {sign ? `${sign} ` : ""}
      {symbol} {formatLocalizedAmount(amount)}
    </span>
  );
}

/* ── Actions (hover-reveal wrapper) ─────────────────────────────────────── */

type DataTableActionsProps = HTMLAttributes<HTMLDivElement> & {
  /** Si false, las acciones quedan visibles siempre (no se ocultan). */
  reveal?: boolean;
};

export function DataTableActions({
  reveal = true,
  className,
  children,
  ...rest
}: DataTableActionsProps) {
  return (
    <div
      {...rest}
      className={cn(
        "flex shrink-0 items-center gap-2",
        reveal &&
          "opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
