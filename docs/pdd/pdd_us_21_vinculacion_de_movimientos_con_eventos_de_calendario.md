# PDD — US-21 · Vinculación de movimientos con eventos de calendario

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Secretaria del club, quiero asociar un movimiento a un evento del calendario, para imputar correctamente ingresos y egresos a una actividad puntual del club. |
| Prioridad | Media |
| Objetivo de negocio | Permitir trazabilidad operativa entre movimientos manuales y eventos reales del club. |

---

## 2. Problema a resolver

La configuración por categoría ya permite mostrar el campo `Calendario`, y Secretaría ya puede elegir eventos habilitados, pero faltaba completar el circuito funcional mostrando el evento asociado en el detalle del movimiento y documentando la historia de punta a punta.

---

## 3. Objetivo funcional

Cuando la categoría lo requiera, Secretaría debe poder seleccionar un evento del club activo para asociarlo al movimiento manual. Ese evento debe persistirse y verse luego en el detalle de la cuenta.

---

## 4. Alcance

### Incluye
- Reutilización de la configuración por categoría del campo `Calendario`.
- Selección de eventos disponibles del club activo.
- Validación de obligatoriedad en el guardado.
- Persistencia de `calendar_event_id`.
- Visualización del evento asociado en el detalle del movimiento.

### No incluye
- Sincronización de calendarios externos.
- Edición de eventos desde esta historia.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `secretaria` en el club activo.

---

## 6. Precondiciones

- Existe una jornada abierta para registrar movimientos.
- Existen eventos del club marcados como disponibles para imputación.
- La categoría seleccionada puede mostrar o exigir el campo `Calendario`.

---

## 7. Reglas de negocio

- La visibilidad del campo `Calendario` depende de las reglas por categoría.
- Si el campo es obligatorio y no se selecciona un evento, el movimiento no se registra.
- Secretaría solo puede ver eventos del club activo.
- Solo se muestran eventos habilitados para imputación.
- Si cambia la categoría por una que no usa `Calendario`, el valor previo no debe persistir en el formulario.
- El evento asociado debe mostrarse en el detalle del movimiento cuando exista.

---

## 8. Persistencia

- `treasury_movements.calendar_event_id`
- `club_calendar_events`
- `treasury_field_rules`

Do not reference current code files.

---

## 9. Dependencias

- US-16 para reglas por categoría.
- US-22 para disponibilización de eventos.
- US-11 para registro de movimientos.
- US-13 para detalle de cuenta.
