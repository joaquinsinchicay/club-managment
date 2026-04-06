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
* club_id
* name
* account_type
* account_scope
* status
* visible_for_secretaria
* visible_for_tesoreria
* emoji

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
* status
* visible_for_secretaria
* visible_for_tesoreria
* emoji

---

### 4.4 ClubActivity

Actividades deportivas.

Atributos:

* id
* club_id
* name
* status
* emoji

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

Formato de recibos.

Atributos:

* id
* club_id
* name
* validation_type
* pattern
* min_numeric_value
* status

---

### 4.7 TreasuryFieldRule

Configuración de campos dinámicos.

Atributos:

* id
* club_id
* category_id
* field_name
* is_visible
* is_required

---

### 4.8 ClubTreasuryCurrency

Monedas del club.

Atributos:

* id
* club_id
* currency_code
* is_primary

---

### 4.9 ClubMovementTypeConfig

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

Reglas:

* Solo una jornada por día y club.
* Requiere jornada abierta para operar.

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
* performed_at

---

## 8. Relaciones clave

* User → Membership → Club
* Club → Accounts / Categories / Activities / Events
* DailyCashSession → Movements
* Movement → Account / Category / Activity / Event
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
7. Solo entidades activas participan en la operatoria.
8. La consolidación no puede ejecutarse dos veces para la misma fecha.

```
```
