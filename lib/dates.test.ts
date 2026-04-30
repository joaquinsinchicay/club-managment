import { describe, expect, it } from "vitest";

import {
  formatDateRange,
  formatLastMovementDate,
  formatLocalizedDateLabel,
  formatMovementGroupDate,
  formatMovementDateTime,
  formatSessionDateLong,
  formatSessionTime,
} from "./dates";

describe("formatMovementGroupDate", () => {
  it("formatea date-only ISO a long es-AR", () => {
    // "29 de abril de 2026"
    const result = formatMovementGroupDate("2026-04-29");
    expect(result).toMatch(/29.*abril.*2026/i);
  });

  it("retorna el value original si la fecha es inválida", () => {
    expect(formatMovementGroupDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatLastMovementDate", () => {
  it("formatea ISO completo a 'dd/mm hh:mm' con padding", () => {
    expect(formatLastMovementDate("2026-04-05T08:03:00")).toBe("05/04 08:03");
    expect(formatLastMovementDate("2026-12-31T23:59:00")).toBe("31/12 23:59");
  });

  it("retorna string vacío si la fecha es inválida", () => {
    expect(formatLastMovementDate("garbage")).toBe("");
  });
});

describe("formatSessionTime", () => {
  it("retorna hora:minuto en formato 24h", () => {
    expect(formatSessionTime("2026-04-29T14:32:00")).toBe("14:32");
    expect(formatSessionTime("2026-04-29T08:05:00")).toBe("08:05");
    expect(formatSessionTime("2026-04-29T00:00:00")).toBe("00:00");
    expect(formatSessionTime("2026-04-29T23:59:00")).toBe("23:59");
  });

  it("retorna null para input null o inválido", () => {
    expect(formatSessionTime(null)).toBeNull();
    expect(formatSessionTime("garbage")).toBeNull();
  });
});

describe("formatLocalizedDateLabel", () => {
  it("formatea ISO date a dd/mm/yyyy", () => {
    expect(formatLocalizedDateLabel("2026-04-05")).toBe("05/04/2026");
    expect(formatLocalizedDateLabel("2026-12-31")).toBe("31/12/2026");
  });

  it("retorna el value original para fecha inválida", () => {
    expect(formatLocalizedDateLabel("not-a-date")).toBe("not-a-date");
  });
});

describe("formatSessionDateLong", () => {
  it("formatea con weekday capitalizado", () => {
    const result = formatSessionDateLong("2026-04-29");
    // "Miércoles, 29 abr. 2026" — el weekday debe estar capitalizado
    expect(result.charAt(0)).toBe(result.charAt(0).toUpperCase());
    expect(result).toMatch(/29/);
    expect(result).toMatch(/2026/);
  });

  it("retorna value original para fecha inválida", () => {
    expect(formatSessionDateLong("garbage")).toBe("garbage");
  });
});

describe("formatDateRange", () => {
  it("formatea rango con flecha cuando hay endDate", () => {
    const result = formatDateRange("2026-04-29", "2026-06-30");
    expect(result).toMatch(/→/);
    expect(result).toMatch(/29/);
    expect(result).toMatch(/30/);
  });

  it("formatea con 'Sin cierre' cuando no hay endDate", () => {
    const result = formatDateRange("2026-04-29", null);
    expect(result).toMatch(/Sin cierre/);
    expect(result).not.toMatch(/→/);
  });

  it("graceful con startDate inválida (fallback al string original)", () => {
    const result = formatDateRange("garbage", null);
    expect(result).toContain("garbage");
  });
});

describe("formatMovementDateTime", () => {
  it("formatea ISO a dd/mm/yy hh:mm con padding", () => {
    const result = formatMovementDateTime("2026-04-05T08:03:00");
    // formato es-AR con 2-digit explícito, debe contener dia/mes/año2 + hora
    expect(result).toMatch(/05/);
    expect(result).toMatch(/04/);
    expect(result).toMatch(/26/);
    expect(result).toMatch(/08:03/);
  });

  it("retorna value original si fecha inválida", () => {
    expect(formatMovementDateTime("garbage")).toBe("garbage");
  });
});
