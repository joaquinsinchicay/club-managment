/**
 * Helper para validar `FormData` de server actions con un schema zod.
 *
 * Reemplaza el patrón disperso de `String(formData.get("x") ?? "")` por una
 * extracción + parse declarativa. El schema describe el shape esperado y zod
 * coerce/valida tipos en una sola llamada.
 *
 * Uso típico:
 * ```ts
 * const schema = z.object({
 *   movement_id: z.string().uuid(),
 *   amount: z.coerce.number().positive(),
 * });
 * const parsed = parseFormData(formData, schema);
 * if (!parsed.ok) return { ok: false, code: "validation_error", errors: parsed.errors };
 * // parsed.data is fully typed
 * ```
 *
 * Se devuelve un discriminated union para que el call-site decida cómo
 * formatear el error (toast, redirect, throw). Mantenemos la API sincrónica
 * porque zod parse no es async.
 */
import type { ZodError, ZodTypeAny, infer as ZodInfer } from "zod";

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: ZodError; firstError: string };

/**
 * Convierte un FormData a un plain object capturando todos los keys (incluso
 * arrays cuando hay múltiples values con el mismo name). Mantiene strings
 * crudos — el coerce a number/boolean/etc lo hace zod.
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key in obj) {
      const existing = obj[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        obj[key] = [existing, value];
      }
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

export function parseFormData<S extends ZodTypeAny>(
  formData: FormData,
  schema: S,
): ParseResult<ZodInfer<S>> {
  const raw = formDataToObject(formData);
  const result = schema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const firstIssue = result.error.issues[0];
  const firstError = firstIssue
    ? `${firstIssue.path.join(".") || "?"}: ${firstIssue.message}`
    : "validation failed";
  return { ok: false, errors: result.error, firstError };
}
