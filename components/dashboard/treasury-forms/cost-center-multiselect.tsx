"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────────────
 * CostCenterMultiSelect — dropdown con checkboxes interno (US-53).
 *
 * Reemplaza la lista plana de checkboxes que se renderizaba antes en los
 * forms de creacion / edicion de movimientos por un trigger compacto que
 * abre un panel desplegable. Sigue serializando como `cost_center_ids`
 * (multiples hidden inputs) + flag `cost_centers_present` para que la
 * action server-side sincronice los links sin asumirlos por defecto.
 * ────────────────────────────────────────────────────────────────────────── */

export type CostCenterOption = {
  id: string;
  name: string;
  type: string;
  currencyCode: string;
  status: "activo" | "inactivo";
};

export type CostCenterMultiSelectProps = {
  options: CostCenterOption[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
  formStateCurrency: string;
  emptyOptionsLabel: string;
  placeholder: string;
  selectedSummary: (count: number) => string;
  currencyMismatchTitle: string;
};

export function CostCenterMultiSelect({
  options,
  selectedIds,
  onChange,
  formStateCurrency,
  emptyOptionsLabel,
  placeholder,
  selectedSummary,
  currencyMismatchTitle
}: CostCenterMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  const selectedCount = selectedIds.length;
  const triggerLabel = selectedCount === 0 ? placeholder : selectedSummary(selectedCount);
  const isPlaceholder = selectedCount === 0;

  return (
    <div ref={wrapperRef} className="relative">
      {/* Hidden flag + multiples hidden inputs para FormData (compat backend). */}
      <input type="hidden" name="cost_centers_present" value="1" />
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="cost_center_ids" value={id} />
      ))}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={options.length === 0}
        className={cn(
          "min-h-11 w-full rounded-card border border-border bg-card px-4 py-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10",
          "flex items-center justify-between gap-2",
          isPlaceholder ? "text-muted-foreground" : "text-foreground",
          options.length === 0 && "cursor-not-allowed opacity-60"
        )}
      >
        <span className="truncate">{options.length === 0 ? emptyOptionsLabel : triggerLabel}</span>
        <svg
          className={cn("size-4 shrink-0 text-muted-foreground transition", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && options.length > 0 ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-card border border-border bg-card p-1 shadow-lg"
        >
          {options.map((cc) => {
            const checked = selectedIds.includes(cc.id);
            const isInactive = cc.status === "inactivo";
            // Inactivos no seleccionados: no se pueden tildar (impedir nuevos
            // links a CCs cerrados). Inactivos ya seleccionados se pueden
            // destildar para desvincular si el usuario quiere.
            const lockNew = isInactive && !checked;
            const currencyMismatch =
              checked && Boolean(formStateCurrency) && cc.currencyCode !== formStateCurrency;
            return (
              <label
                key={cc.id}
                role="option"
                aria-selected={checked}
                aria-disabled={lockNew}
                title={lockNew ? "CC inactivo — no se puede agregar" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-3 rounded-btn px-3 py-2 text-sm text-foreground transition",
                  lockNew ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-secondary-pressed"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={lockNew}
                  onChange={() => toggle(cc.id)}
                  className="size-4 rounded border-border text-foreground focus:ring-foreground disabled:cursor-not-allowed"
                />
                <span className="flex-1 truncate font-medium">{cc.name}</span>
                {isInactive ? (
                  <span className="rounded-xs bg-ds-slate-100 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
                    Inactivo
                  </span>
                ) : null}
                <span className="rounded-xs bg-ds-slate-100 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-eyebrow text-ds-slate-700">
                  {cc.type}
                </span>
                <span className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
                  {cc.currencyCode}
                </span>
                {currencyMismatch ? (
                  <span
                    className="rounded-xs bg-ds-amber-050 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-eyebrow text-ds-amber-700"
                    title={currencyMismatchTitle}
                  >
                    ⚠
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
