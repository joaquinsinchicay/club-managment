import { describe, expect, it } from "vitest";

import {
  buildLastMovementByAccountId,
  buildMovementsWindowSubtitle,
  diffDaysInclusive,
  formatAccountIdentifier,
  formatAccountSubtitle,
  getAllMovementGroups,
  getMovementGroupsForAccount,
  getTotalBalances,
} from "./treasury-role-helpers";
import type {
  TreasuryAccount,
  TreasuryDashboardMovement,
  TreasuryRoleDashboard,
  TreasuryRoleDashboardMovementDateGroup,
} from "./domain/access";

function fakeAccount(overrides: Partial<TreasuryAccount> = {}): TreasuryAccount {
  return {
    id: "acc-1",
    name: "Caja Pesos",
    accountType: "efectivo",
    bankEntity: null,
    bankAccountSubtype: null,
    cbuCvu: null,
    accountNumber: null,
    currencies: ["ARS"],
    visibleForSecretaria: false,
    visibleForTesoreria: true,
    isActive: true,
    ...overrides,
  } as TreasuryAccount;
}

describe("getTotalBalances", () => {
  it("agrega saldos por moneda y ordena con ARS primero", () => {
    const accounts: TreasuryRoleDashboard["accounts"] = [
      {
        accountId: "a",
        name: "A",
        balances: [
          { currencyCode: "USD", amount: 100 },
          { currencyCode: "ARS", amount: 1000 },
        ],
        hasPendingMovements: false,
        hasConciliatedMovements: false,
      },
      {
        accountId: "b",
        name: "B",
        balances: [{ currencyCode: "ARS", amount: 500 }],
        hasPendingMovements: false,
        hasConciliatedMovements: false,
      },
    ];

    const result = getTotalBalances(accounts);
    expect(result).toEqual([
      { currencyCode: "ARS", amount: 1500 },
      { currencyCode: "USD", amount: 100 },
    ]);
  });

  it("retorna array vacío para input vacío", () => {
    expect(getTotalBalances([])).toEqual([]);
  });

  it("ordena no-ARS alfabéticamente", () => {
    const accounts: TreasuryRoleDashboard["accounts"] = [
      {
        accountId: "a",
        name: "A",
        balances: [
          { currencyCode: "USD", amount: 1 },
          { currencyCode: "EUR", amount: 1 },
          { currencyCode: "BRL", amount: 1 },
        ],
        hasPendingMovements: false,
        hasConciliatedMovements: false,
      },
    ];

    const result = getTotalBalances(accounts);
    expect(result.map((r) => r.currencyCode)).toEqual(["BRL", "EUR", "USD"]);
  });
});

describe("getMovementGroupsForAccount", () => {
  const groups: TreasuryRoleDashboardMovementDateGroup[] = [
    {
      movementDate: "2026-04-05",
      accounts: [
        {
          accountId: "a",
          accountName: "A",
          movements: [{ movementId: "m1" } as TreasuryDashboardMovement],
        },
        {
          accountId: "b",
          accountName: "B",
          movements: [{ movementId: "m2" } as TreasuryDashboardMovement],
        },
      ],
    },
  ];

  it("filtra movimientos por accountId", () => {
    const result = getMovementGroupsForAccount(groups, "a");
    expect(result).toEqual([
      {
        movementDate: "2026-04-05",
        movements: [{ movementId: "m1" }],
      },
    ]);
  });

  it("retorna array vacío cuando accountId es null", () => {
    expect(getMovementGroupsForAccount(groups, null)).toEqual([]);
  });

  it("descarta grupos sin movimientos para esa cuenta", () => {
    const result = getMovementGroupsForAccount(groups, "no-existe");
    expect(result).toEqual([]);
  });
});

describe("getAllMovementGroups", () => {
  it("aplana movimientos de todas las cuentas en cada grupo", () => {
    const groups: TreasuryRoleDashboardMovementDateGroup[] = [
      {
        movementDate: "2026-04-05",
        accounts: [
          {
            accountId: "a",
            accountName: "A",
            movements: [{ movementId: "m1" } as TreasuryDashboardMovement],
          },
          {
            accountId: "b",
            accountName: "B",
            movements: [{ movementId: "m2" } as TreasuryDashboardMovement],
          },
        ],
      },
    ];

    const result = getAllMovementGroups(groups);
    expect(result).toEqual([
      {
        movementDate: "2026-04-05",
        movements: [{ movementId: "m1" }, { movementId: "m2" }],
      },
    ]);
  });
});

describe("formatAccountSubtitle", () => {
  it("para cuenta bancaria incluye banco + subtype + currency", () => {
    const account = fakeAccount({
      accountType: "bancaria",
      bankEntity: "Galicia",
      bankAccountSubtype: "caja_ahorro",
      currencies: ["ARS"],
    });
    const result = formatAccountSubtitle(account);
    expect(result).toContain("Galicia");
    expect(result).toContain("ARS");
  });

  it("para billetera virtual usa bankEntity como provider", () => {
    const account = fakeAccount({
      accountType: "billetera_virtual",
      bankEntity: "Mercado Pago",
      currencies: ["ARS"],
    });
    expect(formatAccountSubtitle(account)).toContain("Mercado Pago");
  });

  it("para efectivo muestra label específico", () => {
    const account = fakeAccount({ accountType: "efectivo", currencies: ["ARS"] });
    const result = formatAccountSubtitle(account);
    expect(result).not.toBeNull();
  });

  it("agrega 'Operada por Secretaría' cuando sólo es visible para Secretaría", () => {
    const account = fakeAccount({
      visibleForSecretaria: true,
      visibleForTesoreria: false,
    });
    const result = formatAccountSubtitle(account) ?? "";
    expect(result.toLowerCase()).toMatch(/secretar/i);
  });

  it("oculta currency cuando hay múltiples", () => {
    const account = fakeAccount({ currencies: ["ARS", "USD"] });
    const result = formatAccountSubtitle(account) ?? "";
    expect(result).not.toMatch(/\bARS\b/);
  });
});

describe("formatAccountIdentifier", () => {
  it("prefija CBU para cuentas bancarias", () => {
    const account = fakeAccount({
      accountType: "bancaria",
      cbuCvu: "0070000000000000000000",
    });
    expect(formatAccountIdentifier(account)).toMatch(/^CBU /);
  });

  it("prefija CVU para billeteras virtuales", () => {
    const account = fakeAccount({
      accountType: "billetera_virtual",
      cbuCvu: "0000003100000000000000",
    });
    expect(formatAccountIdentifier(account)).toMatch(/^CVU /);
  });

  it("retorna null cuando no hay identificador", () => {
    const account = fakeAccount({ cbuCvu: null, accountNumber: null });
    expect(formatAccountIdentifier(account)).toBeNull();
  });

  it("usa accountNumber como fallback cuando no hay cbuCvu", () => {
    const account = fakeAccount({
      accountType: "bancaria",
      cbuCvu: null,
      accountNumber: "12345",
    });
    expect(formatAccountIdentifier(account)).toBe("CBU 12345");
  });
});

describe("buildLastMovementByAccountId", () => {
  it("retorna el createdAt máximo por cuenta", () => {
    const groups: TreasuryRoleDashboardMovementDateGroup[] = [
      {
        movementDate: "2026-04-05",
        accounts: [
          {
            accountId: "a",
            accountName: "A",
            movements: [
              { createdAt: "2026-04-05T08:00:00Z" } as TreasuryDashboardMovement,
              { createdAt: "2026-04-05T14:00:00Z" } as TreasuryDashboardMovement,
            ],
          },
        ],
      },
      {
        movementDate: "2026-04-06",
        accounts: [
          {
            accountId: "a",
            accountName: "A",
            movements: [
              { createdAt: "2026-04-06T09:00:00Z" } as TreasuryDashboardMovement,
            ],
          },
        ],
      },
    ];

    const result = buildLastMovementByAccountId(groups);
    expect(result.a).toBe("2026-04-06T09:00:00Z");
  });

  it("retorna objeto vacío para input sin grupos", () => {
    expect(buildLastMovementByAccountId([])).toEqual({});
  });
});

describe("diffDaysInclusive", () => {
  it("calcula diferencia inclusiva en días (mismo día = 1)", () => {
    expect(diffDaysInclusive("2026-04-05", "2026-04-05")).toBe(1);
    expect(diffDaysInclusive("2026-04-01", "2026-04-30")).toBe(30);
    expect(diffDaysInclusive("2026-04-01", "2026-05-01")).toBe(31);
  });

  it("retorna null para fechas inválidas", () => {
    expect(diffDaysInclusive("garbage", "2026-04-30")).toBeNull();
    expect(diffDaysInclusive("2026-04-01", "garbage")).toBeNull();
  });
});

describe("buildMovementsWindowSubtitle", () => {
  it("usa label 'últimos 30 días' para ventana default", () => {
    const subtitle = buildMovementsWindowSubtitle({
      fromDate: "2026-04-01",
      toDate: "2026-04-30",
      count: 5,
    });
    expect(subtitle).toMatch(/30/);
  });

  it("usa label custom para ventanas no-30 días", () => {
    const subtitle = buildMovementsWindowSubtitle({
      fromDate: "2026-04-01",
      toDate: "2026-04-15",
      count: 1,
    });
    // No debe decir "30 días"; debe contener fechas formateadas
    expect(subtitle).toMatch(/2026/);
  });

  it("singular/plural para count", () => {
    const singular = buildMovementsWindowSubtitle({
      fromDate: "2026-04-01",
      toDate: "2026-04-30",
      count: 1,
    });
    const plural = buildMovementsWindowSubtitle({
      fromDate: "2026-04-01",
      toDate: "2026-04-30",
      count: 5,
    });
    expect(singular).not.toEqual(plural);
  });
});
