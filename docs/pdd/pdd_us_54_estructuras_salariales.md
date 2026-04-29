# PDD — US-54 · Catálogo de Estructuras Salariales

> Primer PDD del módulo **E04 · RRHH**. Fuente: Notion `E04 👥 RRHH` · `US-30` → en el repo se numera como **US-54** para respetar la numeración global del backlog (ver `docs/product/backlog_us_mvp.md`).

> ⚠️ **MODELO REFACTORIZADO — 2026-04-24** (migración `20260424000000_hr_refactor_monto_al_contrato.sql`). El monto ya no vive en `salary_structures` ni en `salary_structure_versions` (esta última fue eliminada). Cada contrato (`staff_contracts`) lleva sus propias revisiones de monto en `staff_contract_revisions`. Las referencias en este PDD a "primera versión de monto" y a la tabla `salary_structure_versions` se conservan como contexto histórico; la implementación actual genera la primera revisión de monto sobre el contrato (ver US-57) y delega el versionado a US-55.

> ⚠️ **PERMISO REVISADO — 2026-04-28**: el módulo `/rrhh` quedó restringido al rol `rrhh` exclusivo (ver CLAUDE.md). `admin` no accede al módulo. Las menciones a "Admin del club" en este PDD se interpretan como **Coordinador de RRHH** (rol `rrhh`).

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como Coordinador de RRHH del club, quiero configurar el catálogo de Estructuras Salariales, para definir las posiciones rentadas del club con su remuneración estándar. |
| Prioridad | Alta |
| Objetivo de negocio | Establecer el maestro institucional de **posiciones rentadas** (rol funcional × actividad × tipo de remuneración) que sirve de fuente para armar contratos, proyectar costos y ejecutar liquidaciones mensuales. |

---

## 2. Problema a resolver

Hoy el club no tiene un lugar administrado para definir qué posiciones están habilitadas para ser ocupadas y cuánto remuneran de base. Esto impide proyectar el costo de la nómina, estandarizar contratos y asegurar consistencia entre lo que debe pagarse mes a mes a colaboradores que cumplen roles equivalentes.

---

## 3. Objetivo funcional

Dentro del módulo **`/rrhh`**, la pestaña **`Estructuras`** (ruta `/rrhh/structures`) permite al Coordinador de RRHH (rol `rrhh`) listar, crear y editar estructuras. Cada estructura representa una posición rentada con: nombre descriptivo, rol funcional, actividad, tipo de remuneración (`mensual_fijo | por_hora | por_clase`), monto vigente y estado (`activa | inactiva`). El monto inicial abre automáticamente la primera versión del historial de monto (ver US-55). La moneda se hereda del club (`clubs.currency_code`).

---

## 4. Alcance

### Incluye
- Pestaña **`Estructuras`** del módulo `/rrhh` (ruta `/rrhh/structures`), visible solo para rol `rrhh`.
- Sección `Estructuras Salariales` con listado, búsqueda por nombre, filtros por `Estado` y `Actividad`.
- Formulario de alta con: Nombre, Rol funcional, Actividad, Tipo de remuneración, Monto inicial, Carga horaria esperada (opcional), Estado.
- Formulario de edición con: Nombre, Tipo de remuneración, Carga horaria esperada, Estado. Rol funcional, Actividad y Monto son inmutables desde este formulario.
- Validación de unicidad `(club_id, functional_role, activity_id) where status = 'activa'`.
- Visualización en el listado del contrato vigente asociado (si existe) con link a ficha del colaborador.
- Estado vacío con CTA `+ Nueva Estructura Salarial`.
- Historial de auditoría (CREATED / UPDATED / STATUS_CHANGED) con actor, timestamp y diffs.

### No incluye
- Actualización de monto (cubierta por US-55).
- Adjuntos o documentos ligados a la estructura.
- Dimensión adicional de distinción entre dos colaboradores en la misma actividad con el mismo rol funcional (ver decisión #6 del plan aprobado: se distinguen vía `functional_role`).
- Override de moneda por estructura: se hereda siempre de `clubs.currency_code`.
- Conversión de moneda o cambios de moneda del club.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `rrhh` en el club activo.

---

## 6. Precondiciones

- Existe un club activo resuelto.
- El usuario tiene rol `rrhh` en ese club.
- El catálogo de `activities` del club tiene al menos un ítem activo (US-20).
- `clubs.currency_code` está poblado (backfill `ARS` vía migración de Fase 0).

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin abre la pestaña Estructuras sin datos | Ve el estado vacío con CTA de alta. |
| Admin crea una estructura válida | La estructura queda en `activa` y se crea su primera versión de monto con `start_date = hoy` y `end_date = null`. |
| Admin edita campos permitidos | Los cambios se persisten y quedan registrados en el historial de auditoría. |
| Admin inactiva una estructura | La estructura deja de aparecer como seleccionable al crear contratos nuevos. Contratos vigentes sobre ella no se ven afectados. |
| Usuario sin rol `rrhh` | No ve el módulo RRHH ni la pestaña. |

---

## 8. Reglas de negocio

### Acceso
- Solo usuarios con rol `rrhh` del club activo pueden listar y mutar estructuras.
- `tesoreria` no accede a la administración de estructuras (puede ver nombres de estructura en liquidaciones vía US-67 como read-only).

### Campos obligatorios
- Nombre, Rol funcional, Actividad, Tipo de remuneración y Monto son obligatorios en el alta.
- Monto debe ser mayor a cero.
- Carga horaria esperada es opcional (relevante cuando el tipo es `por_hora` o `por_clase`).

### Unicidad
- Unique parcial `(club_id, lower(trim(functional_role)), divisions, coalesce(activity_id::text, ''), remuneration_type) where status = 'activa'`. Las cinco coordenadas componen la identidad funcional de la estructura. Si dos colaboradores ocupan el mismo rol en la misma actividad y divisiones, se usa `functional_role` distinto (`Profesor titular` vs `Profesor suplente`); si la única diferencia es la remuneración (`mensual_fijo` vs `por_hora`), se admiten estructuras separadas porque `remuneration_type` participa de la unicidad.
- No hay unicidad de `name` porque el nombre es descriptivo; la unicidad funcional vive en `(role, divisions, activity, remuneration_type)`.

### Campos inmutables en edición
- Rol funcional, Actividad y Monto base (vigente) son **inmutables desde esta US**.
- El monto se actualiza mediante la US-55 que crea versiones con trazabilidad.
- Rol funcional y Actividad cambian sólo creando una nueva estructura e inactivando la anterior.

### Estado
- Valores: `activa | inactiva`. Default `activa`.
- Una estructura `inactiva` no aparece en los selectores de contrato nuevo (US-57). Contratos vigentes se preservan y se finalizan explícitamente por US-58.

### Moneda
- Se hereda siempre de `clubs.currency_code`. No se guarda en la fila de la estructura (se resuelve vía join en consultas que lo necesiten).

### Auditoría
- Cada alta registra un evento `CREATED` con snapshot inicial.
- Cada edición registra un evento `UPDATED` con diff campo-a-campo.
- El cambio de estado activa ↔ inactiva registra `STATUS_CHANGED`.
- El audit es append-only; no se permite edición ni borrado.

---

## 9. Flujo principal

1. Admin entra al módulo `/rrhh` y selecciona la pestaña `Estructuras`.
2. Ve la sección `Estructuras Salariales` con filtros y botón `+ Nueva Estructura Salarial`.
3. Admin abre el formulario de alta y completa los campos obligatorios.
4. Admin guarda.
5. El sistema valida obligatoriedad, unicidad y monto > 0.
6. Crea la fila en `salary_structures`, crea la primera versión en `salary_structure_versions` con `amount = input.amount`, `start_date = hoy`, `end_date = null`, registra `CREATED` en `hr_activity_log`.
7. Retorna al listado con feedback toast.
8. Admin abre una estructura existente y edita nombre, tipo, carga horaria o estado.
9. El sistema valida, persiste, registra `UPDATED` con diff.

---

## 10. Flujos alternativos

### A. Duplicado por rol + actividad activa
1. Admin crea una estructura con un par `(rol, actividad)` ya ocupado por otra activa.
2. El sistema bloquea con `duplicate_role_activity`.

### B. Monto inválido
1. Admin ingresa `monto <= 0`.
2. El sistema bloquea con `invalid_amount`.

### C. Estructura ocupada intenta inactivarse
1. Admin cambia estado de `activa` a `inactiva`.
2. Si tiene contrato vigente (US-57), **se permite igualmente** — la regla de "estructura inactiva no está disponible para contratos nuevos" no afecta al contrato vigente ya creado. La finalización del contrato se gestiona por US-58.

### D. Usuario sin rol apropiado
1. Usuario con rol distinto intenta acceder.
2. El módulo `/rrhh` redirige al dashboard; las rutas directas `/rrhh/*` no se renderizan.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- Shell de tab: `<SettingsTabShell>`.
- Listado: `<DataTable density="comfortable" gridColumns>` con columnas Nombre, Rol funcional, Actividad, Tipo, Monto vigente, Estado, Contrato vigente.
- Chips de tipo: `<DataTableChip tone>` con los valores `mensual fijo | por hora | por clase`.
- Acciones por fila: `<DataTableActions>` hover-reveal con `Editar` y `Actualizar monto` (link que abre US-55).
- Modal de alta/edición: `<Modal size="md">` + `<ModalFooter submitVariant="primary">`.
- Todos los campos usan primitivos (`<FormField>`, `<FormInput>`, `<FormSelect>`, `<FormFieldLabel required>`).
- Empty state: `<EmptyState variant="dashed">` con CTA `+ Nueva Estructura Salarial`.
- Feedback: toasts vía `flashToast`/`triggerClientFeedback`, nunca inline post-acción.

---

## 12. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Namespace propuesto
`rrhh.salary_structures.*` (nuevo, bajo top-level `rrhh`).

### Keys mínimas requeridas
- `tab_title`, `section_title`, `section_description`
- `search_placeholder`, `create_cta`, `empty_title`, `empty_description`, `empty_cta`
- `filter_all`, `filter_active`, `filter_inactive`
- `form_name_label`, `form_role_label`, `form_activity_label`, `form_remuneration_type_label`, `form_amount_label`, `form_workload_hours_label`, `form_status_label`
- `remuneration_type_options.{mensual_fijo,por_hora,por_clase}`
- `status_options.{activa,inactiva}`
- `feedback.{created,updated,status_changed,name_required,role_required,activity_required,remuneration_type_required,amount_required,amount_must_be_positive,duplicate_role_activity,forbidden,unknown_error}`
- `audit_log_title`, columnas de historial.

---

## 13. Persistencia

### Entidades nuevas
- `public.salary_structures`:
  - `id uuid pk default gen_random_uuid()`
  - `club_id uuid not null references public.clubs(id)`
  - `name text not null`
  - `functional_role text not null`
  - `activity_id uuid not null references public.activities(id)`
  - `remuneration_type text not null check (remuneration_type in ('mensual_fijo','por_hora','por_clase'))`
  - `workload_hours numeric(10,2) null`
  - `status text not null default 'activa' check (status in ('activa','inactiva'))`
  - `created_at timestamptz default now()`, `updated_at timestamptz default now()`
  - `created_by_user_id uuid`, `updated_by_user_id uuid`
  - Unique parcial: `create unique index on salary_structures (club_id, lower(trim(functional_role)), activity_id) where status = 'activa'`
  - Índices: `(club_id, status)`, `(club_id, activity_id)`.
- `public.salary_structure_versions` (ver US-55) se crea en la misma migration pero la escritura activa aquí es sólo la **primera versión** creada al alta.
- `public.hr_activity_log`:
  - `id`, `club_id`, `entity_type text`, `entity_id uuid`, `action text`, `payload_before jsonb`, `payload_after jsonb`, `performed_by_user_id uuid`, `performed_at timestamptz`.

### RLS
- Policy `salary_structures_club_scope` en todas las operaciones: `using (club_id = current_setting('app.current_club_id', true)::uuid)`.
- Mutación gate adicional al rol: aplicar check de permiso en la capa server-side (service) — RLS valida aislamiento, el service valida rol.

---

## 14. Seguridad
- Toda lectura y mutación se limita al club activo vía `app.current_club_id`.
- El `club_id` lo resuelve el service a partir del contexto de sesión; nunca se acepta del cliente.
- El rol se verifica server-side en el service (`rrhh`).
- Historial de auditoría append-only; no existe acción "delete" expuesta.

---

## 15. Dependencias
- **contracts:** `List salary structures`, `Create salary structure`, `Update salary structure`, `Get salary structure audit log`.
- **domain entities:** `salary_structures`, `salary_structure_versions` (creación inicial), `hr_activity_log`, `activities`, `clubs.currency_code`.
- **permissions:** rol `rrhh` (exclusivo del módulo `/rrhh` — ver guard `canAccessHrModule` en `lib/domain/authorization.ts`).
- **otras US:** US-55 (versionado de monto — crea el primer version row), US-20 (activities), US-46 (`clubs.currency_code`).
