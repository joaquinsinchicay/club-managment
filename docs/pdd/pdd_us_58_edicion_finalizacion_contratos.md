# PDD — US-58 · Edición y finalización de contratos

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · alias `US-33`. En el repo: **US-58**. (Pre-refactor 2026-04-27 el alias era `US-34`.)

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como Admin del club, quiero editar o finalizar un contrato, para reflejar cambios en el acuerdo con el colaborador o el fin del vínculo. |
| Prioridad | Alta |
| Objetivo de negocio | Permitir ajustar términos del contrato vigente y cerrar el vínculo cuando corresponde, liberando la estructura para un contrato nuevo y deteniendo la generación de liquidaciones posteriores. |

---

## 2. Problema a resolver

Los contratos necesitan operar durante su vigencia: ajustar fecha fin, cambiar el modo de cálculo del monto (flag), editar el monto congelado. Y cuando la relación termina, el sistema debe reflejarlo: cambiar de `vigente` a `finalizado`, liberar la estructura, y bloquear liquidaciones de períodos posteriores.

---

## 3. Objetivo funcional

Desde la ficha del colaborador o la ficha de la estructura, `admin` o `rrhh` pueden:
- **Editar** un contrato vigente (fecha fin, flag `uses_structure_amount`, `frozen_amount` si flag = false).
- **Finalizar** un contrato vigente con fecha fin (default hoy, editable) y motivo opcional.

Los cambios en el flag tienen semántica: desactivar congela el monto actual, reactivar vuelve a leer la estructura.

---

## 4. Alcance

### Incluye
- Acción `Editar contrato` en fichas con contrato vigente.
- Acción `Finalizar contrato` en contratos vigentes con confirmación.
- Reversión de la unique parcial (finalizar libera la estructura para un contrato nuevo).
- Registro de `CONTRACT_UPDATED` y `CONTRACT_FINALIZED` en `hr_activity_log`.
- Bloqueo de generación de liquidaciones posteriores a `end_date`.

### No incluye
- Cambio de colaborador o estructura (requiere finalizar + crear nuevo).
- Reactivación de un contrato finalizado (tampoco permitida en Notion; se exige crear uno nuevo).
- Finalización masiva.

---

## 5. Actor principal

`admin` o `rrhh` del club activo.

---

## 6. Precondiciones

- Contrato existe y pertenece al club activo.
- Para editar: `status = 'vigente'`.
- Para finalizar: `status = 'vigente'`.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Edición que desactiva el flag | `frozen_amount` se setea con el monto actual (snapshot de la versión vigente de la estructura); flag pasa a `false`. |
| Edición que activa el flag | `frozen_amount` se borra (`null`); flag pasa a `true`. |
| Finalización | `status = 'finalizado'`, `finalized_at = now()`, `end_date` se actualiza si la indicada es distinta. |
| Post-finalización | La estructura queda liberada y visible en el selector para un nuevo contrato. |
| Liquidaciones para períodos `> end_date` | No se generan. |

---

## 8. Reglas de negocio

### Campos editables en vigente
- `end_date` (permitido `null` para contratos indefinidos; si se informa debe ser `>= start_date`).
- `uses_structure_amount` (toggle).
- `frozen_amount` (solo si `uses_structure_amount = false`, obligatorio y `> 0`).

### Campos inmutables
- `staff_member_id`, `salary_structure_id`, `start_date`.

### Transición del flag
- `true → false`: el sistema lee la versión vigente de la estructura y copia el `amount` al `frozen_amount` del contrato. El admin puede editarlo inmediatamente desde el mismo formulario.
- `false → true`: el sistema setea `frozen_amount = null`.

### Finalización
- Fecha fin por defecto `current_date`, editable. Debe ser `>= start_date` y `<= start_date + 10 años`.
- Motivo opcional (`finalized_reason` texto libre, hasta 500 caracteres).
- Idempotente: finalizar un contrato ya finalizado retorna `already_finalized` sin efecto.
- Atomicidad: transacción que actualiza `status`, `end_date`, `finalized_at`, `finalized_reason`, `finalized_by_user_id` y registra auditoría.

### Liberación de la estructura
- El unique parcial `(salary_structure_id) where status = 'vigente'` se resuelve naturalmente al cambiar `status`. No hay otro side effect sobre la estructura (no se cambia su estado).

### Bloqueo de liquidaciones posteriores
- La RPC de generación (US-61) filtra: `start_date <= period_end and (end_date is null or end_date >= period_start)`.
- Si en el mes de finalización existe liquidación generada, se mantiene (el tesorero ajusta vía US-62 si aplica).

### Auditoría
- `CONTRACT_UPDATED` con diff de campos afectados.
- `CONTRACT_FINALIZED` con snapshot `{ end_date, finalized_reason }`.

---

## 9. Flujo principal (Edición)

1. Admin abre la ficha del contrato vigente y presiona `Editar`.
2. Modal con campos editables.
3. Admin modifica y guarda.
4. El sistema valida y persiste, registra auditoría.
5. Toast de éxito.

## 9.b Flujo principal (Finalización)

1. Admin abre el contrato y presiona `Finalizar`.
2. Modal de confirmación con `<FormBanner variant="warning">` y campos Fecha fin (default hoy) + Motivo (opcional).
3. Admin confirma con `submitVariant="destructive"`.
4. El sistema ejecuta la RPC `hr_finalize_contract(contract_id, end_date, reason)`.
5. Toast de éxito. Modal cierra, refresh.

---

## 10. Flujos alternativos

### A. Flag desactivado sin `frozen_amount` (edición)
Si el admin desactiva el flag pero el `frozen_amount` queda en 0 o vacío por algún error, bloquea con `frozen_amount_required`.

### B. Finalización con fecha inválida
`end_date < start_date` → `invalid_end_date`.
`end_date > start_date + 10 años` → `end_date_too_far`.

### C. Contrato ya finalizado
Acción `Finalizar` no debe estar disponible (UI esconde). Si llega al server, retorna `already_finalized`.

---

## 11. UI / UX

### Reglas
- Modal de edición `<Modal size="md">`.
- Modal de finalización `<Modal size="sm">` con `<FormBanner variant="destructive">` y `<ModalFooter submitVariant="destructive" submitLabel="Finalizar contrato">`.
- Campos `staff_member_id` y `salary_structure_id` mostrados con `<FormReadonly>` + hint "No editable: para cambiarlos, finalizá este contrato y creá uno nuevo".
- Transición del flag: al tocarlo, el formulario muestra inmediatamente el `frozen_amount` (lectura del valor actual via API call o precarga server-side).

---

## 12. Mensajes y textos

### Namespace
`rrhh.contracts.edit.*` y `rrhh.contracts.finalize.*`

### Keys mínimas (edit)
- `trigger_cta`, `modal_title`, `form_end_date_label`, `form_uses_structure_amount_label`, `form_frozen_amount_label`, `readonly_hint`
- `submit_cta`, `submit_pending`
- `feedback.{updated,end_date_before_start,frozen_amount_required,frozen_amount_must_be_positive,forbidden,unknown_error}`

### Keys mínimas (finalize)
- `trigger_cta`, `modal_title`, `modal_description`, `form_end_date_label`, `form_reason_label`, `warning_banner`
- `submit_cta` ("Finalizar contrato"), `submit_pending`, `cancel_cta`
- `feedback.{finalized,invalid_end_date,end_date_too_far,already_finalized,forbidden,unknown_error}`

---

## 13. Persistencia

### Entidad afectada
- `public.staff_contracts` — UPDATE de `end_date`, `uses_structure_amount`, `frozen_amount`, `status`, `finalized_at`, `finalized_reason`, `finalized_by_user_id`, `updated_at`, `updated_by_user_id`.

### RPC
- `hr_finalize_contract(p_contract_id uuid, p_end_date date, p_reason text) returns json` SECURITY DEFINER, atómica.

### Auditoría
- `hr_activity_log` append con diffs.

---

## 14. Seguridad

- RLS club-scoped.
- Service valida rol `admin | rrhh`.
- La RPC valida que el contrato pertenece al club vía `app.current_club_id`.

---

## 15. Dependencias

- **contracts:** `Update staff contract`, `Finalize staff contract`.
- **domain entities:** `staff_contracts`, `salary_structure_versions` (lectura para congelar monto), `hr_activity_log`.
- **otras US:** US-57 (alta), US-61 (generación filtra por `end_date`), US-55 (monto vigente para snapshot).
