import type { Config } from "tailwindcss";

import { dsColors }                    from "./lib/tokens/colors";
import { dsRadius }                    from "./lib/tokens/radii";
import { dsShadow }                    from "./lib/tokens/shadows";
import { dsFontSize, dsLetterSpacing } from "./lib/tokens/typography";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      // ── shadcn/ui HSL tokens (no modificar) ───────────────────────────────
      colors: {
        background:                 "hsl(var(--background))",
        foreground:                 "hsl(var(--foreground))",
        card:                       "hsl(var(--card))",
        "card-foreground":          "hsl(var(--card-foreground))",
        primary:                    "hsl(var(--primary))",
        "primary-foreground":       "hsl(var(--primary-foreground))",
        secondary:                  "hsl(var(--secondary))",
        "secondary-foreground":     "hsl(var(--secondary-foreground))",
        border:                     "hsl(var(--border))",
        outline:                    "hsl(var(--outline))",
        muted:                      "hsl(var(--muted))",
        "muted-foreground":         "hsl(var(--muted-foreground))",
        accent:                     "hsl(var(--accent))",
        "accent-foreground":        "hsl(var(--accent-foreground))",
        destructive:                "hsl(var(--destructive))",
        success:                    "hsl(var(--success))",
        warning:                    "hsl(var(--warning))",
        "surface-container-low":    "hsl(var(--surface-container-low))",
        "surface-container":        "hsl(var(--surface-container))",
        "surface-container-high":   "hsl(var(--surface-container-high))",
        "surface-dim":              "hsl(var(--surface-dim))",

        // ── DS slate scale ─────────────────────────────────────────────────
        "ds-slate-50":  dsColors.slate[50],
        "ds-slate-100": dsColors.slate[100],
        "ds-slate-200": dsColors.slate[200],
        "ds-slate-300": dsColors.slate[300],
        "ds-slate-400": dsColors.slate[400],
        "ds-slate-500": dsColors.slate[500],
        "ds-slate-600": dsColors.slate[600],
        "ds-slate-700": dsColors.slate[700],
        "ds-slate-800": dsColors.slate[800],
        "ds-slate-900": dsColors.slate[900],

        // ── DS módulos semánticos (CSS vars → respetan tema claro/oscuro) ──
        "ds-green":       dsColors.green.base,
        "ds-green-050":   dsColors.green["050"],
        "ds-green-700":   dsColors.green["700"],
        "ds-red":         dsColors.red.base,
        "ds-red-050":     dsColors.red["050"],
        "ds-red-700":     dsColors.red["700"],
        "ds-amber":       dsColors.amber.base,
        "ds-amber-050":   dsColors.amber["050"],
        "ds-amber-700":   dsColors.amber["700"],
        "ds-blue":        dsColors.blue.base,
        "ds-blue-050":    dsColors.blue["050"],
        "ds-blue-700":    dsColors.blue["700"],
        "ds-indigo":      dsColors.indigo.base,
        "ds-indigo-050":  dsColors.indigo["050"],
        "ds-indigo-700":  dsColors.indigo["700"],
        "ds-teal":        dsColors.teal.base,
        "ds-teal-050":    dsColors.teal["050"],
        "ds-teal-700":    dsColors.teal["700"],
        "ds-purple":      dsColors.purple.base,
        "ds-purple-050":  dsColors.purple["050"],
        "ds-purple-700":  dsColors.purple["700"],
        "ds-pink":        dsColors.pink.base,
        "ds-pink-050":    dsColors.pink["050"],
        "ds-pink-700":    dsColors.pink["700"],
      },

      // ── DS border radius ────────────────────────────────────────────────
      // rounded-chip | rounded-btn | rounded-card | rounded-shell | rounded-dialog | rounded-toast
      borderRadius: {
        xl:     "0.875rem",
        "2xl":  "1rem",
        ...dsRadius,
      },

      // ── DS typography scale ─────────────────────────────────────────────
      // text-eyebrow | text-meta | text-small | text-body | text-card-title
      // text-h3 | text-h2 | text-h1 | text-display | text-mono
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fontSize: { ...(dsFontSize as unknown as Record<string, any>) },

      // ── DS letter spacing ───────────────────────────────────────────────
      // tracking-eyebrow | tracking-badge | tracking-label | tracking-chip | ...
      letterSpacing: { ...dsLetterSpacing },

      // ── DS shadows ──────────────────────────────────────────────────────
      // shadow-xs | shadow-sm | shadow-md | shadow-pop | shadow-soft
      boxShadow: { ...dsShadow },
    }
  },
  plugins: []
};

export default config;
