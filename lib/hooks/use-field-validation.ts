/**
 * lib/hooks/use-field-validation.ts — Hook canónico para validación
 * inline de un campo individual con `onBlur` (email, teléfono, CUIT, etc.).
 *
 * Antes de Fase 4, este patrón vivía hand-rolled en cada form:
 *
 *   const [emailError, setEmailError] = useState<string | null>(null);
 *   function handleEmailBlur(event) {
 *     const value = event.target.value.trim();
 *     if (!value) { setEmailError(null); return; }
 *     setEmailError(isValidEmail(value) ? null : "Email inválido");
 *   }
 *
 * Con el hook:
 *
 *   const email = useFieldValidation((value) =>
 *     isValidEmail(value) ? null : "Email inválido",
 *   );
 *
 *   <FormInput
 *     value={emailValue}
 *     onChange={...}
 *     onBlur={(e) => email.validate(e.target.value)}
 *   />
 *   {email.error ? <FormError>{email.error}</FormError> : null}
 *
 * El validator devuelve `string | null` (string = mensaje de error,
 * null = válido). El hook se encarga del state.
 *
 * Convenciones:
 *  - Trim automático del value antes de validar.
 *  - Si el value vacío debe ser válido (campo opcional), el validator
 *    debe devolver null para "" — el hook NO short-circuita.
 *  - `clear()` resetea el error sin re-validar (útil al onChange
 *    cuando el user empieza a corregir).
 */

"use client";

import { useCallback, useState } from "react";

export type FieldValidator = (value: string) => string | null;

export type UseFieldValidationReturn = {
  /** Mensaje de error actual o `null` si el field es válido / no se validó. */
  error: string | null;
  /** Ejecuta el validator sobre el value (trimmed) y guarda el resultado. */
  validate: (value: string) => void;
  /** Limpia el error sin re-validar. */
  clear: () => void;
};

export function useFieldValidation(validator: FieldValidator): UseFieldValidationReturn {
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setError(validator(trimmed));
    },
    [validator],
  );

  const clear = useCallback(() => setError(null), []);

  return { error, validate, clear };
}
