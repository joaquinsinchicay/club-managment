import { describe, expect, it } from "vitest";

import type { PayrollSettlement } from "@/lib/domain/payroll-settlement";
import {
  computeSelectionMode,
  findLatestPeriod,
  formatAmount,
  formatPeriodLong,
  shiftPeriod,
} from "./settlements-list-helpers";

function fakeSettlement(overrides: Partial<PayrollSettlement> = {}): PayrollSettlement {
  return {
    id: "s-1",
    periodYear: 2026,
    periodMonth: 4,
    status: "generada",
    totalAmount: 100,
    baseAmount: 100,
    adjustmentsTotal: 0,
    staffMemberName: "Test",
    salaryStructureName: null,
    salaryStructureRole: null,
    salaryStructureActivityName: null,
    requiresHoursInput: false,
    returnedByRole: null,
    remunerationType: "mensual",
    hoursWorked: null,
    classesWorked: null,
    notes: null,
    ...overrides,
  } as PayrollSettlement;
}

describe("formatPeriodLong", () => {
  it("retorna 'Mes Año' en español", () => {
    expect(formatPeriodLong(2026, 4)).toBe("Abril 2026");
    expect(formatPeriodLong(2026, 1)).toBe("Enero 2026");
    expect(formatPeriodLong(2024, 12)).toBe("Diciembre 2024");
  });
});

describe("shiftPeriod", () => {
  it("desplaza meses dentro del mismo año", () => {
    expect(shiftPeriod({ year: 2026, month: 4 }, 1)).toEqual({ year: 2026, month: 5 });
    expect(shiftPeriod({ year: 2026, month: 4 }, -1)).toEqual({ year: 2026, month: 3 });
  });

  it("cruza fronteras de año al sumar", () => {
    expect(shiftPeriod({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftPeriod({ year: 2026, month: 11 }, 3)).toEqual({ year: 2027, month: 2 });
  });

  it("cruza fronteras de año al restar", () => {
    expect(shiftPeriod({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftPeriod({ year: 2026, month: 2 }, -3)).toEqual({ year: 2025, month: 11 });
  });

  it("delta=0 retorna mismo periodo", () => {
    expect(shiftPeriod({ year: 2026, month: 4 }, 0)).toEqual({ year: 2026, month: 4 });
  });
});

describe("findLatestPeriod", () => {
  it("retorna el periodo más reciente", () => {
    const settlements = [
      fakeSettlement({ periodYear: 2026, periodMonth: 1 }),
      fakeSettlement({ periodYear: 2026, periodMonth: 4 }),
      fakeSettlement({ periodYear: 2025, periodMonth: 12 }),
    ];
    expect(findLatestPeriod(settlements)).toEqual({ year: 2026, month: 4 });
  });

  it("retorna null para input vacío", () => {
    expect(findLatestPeriod([])).toBeNull();
  });

  it("ordena por año primero, luego por mes", () => {
    const settlements = [
      fakeSettlement({ periodYear: 2025, periodMonth: 12 }),
      fakeSettlement({ periodYear: 2026, periodMonth: 1 }),
    ];
    expect(findLatestPeriod(settlements)).toEqual({ year: 2026, month: 1 });
  });
});

describe("formatAmount", () => {
  it("formatea con currency code es-AR", () => {
    expect(formatAmount(1234.5, "ARS")).toMatch(/1\.234,50/);
    expect(formatAmount(0, "USD")).toMatch(/0,00/);
  });

  it("retorna '—' para null/undefined", () => {
    expect(formatAmount(null, "ARS")).toBe("—");
    expect(formatAmount(undefined, "ARS")).toBe("—");
  });

  it("graceful con currency code inválido (fallback)", () => {
    const result = formatAmount(100, "XYZ_INVALID");
    expect(result).toContain("100");
  });
});

describe("computeSelectionMode", () => {
  it("'none' cuando no hay selección", () => {
    expect(computeSelectionMode([])).toBe("none");
  });

  it("'approve' cuando todas son 'generada'", () => {
    const items = [
      fakeSettlement({ status: "generada" }),
      fakeSettlement({ status: "generada" }),
    ];
    expect(computeSelectionMode(items)).toBe("approve");
  });

  it("'pay' cuando todas son 'aprobada_rrhh'", () => {
    const items = [
      fakeSettlement({ status: "aprobada_rrhh" }),
      fakeSettlement({ status: "aprobada_rrhh" }),
    ];
    expect(computeSelectionMode(items)).toBe("pay");
  });

  it("'mixed' cuando hay estados distintos", () => {
    const items = [
      fakeSettlement({ status: "generada" }),
      fakeSettlement({ status: "aprobada_rrhh" }),
    ];
    expect(computeSelectionMode(items)).toBe("mixed");
  });

  it("'mixed' cuando hay status que no permite acción bulk", () => {
    const items = [
      fakeSettlement({ status: "generada" }),
      fakeSettlement({ status: "pagada" }),
    ];
    expect(computeSelectionMode(items)).toBe("mixed");
  });
});
