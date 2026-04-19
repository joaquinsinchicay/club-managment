/**
 * Design System — Typography Tokens
 *
 * Fuente de verdad para escala tipográfica del DS.
 * Importado por tailwind.config.ts → clases `text-eyebrow`, `text-meta`, etc.
 *
 * Cada entrada de dsFontSize sigue el formato [size, { fontWeight, letterSpacing, lineHeight }]
 * que Tailwind acepta en theme.fontSize para embeber las props asociadas.
 *
 * Uso: <span className="text-eyebrow uppercase text-ink-muted" />
 */

export const dsFontSize = {
  eyebrow:      ["10px", { fontWeight: "600", letterSpacing: "0.08em",  lineHeight: "1.2"  }],
  meta:         ["11px", { fontWeight: "400", letterSpacing: "0",       lineHeight: "1.4"  }],
  small:        ["12px", { fontWeight: "400", letterSpacing: "0",       lineHeight: "1.5"  }],
  label:        ["13px", { fontWeight: "600", letterSpacing: "-0.005em", lineHeight: "1.4" }],
  body:         ["14px", { fontWeight: "400", letterSpacing: "0",       lineHeight: "1.6"  }],
  "card-title": ["15px", { fontWeight: "600", letterSpacing: "-0.01em", lineHeight: "1.3"  }],
  h3:           ["16px", { fontWeight: "600", letterSpacing: "-0.01em", lineHeight: "1.3"  }],
  h4:           ["17px", { fontWeight: "700", letterSpacing: "-0.01em", lineHeight: "1.25" }],
  h2:           ["20px", { fontWeight: "700", letterSpacing: "-0.02em", lineHeight: "1.2"  }],
  h1:           ["24px", { fontWeight: "700", letterSpacing: "-0.02em", lineHeight: "1.15" }],
  display:      ["28px", { fontWeight: "800", letterSpacing: "-0.03em", lineHeight: "1.1"  }],
  mono:         ["13px", { fontWeight: "500", letterSpacing: "0",       lineHeight: "1.5"  }],
} as const;

export const dsLetterSpacing = {
  eyebrow:      "0.08em",
  badge:        "0.06em",
  label:        "0.04em",
  chip:         "0.03em",
  "eyebrow-sm": "0.06em",
  "wide-sm":    "0.02em",
  wider:        "0.10em",
} as const;
