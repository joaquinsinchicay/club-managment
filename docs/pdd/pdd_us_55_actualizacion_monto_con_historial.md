# PDD — US-55 · Actualización de monto con historial

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · alias `US-34` + `US-35` (revisión salarial individual + masiva). En el repo: **US-55**. (Pre-refactor 2026-04-27 el alias Notion era `US-31`.)

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como Admin del club, quiero actualizar el monto de una Estructura Salarial manteniendo su historial, para reflejar cambios salariales y permitir consultar la evolución del monto en el tiempo. |
| Prioridad | Alta |
| Objetivo de negocio | Garantizar trazabilidad total de las actualizaciones salariales del club, preservando el histórico de montos por fecha de vigencia para reportes, auditorías y cálculo de liquidaciones futuras. |

---

## 2. Problema a resolver

Sin versionado, un cambio de monto sobreescribe el valor anterior y rompe la reconstrucción histórica. Se necesita un modelo temporal donde cada versión (`start_date`, `end_date`, `amount`) sea consultable y no mutable, con una sola versión vigente por estructura en cada momento.

---

## 3. Objetivo funcional

Desde el detalle de una Estructura Salarial, el Admin puede ejecutar la acción **Actualizar monto**, indicando un **monto nuevo** y una **fecha de vigencia** (default hoy, editable). El sistema cierra la versión vigente anterior (`end_date = fecha_vigencia_nueva - 1 día`) y crea una nueva versión con `start_date = fecha_vigencia_nueva` y `end_date = null`. El historial es visible desde la ficha de la estructura con todas las versiones ordenadas cronológicamente.

---

## 4. Alcance

### Incluye
- Acción `Actualizar monto` disponible desde el detalle de la estructura (accesible para `admin` y `rrhh`).
- Formulario con: Monto nuevo, Fecha de vigencia (default `current_date`).
- Cierre atómico de la versión anterior + creación de la nueva versión en la misma transacción.
- Vista de historial con Monto, Fecha inicio, Fecha fin, Actor.
- Propagación automática del nuevo monto vigente a **liquidaciones futuras** de contratos con `uses_structure_amount = true` (via lectura al generar en US-61, sin UPDATE masivo).
- Preservación del snapshot en liquidaciones ya generadas (no se retocan).

### No incluye
- Edición o borrado de versiones existentes (append-only).
- Retroactivo: no se permite `start_date` anterior a la `start_date` de la última versión vigente.
- Ajuste manual de contratos con `uses_structure_amount = false`.
- Conversión de moneda o cambio de moneda del club.

---

## 5. Actor principal

Usuario autenticado con rol `admin` o `rrhh` en el club activo.

---

## 6. Precondiciones

- La estructura existe y pertenece al club activo.
- La estructura tiene al menos una versión vigente (creada al alta en US-54).

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Actor confirma actualización válida | Versión anterior queda cerrada, versión nueva queda vigente. |
| La estructura tiene un contrato vigente con flag `uses_structure_amount = true` | Las liquidaciones futuras tomarán el nuevo monto al momento de generarse. |
| La estructura tiene un contrato vigente con flag `uses_structure_amount = false` | No hay efecto sobre el contrato. |
| Existen liquidaciones ya generadas | Los snapshots se preservan intactos. |

---

## 8. Reglas de negocio

### Obligatoriedad
- `amount` obligatorio, mayor a cero.
- `effective_date` obligatoria, mayor o igual a `today() - 0` (no retroactiva anterior a la vigente actual).

### Integridad
- No puede existir más de una versión con `end_date = null` por `salary_structure_id`. Se protege con unique parcial `(salary_structure_id) where end_date is null`.
- Transacción atómica: cerrar versión vigente + insertar nueva. Si alguno falla, rollback completo.
- `end_date` de la versión anterior = `effective_date_nueva - 1 día`. Si `effective_date_nueva == today()` y la versión anterior tiene `start_date == today()`, la regla produciría `end_date < start_date`: en ese caso el sistema bloquea con error `same_day_update` y sugiere corregir la versión anterior o diferir el cambio.

### Propagación a liquidaciones futuras
- La lectura se hace al generar liquidaciones (US-61) mediante la vista `salary_structure_current_amount`:
  - `select amount from salary_structure_versions where salary_structure_id = $1 and $today between start_date and coalesce(end_date, $today)`.

### Auditoría
- Cada actualización registra `AMOUNT_UPDATED` en `hr_activity_log` con actor, timestamp y diff `amount_before → amount_after`.

---

## 9. Flujo principal

1. Admin entra a la ficha de la estructura y presiona `Actualizar monto`.
2. Se abre un modal `<Modal size="sm">` con Monto y Fecha de vigencia.
3. Admin completa y confirma.
4. El sistema valida y ejecuta el RPC `hr_update_salary_structure_amount(structure_id, new_amount, effective_date)`:
   a. Busca la versión vigente.
   b. Si la `effective_date` es anterior o igual al `start_date` vigente → error `invalid_effective_date`.
   c. UPDATE de la versión vigente `end_date = effective_date - 1 día`.
   d. INSERT nueva versión con `start_date = effective_date`, `end_date = null`.
   e. INSERT en `hr_activity_log`.
5. Retorna al listado con toast de éxito. El historial se refresca.

---

## 10. Flujos alternativos

### A. Monto inválido
1. Admin ingresa `amount <= 0`.
2. El sistema bloquea con `amount_must_be_positive`.

### B. Fecha retroactiva
1. Admin ingresa una `effective_date` anterior o igual al `start_date` de la versión vigente.
2. El sistema bloquea con `invalid_effective_date`.

### C. Transacción falla
1. Durante el RPC, una operación falla.
2. Rollback completo; no se crea la nueva versión ni se cierra la anterior.
3. Toast de error `unknown_error`.

### D. Consulta del historial
1. Admin abre la sección "Historial" en la ficha de la estructura.
2. Ve todas las versiones ordenadas por `start_date desc`, la primera con `end_date = null` marcada como `Vigente`.

---

## 11. UI / UX

### Reglas
- Modal de actualización con `<FormInput type="number" step="0.01">` para monto y `<FormInput type="date">` para fecha. Ambos required.
- Historial renderizado en una sub-sección de la ficha con `<DataTable density="compact">`. Columnas: Monto, Fecha inicio, Fecha fin, Actualizó, Actualizado el.
- La versión vigente lleva `<StatusBadge tone="accent">Vigente</StatusBadge>`.
- Feedback con toast.

---

## 12. Mensajes y textos

### Namespace
`rrhh.salary_structures.amount_update.*`

### Keys mínimas
- `trigger_cta` = "Actualizar monto"
- `modal_title`, `modal_description`
- `form_new_amount_label`, `form_effective_date_label`, `form_effective_date_helper`
- `submit_cta`, `submit_pending`, `cancel_cta`
- `history_title`, `history_current_badge`
- `feedback.{updated,amount_required,amount_must_be_positive,effective_date_required,invalid_effective_date,same_day_update,forbidden,unknown_error}`

---

## 13. Persistencia

### Entidad
- `public.salary_structure_versions`:
  - `id uuid pk`
  - `salary_structure_id uuid not null references salary_structures(id) on delete cascade`
  - `amount numeric(18,2) not null check (amount > 0)`
  - `start_date date not null`
  - `end_date date null`
  - `created_at timestamptz default now()`
  - `created_by_user_id uuid`
  - Unique parcial: `create unique index on salary_structure_versions (salary_structure_id) where end_date is null`
  - Índice: `(salary_structure_id, start_date desc)`.

### Vista auxiliar
- `public.salary_structure_current_amount` — materialización lógica (view):
  ```sql
  create view public.salary_structure_current_amount as
  select salary_structure_id, amount
  from public.salary_structure_versions
  where end_date is null;
  ```

### RPC
- `hr_update_salary_structure_amount(p_structure_id uuid, p_new_amount numeric, p_effective_date date) returns json`
  - SECURITY DEFINER, requiere `app.current_club_id` y que la estructura pertenezca al club.
  - Devuelve `{ok, code, version_id}`.

### RLS
- Policy `salary_structure_versions_club_scope` via join con `salary_structures`:
  `using (exists (select 1 from salary_structures ss where ss.id = salary_structure_versions.salary_structure_id and ss.club_id = current_setting('app.current_club_id', true)::uuid))`.

---

## 14. Seguridad

- RPC SECURITY DEFINER valida el `club_id` de la estructura vs `app.current_club_id`.
- El service chequea rol `admin | rrhh` server-side.
- La versión es inmutable: no existe endpoint de UPDATE.

---

## 15. Dependencias

- **contracts:** `Update salary structure amount`, `List salary structure versions`.
- **domain entities:** `salary_structure_versions`, `hr_activity_log`.
- **otras US:** US-54 (estructura base), US-57/US-58 (flag `uses_structure_amount` en contratos), US-61 (lectura del monto vigente al generar liquidaciones).
