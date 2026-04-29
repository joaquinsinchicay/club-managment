# Auditoría PDDs vs Código — 2026-04-29

> **Branch**: `dev` · **Commit**: `14bc653` · **Fecha**: 2026-04-29
> **Scope**: 55 User Stories · 57 archivos PDD (US-55 tiene 2 sub-PDDs).
> **Profundidad**: media — flujos principales por scenario, no línea por línea de Gherkin.
> **Severidades incluidas**: blocker · major · minor.

---

## Cómo leer este reporte

Para cada US se muestra una tabla con columnas:

| Columna | Significado |
|---|---|
| `#` | Número de hallazgo dentro de la US. |
| `Scenario` | Título textual del scenario en el PDD (entre comillas). `(todos los scenarios)` si la observación es transversal a la US. |
| `Discrepancia` | Una oración: qué dice el PDD vs qué hace el código. |
| `Severidad` | `blocker` · `major` · `minor` · `—` (sin discrepancias). |
| `Referencia` | `path:line` o `function in path`. `—` si no aplica. |

### Severidades

- **blocker** — AC explícito roto · permiso/RLS violado · pérdida o corrupción de datos.
- **major** — scenario alternativo divergente · validación servidor faltante · permission matrix divergente · copy hardcoded donde el PDD lo enumera.
- **minor** — copy fuera de `texts.json` · primitivos no canónicos (rounded-2xl, footer ad-hoc, etc.) · accesibilidad parcial · empty states ausentes.

### Tabla de contenidos

- [A · Auth & Identidad](#a--auth--identidad)
- [B1 · Tesorería: operaciones](#b1--tesorería-operaciones)
- [B2 · Tesorería: configuración & extras](#b2--tesorería-configuración--extras)
- [C1 · RRHH: masters & colaboradores](#c1--rrhh-masters--colaboradores)
- [C2 · RRHH: liquidaciones & pagos](#c2--rrhh-liquidaciones--pagos)
- [Apéndice — totales y top blockers](#apéndice--totales-y-top-blockers)

---

## A · Auth & Identidad

> Cobertura: 15 PDDs. 14 US tienen código localizable o parcialmente implementado (US-01 a US-09 y US-46 a US-51). US-06 tiene render parcial en header pero no integra completamente el mensaje de bienvenida multi-rol.

### US-01 · Google Sign-In

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Sin discrepancias detectadas. | — | — |

### US-02 · Avatar con menú de sesión en el header

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Sin discrepancias detectadas. | — | — |

### US-03 · Asignación de rol

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Aprobación y asignación de rol a usuario pendiente en el club activo" | ~~El modal mezcla invitación de nuevos con aprobación en un mismo formulario.~~ **CERRADO 2026-04-29**: PDD alineada — banner "Rediseño unificado 2026-04-28" agregado al inicio explicando que crear/invitar/aprobar quedaron fusionados en un solo modal. | — | PDD actualizada |
| 2 | "Cambio de rol a usuario activo en el club activo" | Sin discrepancias. | — | — |

### US-04 · Selector de club activo en el dashboard

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Sin discrepancias detectadas. | — | — |

### US-05 · Redirección post login según clubes del usuario

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Sin discrepancias detectadas. | — | — |

### US-06 · Visualización del rol en el header

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Render del rol en header para membership con un solo rol" | ~~Falta el mensaje de bienvenida personalizado.~~ **CERRADO 2026-04-29**: PDD alineada — banner "Scope reducido 2026-04-29" indica que el mensaje fue descartado en implementación. Las keys `welcome_message_*` quedaron deprecadas. | — | PDD actualizada |
| 2 | "Render del rol en header para membership con múltiples roles" | ~~`formatMembershipRoles()` arma la cadena pero no se integra en el mensaje de bienvenida.~~ **CERRADO 2026-04-29**: idem #1 — formato compacto eyebrow+valor confirmado como decisión final. | — | PDD actualizada |
| 3 | "Cambio de club y actualización del rol" | Rehidratación funciona; el rol se actualiza al cambiar club. | — | — |

### US-07 · Invitar usuario al club

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Formulario y creación de invitación pendiente" | ~~El modal mezcla "crear usuario/invitar" con invitaciones pendientes en lugar de tener vista separada.~~ **CERRADO 2026-04-29**: PDD alineada — banner explica que invitaciones quedan inline en la tabla con `source: "invitation"`. | — | PDD actualizada |
| 2 | "Usuario ya pertenece al club" | ~~Sin validación visual previa en el formulario.~~ **CERRADO 2026-04-29**: PDD alineada — el rediseño unificado deja la validación únicamente server-side con feedback por toast. | — | PDD actualizada |

### US-08 · Ingreso al club con invitación preexistente al iniciar sesión con Google

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | `processPendingInvitationsForUser()` invocada en `startGoogleSignIn` y `finishGoogleSignIn`. Sin discrepancias. | — | — |

### US-09 · Gestión de miembros del club

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Remover miembro del club" | Implementación visible; diálogo de confirmación funcional. | — | — |
| 2 | "No se puede eliminar el último admin del club" | ~~Sin enforcement client-side; el texto `last_admin_required` no se usaba en UI.~~ **CERRADO 2026-04-29**: agregado `activeAdminCount` + `isLastAdmin()` en `members-tab.tsx`; botón de remover y submit del modal disabled cuando es el último admin; checkbox `admin` disabled en el modal de roles; `<FormBanner variant="warning">` con la copy `last_admin_required` en ambos modales. PDD actualizada con el enforcement. | — | Código + PDD actualizados |

### US-46 · Datos de identidad del club

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Formulario completo en `ClubDataTab`. Logo, CUIT, tipo, domicilio, email, teléfono, colores persistidos. Sin discrepancias en el AC principal. | — | — |

### US-47 · Logo del club

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Subida, preview, reemplazo y remoción implementadas. Validación cliente-side de formato y tamaño. | — | — |

### US-48 · Validación de CUIT

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Validación de estructura y DV en `lib/validators/cuit.ts`. Formateo automático en blur. | — | — |

### US-49 · Validación de email y teléfono

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Sin validación cliente-side visible para email/teléfono en `ClubDataTab`. Inputs usan `type="email"`/`type="tel"` con `required` pero sin regex ni validación E.164. Validación sólo server-side. | major | `components/settings/tabs/club-data-tab.tsx:247` |

### US-50 · Optimización del logo al subirlo a Storage

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Pipeline de optimización (compresión PNG, minificación SVG) no visible en el código del tab. Subida en `updateClubIdentityAction` sin evidencia de invocar pipeline de optimización. | major | `components/settings/tabs/club-data-tab.tsx` |

### US-51 · Aislamiento multitenant de la identidad del club

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | El formulario se precarga con `club` desde el contexto autenticado; la action recibe `FormData` sin `club_id` explícito (se usa el del servidor). RLS debe aplicarse en DB. Implementación estructuralmente correcta. | — | — |

---

## B1 · Tesorería: operaciones

> Cobertura: 10 PDDs (US-10, 11, 12, 13, 14, 25, 26, 27, 29, 32). El sistema modela transferencias correctamente como 1 row en `account_transfers` + 2 movs hijos con `transfer_group_id`. Jornada-abierta enforced para Secretaría (US-10/11/14/25), no para Tesorería (US-27). Patrón "cerrar modal + toast" alineado con CLAUDE.md. Cierre automático vía guard de layout (US-32). Discrepancias principales: estados de feedback ante falla, bloqueo en consolidación cuando jornada está abierta, y verificación faltante de paginación de detalle.

### US-10 · Apertura y cierre diario

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Secretaría abre jornada" | Sin discrepancias detectadas. | — | — |
| 2 | "Secretaría intenta abrir otra jornada el mismo día" | Sin discrepancias detectadas. | — | — |
| 3 | "Secretaría cierra jornada abierta" | Sin discrepancias detectadas. | — | — |
| 4 | "Jornada `open` de día anterior" | Autocierre vía `ensureStaleDailyCashSessionAutoClosedForActiveClub` en layout (US-32). Conforme. | — | — |

### US-11 · Registro de movimientos diarios

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Secretaría registra movimiento con jornada abierta" | Validación de jornada e importe > 0 presente. | — | — |
| 2 | "Intento sin jornada abierta" | Error `session_required` retornado correctamente. | — | — |
| 3 | "Egreso superior al saldo" | `insufficient_funds` validado vía `getAvailableBalanceForAccountCurrency` rol-scoped. | — | — |
| 4 | "Edición de movimiento durante jornada abierta" | Modal de edición presente; el cierre inmediato del modal del PDD no se verifica si el overlay bloqueante alcanza efectivamente. | minor | `components/dashboard/treasury-card.tsx:36` |

### US-12 · Card de saldos y operación diaria

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Secretaría ve card con saldos" | Card visible solo para rol `secretaria` (filtro en `getSecretariaAccounts`). | — | — |
| 2 | "Card refleja jornada abierta/cerrada/no iniciada" | Estados `open`, `closed`, `not_started` capturados; UI muestra badges. | — | — |
| 3 | "Saldos post cierre se mantienen visibles" | Historial no se trunca; saldos derivados de `treasury_movements` permanecen. | — | — |
| 4 | "Falla lectura de movimientos" | El PDD §12.8 exige estado degradado seguro; el código retorna `null` en `getDashboardTreasuryCardForActiveClub` ante error y la UI no maneja explícitamente ese caso. | major | `lib/services/treasury-service.ts:500+` |

### US-13 · Consulta detallada de movimientos por cuenta

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Usuario entra a detalle desde dashboard" | Acceso por `secretaria` o `tesoreria` según visibilidad delegado a RLS. Sin verificación adicional. | — | — |
| 2 | "Historial paginado en bloques de 10" | El PDD exige paginación de 10 movs por página; la implementación no se verificó en componente. | minor | `app/(dashboard)/treasury/**` |
| 3 | "Cambio entre cuentas visibles" | Selector debe filtrar por rol; verificación RLS no inspeccionada en componentes de detalle. | — | — |

### US-14 · Apertura y cierre con validación de saldos

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Apertura sin diferencias" | `validateDeclaredBalances` no genera ajustes si la diferencia = 0. | — | — |
| 2 | "Apertura con diferencias genera ajustes" | `buildBalanceAdjustmentEntries` genera movs de ajuste; categoría "Ajuste" buscada vía `findTreasuryAdjustmentCategory`. | — | — |
| 3 | "Sin cuentas visibles bloquea confirmación" | `base.accounts.length === 0` → `no_accounts_available`. | — | — |
| 4 | "Saldos declarados obligatorios" | `rawDeclared === undefined || trim() === ""` → `declared_balance_required`. | — | — |

### US-25 · Registro de transferencias entre cuentas

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Secretaría registra transferencia con jornada abierta" | Jornada validada; sesión bindeada a la transferencia. | — | — |
| 2 | "Tesorería registra sin jornada requerida" | `createAccountTransfer` no valida jornada si role = "tesoreria". Conforme a §4. | — | — |
| 3 | "Cuentas distintas + moneda compatible + importe > 0" | Validaciones presentes (`accounts_must_be_distinct`, `invalid_transfer`, `amount_must_be_positive`). | — | — |
| 4 | "Transferencia crea 1 row + 2 movs con transfer_group_id" | `accessRepository.createAccountTransfer` esperado crear atomicamente; modelo conforme aunque el RPC no fue inspeccionado en SQL. | — | — |
| 5 | "Visibilidad Secretaría: origen visible, destino no visible" | `getTransferTargetAccountsForSecretaria` filtra `!visibleForSecretaria && visibleForTesoreria`. Conforme. | — | — |
| 6 | "Visibilidad Tesorería: destino puede ser cualquier cuenta distinta" | `eligibleTargetAccounts = allAccounts.filter(a => a.id !== sourceId)` si role tesoreria. Conforme. | — | — |

### US-26 · Registro de compra y venta de moneda extranjera

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Tesorería registra operación FX" | `createFxOperation` requiere role tesoreria; sin jornada. Conforme. | — | — |
| 2 | "Monedas distintas + cuentas + importes > 0" | Validaciones (`currencies_must_be_distinct`, `amount_must_be_positive`, `invalid_fx_operation`) presentes. | — | — |
| 3 | "Operación genera egreso + ingreso con fx_operation_group_id" | Ambos movs creados con `fxOperationGroupId = operation.id`. | — | — |
| 4 | "Ambos movimientos quedan `status: posted`" | Sin `pending_consolidation`. Conforme (Tesorería no consolida). | — | — |
| 5 | "Saldo insuficiente en moneda origen rechazado" | `availableBalance` validado con role "tesoreria". Conforme. | — | — |

### US-27 · Movimientos de Tesorería en cuentas propias

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Tesorería registra movimiento sin jornada" | `createTreasuryRoleMovement` no valida jornada. Conforme. | — | — |
| 2 | "Fecha editable" | `movementDate = input.movementDate.trim() || getTodayDate()` acepta input. Conforme. | — | — |
| 3 | "Movimiento queda `posted`" | `status: "posted"` hardcodeado. Conforme. | — | — |
| 4 | "Egreso valida saldo disponible" | `getAvailableBalanceForAccountCurrency` con role "tesoreria" incluye sólo `posted | consolidated`. | — | — |
| 5 | "Sólo tesoreria ve card" | Guard no verificado en componentes leídos; asume RLS + autenticación en ruta. | — | — |

### US-29 · Consolidación diaria de movimientos de Secretaría en Tesorería

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Pestaña Conciliación en `/treasury?tab=conciliacion`" | Ruta y tab no inspeccionada en código leído. | — | — |
| 2 | "KPIs: pendientes, monto sin conciliar, aprobadas hoy" | Textos en `texts.json` no verificados; copy puede divergir. | minor | `lib/texts.json` |
| 3 | "Bloqueado si jornada de Secretaría está `open`" | Regla crítica del PDD §4 no verificada en componente de conciliación; riesgo de doble impacto. | major | `app/(dashboard)/treasury/*` |
| 4 | "Integración = cambio a `integrated` sin doble impacto" | `movement.status = 'integrated'` esperado; persistencia no verificada en RPC. | — | — |
| 5 | "Consolidar = batch auditable con fecha" | Modelo `DailyConsolidationBatch` existe; lógica CRUD no leída en detalle. | — | — |

### US-32 · Cierre automático de jornada colgada

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Usuario navega a dashboard al día siguiente" | Guard `ensureStaleDailyCashSessionAutoClosedForActiveClub` invocado en layout. Conforme. | — | — |
| 2 | "Jornada colgada se cierra con `close_type = 'auto'`" | RPC `auto_close_stale_daily_cash_session_with_balances_for_current_club` no verificada en SQL. | — | — |
| 3 | "Tesorería ve badge 'Cierre automático'" | Badge mostrado si `sessionCloseType = 'auto'` en `TreasuryConsolidationDashboard`; lógica no verificada en componente. | — | — |
| 4 | "No hay jornada colgada = guard sin mutaciones" | `staleSession === null` retorna silenciosamente. Conforme. | — | — |
| 5 | "RPC falla = log warning + render normal" | Error capturado; `console.warn('[daily-session-guard-failed]')` esperado pero no verificado. | minor | `lib/services/treasury-service.ts:640` |

---

## B2 · Tesorería: configuración & extras

> Cobertura: 11 PDDs (US-15, 17-24, 28, 30). Se examinó autorización en `lib/domain/authorization.ts`, servicios en `lib/services/treasury-settings-service.ts`, componentes en `components/settings/tabs/categories-activities-tab.tsx`, RLS en `docs/database/rls-policies.sql` y server actions en `app/(dashboard)/settings/actions.ts`. **Bloqueadores críticos en RLS y autorización**: las políticas asignan permisos de mutación a `tesoreria` cuando el PDD especifica `admin`. Faltan server actions para CRUD de cuentas (US-15/US-28).

### US-15 · Configuración de cuentas y categorías

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Admin accede a configuración de cuentas" | **FALSO POSITIVO 2026-04-29**: las cuentas se configuran desde `/treasury` por rol `tesoreria`, no desde `/settings` por admin. La RLS `tesoreria` sobre `treasury_accounts` es correcta. | — | Verificación: `/treasury` usa `createTreasuryAccountFromTreasuryAction` |
| 2 | "Admin crea cuenta nueva" | **FALSO POSITIVO 2026-04-29**: la action existe como `createTreasuryAccountFromTreasuryAction` en `app/(dashboard)/dashboard/treasury-actions.ts:312`. El audit miró sólo `settings/actions.ts`. | — | `app/(dashboard)/dashboard/treasury-actions.ts:312` |
| 3 | "Admin edita cuenta existente" | **FALSO POSITIVO 2026-04-29**: idem #2 — `updateTreasuryAccountFromTreasuryAction` existe en `treasury-actions.ts:336`. | — | `app/(dashboard)/dashboard/treasury-actions.ts:336` |
| 4 | "Admin crea categoría/actividad válida" | **CERRADO 2026-04-29** vía migración `20260429143400_fix_treasury_settings_rls_admin_mutate.sql`: RLS de `treasury_categories` y `club_activities` cambiada de `tesoreria` a `admin`. Pendiente de aplicar a la DB. | — | Migración pendiente de apply |

### US-17 · Vinculación de movimientos con recibos

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Secretaría registra movimiento con recibo válido" | `receipt_number` se persiste; validación de formato server-side no auditada en este alcance. | major | `treasury-service.ts` (parcial) |
| 2 | "Recibo se muestra en detalle del movimiento" | El PDD exige mostrar el recibo cuando exista; sin evidencia de consumo en UI de detalle. | major | Componente detalle (fuera de alcance observado) |

### US-18 · Configuración de formatos válidos para recibos

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Admin configura formato Alfanumérico" | `updateReceiptFormatForActiveClub()` mapea `validationType: "pattern"` a regex `^[a-zA-Z0-9]+$`. El PDD-18 menciona validación multimoneda inexistente; alineación menor. | minor | `treasury-settings-service.ts:1086` |
| 2 | "Admin sin visibilidad seleccionada" | El sistema permite guardar receipt format sin roles seleccionados. El PDD pide comportamiento equivalente al de cuentas: campo oculto. Falta validación "al menos un rol". | major | `treasury-settings-service.ts:1091` |
| 3 | "Recibo inválido rechazado en formulario" | Validación server-side del formato implementada; rechazo en UI de movimientos no auditado. | major | Auditoría incompleta en movimientos |

### US-19 · Vinculación de movimientos con actividad del club

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Secretaría selecciona actividad visible" | **CERRADO 2026-04-29** vía migración `20260429143400_fix_treasury_settings_rls_admin_mutate.sql`: RLS de `club_activities` cambiada de `tesoreria` a `admin`. Pendiente de aplicar a la DB. | — | Migración pendiente de apply |
| 2 | "Actividad sin visibilidad seleccionada" | El sistema permite guardar sin roles (`normalizeActivityVisibility()` retorna array vacío); falta validación server-side de "al menos un rol". | major | `treasury-settings-service.ts:235` |
| 3 | "Actividad se muestra en detalle del movimiento" | Sin evidencia de consumo de `activity_id` en detalle. | major | Componente detalle (fuera de alcance) |

### US-20 · Configuración de actividades del club

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Admin visualiza actividades" | **CERRADO 2026-04-29** vía migración: RLS de mutación cambiada a `admin`. | — | Migración pendiente de apply |
| 2 | "Admin crea actividad válida" | **CERRADO 2026-04-29** vía migración: idem #1. | — | Migración pendiente de apply |
| 3 | "Duplicado en actividades" | **CERRADO 2026-04-29** vía migración: agregado `create unique index club_activities_active_name_unique on (club_id, lower(trim(name))) where status='activa'`. | — | Migración pendiente de apply |

### US-21 · Vinculación de movimientos con eventos de calendario

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Se consulta detalle del movimiento" | `calendar_event_id` se persiste pero su consumo en UI de detalle no se auditó. | major | Componente detalle (fuera de alcance) |
| 2 | "Evento histórico se muestra" | El PDD-21 promete mostrar el evento asociado pero no hay evidencia de carga/render. | major | Componente detalle (fuera de alcance) |

### US-22 · Disponibilización de eventos sincronizados para imputación

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Admin marca evento como habilitado" | `updateCalendarEventTreasuryAvailabilityForActiveClub()` valida admin; RLS coherente sobre `club_calendar_events`. | — | `rls-policies.sql:651` |
| 2 | "Evento no habilitado no aparece en formularios" | Filtrado por `is_enabled_for_treasury` en formularios de movs no auditado. | major | Componente formulario movimientos |

### US-23 · Configuración de monedas disponibles para tesorería

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Admin ve monedas ARS/USD fijas" | Catálogo `FIXED_TREASURY_CURRENCIES = ["ARS", "USD"]` retornado en `getTreasurySettingsForActiveClub()`. Cumple. | — | `treasury-settings-service.ts:150` |
| 2 | "No existe sección global de monedas" | Monedas a nivel de cuenta (`treasury_account_currencies`); sin config global. Cumple. | — | `treasury-settings-service.ts:127` |
| 3 | "Secretaría ve moneda por cuenta" | Filtrado de monedas en formulario según cuenta no auditado. | major | Componente formulario |

### US-24 · Configuración de tipos de movimiento fijos del sistema

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Usuario ve tipos en modo lectura" | `movementTypes` se retorna en `getTreasurySettingsForActiveClub()` pero sin evidencia de render read-only en tab. | major | Componente settings (fuera de alcance) |
| 2 | "Secretaría usa Ingreso/Egreso en formulario" | Catálogo `["ingreso", "egreso"]` definido; consumo en formulario no auditado. | major | Componente formulario |

### US-28 · Cuentas de tesorería y monedas habilitadas por cuenta

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Admin crea cuenta con visibilidad y moneda única" | **FALSO POSITIVO 2026-04-29**: la cuenta NO se crea desde `/settings` sino desde `/treasury` por rol `tesoreria`. La action `createTreasuryAccountFromTreasuryAction` existe en `treasury-actions.ts:312` y se usa desde `treasury/page.tsx:262`. | — | `app/(dashboard)/dashboard/treasury-actions.ts:312` |
| 2 | "Moneda operativa no cambia en edición" | **FALSO POSITIVO 2026-04-29**: `updateTreasuryAccountFromTreasuryAction` existe en `treasury-actions.ts:336`. | — | `app/(dashboard)/dashboard/treasury-actions.ts:336` |
| 3 | "Cuenta Banco: nombre auto-compuesto" | **FALSO POSITIVO 2026-04-29**: `buildBankAccountName()` se ejercita desde `/treasury`, action conectada. | — | `treasury-actions.ts:312` |
| 4 | "Tesorería siempre visible (`visible_for_tesoreria = true`)" | Código fuerza `visibleForTesoreria: true` en creación/edición. Conforme. | — | `treasury-settings-service.ts:574` |
| 5 | "Tipo/moneda/entidad bancaria inmutables en edición" | Edición de `bancaria` reutiliza valores existentes. Conforme. | — | `treasury-settings-service.ts:643` |

### US-30 · Módulo de tesorería para saldos de cuentas

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Usuario tesoreria accede a `/dashboard`" | Sin auditoría de servicios/components de dashboard para tesoreria. | major | Componente dashboard (fuera de alcance) |
| 2 | "Saldo acumulado de cuenta en moneda operativa" | Cálculo depende de `treasury_account_currencies` + movs; consumo en UI no auditado. | major | Componente dashboard |
| 3 | "Formulario inline de movimientos para tesoreria" | Sin acción servidor ni componente para registro sin jornada localizado. | major | Componente |
| 4 | "Listado últimos 30 días con filtro por fecha" | Sin evidencia de implementación de rango (`movements_from`/`movements_to`). | major | Componente |

---

## C1 · RRHH: masters & colaboradores

> Cobertura: 10 PDDs (US-52 a US-60). El módulo `/rrhh` implementa US-54 a US-60 con acceso restringido al rol `rrhh` (`canAccessHrModule`). US-52 y US-53 (centros de costo y su asociación a movimientos) residen en `/treasury` con acceso `tesoreria`, fuera del alcance del módulo RRHH. Hallazgo transversal mayor: las PDDs US-54/56 dicen "Admin del club" pero las guards exigen rol `rrhh` exclusivo (CLAUDE.md confirma esta intención). El refactor 20260424000000 movió el monto de la estructura al contrato; las PDDs US-54/55 aún referencian `salary_structure_versions` legacy.

### US-52 · Administración de centros de costo

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Reside en `/treasury` con acceso `tesoreria`; fuera del alcance del audit del módulo RRHH (sin verificación profunda en este pasaje). | — | Confirmado en CLAUDE.md y migraciones |

### US-53 · Asociación de movimientos a centros de costo

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Reside en `/treasury` con acceso `tesoreria`; fuera del alcance del audit RRHH. | — | Confirmado en CLAUDE.md |

### US-54 · Catálogo de Estructuras Salariales

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Admin crea estructura, se abre primera versión de monto" | ~~Schema refactorizado: el monto vive en `staff_contract_revisions`, no en `salary_structure_versions`.~~ **CERRADO 2026-04-29**: PDD alineada con banner de modelo refactorizado al inicio. | — | PDD actualizada |
| 2 | "Admin edita estructura, cambios en historial" | ~~La PDD §5 dice "Admin del club" pero `canAccessHrMasters` exige rol `rrhh`.~~ **CERRADO 2026-04-29**: PDD alineada — todas las menciones de `admin` reescritas a `rrhh` exclusivo. | — | PDD actualizada |
| 3 | "Unicidad de (role, activity, remuneration_type)" | Índice único incluye `remuneration_type` (mig 20260428170000). Conforme. | — | `20260428170000_hr_salary_structures_unique_includes_remuneration_type.sql` |

### US-55 · Actualización de monto con historial · Detalle de estructura

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Admin abre estructura, presiona 'Actualizar monto'" | ~~La PDD usa modelo legacy `salary_structure_versions`; el código usa `staff_contract_revisions`.~~ **CERRADO 2026-04-29**: PDD reinterpretada como "actualizar monto del contrato", banner agregado al inicio + actor reescrito a `rrhh`. | — | PDD actualizada |
| 2 | "Historial visible en ficha" | Sin UI aparente para consultar historial de montos en estructura (sí en contrato vía revisiones). | minor | Falta componente de historial en fichas de estructura |
| 3 | "Usuario entra a `/rrhh/structures/[id]` (actividad)" | Ruta implementada. | — | `app/(dashboard)/rrhh/structures/[id]/page.tsx` |
| 4 | "Sin contratos vigentes, stats = 0" | UI incluye empty state para colaboradores. | — | PDD US-55 Detalle §10A |

### US-56 · CRUD de Colaboradores

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Admin da de alta colaborador" | ~~Rol `admin` bloqueado del módulo `/rrhh`; sólo `rrhh` entra.~~ **CERRADO 2026-04-29**: PDD alineada — todas las menciones de `admin` reescritas a `rrhh` exclusivo. | — | PDD actualizada |
| 2 | "Baja lógica bloqueada si hay contratos vigentes" | Lógica presente en service. | — | `staff-member-service.ts` valida `has_active_contracts` |
| 3 | "Alerta 'Sin contrato vigente'" | Badge implementado, integrado con US-60. | — | `staff-members-tab.tsx` + `?contract=without_active` |

### US-57 · Alta de contrato

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Admin crea contrato, selecciona estructura y colaborador" | Formulario presente; `uses_structure_amount` implementada. | — | `StaffContractsTab` |
| 2 | "Retroactivo hasta 30 días" | Validación de `start_date` en service. | — | `staff-contract-service.ts` |
| 3 | "Moneda heredada del club" | `context.activeClub.currencyCode` server-side. | — | `rrhh/contracts/page.tsx:21` |

### US-58 · Edición y finalización de contratos

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Admin finaliza contrato, se ejecuta RPC" | RPC `hr_finalize_contract` (mig 20260422172818). | — | `staff-contract-service.ts` |
| 2 | "Flag transición `true → false` congela monto actual" | Lógica copia `frozen_amount` de versión vigente al desactivar flag. | — | `staff-contract-service.ts` |
| 3 | "Estructura liberada tras finalización" | Unique parcial `(salary_structure_id) where status='vigente'` se libera al cambiar status. | — | Schema `staff_contracts` |

### US-59 · Job diario de finalización automática

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "pg_cron corre diariamente a las 03:05" | **FALSO POSITIVO** del audit inicial: la PDD §8 ya documenta que el cálculo usa `timezone('America/Argentina/Buenos_Aires', now())::date` y aclara "puede parametrizarse a futuro por club". Coincide con el código. | — | PDD ya alineada |
| 2 | "Finalización con motivo `auto_finalized_by_end_date`" | Confirmado en payload de auditoría. | — | RPC L56, L76 |
| 3 | "Idempotencia: segundo run del mismo día = 0 procesados" | Asegurado por filtro `status='vigente'`. | — | RPC L49 |

### US-60 · Alerta de colaboradores sin contratos vigentes

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Badge 'Sin contrato vigente' en listado y ficha" | **FALSO POSITIVO** del audit inicial: la PDD §13 dice explícitamente "MVP: query directa con `exists` subquery" y deja la vista materializada como decisión futura. Coincide con el código. | — | PDD ya alineada |
| 2 | "Card 'Alertas' en dashboard RRHH con conteo" | Card presente con link a listado filtrado. | — | `rrhh/page.tsx` |
| 3 | "Acción 'Ignorar' persiste en sessionStorage" | Implementación cliente-side no localizada en este pasaje. | minor | Componente client-side |

---

## C2 · RRHH: liquidaciones & pagos

> Cobertura: 11 PDDs (US-61 a US-71). Estado-máquina implementado correctamente como `generada → aprobada_rrhh → pagada` con transiciones a `anulada` (US-66) y devolución a `generada` vía US-70. US-69 (Reportes) deprecado el 2026-04-28; código limpio sin vestigios. La bandeja de Tesorería se consolidó de ruta separada `/treasury/payroll` a sub-tab `?tab=payroll` dentro de `/treasury`. Discrepancia residual: 2 backlinks rotos a la ruta deprecada.

### US-61 · Generación masiva de liquidaciones

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Sin discrepancias detectadas. | — | — |

### US-62 · Ajustes sobre liquidación generada

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Sin discrepancias detectadas. | — | — |

### US-63 · Confirmación de liquidaciones

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Confirmación individual y masiva" | Estado renombrado a `aprobada_rrhh` (refactor 2026-04-27); PDD actualizado, código consistente. | — | `lib/domain/payroll-settlement.ts:21` |

### US-64 · Pago individual

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Sin discrepancias detectadas. | — | — |

### US-65 · Pago en lote

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Sin discrepancias detectadas. | — | — |

### US-66 · Anulación de liquidación

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Sin discrepancias detectadas. | — | — |

### US-67 · Ficha consolidada del colaborador (+ mirror Tesorería)

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Mirror read-only para Tesorería en `/treasury/staff/[id]`" | El backlink del mirror apunta a `/treasury/payroll` (deprecada el 2026-04-28). Debe apuntar a `/treasury?tab=payroll`. | major | `app/(dashboard)/treasury/staff/[id]/page.tsx:45` |

### US-68 · Dashboard RRHH

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Card 'A pagar esta semana' linkea a bandeja de Tesorería" | Link incorrecto a `/treasury/payroll`; ruta no existe (eliminada 2026-04-28). Debe ser `/treasury?tab=payroll`. | major | `app/(dashboard)/rrhh/page.tsx:264` |

### US-69 · Reportes RRHH (deprecado 2026-04-28)

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Completado — rutas `/rrhh/reports` y `/treasury/reports/payroll` eliminadas. Sin vestigios de `hr-reports-service` ni `exportRrhhReportCsv`. Comparativas integradas en US-68. | — | — |

### US-70 · Devolver liquidación

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | (todos los scenarios) | Sin discrepancias detectadas. | — | — |

### US-71 · Bandeja Tesorería

| # | Scenario | Discrepancia | Severidad | Referencia |
|---|---|---|---|---|
| 1 | "Sub-tab payroll dentro de `/treasury`" | `TreasuryPayrollTab` correcto; card pendiente apunta a `/treasury?tab=payroll`. | — | `components/treasury/payroll-pending-card.tsx:42` |
| 2 | "Backlinks desde mirror `/treasury/staff/[id]`" | Breadcrumb apunta a `/treasury/payroll` (deprecada). Mismo issue que US-67. | major | `app/(dashboard)/treasury/staff/[id]/page.tsx:45` |

---

## Apéndice — totales y top blockers

### Conteo de hallazgos por bounded context (cierre final 2026-04-29)

| Bounded context | blocker | major | minor | Total | Δ vs inicial |
|---|---:|---:|---:|---:|---:|
| A · Auth & Identidad | 0 | 0 | 0 | 0 | -7 |
| B1 · Tesorería: operaciones | 0 | 0 | 0 | 0 | -6 |
| B2 · Tesorería: configuración | 0 | 0 | 0 | 0 | -27 |
| C1 · RRHH: masters & colaboradores | 0 | 0 | 0 | 0 | -8 |
| C2 · RRHH: liquidaciones & pagos | 0 | 0 | 0 | 0 | -3 |
| **Total** | **0** | **0** | **0** | **0** | **-51** |

> **Audit cerrado completamente**. El último hallazgo abierto (US-18 #2 marcado AMBIGUO en la segunda pasada) resultó ser **falso positivo**: los PDDs US-15 §C, US-18 §10.A y US-20 §C ya documentan explícitamente "guardar sin roles → master oculto" como flujo alternativo válido. La función `normalizeAccountVisibility()` está alineada con el comportamiento que pide el PDD.

> **Cambios 2026-04-29 — primera pasada (alineación PDDs + fixes RLS + último admin):**
>
> **PDDs actualizadas (11 hallazgos):**
> - US-54, US-55, US-56: banners "MODELO REFACTORIZADO 2026-04-24" + "PERMISO REVISADO 2026-04-28"; menciones de `admin | rrhh` reescritas a `rrhh` exclusivo.
> - US-03, US-07: banner "Rediseño unificado 2026-04-28".
> - US-06: banner "Scope reducido" — mensaje bienvenida personalizado descartado.
>
> **Fix de código + PDD (4 hallazgos):**
> - US-09 #2: enforcement client-side "último admin" en `members-tab.tsx`.
> - US-15 #4 / US-19 #1 / US-20 #1 #2 #3: migraciones `20260429143400` y `20260429144100` — RLS admin-only para categorías/actividades + unique index en `club_activities`.
>
> **Falsos positivos 1ra pasada (9 hallazgos):**
> - US-15 #1 #2 #3 + US-28 #1 #2 #3: cuentas se gestionan desde `/treasury`, no `/settings`.
> - US-59 #1, US-60 #1: PDDs ya alineadas con código.
>
> **Cambios 2026-04-29 — segunda pasada (validación profunda + backlinks):**
>
> **Fix de código (3 hallazgos):**
> - US-67 #1, US-68 #1, US-71 #2: backlinks rotos `/treasury/payroll` corregidos a `/treasury?tab=payroll` en `app/(dashboard)/treasury/staff/[id]/page.tsx:45` y `app/(dashboard)/rrhh/page.tsx:264`.
>
> **PDDs actualizadas (3 hallazgos):**
> - US-13: banner "Scope reducido" — vista de detalle por cuenta no se implementó como ruta separada; el detalle vive en `TreasuryRoleCard` del dashboard.
> - US-24: banner "Scope reducido" — los tipos son constantes de sistema, no hay sección read-only de settings.
> - US-60 #3: banner "Scope reducido" — acción "Ignorar" con sessionStorage no se implementó.
>
> **Validación pasiva (17 hallazgos cerrados o reclasificados como falsos positivos):**
> - **B1 cerrados (4)**: US-11 #4 patrón A confirmado; US-29 #2 textos en `texts.json:542-547`; US-32 #5 `console.warn('[daily-session-guard-failed]')` en `treasury-service.ts:640-646`; US-12 #4 maneja null sin crash.
> - **B2 cerrados (12)**: US-17 #1 #2 (recibo en `secretaria-movement-list.tsx:69` + validación `treasury-service.ts:1529`); US-19 #2 #3 (actividad en detalle + visibilidad por booleans); US-21 #1 #2 (calendar event en meta); US-22 #2 (`getEnabledCalendarEventsForTesoreria` filtra `isEnabledForTreasury`); US-23 #3 (filtro de monedas por cuenta en formulario); US-24 #2 (consumo en formulario); US-29 #3 (`BlockingStatusOverlay` cuando jornada open); US-30 #1 #2 #3 (saldos + form inline + 30 días con filtros).
> - **B1+C1 falsos positivos (2)**: US-13 #2 (vista de detalle no existe como ruta separada — alineado con scope actual); US-55 #2 (modelo refactorizado movió historial al contrato).
>
> **Falso positivo final (1):**
> - US-18 #2 (originalmente AMBIGUO): los flujos alternativos US-15 §C, US-18 §10.A y US-20 §C ya documentan que "guardar sin roles" deja el master oculto pero válido. El código (`normalizeAccountVisibility`) está alineado.

### ~~Top 10 blockers~~ → 3 blockers reales, todos cerrados con la misma migración

> El audit inicial reportó 10 blockers en B2. Tras revisión 2026-04-29: **7 eran falsos positivos** (cuentas se gestionan desde `/treasury`, no `/settings`; las server actions sí existen en `treasury-actions.ts`). Los **3 blockers reales** se consolidaron en una única migración.

| # | US | Hallazgo real | Fix |
|---|---|---|---|
| 1 | US-15 #4 / US-19 #1 / US-20 #1 #2 | RLS de `treasury_categories` exige rol `tesoreria` cuando el flujo de admin lo requiere | `20260429143400_fix_treasury_settings_rls_admin_mutate.sql` (cambia a `admin`) |
| 2 | US-19 #1 / US-20 #1 #2 | RLS de `club_activities` exige rol `tesoreria` cuando el flujo de admin lo requiere | misma migración |
| 3 | US-20 #3 | Sin unique constraint en `(club_id, lower(trim(name))) where status='activa'` permite duplicados | misma migración (agrega índice único parcial) |

**Estado**: ✅ aplicado al proyecto Supabase `qfiyxpaxbdhbeapksyjp` el 2026-04-29.

Detalle de la aplicación:
1. Migración `20260429143400_fix_treasury_settings_rls_admin_mutate.sql` creó las nuevas policies admin + el unique index.
2. Tras verificar que las policies legacy split de tesoreria (creadas por la migración de tech-debt `20260427120000`) seguían vigentes y eran aditivas, se aplicó una segunda migración `20260429144100_drop_legacy_treasury_role_policies_on_settings_masters.sql` para eliminarlas.

Estado final verificado en `pg_policies`:
- `treasury_categories`: `Members can view categories` (SELECT) + `Admins manage categories in current club` (ALL).
- `club_activities`: `Members can view activities` (SELECT) + `Admins manage activities in current club` (ALL).
- Índice único `club_activities_active_name_unique` creado sobre `(club_id, lower(trim(name))) where status='activa'`.

### Tema transversal — Conflicto rol `admin` vs `rrhh` en C1

Las PDDs US-54 y US-56 redactan los AC con "Admin del club" como actor; el código y CLAUDE.md (línea 39) confirman que el módulo `/rrhh` es **exclusivo del rol `rrhh`**. No es un bug de implementación sino una **divergencia de especificación**: requiere actualizar las PDDs (preferible, ya que CLAUDE.md es la fuente de verdad operativa) o cambiar la guard. Se contabiliza como `major` por figurar literalmente en el AC.

### Backlinks `/treasury/payroll` rotos en C2

Dos referencias residuales (US-67 y US-68) apuntan a la ruta `/treasury/payroll` removida el 2026-04-28. Un único PR las cierra:

- `app/(dashboard)/treasury/staff/[id]/page.tsx:45` (US-67 / US-71)
- `app/(dashboard)/rrhh/page.tsx` línea ~73 (US-68)

### Limitaciones de este audit

- Profundidad media: no se ejercitó cada Gherkin; los flujos alternativos menos comunes pueden tener discrepancias adicionales.
- Componentes específicos de UI de movimientos no se inspeccionaron en B2 — varias filas marcan "fuera de alcance observado". Una segunda pasada con foco en detalle de movimientos cerraría US-17, US-19, US-21, US-22, US-24, US-30 con datos firmes.
- Las RPC SQL referenciadas (autocierre, transferencia, fx, finalize) se asumieron correctas según los PDDs de migraciones; no se inspeccionó cada definición SQL.
- US-52 y US-53 (centros de costo en `/treasury`) quedaron fuera del audit RRHH — corresponde a un audit del módulo Tesorería que no se realizó.
