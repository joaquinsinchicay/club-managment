/**
 * lib/hooks/use-server-action.ts — Hook canónico para invocar server actions
 * desde un client component manejando loading state + feedback (toast) +
 * router.refresh() en una sola llamada.
 *
 * Antes de Fase 4, esta lógica estaba duplicada inline en 5 archivos como
 * `async function runAction(action, formData, onSuccess, setPending)` con
 * pequeñas variaciones (algunas con data passing, otras sin onSuccess,
 * distintos feedback domains).
 *
 * Uso típico:
 *
 *   const { isPending, runAction } = useServerAction<RrhhActionResult>("settings");
 *
 *   async function handleCreate(formData: FormData) {
 *     await runAction(createAction, formData, () => setCreateOpen(false));
 *   }
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { triggerClientFeedback } from "@/lib/client-feedback";
import type { FeedbackDomain } from "@/lib/feedback-catalog";

/**
 * Shape mínima esperada de la respuesta de una server action: cumple con
 * el patrón documentado en CLAUDE.md (sección "Forms dentro de modales con
 * server actions" → patrón A).
 */
export type ServerActionResult = {
  ok: boolean;
  code: string;
};

type RunAction<R extends ServerActionResult> = (
  action: (fd: FormData) => Promise<R>,
  formData: FormData,
  onSuccess?: (result: R) => void,
) => Promise<R>;

export type UseServerActionReturn<R extends ServerActionResult> = {
  /** True mientras la action está en flight. Útil para deshabilitar el form. */
  isPending: boolean;
  /**
   * Invoca la action, dispara el toast vía `triggerClientFeedback` con el
   * `feedbackDomain` configurado, y si `result.ok` ejecuta `onSuccess` y
   * refresca la ruta vía `router.refresh()`. Devuelve el resultado para
   * chaining adicional opcional.
   */
  runAction: RunAction<R>;
};

/**
 * @param feedbackDomain — clave usada por `triggerClientFeedback` para
 *   resolver el toast (ej. "settings", "dashboard", "treasury"). Identifica
 *   el namespace del catálogo de feedback codes.
 */
export function useServerAction<R extends ServerActionResult = ServerActionResult>(
  feedbackDomain: FeedbackDomain,
): UseServerActionReturn<R> {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [, startTransition] = useTransition();

  const runAction: RunAction<R> = async (action, formData, onSuccess) => {
    setIsPending(true);
    try {
      const result = await action(formData);
      triggerClientFeedback(feedbackDomain, result.code);
      if (result.ok) {
        onSuccess?.(result);
        startTransition(() => router.refresh());
      }
      return result;
    } finally {
      setIsPending(false);
    }
  };

  return { isPending, runAction };
}
