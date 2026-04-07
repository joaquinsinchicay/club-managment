# PDD — US-30 · Dashboard de Tesorería para consulta de saldos y movimientos

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como usuario con rol Tesoreria del club, quiero ver en el dashboard los saldos de mis cuentas visibles y registrar movimientos, para operar desde una UX equivalente a Secretaría sin depender de la jornada diaria. |
| Prioridad | Alta |
| Objetivo de negocio | Integrar la operatoria base de Tesorería dentro del dashboard principal, manteniendo claridad de rol, aislamiento por club y visibilidad por cuenta. |

---

## 2. Problema a resolver

El dashboard actual concentra la operatoria diaria de Secretaría. Cuando un usuario con rol `tesoreria` entra a `/dashboard`, no dispone de una card operativa equivalente para consultar saldos y registrar movimientos sobre sus cuentas visibles.

---

## 3. Objetivo funcional

El sistema debe mostrar en `/dashboard` una card operativa para usuarios con rol `tesoreria`, usando la misma estructura visual base de Secretaría pero sin estado de jornada ni acciones de apertura/cierre, con listado de cuentas visibles, saldos por moneda, acceso al detalle y formulario inline de movimientos.

---

## 4. Alcance

### Incluye
- Card operativa de Tesorería dentro de `/dashboard`.
- Listado de cuentas visibles para Tesorería en el club activo.
- Visualización de saldos por moneda para cada cuenta.
- Estado vacío cuando no existen cuentas visibles para Tesorería.
- Navegación al detalle de cuenta desde el dashboard.
- Formulario inline para registrar movimientos de Tesorería.

### No incluye
- Apertura o cierre de jornada.
- Consolidación diaria.
- Operatoria de Secretaría dentro de esta vista.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `tesoreria` en el club activo.

---

## 6. Precondiciones

- El club activo está resuelto.
- El usuario actual tiene rol `tesoreria` en el club activo.
- Existen cero o más cuentas con visibilidad para Tesorería.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Tesorería entra al dashboard | Ve la card con las cuentas visibles para su rol y sus saldos. |
| No hay cuentas visibles | Ve un estado vacío controlado. |
| Selecciona ver detalle | Accede al detalle de la cuenta dentro del contexto del club activo. |
| Registra un movimiento | El sistema crea el movimiento en el club activo sin exigir jornada diaria. |
| Usuario sin rol Tesorería entra al dashboard | No ve la card de Tesorería. |

---

## 8. Reglas de negocio

- Solo `tesoreria` puede ver esta card dentro de `/dashboard`.
- Si el usuario también tiene `secretaria`, el dashboard prioriza la variante de Secretaría.
- La card usa únicamente cuentas con `visible_for_tesoreria = true`.
- Cada cuenta visible muestra sus saldos por todas las monedas habilitadas.
- El estado vacío no oculta la pantalla; muestra la card con mensaje claro.
- La card no muestra estado de jornada ni CTAs de apertura/cierre.
- Tesorería puede registrar movimientos sin requerir `daily_cash_session_id`.
- El detalle por cuenta reutiliza la lógica de consulta del día, pero sin exponer CTAs de operatoria de Secretaría.

---

## 9. Flujo principal

1. Un usuario con rol `tesoreria` entra a `/dashboard`.
2. El sistema valida sesión, club activo y rol habilitado.
3. El backend resuelve las cuentas visibles para Tesorería y calcula sus saldos por moneda.
4. La UI renderiza la card con el listado de cuentas y el formulario inline.
5. El usuario puede entrar al detalle de una cuenta o registrar un movimiento.

---

## 10. Flujos alternativos

### A. Sin cuentas visibles

1. El club activo no tiene cuentas visibles para Tesorería.
2. El sistema renderiza la card.
3. La UI muestra un estado vacío específico.

### B. Usuario no autorizado

1. Un usuario sin rol `tesoreria` entra a `/dashboard`.
2. El sistema no renderiza la card de Tesorería.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La vista debe ser mobile-first.
- Debe sentirse coherente con la card de Secretaría, evitando una UX puente.
- Debe mostrar saldos de forma escaneable por cuenta y moneda.
- Debe ofrecer acceso al detalle y formulario inline en la misma pantalla.
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
| title | `dashboard.treasury_role.title` | Título de la card de Tesorería. |
| body | `dashboard.treasury_role.description` | Descripción breve de la card. |
| label | `dashboard.treasury_role.empty_accounts` | Estado vacío sin cuentas visibles para Tesorería. |
| action | `dashboard.treasury_role.detail_cta` | Acceso al detalle por cuenta. |
| title | `dashboard.treasury_role.movement_form_title` | Título del formulario inline. |
| body | `dashboard.treasury_role.movement_form_description` | Descripción del formulario inline. |
| action | `dashboard.treasury_role.create_cta` | Crear movimiento de Tesorería. |
| status | `dashboard.treasury_role.create_loading` | Estado visible durante la creación. |
| action | `dashboard.treasury_role.back_to_dashboard_cta` | Vuelta al dashboard desde el detalle. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_accounts`: READ para resolver cuentas visibles a Tesorería.
- `treasury_account_currencies`: READ indirecto para monedas habilitadas por cuenta.
- `treasury_movements`: READ para calcular saldos del día por cuenta y moneda.
- `treasury_movements`: INSERT para registrar movimientos de Tesorería sin jornada.

Do not reference current code files.

---

## 14. Seguridad

- La lectura y escritura deben limitarse al club activo.
- No deben mostrarse cuentas sin visibilidad para Tesorería.
- No debe permitir acceso a cuentas de otros clubes manipulando ids.
- El acceso al detalle debe validarse server-side contra las cuentas visibles del rol.

---

## 15. Dependencias

- contracts: `Get treasury role dashboard`, `Get account detail`, `Create treasury role movement`.
- domain entities: `treasury_accounts`, `treasury_account_currencies`, `treasury_movements`.
- other US if relevant: US-28 para la visibilidad por rol; US-13 para el detalle por cuenta; US-27 para la operatoria de movimientos de Tesorería.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Reutilizar reglas de jornada de Secretaría en Tesorería | Media | Alta | Separar servicios y acciones de creación de movimientos. |
| Mostrar cuentas no visibles para Tesorería | Media | Alta | Filtrar por visibilidad del rol en el backend. |
| Mezclar ambas variantes del dashboard para usuarios multirol | Media | Media | Renderizar una sola variante con prioridad definida. |
