# PDD — US-22 · Disponibilización de eventos sincronizados para imputación de movimientos

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Admin del club, quiero utilizar los eventos sincronizados desde Google Calendar para que Secretaria pueda imputar movimientos a eventos reales del club. |
| Prioridad | Media |
| Objetivo de negocio | Permitir que un admin controle qué eventos sincronizados del club quedan disponibles para imputación operativa por parte de Secretaría. |

---

## 2. Problema a resolver

El dominio ya contempla eventos sincronizados del club, pero faltaba una pantalla operativa para decidir cuáles quedan habilitados para imputación y cuáles no deben exponerse a Secretaría.

---

## 3. Objetivo funcional

Desde `Configuración del club > Tesorería`, un usuario `admin` debe poder ver el listado de eventos sincronizados del club activo y marcar cuáles están disponibles para imputación.

---

## 4. Alcance

### Incluye
- Sección de eventos disponibles para imputación dentro de `Tesorería`.
- Listado de eventos sincronizados del club activo.
- Visualización mínima de título y fecha.
- Toggle o acción de guardado para `is_enabled_for_treasury`.
- Estado vacío cuando no hay eventos.
- Impacto inmediato en las opciones que ve Secretaría en el formulario manual.

### No incluye
- Sincronización con Google Calendar.
- Edición de título, fecha o metadata del evento.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `admin` en el club activo.

---

## 6. Reglas de negocio

- Solo `admin` puede cambiar la disponibilidad del evento para imputación.
- La configuración aplica solo al club activo.
- Un evento no habilitado no debe aparecer entre las opciones de Secretaría.
- Un evento habilitado sí debe aparecer entre las opciones disponibles.
- Si no hay eventos sincronizados, la UI debe mostrar estado vacío.

---

## 7. Persistencia

- `club_calendar_events.is_enabled_for_treasury`

Do not reference current code files.

---

## 8. Dependencias

- `club_calendar_events` como fuente de verdad.
- US-21 para el consumo del evento en el formulario de Secretaría.
