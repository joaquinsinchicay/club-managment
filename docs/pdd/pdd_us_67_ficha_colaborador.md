# PDD — US-67 · Ficha consolidada del colaborador

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · alias `US-46`. En el repo: **US-67**. (Pre-refactor 2026-04-27 el alias era `US-43`.)

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como Tesorero del club, quiero consultar la ficha de un colaborador con todos sus contratos y pagos históricos, para tener visibilidad completa de su vínculo rentado con el club. |
| Prioridad | Alta |
| Objetivo de negocio | Centralizar en una sola vista toda la información operativa y financiera de un colaborador: datos personales, vínculos contractuales, liquidaciones, pagos efectivos y totales consolidados. |

---

## 2. Problema a resolver

La información del colaborador hoy estaría dispersa en múltiples listados (contratos, liquidaciones, movimientos). Sin un punto de consolidación, rastrear la historia financiera con un colaborador requiere múltiples navegaciones y filtros manuales.

---

## 3. Objetivo funcional

Una página `/rrhh/staff/[id]` accesible desde el listado de colaboradores (US-56) muestra en una sola vista: datos personales, contratos (vigentes y finalizados), liquidaciones (todos los estados), pagos efectivos (con link al movement), totales consolidados año/mes, alerta visual si el colaborador está `activo` sin contratos vigentes, y CTA de acceso rápido para crear un contrato.

---

## 4. Alcance

### Incluye
- Página `/rrhh/staff/[id]` accesible para `admin`, `rrhh`, `tesoreria`.
- Encabezado con datos personales y alerta si aplica.
- Sección "Contratos" con listado de todos (vigentes + finalizados).
- Sección "Liquidaciones" con todos los estados y filtros.
- Sección "Pagos" con fecha, monto, cuenta, link al movement.
- Card de totales: pagado en el año, pagado en el mes en curso.
- CTA "+ Nuevo contrato" que precarga el colaborador.

### No incluye
- Export PDF de la ficha (futuro).
- Edición inline; se hace via modal (US-56/US-57).
- Comparativas con otros colaboradores.

---

## 5. Actor principal

`admin`, `rrhh` o `tesoreria`.

---

## 6. Precondiciones

- El colaborador existe y pertenece al club activo.

---

## 7. Postcondiciones

- Lectura server-side; sin mutaciones directas desde esta vista.
- La navegación a acciones (nuevo contrato, editar colaborador, pago) abre modales o páginas específicas ya cubiertas por otras US.

---

## 8. Reglas de negocio

### Permisos de lectura
- `admin`, `rrhh`, `tesoreria` pueden acceder. Otros roles: 404 o redirect.
- RLS garantiza que sólo se lee del club activo.

### Agregados
- `total_paid_year`: suma de `total_amount` de liquidaciones `pagada` del año en curso.
- `total_paid_month`: suma del mes en curso.
- Ambos calculados server-side en tiempo de render.

### Alerta
- Si `staff_member.status = 'activo'` y no tiene `staff_contracts.status = 'vigente'`, se muestra `<FormBanner variant="warning">` con las acciones `Dar de baja` e `Ignorar` (US-60).

### Permisos de acción
- CTA "+ Nuevo contrato" visible sólo para `admin | rrhh`.
- CTA "Editar colaborador" visible sólo para `admin | rrhh`.
- `tesoreria` ve la ficha read-only (puede acceder a liquidaciones y pagos, pero no crear contratos ni editar colaborador).

### Navegación
- Cada liquidación → link a su detalle (`/rrhh/settlements/[id]`).
- Cada pago → link al movement en Tesorería (`/treasury/movements/[id]` o similar del patrón existente).

---

## 9. Flujo principal

1. Usuario abre listado de colaboradores y selecciona uno.
2. Navega a `/rrhh/staff/[id]`.
3. El server carga en paralelo:
   - `staff_members` (detalle).
   - `staff_contracts where staff_member_id = $id` ordenados por `start_date desc`.
   - `payroll_settlements where contract_id in (...)` con join a contract + structure para display.
   - `treasury_movements where payroll_settlement_id in (...)`.
   - Agregados año/mes.
4. Renderiza la ficha.

---

## 10. Flujos alternativos

### A. Colaborador sin contratos ni liquidaciones
- Secciones "Contratos", "Liquidaciones", "Pagos" muestran `<EmptyState variant="dashed">` específico.
- Card "Actividad reciente" muestra fallback `activity_empty`.

### B. Colaborador inactivo
- Banner informativo `<FormBanner variant="info">Colaborador inactivo desde {fecha}`.
- Historial completo visible. Sin CTA para nuevos contratos.

### C. Colaborador no pertenece al club activo (intento por URL)
- RLS → 404.

---

## 11. UI / UX

### Reglas
- Layout mobile-first, grid de 2 columnas en desktop (`lg:grid-cols-[2fr_1fr]`).
- Encabezado con `<Avatar name size="lg">` + nombre (`text-h1`) + eyebrow + chips de estado y tipo de vínculo.
- Cards de información (Datos personales, Contacto, Datos bancarios): `<Card padding="comfortable">` con `<CardHeader>` **sin** `divider` — el título y la descripción quedan flush con el grid de campos. Tipografía via tokens DS (`text-eyebrow tracking-card-eyebrow` para labels, `text-body` para valores).
- Sección contratos: `<DataTable density="comfortable">` con columnas Estructura, Rol, Actividad, Fechas, Monto, Estado.
- Sección liquidaciones: `<DataTable density="compact">` con columnas Período, Contrato, Monto final, Estado, con filtro por mes/año y estado.
- Sección pagos: `<DataTable density="compact">` con columnas Fecha, Monto, Cuenta, Movimiento.
- **Aside derecha**:
  1. **Antigüedad en el club** — `<Card tone="accent-rrhh">` con eyebrow + número grande (`text-h1`) + fecha de alta.
  2. **Actividad reciente** — `<Card padding="comfortable">` con eyebrow `Actividad reciente` y lista de hasta 8 entradas derivadas de `hr_activity_log` (ver § 13). Cada entrada muestra label de la acción + detalle (fecha · período · monto · código de contrato según el tipo). Empty state inline con `activity_empty`. **No hay cards "Totales pagado"** — la información de totales pagados se consulta desde Liquidaciones.
- Empty states con `<DataTableEmpty>`.
- Alerta colaborador sin contratos: `<FormBanner variant="warning">` al top.
- CTAs con `<LinkButton>` / `<Button>` del canon.

---

## 12. Mensajes y textos

### Namespace
`rrhh.staff_profile.*`

### Keys mínimas
- `info_title`, `info_description`, `info_*_label`
- `contact_title`, `contact_description`, `contact_*_label`
- `bank_title`, `bank_description`, `bank_cbu_label`
- `tenure_eyebrow`, `tenure_*_singular/plural`, `tenure_zero`, `tenure_since_template`
- `activity_eyebrow`, `activity_empty`, `activity_actions.{staff_member_created,staff_member_updated,staff_member_bank_updated,staff_contract_created,staff_contract_finalized,staff_contract_revision_created,payroll_settlement_generated,payroll_settlement_approved,payroll_settlement_paid,payroll_settlement_returned,payroll_settlement_voided,fallback}`
- `contracts_*`, `settlements_*`, `payments_*` (títulos, columnas, empty states)
- `new_contract_cta`, `edit_cta`
- `alert_no_active_contracts`

---

## 13. Persistencia

- Sólo lectura.
- Queries derivadas de entidades existentes: `staff_members`, `staff_contracts`, `payroll_settlements`, `payroll_settlement_adjustments`, `treasury_movements`, `treasury_accounts`, `salary_structures`, `activities`.

### Queries clave (pseudocódigo)
```sql
-- Ficha base
select * from staff_members where id = $id and club_id = current_setting('app.current_club_id')::uuid;

-- Contratos con joins
select sc.*, ss.name as structure_name, ss.functional_role, a.name as activity_name
from staff_contracts sc
join salary_structures ss on ss.id = sc.salary_structure_id
join activities a on a.id = ss.activity_id
where sc.staff_member_id = $id
order by sc.start_date desc;

-- Liquidaciones con joins
select ps.*, sc.id as contract_id, ss.functional_role
from payroll_settlements ps
join staff_contracts sc on sc.id = ps.contract_id
join salary_structures ss on ss.id = sc.salary_structure_id
where sc.staff_member_id = $id
order by ps.period_year desc, ps.period_month desc;

-- Actividad reciente (US-67 v2)
-- Une eventos del miembro + sus contratos + sus liquidaciones, ordenados desc.
select id, entity_type, action, performed_at, payload_before, payload_after
from hr_activity_log
where club_id = current_setting('app.current_club_id')::uuid
  and (
       (entity_type = 'staff_member' and entity_id = $id)
    or (entity_type = 'staff_contract' and entity_id in (select id from staff_contracts where staff_member_id = $id))
    or (entity_type = 'payroll_settlement' and entity_id in (
          select ps.id from payroll_settlements ps
          join staff_contracts sc on sc.id = ps.contract_id
          where sc.staff_member_id = $id))
  )
order by performed_at desc
limit 8;
```

#### Mapping `(entity_type, action) → label`
- `staff_member.created` → `staff_member_created` ("Colaborador creado").
- `staff_member.updated` → `staff_member_updated`. Si el único campo cambiado entre `payload_before` y `payload_after` es `cbuAlias`, se reescribe a `staff_member_bank_updated` ("Datos bancarios actualizados").
- `staff_contract.created` → `staff_contract_created` (detalle: código de contrato).
- `staff_contract.finalized` → `staff_contract_finalized`.
- `staff_contract_revision.created` → `staff_contract_revision_created` (detalle: monto formateado).
- `payroll_settlement.{generated|approved|paid|returned|voided}` → label correspondiente (detalle: período + total).
- Cualquier otra combinación cae a `activity_actions.fallback`.

### RLS
- Todas las tablas son club-scoped. No se requieren policies adicionales.

---

## 14. Seguridad

- RLS club-scoped.
- Verificación de rol en page component (sin acceso → 404).
- PII (DNI, CUIT, CBU) visible para roles autorizados.

---

## 15. Dependencias

- **domain entities:** `staff_members`, `staff_contracts`, `payroll_settlements`, `treasury_movements`, `salary_structures`, `activities`, `treasury_accounts`.
- **otras US:** US-56, US-57, US-58, US-60, US-61, US-62, US-63, US-64, US-65, US-66.

---

## 16. Mirror para rol Tesorería en `/treasury/staff/[id]` (refactor 2026-04-27)

> **Notion alias**: US-46 (corresponde a esta US-67 en numeración repo).

E04 RRHH (Notion) pidió que rol Tesorería pueda **leer** la ficha del
colaborador desde su propio módulo, sin abrir `/rrhh` (que sigue
exclusivo de rol RRHH según [CLAUDE.md](../../CLAUDE.md)).

### Implementación

- **Ruta nueva**: `app/(dashboard)/treasury/staff/[id]/page.tsx` — server component, redirige a `/treasury` si no es Tesorería.
- **Authorization** (`lib/domain/authorization.ts`):
  - `canAccessTreasuryStaffProfile(membership)` — guard de página, rol `tesoreria`.
  - `canViewStaffProfile(membership)` — guard del service, rol `rrhh` o `tesoreria` (permisivo). El `getStaffProfile` se cambió a este guard para soportar ambas rutas con un único service.
- **Componente**: `components/hr/staff-profile-view.tsx` — props `updateAction` y `createContractAction` ahora opcionales + handlers defensivos. En modo Tesorería se invoca con `canMutate={false}` y sin pasar las actions, lo que oculta los CTAs de "Editar" y "Nuevo contrato".
- **Bandeja**: el nombre del colaborador en filas de `components/treasury/payroll-tray.tsx` es un `<Link>` a `/treasury/staff/${staffMemberId}`.

### Acceso esperado por rol

| Rol activo | `/rrhh/staff/[id]` | `/treasury/staff/[id]` |
|---|---|---|
| RRHH puro | ✅ con CTAs Editar / Nuevo contrato | ❌ redirige a `/treasury` |
| Tesorería puro | ❌ redirige a `/dashboard` | ✅ read-only |
| Ambos | ✅ con CTAs | ✅ read-only |
