# PDD — US-57 · Alta de contrato colaborador + Estructura Salarial

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · `US-33`. En el repo: **US-57**.

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como Admin del club, quiero crear un contrato asociando un colaborador con una Estructura Salarial, para formalizar su vínculo rentado con el club. |
| Prioridad | Alta |
| Objetivo de negocio | Ligar personas a posiciones rentadas con reglas claras sobre cómo se determina su remuneración (estándar vs acordada), para habilitar la generación de liquidaciones mes a mes. |

---

## 2. Problema a resolver

Las Estructuras Salariales (US-54) definen posiciones, los Colaboradores (US-56) definen personas. Hace falta el artefacto que une ambos: el **contrato**, con sus fechas, su modo de cálculo de monto y la posibilidad de congelar el valor para ese contrato específico sin afectar a la estructura base.

---

## 3. Objetivo funcional

Desde la ficha de un colaborador o desde la ficha de una Estructura Salarial, `admin` o `rrhh` pueden ejecutar **`+ Nuevo Contrato`**. El formulario pide Colaborador, Estructura Salarial, Fecha inicio, Fecha fin (opcional), flag `Usa monto estándar` (default `true`) y Monto acordado (requerido cuando el flag está en `false`). Al guardar, se valida que la estructura no tenga otro contrato vigente, que el colaborador esté activo, y se registra la relación. La Estructura pasa de `vacante` a `ocupada` (cálculo derivado, no columna).

---

## 4. Alcance

### Incluye
- Formulario de alta accesible desde ficha de colaborador o estructura.
- Selectores filtrados:
  - Estructuras: sólo `status = 'activa'` sin contrato vigente.
  - Colaboradores: sólo `status = 'activo'`.
- Flag `uses_structure_amount` con comportamiento descrito abajo.
- Validación de unicidad (una estructura = un contrato vigente) via unique parcial.
- Registro de auditoría `CONTRACT_CREATED`.
- Persistencia de `frozen_amount` cuando el flag está en `false` al alta.

### No incluye
- Adjuntos / documentos del contrato (fuera de scope MVP por decisión del plan).
- Renovaciones automáticas.
- Contratos simultáneos superpuestos sobre la misma estructura.
- Edición y finalización (cubiertas por US-58).
- Cambio de colaborador o estructura en un contrato ya creado (requiere finalizar + crear nuevo).

---

## 5. Actor principal

`admin` o `rrhh` del club activo.

---

## 6. Precondiciones

- Existe al menos una Estructura Salarial `activa` sin contrato vigente.
- Existe al menos un Colaborador `activo`.
- Rol `admin` o `rrhh` en el club.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Alta válida con flag `true` | Contrato vigente, sin `frozen_amount`. El monto se resolverá al generar liquidaciones vía la versión vigente de la estructura. |
| Alta válida con flag `false` | Contrato vigente con `frozen_amount = input.agreed_amount`. |
| La estructura ya tenía contrato vigente | Alta bloqueada con `structure_already_taken`. |

---

## 8. Reglas de negocio

### Campos obligatorios
- `staff_member_id`, `salary_structure_id`, `start_date` son obligatorios.
- Si `uses_structure_amount = false` → `agreed_amount` obligatorio y mayor a cero.

### Validaciones
- Estructura: debe ser `activa` y no tener contrato vigente (unique parcial `where status = 'vigente'`).
- Colaborador: debe estar `activo`.
- `start_date` debe ser mayor o igual a hoy **o hasta 30 días retroactivo** (para registrar contratos que empezaron en los últimos días y recién se formalizan). Retroactivos más allá bloquean con `start_date_too_old`.
- Si `end_date` se informa, debe ser mayor o igual a `start_date`.
- Moneda: heredada del club (`clubs.currency_code`). No se selecciona.

### Comportamiento del flag `uses_structure_amount`
- `true` (default):
  - `agreed_amount` se ignora/no se persiste.
  - Las liquidaciones futuras leen `salary_structure_current_amount` al momento de generarse.
- `false`:
  - `agreed_amount` obligatorio y se persiste en la columna `frozen_amount`.
  - Las liquidaciones futuras leen `frozen_amount` directo del contrato.
  - `frozen_amount` se puede editar en US-58 mientras el flag siga en `false`.

### Unicidad
- Unique parcial: `(salary_structure_id) where status = 'vigente'`. Previene dos contratos vigentes sobre la misma estructura.
- No hay unicidad entre colaborador y estructura combinados: un colaborador puede tener varios contratos vigentes en estructuras distintas.

### Estados del contrato
- `vigente | finalizado`. Default al alta: `vigente`.

### Auditoría
- Evento `CONTRACT_CREATED` con snapshot completo.

---

## 9. Flujo principal

1. Admin abre ficha de colaborador o de estructura y presiona `+ Nuevo Contrato`.
2. Abre `<Modal size="md">` con formulario.
3. Si entra desde ficha de colaborador → `staff_member_id` preseleccionado.
4. Si entra desde ficha de estructura → `salary_structure_id` preseleccionado.
5. Completa los campos restantes.
6. Guarda. El sistema valida, persiste, registra auditoría.
7. Toast de éxito. Modal cierra, `router.refresh()`.

---

## 10. Flujos alternativos

### A. Estructura ocupada
Bloqueo con `structure_already_taken` y mensaje explicativo.

### B. Colaborador inactivo
El selector no muestra colaboradores `inactivo`. Si el ID viene manipulado, el server bloquea con `staff_member_not_active`.

### C. Estructura inactiva
El selector no muestra estructuras `inactiva`. Server bloquea con `salary_structure_not_active`.

### D. Flag desactivado sin `agreed_amount`
Bloqueo con `agreed_amount_required`.

### E. Fecha inicio muy retroactiva
Bloqueo con `start_date_too_old` (más de 30 días hacia atrás).

---

## 11. UI / UX

### Reglas
- Modal `<Modal size="md">` con secciones Colaborador, Estructura, Vigencia, Remuneración.
- `<FormSelect>` para colaborador y estructura, con búsqueda interna.
- Flag `uses_structure_amount` como `<FormCheckboxCard>` con descripción clara: "El contrato toma automáticamente el monto vigente de la estructura. Al desactivar, el monto queda congelado en el contrato y requiere edición manual."
- `<FormInput type="number">` para `agreed_amount` visible sólo cuando el flag está en `false`.
- `<FormReadonly>` mostrando la moneda del club.
- `<ModalFooter submitVariant="primary" submitLabel="Crear contrato">`.
- Feedback con toast client-side usando el patrón A (`setModalOpen(false) → await → triggerClientFeedback → router.refresh`).

---

## 12. Mensajes y textos

### Namespace
`rrhh.contracts.create.*`

### Keys mínimas
- `trigger_cta`, `modal_title`, `modal_description`
- `form_staff_member_label`, `form_structure_label`, `form_start_date_label`, `form_end_date_label`, `form_end_date_helper`
- `form_uses_structure_amount_label`, `form_uses_structure_amount_description`
- `form_agreed_amount_label`, `form_agreed_amount_helper`, `form_currency_readonly_label`
- `submit_cta`, `submit_pending`, `cancel_cta`
- `feedback.{created,staff_member_required,structure_required,start_date_required,end_date_before_start,agreed_amount_required,agreed_amount_must_be_positive,structure_already_taken,staff_member_not_active,salary_structure_not_active,start_date_too_old,forbidden,unknown_error}`

---

## 13. Persistencia

### Entidad
- `public.staff_contracts`:
  - `id uuid pk`
  - `club_id uuid not null references clubs(id)`
  - `staff_member_id uuid not null references staff_members(id)`
  - `salary_structure_id uuid not null references salary_structures(id)`
  - `start_date date not null`
  - `end_date date null`
  - `uses_structure_amount boolean not null default true`
  - `frozen_amount numeric(18,2) null`
  - `status text not null default 'vigente' check (status in ('vigente','finalizado'))`
  - `finalized_at timestamptz null`
  - `finalized_reason text null`
  - `finalized_by_user_id uuid null`
  - `created_at timestamptz default now()`, `updated_at timestamptz default now()`
  - `created_by_user_id uuid`, `updated_by_user_id uuid`
  - Checks: `check (uses_structure_amount = true or frozen_amount is not null)`.
  - Checks: `check (end_date is null or end_date >= start_date)`.
  - Unique parcial: `create unique index on staff_contracts (salary_structure_id) where status = 'vigente'`.
  - Índices: `(club_id, status)`, `(staff_member_id, status)`.

### RLS
- `staff_contracts_club_scope`: `club_id = current_setting('app.current_club_id', true)::uuid`.

---

## 14. Seguridad

- Todas las lecturas/escrituras RLS-scoped al club activo.
- Rol `admin | rrhh` validado en service.
- `club_id` resuelto server-side, nunca del cliente.

---

## 15. Dependencias

- **contracts:** `Create staff contract`, `List staff contracts`.
- **domain entities:** `staff_contracts`, `staff_members` (lectura), `salary_structures` (lectura), `hr_activity_log`.
- **otras US:** US-54, US-56, US-58 (edición/finalización), US-61 (consumo del contrato al generar).
