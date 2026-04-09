# PDD — US-10 · Apertura y cierre diario de movimientos

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Secretaria del club, quiero realizar la apertura y cierre diario de movimientos, para registrar la operatoria del día, obtener saldos por cuenta y dejar trazabilidad de mi jornada laboral. |
| Prioridad | Alta |
| Objetivo de negocio | Establecer una jornada operativa diaria por club que delimite la carga de movimientos de Secretaría y permita controlar apertura, cierre y trazabilidad básica. |

---

## 2. Problema a resolver

La operatoria diaria de Secretaría necesita un marco explícito de jornada para saber cuándo puede cargar movimientos y cuándo debe quedar bloqueada la edición del día. Sin esta jornada, no hay control temporal ni consistencia operativa.

---

## 3. Objetivo funcional

El sistema debe permitir que un usuario con rol `secretaria` en el club activo abra una jornada diaria, opere movimientos durante ese período y la cierre al finalizar, manteniendo una única jornada por día y por club.

---

## 4. Alcance

### Incluye
- Apertura de jornada diaria para Secretaría.
- Cierre de jornada abierta.
- Validación de una sola jornada por día y club.
- Exposición del estado de jornada dentro del dashboard.
- Navegación con loader bloqueante desde las CTAs de Secretaría hacia las pantallas de apertura y cierre.
- Reglas para permitir o bloquear la creación de movimientos según el estado de la jornada.

### No incluye
- Ajustes por diferencia contra saldo declarado.
- Validaciones contables detalladas de cierre.
- Correcciones por Tesorería posteriores al cierre.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `secretaria` en el club activo.

---

## 6. Precondiciones

- El club activo está resuelto en backend.
- Existen cuentas visibles para Secretaría en el club activo.
- El dashboard puede resolver el estado de jornada del día.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Secretaría abre jornada | Se registra una jornada `open` para el día y club activo. |
| Secretaría intenta abrir otra jornada el mismo día | La acción se bloquea. |
| Secretaría cierra jornada abierta | La jornada cambia a `closed` y deja de habilitar carga de movimientos. |
| Secretaría intenta cerrar sin jornada abierta | La acción se bloquea. |

---

## 8. Reglas de negocio

- Solo `secretaria` puede abrir o cerrar jornada diaria.
- Solo puede existir una jornada por día y por club.
- La operación aplica únicamente al club activo.
- La carga de movimientos de Secretaría requiere jornada `open`.
- Una jornada `closed` no debe volver a habilitar la carga del mismo día en esta historia.

---

## 9. Flujo principal

1. Secretaría entra al dashboard del club activo.
2. El sistema consulta el estado de jornada del día.
3. Si no hay jornada, la UI ofrece abrirla.
4. Al abrir, se registra la jornada y el dashboard refleja estado `Abierta`.
5. Cuando la operativa termina, Secretaría selecciona cerrar jornada.
6. El sistema registra el cierre y el dashboard refleja estado `Cerrada`.

---

## 10. Flujos alternativos

### A. Doble apertura

1. Ya existe una jornada para el día actual.
2. Secretaría intenta abrir otra.
3. El sistema bloquea la acción sin duplicar registros.

### B. Cierre sin jornada

1. No existe jornada abierta para el día.
2. Secretaría intenta cerrar.
3. El sistema rechaza la operación.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- El estado de jornada debe verse de forma clara en dashboard.
- Las acciones disponibles deben cambiar según la jornada.
- La interacción debe ser mobile-first y de baja fricción.
- Al navegar desde una CTA de Secretaría hacia apertura o cierre, la pantalla actual debe mostrar un loader bloqueante hasta que cargue la nueva ruta.
- Al confirmar apertura o cierre, el CTA debe entrar en loading de inmediato y el formulario de validación debe quedar bloqueado hasta resolver.
- El resultado final de apertura o cierre debe mostrarse mediante toast.
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
| title | `dashboard.treasury.title` | Título de la card operativa de Secretaría. |
| label | `dashboard.treasury.session_label` | Estado de jornada. |
| label | `dashboard.treasury.session_open` | Jornada abierta. |
| label | `dashboard.treasury.session_closed` | Jornada cerrada. |
| label | `dashboard.treasury.session_not_started` | Jornada no iniciada. |
| action | `dashboard.treasury.open_session_cta` | Acción de abrir jornada. |
| action | `dashboard.treasury.close_session_cta` | Acción de cerrar jornada. |
| status | `dashboard.treasury.navigation_loading` | Estado visible durante la navegación hacia apertura o cierre. |
| status | `dashboard.treasury.confirm_open_session_loading` | Estado visible mientras se confirma la apertura. |
| status | `dashboard.treasury.confirm_close_session_loading` | Estado visible mientras se confirma el cierre. |
| feedback | `dashboard.feedback.session_opened` | Apertura exitosa. |
| feedback | `dashboard.feedback.session_closed` | Cierre exitoso. |
| feedback | `dashboard.feedback.session_already_exists` | Error de doble apertura. |
| feedback | `dashboard.feedback.session_not_open` | Error de cierre sin jornada abierta. |

---

## 13. Persistencia

### Entidades afectadas
- `daily_cash_sessions`: READ para obtener la jornada del día; INSERT para apertura; UPDATE para cierre.
- `treasury_accounts`: READ para alimentar la card operativa del club activo.
- `treasury_movements`: READ para cálculo simple de saldos visibles en dashboard.

Do not reference current code files.

---

## 14. Seguridad

- Solo `secretaria` del club activo puede abrir o cerrar jornada.
- La jornada debe resolverse y mutarse siempre contra el club activo.
- No debe existir acceso cross-club por manipulación de frontend.

---

## 15. Dependencias

- contracts: `Get dashboard treasury card`, `Open daily cash session`, `Close daily cash session`.
- domain entities: `daily_cash_sessions`, `treasury_accounts`, `treasury_movements`.
- permissions: matriz donde Secretaría opera jornada diaria.
- other US if relevant: US-11 para creación de movimientos durante jornada abierta; US-12 para la card del dashboard.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Permitir múltiples jornadas el mismo día | Media | Alta | Validar existencia previa antes de abrir. |
| Cerrar jornada sin haber abierto una | Media | Media | Validar sesión `open` previa antes de cerrar. |
| Mostrar estado ambiguo en dashboard | Media | Media | Exponer un único estado efectivo del día y accionar acorde. |
