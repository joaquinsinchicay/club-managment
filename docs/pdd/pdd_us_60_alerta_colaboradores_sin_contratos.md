# PDD — US-60 · Alerta de colaboradores activos sin contratos vigentes

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · alias `US-37`. En el repo: **US-60**. (Pre-refactor 2026-04-27 el alias era `US-36`.)

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como sistema, quiero detectar colaboradores activos sin contratos vigentes y mostrar una alerta al Admin, para que evalúe darlos de baja manualmente. |
| Prioridad | Media |
| Objetivo de negocio | Evitar que el maestro acumule colaboradores que efectivamente ya no se desempeñan en el club, manteniendo la higiene de los datos y la visibilidad de decisiones pendientes. |

---

## 2. Problema a resolver

Sin señalización, un colaborador `activo` cuyo último contrato venció queda "huérfano" en el sistema indefinidamente. El admin necesita verlo y decidir: reactivarlo (crear nuevo contrato) o darle de baja.

---

## 3. Objetivo funcional

El sistema detecta, en tiempo de render, los colaboradores con `status = 'activo'` sin ningún `staff_contracts` con `status = 'vigente'`. Estos aparecen con un badge visual en el listado (US-56) y en la ficha (US-67), y el dashboard RRHH (US-68) muestra una card con el conteo total. Desde la ficha, la alerta ofrece dos acciones rápidas: `Dar de baja` (ejecuta US-56 deactivation) e `Ignorar` (no hace nada, la alerta persiste).

---

## 4. Alcance

### Incluye
- Computo server-side al listar colaboradores y al renderizar ficha: `has_active_contracts = exists(...)`.
- Badge visual `<StatusBadge tone="warning">Sin contrato vigente</StatusBadge>` en listado y ficha.
- Card "Alertas" en Dashboard RRHH con el conteo.
- Acciones `Dar de baja` e `Ignorar` en la alerta de la ficha.
- La alerta desaparece automáticamente al crear un contrato vigente (recálculo server-side en siguiente render).

### No incluye
- Notificaciones push / email.
- Auto-baja por tiempo sin contrato (propuesta de producto, no en scope).
- Configuración de umbrales (ej. alertar sólo tras N días sin contrato).

---

## 5. Actor principal

Sistema (computo). `admin` o `rrhh` (consumo visual).

---

## 6. Precondiciones

- Existen colaboradores (`staff_members`).

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Colaborador activo sin contrato vigente | Badge visible en listado, ficha y card dashboard. |
| Colaborador activo con ≥1 contrato vigente | Sin badge. |
| Al crear contrato vigente | En el próximo render, el badge desaparece. |
| Acción "Dar de baja" en la alerta | Ejecuta la transición a `inactivo` (US-56). |
| Acción "Ignorar" | No modifica estado ni persiste nada; el usuario cierra el panel y el badge sigue visible. |

---

## 8. Reglas de negocio

### Detección
- Calcular `has_active_contracts` server-side en cada render:
  - En el listado: `select sm.*, exists(select 1 from staff_contracts sc where sc.staff_member_id = sm.id and sc.status = 'vigente') as has_active_contracts from staff_members sm`.
  - Se considera `en alerta` cuando `status = 'activo' and has_active_contracts = false`.

### "Ignorar"
- No persiste estado. La acción simplemente cierra el callout visual en la sesión actual vía `sessionStorage` (si se quiere evitar repetirlo al scrollear). Al refrescar, la alerta reaparece (esto es intencional: es un recordatorio persistente hasta resolver).

### "Dar de baja"
- Navega al modal de baja (US-56) con `staff_member_id` preseleccionado.
- Al confirmar, el colaborador pasa a `inactivo` con `deactivation_reason = 'no_active_contracts'` (texto opcional).

### Performance
- El exists subquery es barato. Se puede materializar en una vista `staff_members_with_alerts` si el listado se vuelve pesado; no es necesario en MVP.

---

## 9. Flujo principal

1. Admin abre listado de colaboradores (US-56).
2. El server devuelve filas enriquecidas con `has_active_contracts`.
3. Las filas con `status = 'activo' and has_active_contracts = false` muestran el badge.
4. Admin entra a la ficha del colaborador en alerta.
5. Ve el banner superior `<FormBanner variant="warning">` con acciones `Dar de baja` e `Ignorar`.
6. Si elige `Dar de baja` → modal US-56 → confirma → colaborador `inactivo` → alerta desaparece.
7. Si elige `Ignorar` → el banner se oculta en esta sesión (no persiste).

---

## 10. Flujos alternativos

### A. Colaborador con contrato finalizado ayer
- En el momento del render (después del job de US-59 o post-finalización manual), el colaborador entra en condición de alerta. El badge aparece inmediatamente.

### B. Crear contrato nuevo resuelve la alerta
- El admin crea contrato (US-57). En el siguiente render, `has_active_contracts = true` y el badge desaparece.

### C. Colaborador en alerta reactivado desde otra ficha
- No aplica: no hay flujo de reactivación que pase por alerta.

---

## 11. UI / UX

### Reglas
- Listado: `<DataTableChip tone="warning">Sin contrato vigente</DataTableChip>` como columna adicional o inline al nombre.
- Ficha: `<FormBanner variant="warning">` en el top con texto y dos `<Button>` (uno `variant="destructive"` para baja, uno `variant="secondary"` para ignorar).
- Dashboard: card con el conteo + link "Ver colaboradores en alerta" que navega al listado filtrado por `alert=sin_contrato`.

---

## 12. Mensajes y textos

### Namespace
`rrhh.staff_members.alert_no_active_contracts.*`

### Keys mínimas
- `badge_label` = "Sin contrato vigente"
- `ficha_banner_title` = "Colaborador activo sin contratos vigentes"
- `ficha_banner_description` = "Este colaborador está marcado como activo pero no tiene contratos vigentes. Podés darlo de baja o crear un contrato nuevo."
- `ficha_deactivate_cta` = "Dar de baja"
- `ficha_ignore_cta` = "Ignorar"
- `dashboard_card_title` = "Alertas"
- `dashboard_card_description` = "Colaboradores activos sin contratos vigentes"
- `dashboard_card_empty` = "Sin alertas"

---

## 13. Persistencia

- No crea entidades nuevas.
- Lee de `staff_members` + `staff_contracts`.
- Opcionalmente crea la vista `public.staff_members_with_alerts` si se decide materializar.

### Vista propuesta
```sql
create view public.staff_members_with_alerts as
select sm.*,
  exists(select 1 from staff_contracts sc
    where sc.staff_member_id = sm.id and sc.status = 'vigente') as has_active_contracts
from public.staff_members sm;
```
Decisión: agregar la vista sólo si la query directa muestra regresión de performance. En MVP: query directa con `exists` subquery.

---

## 14. Seguridad

- Club-scoped por RLS de `staff_members` y `staff_contracts` (ambas tablas ya tienen policy por club).
- La decisión de `Ignorar` vive en sessionStorage del cliente; no expone datos sensibles.

---

## 15. Dependencias

- **domain entities:** `staff_members`, `staff_contracts`.
- **otras US:** US-56 (baja), US-57 (crear contrato), US-67 (ficha), US-68 (dashboard).
