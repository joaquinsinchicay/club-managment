# PDD — US-14 · Apertura y cierre diario con validación de saldos por cuenta

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Secretaria del club, quiero abrir y cerrar la jornada validando los saldos de cada cuenta disponible, para asegurar que los saldos iniciales y finales queden correctamente registrados y que cualquier diferencia genere el movimiento correspondiente. |
| Prioridad | Alta |
| Objetivo de negocio | Garantizar que la jornada diaria de Secretaría comience y termine con saldos controlados por cuenta, dejando evidencia explícita de diferencias y sus ajustes asociados. |

---

## 2. Problema a resolver

La apertura y cierre básicos permiten operar la jornada, pero todavía no controlan saldos declarados por cuenta. Sin esa validación, las diferencias entre saldo esperado y saldo informado por Secretaría quedan invisibles y no generan trazabilidad operativa.

---

## 3. Objetivo funcional

El sistema debe ofrecer una pantalla dedicada de apertura y otra de cierre diario para `secretaria`, mostrando todas las cuentas visibles del club activo con saldo esperado precargado, permitiendo editar el saldo declarado, previsualizando diferencias y generando movimientos de ajuste al confirmar.

---

## 4. Alcance

### Incluye
- Pantalla de apertura diaria con todas las cuentas con visibilidad `secretaria`.
- Pantalla de cierre diario con todas las cuentas con visibilidad `secretaria`.
- Precarga del saldo esperado por cuenta y moneda.
- Edición del saldo declarado por cuenta y moneda.
- Detección y visualización de diferencias.
- Previsualización de movimientos de ajuste con categoría `Ajuste`.
- Confirmación y cancelación explícitas antes de ejecutar apertura o cierre.
- Registro de saldos esperados, declarados y diferencia por sesión.
- Generación de movimientos automáticos de ajuste en apertura o cierre.

### No incluye
- Reapertura de jornadas cerradas.
- Ajustes manuales posteriores al cierre.
- Validaciones históricas fuera del día operativo actual.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `secretaria` en el club activo.

---

## 6. Precondiciones

- El club activo está resuelto.
- Existen cero o más cuentas visibles para Secretaría.
- El saldo esperado por cuenta puede derivarse del estado actual de la jornada.
- Existe categoría `Ajuste` disponible en el club activo.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Apertura sin diferencias | Se crea la jornada abierta y no se generan ajustes. |
| Apertura con diferencias | Se crea la jornada y se generan movimientos de ajuste por cada diferencia. |
| Cierre sin diferencias | Se cierra la jornada abierta y no se generan ajustes. |
| Cierre con diferencias | Se registran ajustes y luego se cierra la jornada. |
| No hay cuentas visibles | Se muestra estado vacío y no se permite confirmar. |

---

## 8. Reglas de negocio

- Solo `secretaria` puede acceder a apertura y cierre diario en este bloque.
- La apertura solo está disponible si no existe jornada creada para el día actual.
- El cierre solo está disponible si existe una jornada `open` para el día actual.
- La UI muestra exclusivamente cuentas con visibilidad `secretaria` del club activo.
- Cada cuenta visible debe mostrar el saldo esperado acumulado por moneda habilitada, calculado con el historial visible de movimientos de la cuenta hasta la fecha operativa.
- Todos los saldos declarados son obligatorios al confirmar.
- Si el saldo declarado difiere del esperado, se genera un movimiento con categoría `Ajuste`.
- El tipo del movimiento de ajuste será `ingreso` si la diferencia es positiva y `egreso` si es negativa.
- En apertura, primero se crea la jornada y luego se registran saldos y ajustes.
- En cierre, primero se registran saldos y ajustes sobre la jornada abierta y luego se marca el cierre.

---

## 9. Flujo principal

1. Secretaría ingresa a la acción de apertura o cierre desde el dashboard.
2. El sistema valida rol, club activo y estado de la jornada según corresponda.
3. La pantalla muestra todas las cuentas visibles con saldo esperado precargado.
4. El usuario puede editar el saldo declarado por cuenta y moneda.
5. Si hay diferencias, la UI muestra los movimientos de ajuste a generar.
6. El usuario confirma la operación.
7. El sistema registra saldos declarados, crea ajustes si corresponde y finalmente abre o cierra la jornada.
8. El usuario vuelve al dashboard con feedback contextual.

---

## 10. Flujos alternativos

### A. Usuario sin rol permitido

1. Un usuario sin rol `secretaria` intenta acceder a apertura o cierre.
2. El sistema redirige al dashboard sin exponer la funcionalidad.

### B. Sin cuentas visibles

1. Secretaría ingresa a apertura o cierre.
2. No existen cuentas visibles para Secretaría.
3. La pantalla muestra estado vacío y bloquea la confirmación.

### C. Saldos incompletos o inválidos

1. El usuario intenta confirmar sin completar todos los saldos o con valores inválidos.
2. El sistema rechaza la confirmación y devuelve feedback de validación.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La experiencia debe sentirse consistente con dashboard y mobile-first.
- La edición de saldos debe ser simple de escanear por cuenta.
- La previsualización de ajustes debe mostrarse antes de confirmar.
- Las acciones `Confirmar` y `Cancelar` deben quedar visibles en la misma pantalla.
- No debe haber textos hardcodeados.

---

## 12. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Reglas
- No hardcoded strings are allowed.
- All user-facing texts must map to `lib/texts.json`.

### Keys requeridas

| Tipo | Key | Contexto |
|---|---|---|
| action | `dashboard.treasury.open_session_flow_cta` | Acceso desde dashboard a la pantalla de apertura. |
| action | `dashboard.treasury.close_session_flow_cta` | Acceso desde dashboard a la pantalla de cierre. |
| title | `dashboard.treasury.opening_title` | Título de apertura. |
| body | `dashboard.treasury.opening_description` | Descripción de apertura. |
| title | `dashboard.treasury.closing_title` | Título de cierre. |
| body | `dashboard.treasury.closing_description` | Descripción de cierre. |
| label | `dashboard.treasury.expected_balance_label` | Saldo esperado. |
| label | `dashboard.treasury.declared_balance_label` | Saldo declarado. |
| label | `dashboard.treasury.difference_label` | Diferencia. |
| title | `dashboard.treasury.adjustment_preview_title` | Bloque de ajustes. |
| body | `dashboard.treasury.adjustment_preview_description` | Explicación de ajustes. |
| body | `dashboard.treasury.adjustment_message` | Mensaje visible cuando existe diferencia. |
| action | `dashboard.treasury.confirm_open_session_cta` | Confirmación de apertura. |
| action | `dashboard.treasury.confirm_close_session_cta` | Confirmación de cierre. |
| action | `dashboard.treasury.cancel_session_cta` | Cancelación y vuelta al dashboard. |
| feedback | `dashboard.feedback.declared_balance_required` | Validación de saldos faltantes. |
| feedback | `dashboard.feedback.declared_balance_invalid` | Validación de formato inválido. |
| feedback | `dashboard.feedback.no_accounts_available` | Sin cuentas disponibles. |
| feedback | `dashboard.feedback.adjustment_category_missing` | Falta categoría Ajuste. |

---

## 13. Persistencia

### Entidades afectadas
- `daily_cash_sessions`: READ para validar apertura/cierre; INSERT en apertura; UPDATE en cierre.
- `daily_cash_session_balances`: INSERT para registrar esperado, declarado y diferencia por cuenta y momento.
- `treasury_accounts`: READ para resolver cuentas visibles.
- `treasury_movements`: READ para calcular saldo esperado; INSERT para ajustes automáticos.
- `balance_adjustments`: INSERT para vincular el ajuste automático con la sesión y la cuenta.
- `treasury_categories`: READ para resolver la categoría `Ajuste`.

Do not reference current code files.

---

## 14. Seguridad

- La validación de acceso debe resolverse server-side sobre club activo y membership activo.
- No debe ser posible generar ajustes sobre cuentas de otro club.
- Las cuentas visibles deben limitarse a cuentas con `visible_for_secretaria = true`.
- La categoría `Ajuste` debe resolverse del club activo antes de persistir ajustes.

---

## 15. Dependencias

- contracts: `Open daily cash session`, `Close daily cash session`.
- domain entities: `daily_cash_sessions`, `daily_cash_session_balances`, `treasury_accounts`, `treasury_movements`, `balance_adjustments`, `treasury_categories`.
- other US if relevant: US-10 para jornada diaria base; US-11 para movimientos; US-12 para la card del dashboard; US-13 para visibilidad detallada por cuenta.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Registrar ajustes sobre una cuenta incorrecta | Media | Alta | Validar cuentas y monedas exclusivamente contra el club activo. |
| Cerrar la jornada antes de generar ajustes | Media | Alta | En cierre, persistir saldos y ajustes antes del cambio a `closed`. |
| UX confusa con muchas cuentas | Media | Media | Agrupar por cuenta y mostrar resumen claro de diferencia por moneda. |
| Falta de categoría Ajuste | Baja | Alta | Validar antes de confirmar y devolver feedback específico. |

---

## 17. Relacionado

- [PDD US-10 · Apertura y cierre diario](pdd_us_10_apertura_y_cierre_diario.md)
- [PDD US-32 · Cierre automático de jornada colgada](pdd_us_32_cierre_automatico_de_jornada.md) — el cierre automático usa saldos esperados sin ajustes; los cierres manuales de esta US marcan `close_type = 'manual'`.
