import { describe, expect, it } from "vitest";

import {
  formatLocalizedAmount,
  formatLocalizedAmountInputOnBlur,
  formatLocalizedAmountInputOnFocus,
  parseLocalizedAmount,
  sanitizeLocalizedAmountInput,
} from "./amounts";

describe("formatLocalizedAmount", () => {
  it("formatea con 2 decimales y separador es-AR", () => {
    expect(formatLocalizedAmount(1234567.89)).toBe("1.234.567,89");
    expect(formatLocalizedAmount(0)).toBe("0,00");
    expect(formatLocalizedAmount(-50.5)).toBe("-50,50");
  });

  it("trata valores no-finitos como 0", () => {
    expect(formatLocalizedAmount(NaN)).toBe("0,00");
    expect(formatLocalizedAmount(Infinity)).toBe("0,00");
    expect(formatLocalizedAmount(-Infinity)).toBe("0,00");
  });
});

describe("parseLocalizedAmount", () => {
  it("parsea formato es-AR canónico", () => {
    expect(parseLocalizedAmount("1.234.567,89")).toBe(1234567.89);
    expect(parseLocalizedAmount("100")).toBe(100);
    expect(parseLocalizedAmount("100,5")).toBe(100.5);
    expect(parseLocalizedAmount("-50,25")).toBe(-50.25);
  });

  it("acepta también formato plano con punto decimal", () => {
    expect(parseLocalizedAmount("1234.56")).toBe(1234.56);
    expect(parseLocalizedAmount("0.01")).toBe(0.01);
  });

  it("rechaza inputs vacíos o ambiguos", () => {
    expect(parseLocalizedAmount("")).toBeNull();
    expect(parseLocalizedAmount("   ")).toBeNull();
    expect(parseLocalizedAmount("abc")).toBeNull();
    expect(parseLocalizedAmount("1.23.45")).toBeNull(); // separadores de miles inválidos
  });

  it("trim whitespace internos y externos", () => {
    expect(parseLocalizedAmount("  100,5  ")).toBe(100.5);
    expect(parseLocalizedAmount("1 000,5")).toBe(1000.5);
  });
});

describe("sanitizeLocalizedAmountInput", () => {
  it("preserva sólo dígitos y una sola coma decimal", () => {
    expect(sanitizeLocalizedAmountInput("1.234,56")).toBe("1234,56");
    expect(sanitizeLocalizedAmountInput("abc100,50def")).toBe("100,50");
  });

  it("colapsa múltiples comas en una sola", () => {
    expect(sanitizeLocalizedAmountInput("1,2,3")).toBe("1,23");
  });

  it("retorna parte entera cuando no hay coma", () => {
    expect(sanitizeLocalizedAmountInput("12345")).toBe("12345");
  });
});

describe("formatLocalizedAmountInputOnBlur", () => {
  it("formatea valor parseable a 2 decimales con miles", () => {
    expect(formatLocalizedAmountInputOnBlur("1234")).toBe("1.234,00");
    expect(formatLocalizedAmountInputOnBlur("1234,5")).toBe("1.234,50");
  });

  it("retorna sanitizado si no parsea", () => {
    expect(formatLocalizedAmountInputOnBlur("1,2,3,4")).toBe("1,234");
  });

  it("retorna vacío para input vacío", () => {
    expect(formatLocalizedAmountInputOnBlur("")).toBe("");
    expect(formatLocalizedAmountInputOnBlur("   ")).toBe("");
  });
});

describe("formatLocalizedAmountInputOnFocus", () => {
  it("colapsa a forma editable sin separadores de miles ni ceros trailing", () => {
    expect(formatLocalizedAmountInputOnFocus("1.234,50")).toBe("1234,5");
    expect(formatLocalizedAmountInputOnFocus("1.000,00")).toBe("1000");
  });

  it("retorna vacío para input vacío", () => {
    expect(formatLocalizedAmountInputOnFocus("")).toBe("");
  });
});
