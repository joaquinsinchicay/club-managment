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
  `generada → aprobada_rrhh → pagada` con transición lateral a `anulada`
  desde cualquier estado vigente y posibilidad de retroceder de
  `aprobada_rrhh → generada` con motivo (US-41). Almacena monto base
  + ajustes + total. Estado renombrado de `confirmada` → `aprobada_rrhh`
  el 2026-04-27 (E04 refactor Notion US-40).
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
generada  -- hr_approve_settlement -->  aprobada_rrhh  -- hr_pay_settlement -->  pagada
   ^                                       |                                       |
   |                                       |                                       v
   +-- hr_return_settlement_to_generated --+                              hr_annul_settlement
   |                                       |                                       |
   +--- hr_annul_settlement ---------------+--------------------------------> anulada
```

- US-40 (rename 2026-04-27): `confirmada` → `aprobada_rrhh`. RPCs
  `hr_confirm_*` renombradas a `hr_approve_*`. Columnas
  `confirmed_at`/`confirmed_by_user_id` → `approved_at`/`approved_by_user_id`.
- US-41 (NUEVA 2026-04-27): `aprobada_rrhh → generada` con motivo
  obligatorio, disponible para rol `rrhh` o `tesoreria`. Resetea
  `approved_*` a null y graba `returned_*`. Indicador "Devuelta por [rol]"
  visible mientras la liquidación esté en `generada` con `returned_by_role≠null`.
- La transición a `anulada` desde `pagada` requiere que el movimiento
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
| `/rrhh` | Resumen | `canAccessHrModule` (rrhh only) | Dashboard con 6 cards operativas (US-68 / US-45) |
| `/rrhh/contracts` | Contratos | `canAccessHrMasters` (rrhh only) | CRUD de contratos + finalizar (US-57/58 / US-32/33) |
| `/rrhh/contracts/[id]` | Detalle de contrato | `canAccessHrMasters` (rrhh only) | Historial de revisiones + acción "Nueva revisión" (US-34) |
| `/rrhh/contracts/bulk-revision` | Revisión masiva | `canMutateHrMasters` (rrhh only) | Filtros + selección + preview + ejecución transaccional (US-35) |
| `/rrhh/staff` | Colaboradores | `canAccessHrMasters` (rrhh only) | CRUD de colaboradores + alerta sin contratos (US-56/60 / US-31/37) |
| `/rrhh/structures` | Estructuras | `canAccessHrMasters` (rrhh only) | Catálogo puro (sin monto). El monto vive en las revisiones. (US-54/55 reescrita → US-30) |

Rutas operativas fuera de la sub-nav principal:

| Ruta | Guard | Contenido |
|---|---|---|
| `/rrhh/settlements` | `canOperateHrSettlements` (rrhh only) | Listado de liquidaciones + pagos (US-61..66 / US-38..43) |
| `/rrhh/reports` | `canAccessHrModule` (rrhh only) | Reportes con export CSV (US-69 / US-46) |
| `/rrhh/staff/[id]` | `canAccessHrModule` (rrhh only) | Ficha consolidada del colaborador (US-67 / US-44) |

### Revisión Salarial (US-34 / US-35)

El monto de un contrato vive en `staff_contract_revisions`. Cada contrato
tiene 1..N revisiones; solo una por contrato con `end_date is null` (unique
parcial). Operaciones:

- **Alta de contrato** (US-32): la RPC `hr_create_contract_with_initial_revision`
  inserta contrato + primera revisión (monto inicial + motivo) en una sola
  transacción.
- **Nueva revisión individual** (US-34): la RPC `hr_create_salary_revision`
  cierra la revisión vigente (end_date = fecha_vigencia - 1 día) y abre una
  nueva. El modal de la ficha (`ContractDetailView`) permite ingresar el
  monto en **dos modos** (toggle):
  - **% variación**: se ingresa el porcentaje y se calcula
    `nuevoMonto = baseAmount * (1 + pct/100)` en cliente. Preview en vivo del
    nuevo monto.
  - **Monto nuevo**: ingreso directo del valor (formato es-AR).
  El motivo se elige de un preset cerrado
  (`texts.rrhh.contract_detail.revision_motivo_options` — paritaria,
  trimestral, inflación, promoción, corrección) o se marca "Otro (detallar
  en observaciones)". Las **observaciones** (textarea opcional) se
  concatenan al motivo con `" · "` antes de persistir como `reason` en la
  revisión. Si ninguno de los dos modos produce un monto > 0, el botón
  "Crear revisión" queda deshabilitado. El envío siempre pasa el monto
  final computado al RPC — no el porcentaje.
- **Revisión masiva** (US-35): la RPC `hr_create_salary_revisions_bulk` aplica
  un ajuste (`percent` | `fixed` | `set`) sobre N contratos en una sola
  transacción; rollback total si cualquiera falla.
- **Finalización de contrato**: al cerrar el contrato (manual o automática),
  la revisión vigente se cierra con `end_date = contract.end_date`.
- **Liquidaciones** (US-38): la RPC `hr_generate_monthly_settlements` lee el
  monto base de la revisión vigente al primer día del período.

### Mapping histórico de numeración de User Stories

El código y los PDDs usan la numeración original US-54..US-69. La spec viva
en Notion renumbera a US-30..US-46 y redefine algunas US (especialmente el
movimiento del monto al contrato). Se conserva la numeración del código
para trazabilidad del historial y se mapea aquí:

| US (código) | US (Notion) | Alcance |
|---|---|---|
| US-54 | US-30 | Catálogo de Estructuras Salariales (sin monto en la spec nueva) |
| US-55 | US-30 (absorbido) | Actualización de monto en la estructura → eliminado; reemplazado por revisiones |
| US-56 | US-31 | CRUD de colaboradores (sin estado activo/inactivo en la spec nueva) |
| US-57 | US-32 | Alta de contrato con monto inicial + motivo |
| US-58 | US-33 | Adjuntos y finalización de contrato. La edición del listado se retiró: post-creación los únicos cambios sobre un contrato son finalización (desde el listado o la ficha) y revisión salarial (desde la ficha). |
| (nuevo) | US-34 | Revisión salarial individual por contrato |
| (nuevo) | US-35 | Revisión salarial masiva |
| US-59 | US-36 | Job diario de finalización automática |
| US-60 | US-37 | Alerta colaborador sin contratos vigentes |
| US-61 | US-38 | Generación masiva de liquidaciones |
| US-62 | US-39 | Ajustes de liquidación |
| US-63 | US-40 | Confirmación de liquidaciones |
| US-64 | US-41 | Pago individual |
| US-65 | US-42 | Pago en lote |
| US-66 | US-43 | Anulación de liquidación |
| US-67 | US-44 | Ficha consolidada del colaborador |
| US-68 | US-45 | Dashboard RRHH |
| US-69 | US-46 | Reportes |

### Reglas transversales adicionales

10. Todas las mutaciones de RRHH pasan por RPCs SECURITY DEFINER o
    servicios con admin client (club scope validado server-side).
11. Ningún cliente escribe o lee `hr_job_runs` directamente.
12. El historial de auditoría (`hr_activity_log`) es append-only.
13. El monto de un contrato SIEMPRE se lee de `staff_contract_revisions`
    (revisión con `end_date is null`). La Estructura Salarial no tiene
    monto; es solo catálogo.

### Ficha de contrato (`/rrhh/contracts/[id]`)

Layout en dos columnas (mobile-first, stack en < lg). El código humano
del contrato (`C-XXXXXXXX`) se deriva del UUID via
`formatContractCode(id)` en `lib/domain/staff-contract.ts`.

Cards implementadas:

- **Header** — breadcrumb "Contratos · C-XXXX", Avatar + nombre del
  colaborador (link a `/rrhh/staff/[id]`), chips de estado + tipo de
  pago + tipo de remuneración, y CTAs: "Nueva revisión" (si vigente y
  can mutate), "Ver ficha colaborador", "Finalizar contrato" (si
  vigente).
- **Información del contrato** — `dl` con número, tipo de pago,
  estructura, rol, división, actividad, tipo de remuneración, inicio,
  fin.
- **Historial de revisiones** — timeline vertical. Cada item muestra
  rango `{MesCorto Año} → {MesCorto Año|Vigente}`, bullet indicator
  (pink cuando vigente, slate cuando pasada), badge "Actual"
  (`DataTableChip` info) o "Inicial" (neutral), % vs revisión
  anterior (calculado client-side), motivo opcional y monto. La
  revisión vigente va destacada con fondo `pink-050/50`.
- **Documentos** — upload (PDF/Word/imágenes ≤ 10 MB), signed URL para
  descarga, delete.
- **Monto vigente** — monto grande + eyebrow con tipo de pago +
  "Revisado el DD/MM · +X,X% vs anterior" calculado.
- **Últimas liquidaciones** — hasta 5 filas via
  `listSettlementsForContract(contractId, 5)` (nuevo método del
  repositorio, filtra por `contract_id`). Status chip por estado
  (`generada`/`aprobada_rrhh`/`pagada`/`anulada`).

#### TODO ficha de contrato (diferido a iteraciones posteriores)

El mockup original incluye features que requieren esquema/lógica
nueva y quedaron fuera del alcance del rediseño inicial. Se listan
aquí para que no se pierdan:

- **Frecuencia de revisión** (trimestral/semestral/anual) — campo
  nuevo en `staff_contracts` + input en form de alta.
- **Próxima revisión · fecha prevista · días restantes** — derivable
  si existiera "frecuencia de revisión".
- **Último IPC (INDEC)** — integración externa o columna manual.
- **Notas del contrato** — columna nueva `staff_contracts.notes`.
- **Modalidad de pago · Banco Nación** (detalle bancario) — campos
  nuevos, probable sobre `staff_members`.
- **Simular aumento** — UI + cálculo nuevos (podría reusar
  `createBulkSalaryRevision` en modo dry-run).
- **Resumen anual (Liquidado / A liquidar)** — agregación nueva sobre
  `payroll_settlements`. Hoy la card "Últimas liquidaciones" cumple
  el rol informativo mínimo.
- **"Aprobó: {nombre}" por revisión** — requiere join a `profiles` /
  `users` por `created_by_user_id`. Hoy guardamos sólo el id.

### Ficha del colaborador (`/rrhh/staff/[id]`)

Misma estructura visual que la ficha de contrato (breadcrumb + header
card + layout dos columnas). El listado `/rrhh/staff` ya no expone
edición inline: cada fila tiene únicamente un icon "Ver ficha" que
navega a esta ruta. La edición se hace desde el header de la ficha
mediante el CTA "Editar datos" (modal con `StaffMemberFormFields`
+ `updateStaffMemberAction`).

Cards implementadas:

- **Header** — breadcrumb "Colaboradores · {nombre}", Avatar + nombre
  + meta (DNI, CUIT, email), chips (con/sin contrato vigente, tipo
  de vínculo), CTAs: `+ Nuevo contrato` (link a `/rrhh/contracts`)
  y `Editar datos` (modal, sólo si `canMutateHrMasters`).
- **Datos personales** — `dl` con nombre completo, DNI, CUIT/CUIL,
  tipo de vínculo, fecha de alta.
- **Contacto** — email y teléfono.
- **Datos bancarios** — CBU/alias.
- **Contratos** — DataTable compact con estructura (link a
  `/rrhh/contracts/[id]`), desde, hasta, monto vigente, estado.
- **Liquidaciones** — DataTable compact con período, estructura,
  total y estado.
- **Antigüedad en el club** — card lateral accent-rrhh con cálculo
  de años · meses desde `hire_date` + fecha de alta formateada.
- **Totales** — año acumulado y mes corriente (heredados de
  `getStaffProfile`).

#### TODO ficha de colaborador (diferido a iteraciones posteriores)

El mockup incluye features que requieren esquema nuevo sobre
`staff_members` y/o aggregations adicionales:

- **Nacimiento / edad** — campo `birth_date` en `staff_members`.
- **Estado civil, nacionalidad** — columnas nuevas.
- **Domicilio** (calle, CP, localidad) — columnas nuevas (o una
  sub-tabla `staff_addresses`).
- **Datos bancarios detallados** (banco, tipo de cuenta, CBU
  completo, alias separado) — hoy sólo `cbu_alias` consolidado.
- **"Dar de baja..."** — ❌ **REVERTIDO** (E04 refactor 2026-04-27,
  US-31). El nuevo modelo Notion exige que el colaborador NO tenga
  estado activo/inactivo. Migración `20260427030000` dropea las
  columnas `deactivated_at`, `deactivated_by_user_id`,
  `deactivation_reason` + drop RPC `hr_deactivate_staff_member`. El
  colaborador conserva todo el histórico (contratos, liquidaciones,
  pagos) aunque no tenga contratos vigentes; el listado los marca
  vía toggle "vigente / todos" (US-31 Scenario 4) y la alerta
  US-37.
- **Actividad reciente** (timeline de revisiones + liquidaciones +
  contratos) — requiere agregación + ordenamiento cronológico de
  múltiples fuentes; por ahora la info vive en cards separadas.

```
```
