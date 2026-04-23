/**
 * Design System — Border Radius Tokens
 *
 * Fuente de verdad para radios de borde del DS.
 * Importado por tailwind.config.ts → clases `rounded-chip`, `rounded-btn`, etc.
 *
 * ⚠️  Sincronizar con --radius-* en globals.css si se modifica este archivo.
 *
 * Tabla de migración hardcoded → semántico:
 *   rounded-[4px]  → rounded-xs
 *   rounded-[6px]  → rounded-chip
 *   rounded-[8px]  → rounded-btn
 *   rounded-[10px] → rounded-card
 *   rounded-[12px] → rounded-card  (más cercano)
 *   rounded-[14px] → rounded-card  (rounded-xl "custom" → rounded-card 10px o container si hace falta más)
 *   rounded-xl     → rounded-card  (Tailwind "xl" quedó legacy; mapea a card)
 *   rounded-[18px] → rounded-shell
 *   rounded-[20px] → rounded-dialog
 *   rounded-[24px] → rounded-shell (6px más ceñido; decisión del DS)
 *   rounded-[28px] → rounded-toast
 */

export const dsRadius = {
  xs:     "4px",   // badges / micro-chips (currency codes, type codes inline)
  chip:   "6px",   // pills, badges, chips pequeños
  btn:    "8px",   // botones
  card:   "10px",  // cards, inputs, selects
  shell:  "18px",  // contenedores grandes
  dialog: "20px",  // modales / drawers
  toast:  "28px",  // toasts
} as const;
