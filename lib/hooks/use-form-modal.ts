/**
 * lib/hooks/use-form-modal.ts — Hook canónico para modales que ejecutan
 * server actions (create, edit, delete confirm).
 *
 * Combina:
 *   - state machine de open/close (con context opcional T para "editar")
 *   - useServerAction internamente (pending + feedback + router.refresh)
 *   - handler `handleSubmit(formData)` que cierra el modal y dispara la action
 *
 * Patrón "create-only":
 *
 *   const create = useFormModal<void, RrhhActionResult>({
 *     feedbackDomain: "settings",
 *     action: createAction,
 *   });
 *   // ...
 *   <button onClick={create.open}>Nuevo</button>
 *   <Modal open={create.isOpen} onClose={create.close} closeDisabled={create.isPending}>
 *     <form action={create.handleSubmit}>...</form>
 *   </Modal>
 *
 * Patrón "edit per-row":
 *
 *   const edit = useFormModal<StaffMember, RrhhActionResult>({
 *     feedbackDomain: "settings",
 *     action: updateAction,
 *   });
 *   // ...
 *   <button onClick={() => edit.openWith(member)}>Editar</button>
 *   <Modal open={edit.isOpen} onClose={edit.close}>
 *     {edit.target ? <EditForm member={edit.target} action={edit.handleSubmit} /> : null}
 *   </Modal>
 */

"use client";

import { useState } from "react";

import { useServerAction, type ServerActionResult } from "@/lib/hooks/use-server-action";
import type { FeedbackDomain } from "@/lib/feedback-catalog";

export type UseFormModalOptions<R extends ServerActionResult> = {
  /** Domain del catálogo de feedback codes (resuelve toasts). */
  feedbackDomain: FeedbackDomain;
  /** Server action a invocar al submit del form. */
  action: (formData: FormData) => Promise<R>;
};

export type UseFormModalReturn<T, R extends ServerActionResult> = {
  /** True cuando el modal está abierto. */
  isOpen: boolean;
  /** Contexto del modal (null para create, T para edit). */
  target: T | null;
  /** Abre el modal sin contexto (caso "create"). */
  open: () => void;
  /** Abre el modal con un item de contexto (caso "edit"). */
  openWith: (target: T) => void;
  /** Cierra el modal y limpia el contexto. */
  close: () => void;
  /** True mientras la action está en flight. Útil para `closeDisabled`. */
  isPending: boolean;
  /**
   * Handler para `<form action={handleSubmit}>`. Cierra el modal optimisticamente
   * (antes del await), dispara la action, y deja al hook gestionar el feedback
   * + router.refresh.
   */
  handleSubmit: (formData: FormData) => Promise<void>;
};

export function useFormModal<T = void, R extends ServerActionResult = ServerActionResult>({
  feedbackDomain,
  action,
}: UseFormModalOptions<R>): UseFormModalReturn<T, R> {
  const [target, setTarget] = useState<T | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { isPending, runAction } = useServerAction<R>(feedbackDomain);

  function open() {
    setTarget(null);
    setIsOpen(true);
  }
  function openWith(value: T) {
    setTarget(value);
    setIsOpen(true);
  }
  function close() {
    setIsOpen(false);
    setTarget(null);
  }

  async function handleSubmit(formData: FormData): Promise<void> {
    // Cierre optimista: mejor UX, el modal cierra apenas el usuario
    // confirma. Si la action falla el toast lo informa (CLAUDE.md
    // "Patrón A — Action devuelve {ok, code}").
    close();
    await runAction(action, formData);
  }

  return { isOpen, target, open, openWith, close, isPending, handleSubmit };
}
