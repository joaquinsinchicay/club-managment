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
- Totales en cero.

### B. Colaborador inactivo
- Banner informativo `<FormBanner variant="info">Colaborador inactivo desde {fecha}`.
- Historial completo visible. Sin CTA para nuevos contratos.

### C. Colaborador no pertenece al club activo (intento por URL)
- RLS → 404.

---

## 11. UI / UX

### Reglas
- Layout mobile-first, grid de 2 columnas en desktop.
- Encabezado con `<Avatar name size="lg">` + nombre + chips de estado y tipo de vínculo.
- Card de datos personales: `<Card padding="comfortable">` con 2 columnas.
- Card de totales: dos números grandes (año, mes) con labels.
- Sección contratos: `<DataTable density="comfortable">` con columnas Estructura, Rol, Actividad, Fechas, Monto, Estado.
- Sección liquidaciones: `<DataTable density="compact">` con columnas Período, Contrato, Monto final, Estado, con filtro por mes/año y estado.
- Sección pagos: `<DataTable density="compact">` con columnas Fecha, Monto, Cuenta, Movimiento.
- Empty states con `<DataTableEmpty>`.
- Alerta colaborador sin contratos: `<FormBanner variant="warning">` al top.
- CTAs con `<LinkButton>` / `<Button>` del canon.

---

## 12. Mensajes y textos

### Namespace
`rrhh.staff_profile.*`

### Keys mínimas
- `section_personal_data`, `section_contracts`, `section_settlements`, `section_payments`, `section_totals`
- `total_paid_year_label`, `total_paid_month_label`
- `new_contract_cta`, `edit_staff_cta`
- `empty_contracts`, `empty_settlements`, `empty_payments`
- `alert_no_contracts_title`, `alert_no_contracts_description`, `deactivate_cta`, `ignore_alert_cta`
- `inactive_banner`
- Columnas de cada tabla.

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

-- Totales
select
  coalesce(sum(case when extract(year from ps.paid_at) = extract(year from current_date) then ps.total_amount end), 0) as total_year,
  coalesce(sum(case when date_trunc('month', ps.paid_at) = date_trunc('month', current_date) then ps.total_amount end), 0) as total_month
from payroll_settlements ps
join staff_contracts sc on sc.id = ps.contract_id
where sc.staff_member_id = $id and ps.status = 'pagada';
```

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
