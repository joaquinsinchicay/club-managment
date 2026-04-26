# PDD — US-56 · CRUD de Colaboradores

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · alias `US-31`. En el repo: **US-56**. (Pre-refactor 2026-04-27 el alias era `US-32`.)

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como Admin del club, quiero dar de alta, editar y dar de baja colaboradores, para mantener el maestro de personas rentadas del club. |
| Prioridad | Alta |
| Objetivo de negocio | Consolidar el maestro de personas rentadas con datos personales, de contacto y de pago, manteniendo su historial de vínculos con el club a lo largo del tiempo. |

---

## 2. Problema a resolver

Hoy no hay un registro formal de las personas que reciben remuneración del club. Sin este maestro, no pueden armarse contratos ni generar liquidaciones, y se pierde la trazabilidad de personas que rotaron por el club.

---

## 3. Objetivo funcional

Dentro del módulo `/rrhh`, la pestaña **`Colaboradores`** (ruta `/rrhh/staff`) permite a `admin` y `rrhh` listar, crear, editar, activar y desactivar personas rentadas. Cada colaborador tiene nombre, DNI, CUIT/CUIL, datos de contacto, tipo de vínculo, CBU/alias, fecha de alta y estado. La baja lógica se bloquea si hay contratos vigentes.

---

## 4. Alcance

### Incluye
- Listado con Nombre, DNI, Tipo de vínculo, Estado, Cantidad de contratos vigentes.
- Búsqueda por nombre o DNI; filtros por Estado y Tipo de vínculo.
- Alta con formulario completo.
- Edición de datos del colaborador en cualquier estado.
- Baja lógica (`status = 'inactivo'`) bloqueada si tiene contratos vigentes.
- Reactivación (inactivo → activo) preservando todo el historial.
- Historial de auditoría en `hr_activity_log`.

### No incluye
- Upload de documentos o fotos (fuera de scope MVP).
- Integración con sistema de invitaciones/auth (colaborador no necesariamente es usuario del sistema).
- Import masivo vía CSV.
- Edición de campos después de tener liquidaciones (todos los campos permanecen editables; los snapshots de liquidaciones preservan los datos del momento).

---

## 5. Actor principal

`admin` o `rrhh` del club activo.

---

## 6. Precondiciones

- Club activo resuelto.
- Rol `admin` o `rrhh` confirmado.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Alta válida | Colaborador queda `activo`. |
| Baja con contratos vigentes | Bloqueada con mensaje específico. |
| Baja sin contratos vigentes | Colaborador pasa a `inactivo`, se registra `fecha_baja`. |
| Reactivación | Colaborador vuelve a `activo`, historial intacto. |

---

## 8. Reglas de negocio

### Campos obligatorios
- `first_name`, `last_name`, `dni`, `cuit_cuil`, `vinculo_type` son obligatorios.
- `email`, `phone`, `cbu_alias`, `fecha_alta` son opcionales. `fecha_alta` default `current_date`.

### Formatos
- `dni`: 7 u 8 dígitos numéricos. Normalizar quitando puntos y espacios.
- `cuit_cuil`: validar formato `XX-XXXXXXXX-X` y dígito verificador AFIP (reutilizar `lib/validators/cuit.ts`).
- `email`: si se informa, RFC-valid.
- `phone`: si se informa, E.164 con prefijo internacional.
- `cbu_alias`: string libre, 6 a 22 caracteres.

### Tipo de vínculo
- Enum: `relacion_dependencia | monotributista | honorarios`. Visible en UI con labels amigables.

### Unicidad
- Unique parcial: `(club_id, dni) where status = 'activo'`. Mismo DNI activo no puede existir dos veces en el club.
- Unique parcial: `(club_id, cuit_cuil) where status = 'activo'`.
- Un colaborador inactivo con DNI X no bloquea alta de otro activo con DNI X (escenario de cambio de persona real); el sistema muestra warning informativo pero permite guardar.

### Baja lógica
- Sólo permitida si `count(*) from staff_contracts where staff_member_id = $1 and status = 'vigente' = 0`.
- Al pasar a `inactivo`, setear `deactivated_at = now()`.
- Baja preserva todos los registros históricos (contratos finalizados, liquidaciones, pagos).

### Reactivación
- Permite volver a `activo`. Setea `deactivated_at = null`.

### Auditoría
- `CREATED`, `UPDATED`, `DEACTIVATED`, `REACTIVATED` en `hr_activity_log`.

---

## 9. Flujo principal

1. Admin abre la sección `Colaboradores`.
2. Presiona `+ Nuevo Colaborador`.
3. Completa el formulario.
4. Guarda. El sistema valida, persiste y emite toast.
5. Para editar: abre la fila, modifica, guarda.
6. Para dar de baja: abre la fila, cambia Estado a `inactivo` y guarda.

---

## 10. Flujos alternativos

### A. DNI / CUIT duplicado activo
Bloqueo con `duplicate_dni` o `duplicate_cuit_cuil`.

### B. Formato de CUIT/CUIL inválido
Bloqueo con `invalid_cuit_cuil`.

### C. Baja con contratos vigentes
Bloqueo con `has_active_contracts`. Se ofrece link "Finalizar contratos vigentes" que navega al listado de contratos.

### D. Reactivación con DNI ya ocupado
Si al reactivar existe otro colaborador activo con el mismo DNI: bloquea con `duplicate_dni`. El admin debe resolver la colisión primero.

---

## 11. UI / UX

### Reglas
- Listado: `<DataTable density="comfortable" gridColumns>`.
- `<Avatar name>` con iniciales en cada fila.
- `<StatusBadge>` para estado `activo`/`inactivo`.
- Chip con `vinculo_type`: `<DataTableChip tone="neutral">`.
- Modal de alta/edición `<Modal size="md">` con secciones: Datos personales, Contacto, Vínculo, Datos de pago.
- Baja confirmable vía `<Modal size="sm">` con `<FormBanner variant="warning">`.
- Alerta visual cuando `status = 'activo'` y `active_contracts_count = 0` (ver US-60).

---

## 12. Mensajes y textos

### Namespace
`rrhh.staff_members.*`

### Keys mínimas
- `section_title`, `section_description`, `create_cta`, `search_placeholder`
- `filter_all`, `filter_active`, `filter_inactive`
- `form_first_name_label`, `form_last_name_label`, `form_dni_label`, `form_cuit_label`, `form_email_label`, `form_phone_label`, `form_vinculo_label`, `form_cbu_alias_label`, `form_hire_date_label`, `form_status_label`
- `vinculo_options.{relacion_dependencia,monotributista,honorarios}`
- `status_options.{activo,inactivo}`
- `deactivate_cta`, `deactivate_modal_title`, `deactivate_confirm`, `reactivate_cta`
- `feedback.{created,updated,deactivated,reactivated,first_name_required,last_name_required,dni_required,invalid_dni,cuit_required,invalid_cuit_cuil,vinculo_required,email_invalid,phone_invalid,duplicate_dni,duplicate_cuit_cuil,has_active_contracts,forbidden,unknown_error}`

---

## 13. Persistencia

### Entidad
- `public.staff_members`:
  - `id uuid pk`
  - `club_id uuid not null references clubs(id)`
  - `first_name text not null`, `last_name text not null`
  - `dni text not null`, `cuit_cuil text not null`
  - `email text null`, `phone text null`
  - `vinculo_type text not null check (vinculo_type in ('relacion_dependencia','monotributista','honorarios'))`
  - `cbu_alias text null`
  - `hire_date date not null default current_date`
  - `status text not null default 'activo' check (status in ('activo','inactivo'))`
  - `deactivated_at timestamptz null`
  - `created_at timestamptz default now()`, `updated_at timestamptz default now()`
  - `created_by_user_id uuid`, `updated_by_user_id uuid`
  - Índices: `(club_id, status)`, `(club_id, last_name, first_name)`.
  - Unique parciales: `(club_id, dni) where status = 'activo'`, `(club_id, cuit_cuil) where status = 'activo'`.

### RLS
- `staff_members_club_scope`: `club_id = current_setting('app.current_club_id', true)::uuid`.

---

## 14. Seguridad

- Club scoping por RLS.
- Validación de rol `admin | rrhh` en service.
- DNI, CUIT y CBU son **PII sensible**: logs y exports deben mascarar o requerir permisos explícitos. En la UI se muestran completos a `admin | rrhh`; no se exponen a otros roles.
- Las API/server actions nunca reciben `club_id` del cliente.

---

## 15. Dependencias

- **contracts:** `List staff members`, `Create staff member`, `Update staff member`, `Deactivate staff member`, `Reactivate staff member`.
- **domain entities:** `staff_members`, `staff_contracts` (lectura para validar baja), `hr_activity_log`.
- **validators:** `lib/validators/cuit.ts` (reutilizar), nuevo `lib/validators/dni.ts` si no existe.
- **otras US:** US-57 (contratos), US-60 (alerta sin contratos), US-67 (ficha).
