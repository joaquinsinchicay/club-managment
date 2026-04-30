import { describe, expect, it } from "vitest";

import {
  SETTLEMENT_TONES,
  formatAmount,
  formatBytes,
  formatIsoDate,
  formatMonthYear,
  formatPercent,
  resolvePaymentTypeLabel,
  resolveRemunerationTypeLabel,
  todayIso,
} from "./contract-detail-helpers";

describe("formatMonthYear", () => {
  it("formatea ISO date con mes corto + año", () => {
    expect(formatMonthYear("2026-04-29")).toBe("Abr 2026");
    expect(formatMonthYear("2026-12-01")).toBe("Dic 2026");
    expect(formatMonthYear("2026-01-01")).toBe("Ene 2026");
  });

  it("acepta ISO completo (con tiempo)", () => {
    expect(formatMonthYear("2026-04-29T10:00:00Z")).toBe("Abr 2026");
  });

  it("retorna '—' para null/undefined/empty", () => {
    expect(formatMonthYear(null)).toBe("—");
    expect(formatMonthYear(undefined)).toBe("—");
    expect(formatMonthYear("")).toBe("—");
  });

  it("retorna value original para fecha malformada", () => {
    expect(formatMonthYear("not-a-date")).toBe("not-a-date");
  });
});

describe("formatBytes", () => {
  it("retorna B para valores < 1KB", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("retorna KB para valores entre 1KB y 1MB", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(1024 * 1023)).toBe("1023.0 KB");
  });

  it("retorna MB para valores >= 1MB", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(1024 * 1024 * 5.5)).toBe("5.5 MB");
  });
});

describe("formatAmount", () => {
  it("formatea con currency code", () => {
    expect(formatAmount(1234.5, "ARS")).toMatch(/1\.234,50/);
  });

  it("retorna '—' para null/undefined", () => {
    expect(formatAmount(null, "ARS")).toBe("—");
    expect(formatAmount(undefined, "ARS")).toBe("—");
  });
});

describe("formatIsoDate", () => {
  it("convierte ISO YYYY-MM-DD a DD/MM/YYYY", () => {
    expect(formatIsoDate("2026-04-29")).toBe("29/04/2026");
    expect(formatIsoDate("2026-12-31T23:59:00Z")).toBe("31/12/2026");
  });

  it("retorna '—' para null/undefined", () => {
    expect(formatIsoDate(null)).toBe("—");
    expect(formatIsoDate(undefined)).toBe("—");
  });

  it("retorna value original si no parsea", () => {
    expect(formatIsoDate("garbage")).toBe("garbage");
  });
});

describe("formatPercent", () => {
  it("agrega signo + cuando positivo", () => {
    expect(formatPercent(5.5)).toMatch(/^\+5,5%/);
    expect(formatPercent(0)).toMatch(/^\+0,0%/);
  });

  it("preserva signo - cuando negativo", () => {
    expect(formatPercent(-3.2)).toMatch(/^-3,2%/);
  });

  it("formatea con 1 decimal forzado", () => {
    expect(formatPercent(5)).toMatch(/^\+5,0%$/);
    expect(formatPercent(5.123)).toMatch(/^\+5,1%$/);
  });
});

describe("todayIso", () => {
  it("retorna fecha en formato YYYY-MM-DD", () => {
    const result = todayIso();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("resolvePaymentTypeLabel", () => {
  it("retorna null para input null/empty", () => {
    expect(resolvePaymentTypeLabel(null)).toBeNull();
    expect(resolvePaymentTypeLabel("")).toBeNull();
  });

  it("retorna el raw como fallback si la key no existe", () => {
    // Para keys desconocidas devuelve el raw input.
    expect(resolvePaymentTypeLabel("unknown_key")).toBe("unknown_key");
  });
});

describe("resolveRemunerationTypeLabel", () => {
  it("retorna null para input null/empty", () => {
    expect(resolveRemunerationTypeLabel(null)).toBeNull();
  });

  it("retorna raw como fallback", () => {
    expect(resolveRemunerationTypeLabel("xyz_unknown")).toBe("xyz_unknown");
  });
});

describe("SETTLEMENT_TONES", () => {
  it("define los 4 estados conocidos de settlement", () => {
    expect(SETTLEMENT_TONES).toHaveProperty("generada");
    expect(SETTLEMENT_TONES).toHaveProperty("aprobada_rrhh");
    expect(SETTLEMENT_TONES).toHaveProperty("pagada");
    expect(SETTLEMENT_TONES).toHaveProperty("anulada");
  });

  it("usa tones del DS para cada estado", () => {
    expect(SETTLEMENT_TONES.generada.tone).toBe("warning");
    expect(SETTLEMENT_TONES.pagada.tone).toBe("income");
    expect(SETTLEMENT_TONES.aprobada_rrhh.tone).toBe("info");
    expect(SETTLEMENT_TONES.anulada.tone).toBe("neutral");
  });
});
