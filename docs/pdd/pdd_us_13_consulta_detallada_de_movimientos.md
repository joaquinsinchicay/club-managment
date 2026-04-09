# PDD — US-13 · Consulta detallada de movimientos y saldos por cuenta

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como usuario operativo con rol Secretaria o Tesoreria del club, quiero consultar el detalle de movimientos y saldos por cuenta, para controlar el estado de cada cuenta visible dentro del club activo. |
| Prioridad | Alta |
| Objetivo de negocio | Dar visibilidad detallada del dia por cuenta para que los roles operativos puedan auditar sus cuentas visibles sin perder el contexto del club activo. |

---

## 2. Problema a resolver

Las vistas resumidas de saldos no muestran el detalle de movimientos por cuenta. Los roles operativos necesitan inspeccionar una cuenta específica, revisar su historial de movimientos y cambiar entre cuentas visibles cuando hay más de una.

---

## 3. Objetivo funcional

Desde la card del dashboard de Secretaría o desde la card de Tesorería en `/dashboard`, el usuario con rol habilitado debe poder entrar al detalle de una cuenta del club activo, ver su saldo actual, el estado del día, el historial cronológico de movimientos agrupado por fecha y cambiar entre cuentas disponibles para su rol.

---

## 4. Alcance

### Incluye
- Navegación desde la card del dashboard al detalle por cuenta.
- Navegación desde la card de Tesorería al detalle por cuenta cuando corresponda.
- Visualización de saldo actual por cuenta.
- Visualización del estado de jornada del día.
- Historial completo de movimientos visibles de la cuenta seleccionada.
- Agrupación visual de movimientos por fecha.
- Cambio entre cuentas visibles para el rol operativo del acceso.
- Estado vacío cuando la cuenta no tiene movimientos.
- CTA visible para volver al dashboard.

### No incluye
- Filtros por fecha histórica.
- Vista de cuentas de otros roles o clubes.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `secretaria` o `tesoreria` en el club activo.

---

## 6. Precondiciones

- El club activo está resuelto.
- Existe al menos cero o más cuentas visibles para el rol del acceso.
- Existe un punto de entrada desde la card de Secretaría o desde la card de Tesorería en `/dashboard`.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Usuario habilitado entra al detalle desde su vista origen | Ve la vista detallada de la cuenta seleccionada. |
| La cuenta tiene movimientos | Se listan agrupados por fecha y ordenados desde lo más reciente. |
| La cuenta no tiene movimientos | Se muestra estado vacío y saldo actual. |
| Se cambia de cuenta | La vista se actualiza con saldos y movimientos de la nueva cuenta. |

---

## 8. Reglas de negocio

- Puede acceder `secretaria` o `tesoreria` segun visibilidad de la cuenta.
- La vista solo muestra información de la cuenta seleccionada en el club activo.
- Los movimientos deben incluir el historial visible completo de la cuenta dentro del club activo.
- El orden visible debe priorizar las fechas más recientes y agrupar los movimientos por `movementDate`.
- Si el acceso es desde Secretaría y hay jornada abierta, la vista puede ofrecer acceso rápido a registrar un nuevo movimiento.
- El flujo principal de edición de Secretaría vive en el dashboard, no en esta vista de detalle.
- Si el acceso es desde Tesorería, la vista no expone CTAs de operatoria de Secretaría.

---

## 9. Flujo principal

1. El usuario abre su vista origen y selecciona ver detalle de una cuenta visible.
2. El sistema resuelve la cuenta seleccionada dentro del club activo y valida visibilidad para el rol del acceso.
3. La UI muestra saldo actual, estado de jornada e historial de movimientos agrupado por fecha.
4. El usuario puede cambiar de cuenta desde la misma vista.

---

## 10. Flujos alternativos

### A. Sin movimientos

1. La cuenta seleccionada no tiene movimientos visibles en su historial.
2. La UI mantiene saldo y estado de jornada visibles.
3. El listado se reemplaza por un estado vacío.

### B. Sin cuentas disponibles

1. No existen cuentas visibles para el rol del acceso en el club activo.
2. La vista informa que no hay cuentas disponibles.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La vista debe conservar el contexto del dashboard y del club activo.
- Debe permitir cambiar entre cuentas sin fricción.
- Debe mostrar movimientos y saldos de forma fácil de escanear en mobile.
- Debe mostrar encabezados de fecha para separar visualmente el historial.
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
| title | `dashboard.treasury.detail_title` | Título de la vista de detalle. |
| body | `dashboard.treasury.detail_description` | Descripción de la vista. |
| label | `dashboard.treasury.detail_account_label` | Cuenta seleccionada. |
| action | `dashboard.treasury.detail_create_movement_cta` | Atajo para registrar movimiento. |
| action | `dashboard.treasury.account_switch_label` | Selector o grupo de cambio de cuenta. |
| action | `dashboard.treasury.back_to_dashboard_cta` | CTA de regreso al dashboard. |
| label | `dashboard.treasury.detail_empty_movements` | Estado vacío sin movimientos. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_accounts`: READ para resolver cuentas visibles y navegación entre cuentas.
- `treasury_movements`: READ para obtener movimientos del día por cuenta.
- `daily_cash_sessions`: READ para reflejar el estado de la jornada actual.
- `users`: READ indirecto para mostrar responsable de carga cuando sea posible.

Do not reference current code files.

---

## 14. Seguridad

- El detalle debe limitarse al club activo y a cuentas visibles para el rol del acceso.
- No debe permitir acceso a cuentas de otros clubes por id manipulado.
- La resolución de cuenta válida debe hacerse server-side.

---

## 15. Dependencias

- contracts: `Get account detail`.
- domain entities: `treasury_accounts`, `treasury_movements`, `daily_cash_sessions`.
- other US if relevant: US-12 para el acceso desde la card de Secretaría; US-30 para el acceso desde la card de Tesorería en `/dashboard`; US-11 para la creación de movimientos del día.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Exponer movimientos de otra cuenta o club | Media | Alta | Validar cuenta seleccionada contra las cuentas visibles del club activo. |
| Orden incorrecto de movimientos | Media | Media | Ordenar cronológicamente antes de renderizar. |
| Vista vacía poco informativa | Baja | Media | Mantener saldo y estado aunque no existan movimientos. |
