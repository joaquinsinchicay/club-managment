/**
 * Design System — Shadow Tokens
 *
 * Fuente de verdad para sombras del DS.
 * Importado por tailwind.config.ts → clases `shadow-xs`, `shadow-sm`, `shadow-md`, etc.
 *
 * ⚠️  Sincronizar con --shadow-* en globals.css si se modifica este archivo.
 *
 * Uso: <div className="shadow-md" />
 * Nunca: <div style={{ boxShadow: "0 4px 12px ..." }} />
 */

export const dsShadow = {
  xs:   "0 1px 0 rgba(15,23,42,0.04)",
  sm:   "0 1px 2px rgba(15,23,42,0.06)",
  md:   "0 8px 40px -12px rgba(15,23,42,0.12)",
  pop:  "0 12px 40px -8px rgba(15,23,42,0.18)",
  // Preserva el valor original de tailwind.config.ts — 14 componentes lo usan
  soft: "0 10px 24px -18px rgba(15, 23, 42, 0.18)",
} as const;
