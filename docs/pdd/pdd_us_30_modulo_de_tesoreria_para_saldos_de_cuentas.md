# PDD — US-30 · Modulo de Tesorería para consulta de saldos de cuentas

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como usuario con rol Tesoreria del club, quiero acceder a un modulo propio con los saldos de mis cuentas visibles, para consultar rapidamente el estado operativo sin usar el dashboard de Secretaría. |
| Prioridad | Alta |
| Objetivo de negocio | Separar la consulta operativa de Tesorería del dashboard de Secretaría, manteniendo claridad de rol, aislamiento por club y visibilidad por cuenta. |

---

## 2. Problema a resolver

El dashboard actual concentra la operatoria diaria de Secretaría. Cuando un usuario con rol `tesoreria` entra a `/dashboard`, no dispone de una vista propia de consulta de cuentas y saldos, aunque existan cuentas habilitadas para ese rol.

---

## 3. Objetivo funcional

El sistema debe exponer un modulo propio en `/dashboard/treasury` para usuarios con rol `tesoreria`, mostrando las cuentas visibles para ese rol dentro del club activo y sus saldos por moneda, con acceso al detalle por cuenta.

---

## 4. Alcance

### Incluye
- Ruta propia `/dashboard/treasury`.
- Acceso visible al modulo para usuarios con rol `tesoreria`.
- Listado de cuentas visibles para Tesorería en el club activo.
- Visualización de saldos por moneda para cada cuenta.
- Estado vacío cuando no existen cuentas visibles para Tesorería.
- Navegación al detalle de cuenta desde el modulo.

### No incluye
- Apertura o cierre de jornada.
- Registro de movimientos desde este modulo.
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
| Tesorería entra al modulo | Ve las cuentas visibles para su rol con sus saldos. |
| No hay cuentas visibles | Ve un estado vacío controlado. |
| Selecciona ver detalle | Accede al detalle de la cuenta dentro del contexto del club activo. |
| Usuario sin rol Tesorería intenta entrar | No accede al modulo. |

---

## 8. Reglas de negocio

- Solo `tesoreria` puede acceder a `/dashboard/treasury`.
- El dashboard operativo `/dashboard` sigue siendo exclusivo de Secretaría.
- El modulo usa únicamente cuentas con `visible_for_tesoreria = true`.
- Cada cuenta visible muestra sus saldos por todas las monedas habilitadas.
- El estado vacío no oculta la pantalla; muestra el modulo con mensaje claro.
- El detalle por cuenta reutiliza la lógica de consulta del día, pero sin exponer CTAs de operatoria de Secretaría.

---

## 9. Flujo principal

1. Un usuario con rol `tesoreria` entra a `/dashboard/treasury`.
2. El sistema valida sesión, club activo y rol habilitado.
3. El backend resuelve las cuentas visibles para Tesorería y calcula sus saldos por moneda.
4. La UI renderiza el listado de cuentas.
5. El usuario puede entrar al detalle de una cuenta.

---

## 10. Flujos alternativos

### A. Sin cuentas visibles

1. El club activo no tiene cuentas visibles para Tesorería.
2. El sistema renderiza el modulo.
3. La UI muestra un estado vacío específico.

### B. Usuario no autorizado

1. Un usuario sin rol `tesoreria` intenta abrir `/dashboard/treasury`.
2. El sistema redirige fuera del modulo.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La vista debe ser mobile-first.
- Debe dejar claro que se trata de un modulo distinto del dashboard de Secretaría.
- Debe mostrar saldos de forma escaneable por cuenta y moneda.
- Debe ofrecer una acción simple para entrar al detalle.
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
| eyebrow | `dashboard.treasury_role.eyebrow` | Identificador visual del modulo. |
| title | `dashboard.treasury_role.title` | Título del modulo de Tesorería. |
| body | `dashboard.treasury_role.description` | Descripción breve del modulo. |
| label | `dashboard.treasury_role.empty_accounts` | Estado vacío sin cuentas visibles para Tesorería. |
| action | `dashboard.treasury_role.detail_cta` | Acceso al detalle por cuenta. |
| action | `dashboard.treasury_role.shortcut_cta` | Acceso visible al modulo desde el dashboard general. |
| action | `dashboard.treasury_role.back_to_module_cta` | Vuelta al modulo desde el detalle. |
| action | `header.treasury_module_cta` | Acceso visible al modulo desde el header. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_accounts`: READ para resolver cuentas visibles a Tesorería.
- `treasury_account_currencies`: READ indirecto para monedas habilitadas por cuenta.
- `treasury_movements`: READ para calcular saldos del día por cuenta y moneda.

Do not reference current code files.

---

## 14. Seguridad

- La lectura debe limitarse al club activo.
- No deben mostrarse cuentas sin visibilidad para Tesorería.
- No debe permitir acceso a cuentas de otros clubes manipulando ids.
- El acceso al detalle debe validarse server-side contra las cuentas visibles del rol.

---

## 15. Dependencias

- contracts: `Get treasury role dashboard`, `Get account detail`.
- domain entities: `treasury_accounts`, `treasury_account_currencies`, `treasury_movements`.
- other US if relevant: US-28 para la visibilidad por rol; US-13 para el detalle por cuenta; US-27 para futuras acciones de movimientos dentro del ecosistema de Tesorería.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Reutilizar copy o reglas de Secretaría en Tesorería | Media | Media | Separar textos, ruta y componente visual. |
| Mostrar cuentas no visibles para Tesorería | Media | Alta | Filtrar por visibilidad del rol en el backend. |
| Confundir dashboard general con modulo de Tesorería | Media | Media | Mantener rutas, títulos y accesos explícitamente separados. |
