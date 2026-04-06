# PDD — US-13 · Consulta detallada de movimientos y saldos por cuenta

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Secretaria del club, quiero consultar el detalle de movimientos y saldos por cuenta, para controlar la operatoria diaria y verificar el estado de cada cuenta del club activo. |
| Prioridad | Alta |
| Objetivo de negocio | Dar visibilidad detallada de la jornada actual por cuenta para que Secretaría pueda auditar su operatoria diaria sin perder el contexto del club activo. |

---

## 2. Problema a resolver

La card del dashboard resume saldos, pero no muestra el detalle de movimientos por cuenta. Secretaría necesita inspeccionar una cuenta específica, revisar movimientos del día y cambiar entre cuentas cuando hay más de una.

---

## 3. Objetivo funcional

Desde la card del dashboard, el usuario `secretaria` debe poder entrar al detalle de una cuenta del club activo, ver su saldo actual, el estado de la jornada, el listado cronológico de movimientos del día y cambiar entre cuentas disponibles.

---

## 4. Alcance

### Incluye
- Navegación desde la card del dashboard al detalle por cuenta.
- Visualización de saldo actual por cuenta.
- Visualización del estado de jornada del día.
- Listado de movimientos del día de la cuenta seleccionada.
- Cambio entre cuentas visibles para Secretaría.
- Estado vacío cuando la cuenta no tiene movimientos.

### No incluye
- Edición de movimientos existentes.
- Filtros por fecha histórica.
- Vista de cuentas de otros roles o clubes.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `secretaria` en el club activo.

---

## 6. Precondiciones

- El club activo está resuelto.
- Existe al menos cero o más cuentas visibles para Secretaría.
- El dashboard ya expone la card de saldos.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Secretaria entra al detalle desde dashboard | Ve la vista detallada de la cuenta seleccionada. |
| La cuenta tiene movimientos | Se listan ordenados cronológicamente. |
| La cuenta no tiene movimientos | Se muestra estado vacío y saldo actual. |
| Se cambia de cuenta | La vista se actualiza con saldos y movimientos de la nueva cuenta. |

---

## 8. Reglas de negocio

- Solo `secretaria` puede acceder a esta vista en este bloque.
- La vista solo muestra información de la cuenta seleccionada en el club activo.
- Los movimientos se limitan a la jornada actual.
- El orden visible debe ser cronológico.
- Si hay jornada abierta, la vista puede ofrecer acceso rápido a registrar un nuevo movimiento.

---

## 9. Flujo principal

1. Secretaría abre el dashboard y selecciona ver detalle de una cuenta.
2. El sistema resuelve la cuenta seleccionada dentro del club activo.
3. La UI muestra saldo actual, estado de jornada y listado de movimientos del día.
4. El usuario puede cambiar de cuenta desde la misma vista.

---

## 10. Flujos alternativos

### A. Sin movimientos

1. La cuenta seleccionada no tiene movimientos en la jornada actual.
2. La UI mantiene saldo y estado de jornada visibles.
3. El listado se reemplaza por un estado vacío.

### B. Sin cuentas disponibles

1. No existen cuentas visibles para Secretaría en el club activo.
2. La vista informa que no hay cuentas disponibles.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La vista debe conservar el contexto del dashboard y del club activo.
- Debe permitir cambiar entre cuentas sin fricción.
- Debe mostrar movimientos y saldos de forma fácil de escanear en mobile.
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

- El detalle debe limitarse al club activo y a cuentas visibles para Secretaría.
- No debe permitir acceso a cuentas de otros clubes por id manipulado.
- La resolución de cuenta válida debe hacerse server-side.

---

## 15. Dependencias

- contracts: `Get account detail`.
- domain entities: `treasury_accounts`, `treasury_movements`, `daily_cash_sessions`.
- other US if relevant: US-12 para el acceso desde la card del dashboard; US-11 para la creación de movimientos del día.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Exponer movimientos de otra cuenta o club | Media | Alta | Validar cuenta seleccionada contra las cuentas visibles del club activo. |
| Orden incorrecto de movimientos | Media | Media | Ordenar cronológicamente antes de renderizar. |
| Vista vacía poco informativa | Baja | Media | Mantener saldo y estado aunque no existan movimientos. |

