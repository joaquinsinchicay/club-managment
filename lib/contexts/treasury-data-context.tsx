/**
 * lib/contexts/treasury-data-context.tsx — Context que centraliza los
 * "datos de dominio" de tesorería para que componentes del árbol de
 * `/treasury` y `/dashboard` (cuando opera secretaría) los consuman vía
 * hook en lugar de recibirlos por props drilling.
 *
 * Hidratación server-side: el page server fetcha los datos y los pasa
 * vía la prop `value` al `<TreasuryDataProvider>`. El provider es client
 * component (necesario para `createContext`); su única responsabilidad es
 * actuar como conducto del JSON serializado del server.
 *
 * Antes de Fase 4 · T3.2: `accounts/categories/activities/currencies/...`
 * se pasaban a `<TreasuryRoleCard>` (10+ props), que los re-pasaba a sus
 * 7 forms internos, cada uno también con 6-8 props de dominio. Cualquier
 * feature de dominio nuevo (ej. agregar `CostCenterColor`) tocaba 8+
 * archivos.
 *
 * Después: el page setea el provider una vez. Los consumers usan
 * `useTreasuryData()` para acceder a los datos. Las props del componente
 * solo describen qué hace ESE componente (acciones, estado local), no de
 * dónde vienen los datos del dominio.
 *
 * Nota de scope: en este commit solo `<TreasuryRoleCard>` consume el
 * context. Los 7 forms internos siguen recibiendo los datos como props
 * desde TreasuryRoleCard — esa migración queda para una iteración
 * futura (cada form individual se migra con su propio commit/smoke).
 */

"use client";

import { createContext, useContext, type ReactNode } from "react";

import type {
  ClubActivity,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryCurrencyConfig,
  TreasuryMovementType,
} from "@/lib/domain/access";

/**
 * Sub-tipos para datos derivados que viven solo en este context (no en
 * `lib/domain/*` porque son shapes específicos de UI armados por el page
 * server con joins ad-hoc).
 */
export type ActiveCostCenterOption = {
  id: string;
  name: string;
  type: string;
  currencyCode: string;
  status: "activo" | "inactivo";
};

export type StaffContractOption = {
  contractId: string;
  staffMemberId: string;
  label: string;
};

export type TreasuryDataContextValue = {
  /** Cuentas visibles para el usuario actual (filtradas por rol). */
  accounts: TreasuryAccount[];
  /** TODAS las cuentas del club (para resolver references en historicos). */
  allAccounts: TreasuryAccount[];
  /** Categorías y subcategorías del club. */
  categories: TreasuryCategory[];
  /** Actividades del club (para etiquetar movimientos). */
  activities: ClubActivity[];
  /** Configuración de monedas habilitadas. */
  currencies: TreasuryCurrencyConfig[];
  /** Tipos de movimiento (ingreso/egreso). */
  movementTypes: TreasuryMovementType[];
  /** Formatos de comprobante disponibles para los selects de número. */
  receiptFormats: ReceiptFormat[];
  /** Cuentas elegibles como origen de transferencia (subset de accounts). */
  transferSourceAccounts: TreasuryAccount[];
  /** Cuentas elegibles como destino de transferencia (subset de accounts). */
  transferTargetAccounts: TreasuryAccount[];
  /** Contratos RRHH activos para el selector "Contrato" del modal de movimiento. Opcional. */
  staffContracts?: StaffContractOption[];
  /** Cost centers activos para el multiselect del modal de movimiento. Opcional. */
  activeCostCenters?: ActiveCostCenterOption[];
};

const TreasuryDataContext = createContext<TreasuryDataContextValue | null>(null);

type TreasuryDataProviderProps = {
  value: TreasuryDataContextValue;
  children: ReactNode;
};

export function TreasuryDataProvider({ value, children }: TreasuryDataProviderProps) {
  return <TreasuryDataContext.Provider value={value}>{children}</TreasuryDataContext.Provider>;
}

/**
 * Hook canónico para consumir los datos de dominio de tesorería. Tira si
 * se usa fuera del provider (fail-fast — evita bugs sutiles por valores
 * default vacíos).
 */
export function useTreasuryData(): TreasuryDataContextValue {
  const value = useContext(TreasuryDataContext);
  if (!value) {
    throw new Error(
      "useTreasuryData must be used within <TreasuryDataProvider>. Verifica que el page server esté envolviendo el árbol con el provider y pasando los datos hidratados.",
    );
  }
  return value;
}
