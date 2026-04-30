/**
 * lib/dates.ts — Formatters de fecha/hora canónicos para es-AR.
 *
 * Centraliza todas las variantes de Intl.DateTimeFormat usadas en el frontend.
 * Antes de Fase 4, estas funciones vivían inline duplicadas en 8+ archivos.
 *
 * Convenciones:
 *  - Funciones que reciben `value: string` aceptan tanto ISO completo
 *    (con tiempo) como fecha-only (`YYYY-MM-DD`). Las date-only se anclan
 *    con `T00:00:00` o `T12:00:00` según corresponda.
 *  - Si la fecha es inválida, se devuelve el value original (graceful fallback)
 *    para evitar romper la UI en datos legacy.
 *  - Los nombres preservan la convención previa para que la migración sea
 *    un find/replace mecánico de imports.
 */

/**
 * "long" dateStyle. Ejemplo: "29 de abril de 2026".
 * Uso: header de grupo de movimientos por fecha.
 */
export function formatMovementGroupDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(date);
}

/**
 * "2-digit" todo (día/mes/año + hora:minuto). Ejemplo: "29/04/26 14:32".
 * Uso: timestamp de movimiento individual en listas.
 */
export function formatMovementDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * dateStyle "short" + timeStyle "short" (variante con presets nativos).
 * Ejemplo: "29/4/26 14:32". Diferencias con formatMovementDateTime: usa
 * presets en lugar de explicit 2-digit, dejando al locale formato más natural.
 */
export function formatMovementDateTimeStyle(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

/**
 * "dd/mm hh:mm" manual (sin año). Ejemplo: "29/04 14:32".
 * Uso: badge de "última actividad" en una cuenta tesorería.
 */
export function formatLastMovementDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hours}:${minutes}`;
}

/**
 * Solo hora:minuto. Ejemplo: "14:32".
 * Uso: chip de hora en treasury-card.
 */
export function formatSessionTime(isoString: string | null): string | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

/**
 * "dd/mm/yyyy". Ejemplo: "29/04/2026".
 * Uso: labels de rangos de movimientos en treasury-role-card.
 */
export function formatLocalizedDateLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * "Weekday, día mes corto año" capitalizado. Ejemplo: "Miércoles, 29 abr. 2026".
 * Uso: header largo de jornada en modales de movimiento (anclado a mediodía
 * para evitar drift por timezone).
 */
export function formatSessionDateLong(sessionDate: string): string {
  const date = new Date(`${sessionDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return sessionDate;
  const formatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * "DD mes-corto YYYY" + "→" + idem (o "Sin cierre" si no hay endDate).
 * Ejemplo: "29 abr. 2026 → 30 jun. 2026" o "29 abr. 2026 · Sin cierre".
 * Uso: rango de fechas de un cost center.
 */
export function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(`${startDate}T00:00:00`);
  const startStr = Number.isNaN(start.getTime())
    ? startDate
    : new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(
        start,
      );

  if (!endDate) return `${startStr} · Sin cierre`;

  const end = new Date(`${endDate}T00:00:00`);
  const endStr = Number.isNaN(end.getTime())
    ? endDate
    : new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(
        end,
      );

  return `${startStr} → ${endStr}`;
}
