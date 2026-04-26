import type { Membership } from "@/lib/domain/access";
import { hasMembershipRole } from "@/lib/domain/membership-roles";

type MembershipLike = Pick<Membership, "roles" | "status"> | null | undefined;
type ActiveMembershipLike = Exclude<MembershipLike, null | undefined>;

function isActiveMembership(membership: MembershipLike) {
  return membership?.status === "activo";
}

export type ClubSettingsPermissions = {
  canAccessPage: boolean;
  canAccessNavigation: boolean;
  canManageMembers: boolean;
  canAccessTreasury: boolean;
  canMutateTreasury: boolean;
};

function getActiveMembership(membership: MembershipLike): ActiveMembershipLike | null {
  if (!isActiveMembership(membership)) {
    return null;
  }

  return membership as ActiveMembershipLike;
}

export function getClubSettingsPermissions(membership: MembershipLike): ClubSettingsPermissions {
  const activeMembership = getActiveMembership(membership);
  const canManageMembers = Boolean(activeMembership && hasMembershipRole(activeMembership, "admin"));
  const canAccessTreasury = canManageMembers;
  const canAccessPage = canManageMembers;

  return {
    canAccessPage,
    canAccessNavigation: canAccessPage,
    canManageMembers,
    canAccessTreasury,
    canMutateTreasury: canAccessTreasury
  };
}

export function canManageClubMembers(membership: MembershipLike) {
  return getClubSettingsPermissions(membership).canManageMembers;
}

export function canAccessTreasurySettings(membership: MembershipLike) {
  return getClubSettingsPermissions(membership).canAccessTreasury;
}

export function canMutateTreasurySettings(membership: MembershipLike) {
  return getClubSettingsPermissions(membership).canMutateTreasury;
}

export function canOperateTesoreria(membership: MembershipLike) {
  return isActiveMembership(membership) && hasMembershipRole(membership, "tesoreria");
}

export function canAccessDashboardSummary(membership: MembershipLike) {
  const activeMembership = getActiveMembership(membership);

  if (!activeMembership) {
    return false;
  }

  const hasAdminRole = hasMembershipRole(activeMembership, "admin");
  const hasSecretariaRole = hasMembershipRole(activeMembership, "secretaria");
  const hasTesoreriaRole = hasMembershipRole(activeMembership, "tesoreria");

  return !hasSecretariaRole || hasTesoreriaRole || hasAdminRole;
}

export function canAccessClubSettingsPage(membership: MembershipLike) {
  return getClubSettingsPermissions(membership).canAccessPage;
}

export function canAccessClubSettingsNavigation(membership: MembershipLike) {
  return getClubSettingsPermissions(membership).canAccessNavigation;
}

export function canOperateSecretaria(membership: MembershipLike) {
  return isActiveMembership(membership) && hasMembershipRole(membership, "secretaria");
}

/**
 * Cost Centers (US-52 / US-53) are visible and mutable only for the
 * `tesoreria` role in the active club. Secretaría does not see the tab nor
 * the multiselect field in movements.
 */
export function canAccessCostCenters(membership: MembershipLike) {
  return isActiveMembership(membership) && hasMembershipRole(membership, "tesoreria");
}

export function canMutateCostCenters(membership: MembershipLike) {
  return canAccessCostCenters(membership);
}

/**
 * HR module (E04 · US-54 a US-69).
 *
 * Acceso restringido exclusivamente al rol `rrhh`. Ningún otro rol (incluido
 * `admin` y `tesoreria`) ve el módulo en la nav ni puede invocar sus
 * endpoints. Si más adelante el negocio necesita co-operación parcial desde
 * tesorería, agregar un rol combinado o flag explícito — no ampliar estos
 * guards.
 */
export function canAccessHrModule(membership: MembershipLike) {
  const active = getActiveMembership(membership);
  if (!active) return false;
  return hasMembershipRole(active, "rrhh");
}

export function canAccessHrMasters(membership: MembershipLike) {
  return canAccessHrModule(membership);
}

export function canMutateHrMasters(membership: MembershipLike) {
  return canAccessHrMasters(membership);
}

export function canOperateHrSettlements(membership: MembershipLike) {
  return canAccessHrModule(membership);
}

export function canOperateHrPayments(membership: MembershipLike) {
  return canOperateHrSettlements(membership);
}

/**
 * US-41 · Devolver una liquidación aprobada al estado "generada".
 * Disponible tanto para rol RRHH como para rol Tesorería (US-41 Scenario 01-02),
 * para que cualquiera de los dos pueda corregir errores detectados después
 * de la aprobación sin tener que anular la liquidación.
 */
export function canReturnPayrollSettlement(membership: MembershipLike) {
  const active = getActiveMembership(membership);
  if (!active) return false;
  return hasMembershipRole(active, "rrhh") || hasMembershipRole(active, "tesoreria");
}

/**
 * US-45 · Bandeja Tesorería de pagos pendientes.
 *
 * Solo rol Tesorería accede. Es un mirror específico para el flujo de pago,
 * sin abrir el módulo /rrhh (que sigue siendo exclusivo de rol "rrhh").
 */
export function canAccessTreasuryPayrollTray(membership: MembershipLike) {
  const active = getActiveMembership(membership);
  if (!active) return false;
  return hasMembershipRole(active, "tesoreria");
}

/**
 * US-46 · Ficha de colaborador.
 *
 * Lectura de la ficha disponible para rol RRHH (en /rrhh/staff/[id]) y
 * rol Tesorería (en /treasury/staff/[id], mirror read-only). El service
 * subyacente usa este guard "permisivo" — los guards de cada página son
 * los que deciden quién entra a qué ruta y con qué CTAs.
 */
export function canViewStaffProfile(membership: MembershipLike) {
  const active = getActiveMembership(membership);
  if (!active) return false;
  return hasMembershipRole(active, "rrhh") || hasMembershipRole(active, "tesoreria");
}

/**
 * US-46 · Acceso al mirror de la ficha en /treasury/staff/[id]. Solo rol
 * Tesorería: la ficha en /rrhh sigue gateada por canAccessHrModule.
 */
export function canAccessTreasuryStaffProfile(membership: MembershipLike) {
  const active = getActiveMembership(membership);
  if (!active) return false;
  return hasMembershipRole(active, "tesoreria");
}

/**
 * US-48 · Reportes RRHH desde Tesorería.
 *
 * Mirror read-only de /rrhh/reports en /treasury/reports/payroll. Solo
 * rol Tesorería: los reportes en /rrhh siguen gateados por canAccessHrModule.
 */
export function canAccessTreasuryPayrollReports(membership: MembershipLike) {
  const active = getActiveMembership(membership);
  if (!active) return false;
  return hasMembershipRole(active, "tesoreria");
}

/**
 * US-48 · Lectura de reportes RRHH (servicio común para /rrhh/reports y
 * /treasury/reports/payroll). Permite RRHH o Tesorería.
 */
export function canViewHrReports(membership: MembershipLike) {
  const active = getActiveMembership(membership);
  if (!active) return false;
  return hasMembershipRole(active, "rrhh") || hasMembershipRole(active, "tesoreria");
}
