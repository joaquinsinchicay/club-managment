# PDD — US-32 · Cierre automático de jornada colgada

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como usuario autenticado (rol Secretaría o Tesorería), quiero que una jornada que quedó abierta al cerrar el día calendario sea cerrada automáticamente al ingresar al sistema al día siguiente, para que la conciliación de movimientos anteriores no quede bloqueada a la espera del cierre manual. |
| Prioridad | Alta |
| Objetivo de negocio | Evitar que la UI de Tesorería → Conciliación quede bloqueada cuando Secretaría olvidó cerrar la jornada del día anterior, manteniendo trazabilidad sobre qué cierres fueron manuales y cuáles automáticos. |

---

## 2. Problema a resolver

Si Secretaría no cierra la jornada al finalizar el día, al día siguiente Tesorería abre la pestaña Conciliación, selecciona la fecha anterior y la UI muestra *"La jornada todavía está abierta — Espera a que Secretaría cierre la jornada para poder conciliar los movimientos"*. El usuario no puede avanzar sin intervención manual de Secretaría.

El autocierre de jornadas vencidas ya existía a nivel de base de datos (RPC `auto_close_stale_daily_cash_session_with_balances_for_current_club`) pero solo se invocaba desde los caminos de Secretaría. La pestaña Conciliación de Tesorería no lo disparaba y no había forma de distinguir en la UI una jornada cerrada manualmente de una cerrada por el sistema.

---

## 3. Objetivo funcional

Al ingresar al dashboard autenticado, el backend detecta si existe una jornada `open` anterior al día actual y la cierra con saldos esperados, marcándola con `close_type = 'auto'`. La pestaña Tesorería → Conciliación muestra un badge *"Cierre automático"* acompañado de la fecha y hora de cierre cuando la jornada seleccionada fue cerrada por el sistema.

---

## 4. Alcance

### Incluye
- Guard a nivel de `app/(dashboard)/layout.tsx` que invoca el helper `ensureStaleDailyCashSessionAutoClosedForActiveClub` una vez por request autenticada.
- Nueva columna `daily_cash_sessions.close_type` (enum `session_close_type`: `manual` | `auto`) con default `manual`.
- Actualización de la RPC de autocierre para setear `close_type = 'auto'` y persistir una nota por defecto cuando `notes` está vacío.
- Actualización de RPC de lectura y cierre para proyectar `close_type` en el return table.
- Badge visual *"Cierre automático"* en `TreasuryConciliacionTab` cuando `sessionStatus = 'closed'` y `sessionCloseType = 'auto'`.
- Propagación de `sessionCloseType` y `sessionClosedAt` en `TreasuryConsolidationDashboard`.

### No incluye
- Edge function o cron de autocierre a medianoche.
- Auto-apertura de la jornada del día actual.
- Cálculo de saldo declarado distinto al esperado (el autocierre no admite ajustes).
- UI para que el administrador reabra una jornada cerrada automáticamente.

---

## 5. Actor principal

Usuario autenticado con cualquier rol (Secretaría, Tesorería, Admin) y membership activa en el club seleccionado.

---

## 6. Precondiciones

- El layout `app/(dashboard)/layout.tsx` resolvió `activeClub` y `user` vía `getAuthenticatedSessionContext`.
- Las RPC `get_last_open_daily_cash_session_before_date_for_current_club` y `auto_close_stale_daily_cash_session_with_balances_for_current_club` están desplegadas.
- La columna `daily_cash_sessions.close_type` existe.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Usuario ingresa al dashboard y no hay jornada colgada | El guard retorna sin efectos, el render continúa. |
| Usuario ingresa al dashboard y hay una jornada `open` del día anterior | El sistema computa saldos esperados por `(account_id, currency_code)`, inserta filas en `daily_cash_session_balances` con `balance_moment = 'closing'` y `declared = expected`, marca la jornada como `status = 'closed'`, `close_type = 'auto'`, `closed_at = now()`, `closed_by_user_id = <usuario disparador>`, y persiste nota por defecto si la jornada no tenía notas previas. |
| Tesorería abre Conciliación en fecha cerrada automáticamente | Se muestran los movimientos a conciliar y un badge *"Cierre automático"* con la fecha y hora de cierre. |
| Secretaría cierra jornada manualmente | La jornada queda con `close_type = 'manual'` (default de columna, explicitado en la RPC con balances). |
| Guard falla (RPC caída, permisos) | Se registra `console.warn('[daily-session-guard-failed]')` y el dashboard renderiza igualmente. |

---

## 8. Reglas de negocio

- El guard corre en el layout autenticado sin cookies ni memoización: la RPC es idempotente (`FOR UPDATE` + filtro `status = 'open'`).
- Existe una única invocación en todo el código (`DashboardLayout` → `ensureStaleDailyCashSessionAutoClosedForActiveClub`). Las 7 invocaciones previas en `treasury-service.ts` fueron removidas para no duplicar trabajo ni fragmentar la fuente de verdad.
- El autocierre cierra como máximo la jornada abierta más reciente anterior al día de hoy.
- El saldo declarado coincide exactamente con el esperado (`difference_amount = 0`). No se generan movimientos de ajuste.
- Si la jornada tenía `notes` previas, se preservan; si estaban vacías, se setea `"Cerrada automaticamente por el sistema con saldos esperados."`.
- El badge *"Cierre automático"* sólo se muestra cuando la jornada está cerrada Y `close_type = 'auto'`. No se pinta en cierres manuales ni en jornadas abiertas.

---

## 9. Flujo principal

1. El usuario se autentica y navega a `/dashboard/...`.
2. `DashboardLayout` ejecuta `getAuthenticatedSessionContext()`.
3. Si hay `activeClub`, se invoca `ensureStaleDailyCashSessionAutoClosedForActiveClub`.
4. El helper consulta la RPC `get_last_open_daily_cash_session_before_date_for_current_club(clubId, today)`.
5. Si retorna una jornada colgada:
   - Se listan los movimientos previos a la fecha de la jornada vía `buildAccountBalanceDrafts(clubId, staleSession.sessionDate, accounts)`.
   - Se arma `balance_entries` con `balance_moment = 'closing'`, `declared = expected`, `difference_amount = 0`.
   - Se invoca la RPC `auto_close_stale_daily_cash_session_with_balances_for_current_club` que setea `close_type = 'auto'`, `closed_at = now()`, `closed_by_user_id = <user.id>`, `notes = coalesce(current_notes, default)` de forma atómica y protegida por `FOR UPDATE`.
6. El layout continúa rendereando.
7. Cuando el usuario abre Tesorería → Conciliación con la fecha de la jornada cerrada, `getTreasuryConsolidationDashboard` devuelve `sessionCloseType = 'auto'` y la UI pinta el badge.

---

## 10. Criterios de aceptación (Gherkin)

```gherkin
Feature: Cierre automático de jornadas colgadas

  Background:
    Given existe un club con identificador "club-pj"
    And existe una jornada "open" del 19/04/2026 para ese club
    And no existe jornada alguna para 20/04/2026

  Scenario: Usuario ingresa al dashboard al día siguiente
    Given hoy es 20/04/2026
    And el usuario autenticado tiene club activo "club-pj"
    When el usuario navega a "/dashboard"
    Then la jornada del 19/04/2026 queda con "status" = "closed"
    And la jornada del 19/04/2026 queda con "close_type" = "auto"
    And existen filas en "daily_cash_session_balances" con "balance_moment" = "closing" y "declared_balance" = "expected_balance"
    And "closed_by_user_id" es igual al id del usuario disparador

  Scenario: Tesorería entra a Conciliación y ve el badge
    Given la jornada del 19/04/2026 fue cerrada automáticamente
    When el usuario con rol Tesorería abre "Tesorería → Conciliación" y selecciona 19/04/2026
    Then se muestra el badge "Cierre automático" cerca del encabezado
    And se muestra la descripción con la fecha y hora de cierre
    And la lista de movimientos pendientes de conciliar es visible

  Scenario: Secretaría cierra jornada manualmente
    Given existe una jornada "open" de hoy
    When Secretaría ejecuta el cierre manual con saldos declarados
    Then la jornada queda con "status" = "closed"
    And la jornada queda con "close_type" = "manual"
    And el badge "Cierre automático" no se muestra en Conciliación

  Scenario: No hay jornada colgada
    Given no existen jornadas "open" anteriores al día de hoy
    When el usuario navega a "/dashboard"
    Then el guard no realiza mutaciones
    And el render del layout no se bloquea

  Scenario: La RPC de autocierre falla
    Given el guard intenta ejecutar el autocierre y la RPC lanza un error
    When el usuario navega a "/dashboard"
    Then se registra la advertencia "[daily-session-guard-failed]" en logs
    And el dashboard renderiza igualmente
```

---

## 11. Manejo de errores

- Cualquier excepción en el guard del layout se captura, se loguea como `console.warn('[daily-session-guard-failed]', { clubId, userId, error })` y el dashboard renderiza normalmente.
- Si la RPC retorna `null` (no había jornada colgada o el `expected_session_id` ya no coincidía), el helper retorna `null` silenciosamente.
- La ausencia de la RPC en un entorno legacy está contemplada vía `isMissingStaleSessionAutoCloseRpcError` y una única advertencia por club.

---

## 12. Contratos e invariantes

- `daily_cash_sessions.close_type`: NOT NULL, default `'manual'`.
- `auto_close_stale_daily_cash_session_with_balances_for_current_club` siempre setea `close_type = 'auto'`.
- `close_daily_cash_session_with_balances_for_current_club` siempre setea `close_type = 'manual'`.
- `sessionCloseType` en `TreasuryConsolidationDashboard` sólo es distinto de `null` cuando `sessionStatus = 'closed'`.

---

## 13. UI states

| Estado dashboard | Badge | Descripción mostrada |
|---|---|---|
| `sessionStatus = 'open'` | — | Mensaje de bloqueo *"La jornada todavía está abierta"*. |
| `sessionStatus = 'closed'` y `closeType = 'manual'` | — | Vista normal de Conciliación. |
| `sessionStatus = 'closed'` y `closeType = 'auto'` | *"Cierre automático"* (warning) | *"La jornada fue cerrada automaticamente por el sistema con saldos esperados. (DD/MM/AA HH:mm)"*. |
| `sessionStatus = 'not_started'` | — | Lista vacía sin badge. |

---

## 14. Relacionado

- [PDD US-10 · Apertura y cierre diario](pdd_us_10_apertura_y_cierre_diario.md)
- [PDD US-14 · Apertura y cierre con validación de saldos](pdd_us_14_apertura_y_cierre_con_validacion_de_saldos.md)
- [PDD US-29 · Consolidación diaria de movimientos de Secretaría en Tesorería](pdd_us_29_consolidacion_diaria_de_movimientos_de_secretaria_en_tesoreria.md)
