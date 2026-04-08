# PDD — US-12 · Card de saldos y operación diaria en el dashboard

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E02 · Navegación |
| User Story | Como Secretaria del club, quiero ver en el dashboard una card con los saldos de las cuentas y acciones de apertura/cierre de jornada y registro de movimientos, para operar de forma rápida y centralizada. |
| Prioridad | Alta |
| Objetivo de negocio | Consolidar en el dashboard la operación diaria de Secretaría para que el usuario vea saldos, estado de jornada y acciones disponibles sin salir del contexto principal. |

---

## 2. Problema a resolver

Luego de abrir la jornada y registrar movimientos, Secretaría necesita una vista centralizada de saldos y acciones operativas del día. Sin esa card, la operatoria diaria queda dispersa y obliga a navegar sin contexto.

---

## 3. Objetivo funcional

El dashboard debe mostrar una card de saldos únicamente para usuarios con rol `secretaria` en el club activo. La card debe reflejar cuentas visibles, saldo acumulado del día, estado de jornada y las acciones operativas permitidas según el estado actual.

---

## 4. Alcance

### Incluye
- Card de saldos exclusiva para Secretaría.
- Listado de cuentas visibles para el rol.
- Saldos acumulados por cuenta y moneda.
- Estado de jornada del día.
- Acciones para abrir/cerrar jornada y abrir modales de registro según corresponda.
- Estado vacío si no hay cuentas configuradas.

### No incluye
- Detalle de movimientos por cuenta.
- Validación avanzada de saldos declarados en apertura/cierre.
- Operaciones de Tesorería.
- La card operativa de Tesorería dentro de `/dashboard`.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `secretaria` en el club activo.

---

## 6. Precondiciones

- El club activo está resuelto.
- Existen o pueden no existir cuentas configuradas para Secretaría en el club activo.
- El dashboard puede resolver la jornada del día y los movimientos cargados.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Secretaria entra al dashboard | Ve la card de saldos del club activo. |
| Usuario sin rol Secretaria | No ve la card. |
| Se registra un movimiento | Los saldos de la card se actualizan al refrescar el dashboard. |
| No hay cuentas configuradas | La card muestra estado vacío controlado. |

---

## 8. Reglas de negocio

- Solo `secretaria` ve la card en este bloque.
- Esta historia no cubre accesos ni cards del modulo propio de `tesoreria`.
- La card usa únicamente datos del club activo.
- Las acciones visibles dependen del estado de la jornada.
- Los saldos se calculan a partir de movimientos del día de las cuentas con visibilidad `secretaria`.
- Cada cuenta visible muestra sus saldos por todas las monedas habilitadas.
- Si no hay cuentas, la card sigue siendo visible pero en estado vacío.

---

## 9. Flujo principal

1. Secretaría ingresa al dashboard del club activo.
2. El sistema obtiene cuentas visibles, jornada del día y movimientos del día.
3. La UI renderiza la card con saldos y estado operativo.
4. La experiencia se organiza en una card de saldos, una card de acciones y una card de movimientos del dia.
5. La card habilita las acciones permitidas según exista o no jornada abierta.

---

## 10. Flujos alternativos

### A. Usuario no Secretaria

1. Un usuario `admin` o `tesoreria` abre el dashboard.
2. El sistema no renderiza la card de saldos de Secretaría.

### B. Sin cuentas configuradas

1. El club activo no tiene cuentas visibles para Secretaría.
2. La card muestra un estado vacío con mensaje claro.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La card debe convivir naturalmente con el resto del dashboard.
- Debe mostrar saldos de forma clara y escaneable.
- Debe ser mobile-first.
- El estado de jornada debe entenderse de un vistazo.
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
| title | `dashboard.treasury.title` | Título de la card de saldos. |
| body | `dashboard.treasury.description` | Descripción operativa de la card. |
| label | `dashboard.treasury.session_label` | Estado de jornada visible. |
| label | `dashboard.treasury.empty_accounts` | Estado vacío sin cuentas disponibles. |
| action | `dashboard.treasury.open_session_cta` | Abrir jornada. |
| action | `dashboard.treasury.close_session_cta` | Cerrar jornada. |
| action | `dashboard.treasury.detail_cta` | Ver detalle de cuenta desde la card. |
| action | `dashboard.treasury.movement_modal_cta` | Abrir modal para registrar movimiento. |
| action | `dashboard.treasury.transfer_modal_cta` | Abrir modal para registrar transferencia. |
| title | `dashboard.treasury.movements_card_title` | Titulo de la card de movimientos del dia. |
| body | `dashboard.treasury.movements_card_description` | Descripcion del listado de movimientos del dia. |
| label | `dashboard.treasury.movements_empty` | Estado vacio del listado del dia. |

---

## 13. Persistencia

### Entidades afectadas
- `daily_cash_sessions`: READ para estado de jornada.
- `treasury_accounts`: READ para cuentas visibles en la card.
- `treasury_movements`: READ para cálculo de saldos del día.

Do not reference current code files.

---

## 14. Seguridad

- La card debe usar únicamente información del club activo.
- Un usuario sin rol permitido no debe verla.
- Las acciones derivadas de la card no deben operar fuera del club activo.

---

## 15. Dependencias

- contracts: `Get dashboard treasury card`.
- domain entities: `daily_cash_sessions`, `treasury_accounts`, `treasury_movements`.
- other US if relevant: US-10 y US-11 para el estado de jornada y los movimientos que alimentan la card; US-13 para el detalle por cuenta.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Mostrar saldos de otro club por no filtrar por club activo | Media | Alta | Resolver todo desde el club activo server-side. |
| Mostrar CTA inconsistentes con el estado de jornada | Media | Media | Derivar acciones visibles únicamente del estado actual de la jornada. |
| Estado vacío poco claro | Baja | Media | Definir copy específico para ausencia de cuentas. |
