/**
 * Design System — Color Tokens
 *
 * Fuente de verdad para colores del DS.
 * ⚠️  Sincronizar con el bloque :root de globals.css si se modifica este archivo.
 *
 * Uso en componentes: clases Tailwind `text-ds-*` / `bg-ds-*`
 * Definidas en tailwind.config.ts vía theme.extend.colors
 */

export const dsColors = {
  // Slate scale — sincronizado con --slate-* en globals.css
  slate: {
    50:  "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
  },

  // Módulos semánticos — apuntan a CSS vars para respetar tema claro/oscuro
  green:  { base: "var(--green)",  "050": "var(--green-050)",  "700": "var(--green-700)"  },
  red:    { base: "var(--red)",    "050": "var(--red-050)",    "700": "var(--red-700)"    },
  amber:  { base: "var(--amber)",  "050": "var(--amber-050)",  "700": "var(--amber-700)"  },
  blue:   { base: "var(--blue)",   "050": "var(--blue-050)",   "700": "var(--blue-700)"   },
  indigo: { base: "var(--indigo)", "050": "var(--indigo-050)", "700": "var(--indigo-700)" },
  teal:   { base: "var(--teal)",   "050": "var(--teal-050)",   "700": "var(--teal-700)"   },
  purple: { base: "var(--purple)", "050": "var(--purple-050)", "700": "var(--purple-700)" },
  pink:   { base: "var(--pink)",   "050": "var(--pink-050)",   "700": "var(--pink-700)"   },
} as const;
