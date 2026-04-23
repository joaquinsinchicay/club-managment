# Domain Model

## Objetivo

Este documento define el modelo de dominio del sistema de gestión de clubes, describiendo entidades, relaciones y reglas de negocio.
Es la base para la implementación del esquema de datos (`domain/schema.sql`), contratos de API y lógica de permisos.

---

## 1. Principios del dominio

1. El sistema es **multi-club**.
2. Un usuario puede pertenecer a múltiples clubes.
3. Los permisos dependen de la **membership** (no del usuario global).
4. Toda operación ocurre dentro de un **club activo**.
5. La tesorería es **configurable por club**.
6. Los movimientos son la **fuente única de verdad financiera**.
7. La consolidación se realiza por **día y por club**.
8. Toda operación relevante debe ser **auditada**.

---

## 2. Decisiones cerradas de modelado (MVP)

1. Cada usuario tiene una única membership por club y uno o más roles.
2. Todas las cuentas se modelan en una única tabla.
3. Todos los movimientos se modelan en una única tabla.
4. Los saldos se calculan a partir de movimientos.
5. La consolidación es un proceso explícito con batch y auditoría.
6. El cierre bloquea edición para Secretaría; Tesorería corrige con trazabilidad.

---

## 3. Entidades de acceso

### 3.1 User

Representa un usuario autenticado.

Atributos:

* id
* email (único)
* full_name
* avatar_url
* created_at
* updated_at

---

### 3.2 Club

Representa un club.

Atributos:

* id
* name
* slug (único)
* status
* created_at
* updated_at

---

### 3.3 Membership

Relación entre usuario y club.

Atributos:

* id
* user_id
* club_id
* roles
* status
* joined_at
* approved_at
* approved_by_user_id

Roles:

* admin
* secretaria
* tesoreria

Estados:

* pendiente_aprobacion
* activo
* inactivo

Reglas:

* Un usuario tiene máximo una membership por club.
* Una membership puede combinar múltiples roles operativos para el mismo club.
* Los permisos se resuelven por unión de roles.
* Debe existir al menos un admin activo por club.

---

### 3.4 ClubInvitation

Invitación a un club.

Atributos:

* id
* club_id
* email
* role (rol inicial)
* status
* expires_at
* used_at

---

### 3.5 UserClubPreference

Preferencias del usuario.

Atributos:

* user_id
* last_active_club_id

---

## 4. Configuración de tesorería

### 4.1 TreasuryAccount

Cuenta del club.

Atributos:

* id
* display_id
* club_id
* name
* account_type
* visible_for_secretaria
* visible_for_tesoreria
* emoji

Reglas:

* La visibilidad por rol es la fuente de verdad funcional de la cuenta.
* Una cuenta debe ser visible para `secretaria`, `tesoreria` o ambos.
* Si una cuenta es visible para un rol, ese rol puede consumirla en formularios y saldos donde corresponda.
* `status` puede conservarse como dato legacy de persistencia, pero no define el comportamiento de negocio.
* `account_scope` puede conservarse como dato legacy en persistencia, pero no define el comportamiento de negocio.

---

### 4.2 TreasuryAccountCurrency

Monedas habilitadas por cuenta.

Atributos:

* id
* account_id
* currency_code

---

### 4.3 TreasuryCategory

Categorías.

Atributos:

* id
* club_id
* name
* visible_for_secretaria
* visible_for_tesoreria
* emoji

Reglas:

* La visibilidad por rol es la fuente de verdad funcional de la categoría.
* Una categoría debe ser visible para `secretaria`, `tesoreria` o ambos.
* `status` puede conservarse como dato legacy de persistencia, pero no define el comportamiento de negocio.

---

### 4.4 ClubActivity

Actividades deportivas.

Atributos:

* id
* club_id
* name
* visible_for_secretaria
* visible_for_tesoreria
* emoji

Reglas:

* La visibilidad por rol es la fuente de verdad funcional de la actividad.
* Una actividad debe ser visible para `secretaria`, `tesoreria` o ambos.
* `status` puede conservarse como dato legacy de persistencia, pero no define el comportamiento de negocio.

---

### 4.5 ClubCalendarEvent

Eventos del calendario.

Atributos:

* id
* club_id
* title
* starts_at
* ends_at
* is_enabled_for_treasury

---

### 4.6 ReceiptFormat

Integración de recibos consumida por la operatoria diaria. Cada club debe contar con una configuración bootstrap del sistema de socios persistida en `receipt_formats`, editable por Admin y con posibilidad de quedar `Oculta` para todos los roles operativos.

Atributos:

* id
* club_id
* name
* validation_type
* pattern
* min_numeric_value
* example
* status
* visible_for_secretaria
* visible_for_tesoreria

---

### 4.7 ClubTreasuryCurrency

Monedas del club.

Atributos:

* id
* club_id
* currency_code
* is_primary

---

### 4.8 ClubMovementTypeConfig

Tipos de movimiento habilitados.

Atributos:

* id
* club_id
* movement_type
* is_enabled

---

## 5. Operatoria diaria

### 5.1 DailyCashSession

Jornada de Secretaría.

Atributos:

* id
* club_id
* session_date
* status (open/closed)
* opened_at
* closed_at
* opened_by_user_id
* closed_by_user_id
* close_type (manual/auto): distingue cierres manuales de Secretaría de cierres automáticos disparados por el guard del layout autenticado al detectar jornadas colgadas
* notes (text, nullable): observación libre registrada por el operador al cierre de la jornada; en cierres automáticos se persiste una nota por defecto cuando el campo no tenía valor previo

Reglas:

* Solo una jornada por día y club.
* Requiere jornada abierta para operar.
* El saldo declarado (saldo real) al cierre no puede ser negativo. La diferencia entre saldo declarado y esperado sí puede ser negativa (representa un faltante de arqueo).
* Una jornada `open` cuya `session_date` es anterior al día actual se cierra automáticamente al primer ingreso autenticado del día, con `close_type = 'auto'` y `declared_balance = expected_balance` para todas las cuentas.

---

### 5.2 DailyCashSessionBalance

Balances declarados.

Atributos:

* id
* session_id
* account_id
* currency_code
* balance_moment (opening/closing)
* expected_balance
* declared_balance
* difference_amount

---

### 5.3 TreasuryMovement

Entidad central del sistema.

Atributos:

* id
* club_id
* origin_role (secretaria / tesoreria / system)
* origin_source (manual / transfer / fx / adjustment / consolidation)
* daily_cash_session_id
* account_id
* movement_type (ingreso / egreso)
* category_id
* concept
* currency_code
* amount (>0)
* movement_date
* created_by_user_id
* status
* receipt_number
* activity_id
* calendar_event_id
* transfer_group_id
* fx_operation_group_id
* consolidation_batch_id

Estados:

* pending_consolidation
* integrated
* consolidated
* posted
* cancelled

Reglas:

* El signo del movimiento depende del tipo.
* Es la única fuente de verdad para saldos.
* Un egreso operativo no puede dejar saldo negativo en la cuenta y moneda afectadas al momento efectivo del movimiento.

---

### 5.4 BalanceAdjustment

Ajustes automáticos.

Atributos:

* id
* session_id
* movement_id
* account_id
* difference_amount
* adjustment_moment

---

## 6. Operaciones compuestas

### 6.1 AccountTransfer

Transferencias internas.

Atributos:

* id
* club_id
* source_account_id
* target_account_id
* currency_code
* amount
* concept

Reglas:

* Genera 2 movimientos.
* Debe rechazar importes mayores al saldo disponible de la cuenta origen para la moneda seleccionada.
* Debe persistirse de forma transaccional junto con los dos movimientos asociados.

---

### 6.2 ForeignExchangeOperation

Cambio de moneda.

Atributos:

* id
* club_id
* source_account_id
* target_account_id
* source_amount
* target_amount

Reglas:

* Genera 2 movimientos.
* Tipo de cambio implícito.
* Debe rechazar operaciones cuyo importe origen supere el saldo disponible de la cuenta origen en la moneda origen.

---

## 7. Consolidación

### 7.1 DailyConsolidationBatch

Batch de consolidación.

Atributos:

* id
* club_id
* consolidation_date
* status
* executed_at
* executed_by_user_id

---

### 7.2 MovementIntegration

Integración de movimientos.

Atributos:

* id
* secretaria_movement_id
* tesoreria_movement_id
* integrated_at

---

### 7.3 MovementAuditLog

Auditoría.

Atributos:

* id
* movement_id
* action_type
* payload_before
* payload_after
* performed_by_user_id
* performed_at

---

## 7.4 CostCenter (US-52)

Dimensión de imputación paralela a categorías y actividades. Agrupa compromisos económicos acotados en el tiempo (deudas, eventos, jornadas, presupuestos, publicidades, sponsors) para medir avance contra un monto objetivo.

Atributos:

* id
* club_id
* name (único por club, case-insensitive)
* description
* type (`deuda`, `evento`, `jornada`, `presupuesto`, `publicidad`, `sponsor`)
* status (`activo`, `inactivo`)
* start_date
* end_date (nullable; se autocompleta al cerrar)
* currency_code
* amount (obligatorio para `deuda`, `presupuesto`, `publicidad`, `sponsor`)
* periodicity (`unico`, `mensual`, `trimestral`, `semestral`, `anual`; solo aplica a `presupuesto`, `publicidad`, `sponsor`)
* responsible_user_id
* created_by_user_id
* updated_by_user_id
* created_at
* updated_at

Reglas clave:

* Solo rol `tesoreria` puede crear, editar y cerrar centros de costo.
* Cierre = cambio de `status` a `inactivo`; si `end_date` está vacía o es futura, se autocompleta con hoy.
* Si el CC tiene movimientos enlazados, no se permite editar `type`, `currency_code` ni `start_date`.
* Los indicadores de avance se calculan como Σ de movimientos enlazados (suma directa, sin conversión de moneda).

---

## 7.5 MovementCostCenterLink (US-53)

Relación N:M entre movimientos y centros de costo.

Atributos:

* movement_id
* cost_center_id
* created_at
* created_by_user_id

Reglas clave:

* La imputación es **completa a cada CC** (sin prorrateo). Un movimiento de importe M enlazado a N CC suma M a cada uno; los reportes cruzados entre CC pueden contener doble conteo por diseño.
* Solo rol `tesoreria` puede crear o eliminar enlaces.
* CC `inactivos` no aparecen en el selector pero los enlaces previos se conservan.
* `ON DELETE CASCADE` desde `treasury_movements` y desde `cost_centers` para evitar enlaces huérfanos.

---

## 7.6 CostCenterAuditLog (US-52)

Historial append-only de cambios sobre un CC.

Atributos:

* id
* cost_center_id
* actor_user_id
* action_type (`created`, `updated`, `closed`)
* field (nullable; aplica para `updated`)
* old_value
* new_value
* payload_before (jsonb; snapshot en `created`)
* payload_after (jsonb)
* changed_at

Reglas clave:

* Append-only; no admite `UPDATE` ni `DELETE` desde la aplicación.
* Se escribe desde el service al crear, editar o cerrar un CC.

---

## 8. Relaciones clave

* User → Membership → Club
* Club → Accounts / Categories / Activities / Events / CostCenters
* DailyCashSession → Movements
* Movement → Account / Category / Activity / Event
* Movement ↔ CostCenter (N:M vía MovementCostCenterLink)
* CostCenter → CostCenterAuditLog
* Transfer / FX → Movements
* ConsolidationBatch → Movements
* Movement → AuditLog

---

## 9. Reglas transversales

1. Toda operación ocurre en un club activo.
2. No hay acceso cross-club.
3. Los movimientos son inmutables post cierre (para Secretaría).
4. Toda corrección debe auditarse.
5. No debe haber doble impacto contable.
6. Las configuraciones son por club.
7. Solo entidades visibles para el rol activo participan en la operatoria configurable.
8. La consolidación no puede ejecutarse dos veces para la misma fecha.
9. Los Centros de Costo son una dimensión de imputación paralela: un mismo movimiento puede quedar enlazado a varios CC y cada uno recibe la imputación completa (doble conteo esperado en reportes cruzados entre CC).

```
```

---

## 10. Bounded Context · RRHH (E04)

Entidades y relaciones del módulo de Recursos Humanos. Los agregados
viven en su propio contexto pero comparten identidad con el club
activo y se integran con Tesorería a través de `treasury_movements`.

### Entidades

- **SalaryStructure** — posición rentada del club. Define rol
  funcional × actividad × tipo de remuneración (mensual_fijo / por_hora
  / por_clase). Inmutable en rol/actividad; el nombre, tipo, carga
  horaria y estado son editables.
- **SalaryStructureVersion** — historial de monto de cada estructura.
  Una sola versión puede tener `end_date = null` (vigente). Inmutable.
- **StaffMember** — persona rentada por el club. Carga DNI, CUIT/CUIL,
  contacto, vínculo y datos de pago. Baja lógica (soft delete).
- **StaffContract** — vincula StaffMember con SalaryStructure. Flag
  `uses_structure_amount` elige la fuente del monto: versión vigente de
  la estructura, o un `frozen_amount` congelado en el contrato.
  Una estructura admite un único contrato vigente simultáneamente.
- **PayrollSettlement** — liquidación mensual por contrato. Lifecycle:
  `generada → confirmada → pagada` con transición lateral a `anulada`
  desde cualquier estado vigente. Almacena monto base + ajustes + total.
- **PayrollSettlementAdjustment** — ajuste sobre una liquidación:
  adicional, descuento o reintegro. Un trigger recalcula
  `adjustments_total` y `total_amount` en el padre.
- **PayrollPaymentBatch** — agrupador de pagos en lote con trazabilidad.
- **HrActivityLog** — audit log append-only (entidad + acción + diff).
- **HrJobRun** — bitácora de corridas del cron diario (US-59).

### Invariantes

1. Unicidad por rol + actividad + estado activo en salary_structures
   (unique parcial).
2. Una versión vigente única por estructura.
3. Una estructura admite a lo sumo un contrato `vigente` (enforced por
   unique parcial).
4. DNI y CUIT/CUIL únicos por club entre colaboradores `activo`.
5. Una liquidación no anulada única por contrato × período.
6. `total_amount >= 0`. Cero requiere confirmación explícita.
7. Una liquidación pagada tiene siempre un movimiento de Tesorería
   linkeado (unique parcial en `treasury_movements.payroll_settlement_id`).

### Ciclo de vida de una liquidación

```
generada  -- hr_confirm_settlement -->  confirmada  -- hr_pay_settlement -->  pagada
   \\                                      \\                                    |
    \\                                      \\                                   v
     \\                                      \\-- hr_annul_settlement -->  anulada
      \\                                                                       ^
       \\-- hr_annul_settlement ----------------------------------------------//
```

La transición a `anulada` desde `pagada` requiere que el movimiento
vinculado esté `cancelled` (US-66).

### Integración con Tesorería (US-64/65)

- Categoría "Sueldos" del catálogo legacy se usa como `category_id`
  del movimiento generado al pagar.
- El movimiento hereda `daily_cash_session_id` si el tesorero tiene
  jornada abierta al momento del pago.
- El `display_id` sigue la convención `{CLUB_INITIALS}-MOV-{YYYY}-{seq}`.

### Integración con el Job cron (US-59)

- `pg_cron` dispara `hr_finalize_contracts_due_today_all_clubs()`
  diariamente a las `5 3 * * *` hora local argentina.
- La RPC itera contratos con `end_date = current_date`, los finaliza
  con `finalized_reason='auto_finalized_by_end_date'` y registra
  `CONTRACT_FINALIZED_AUTO`.

### Permisos

- **admin / rrhh**: acceso total (maestros + liquidaciones + pagos +
  reportes).
- **tesoreria**: acceso operativo a liquidaciones y pagos (sin gestión
  de maestros).
- Cualquier otro rol: sin acceso.

### Rutas UI del módulo

Los maestros RRHH **no viven en `/settings`** (decisión arquitectural
Fase 8 · Refinación IA). El Coordinador (`rrhh`) administra todo desde
el módulo dedicado `/rrhh`, con sub-navegación horizontal de 4 pestañas.
**Todo el árbol `/rrhh/*` exige rol `rrhh` exclusivo** — ningún otro rol
(incluido `admin`, `tesoreria`, `secretaria`) lo ve en la nav ni puede
invocar sus endpoints. Los guards están centralizados en
`lib/domain/authorization.ts` y todos delegan en `canAccessHrModule`.

| Ruta | Pestaña | Guard | Contenido |
|---|---|---|---|
| `/rrhh` | Resumen | `canAccessHrModule` (rrhh only) | Dashboard con 6 cards operativas (US-68) |
| `/rrhh/contracts` | Contratos | `canAccessHrMasters` (rrhh only) | CRUD de contratos + finalizar (US-57/58) |
| `/rrhh/staff` | Colaboradores | `canAccessHrMasters` (rrhh only) | CRUD de colaboradores + alerta sin contratos (US-56/60) |
| `/rrhh/structures` | Estructuras | `canAccessHrMasters` (rrhh only) | CRUD de estructuras salariales + versionado (US-54/55) |

Rutas operativas fuera de la sub-nav principal:

| Ruta | Guard | Contenido |
|---|---|---|
| `/rrhh/settlements` | `canOperateHrSettlements` (rrhh only) | Listado de liquidaciones + pagos (US-61..66) |
| `/rrhh/reports` | `canAccessHrModule` (rrhh only) | Reportes con export CSV (US-69) |
| `/rrhh/staff/[id]` | `canAccessHrModule` (rrhh only) | Ficha consolidada del colaborador (US-67) |

### Reglas transversales adicionales

10. Todas las mutaciones de RRHH pasan por RPCs SECURITY DEFINER o
    servicios con admin client (club scope validado server-side).
11. Ningún cliente escribe o lee `hr_job_runs` directamente.
12. El historial de auditoría (`hr_activity_log`) es append-only.

```
```
