/**
 * lib/logger.ts — logger central para services y repositories.
 *
 * API drop-in compatible con `console.*` (mismo shape de variadic args), de
 * modo que la migración desde `console.error/warn/info/log` sea un reemplazo
 * mecánico del nombre. Centraliza:
 *  - filtrado por nivel via NODE_ENV (en producción debug/info se silencian)
 *  - punto único para integrar Sentry/Datadog/OpenTelemetry a futuro
 *  - convención: el primer arg es el prefijo "[scope]" o "[scope-event]"
 *    (los call-sites legacy ya cumplen esta convención).
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// En desarrollo log todo; en producción sólo warn+error.
const MIN_LEVEL: number =
  process.env.NODE_ENV === "production" ? LEVEL_ORDER.warn : LEVEL_ORDER.debug;

function emit(level: LogLevel, args: unknown[]): void {
  if (LEVEL_ORDER[level] < MIN_LEVEL) return;
  const sink =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : level === "info"
          ? console.info
          : console.log;
  sink(...args);
}

export const logger = {
  debug(...args: unknown[]) {
    emit("debug", args);
  },
  info(...args: unknown[]) {
    emit("info", args);
  },
  warn(...args: unknown[]) {
    emit("warn", args);
  },
  error(...args: unknown[]) {
    emit("error", args);
  },
};
