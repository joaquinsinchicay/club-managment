# Permission Matrix

## Objetivo

Este documento define de forma explícita qué acciones puede realizar cada rol dentro del sistema.
Es la fuente de verdad para implementar validaciones de permisos en backend, RLS y lógica de negocio.

---

## 1. Roles del sistema

Los roles son definidos a nivel `membership` por club.

Roles disponibles:

* `admin`
* `secretaria`
* `tesoreria`

---

## 2. Reglas generales

1. Todos los permisos aplican dentro del **club activo**.
2. Un usuario solo puede ejecutar acciones si su `membership.status = activo`.
3. Si una acción no está explícitamente permitida → debe considerarse prohibida.
4. Una membership puede tener múltiples roles simultáneos.
5. Los permisos se resuelven por unión de roles.
6. La validación de permisos debe ocurrir en backend, no en frontend.

---

## 3. Convenciones

* ✅ = permitido
* ❌ = no permitido
* ⚠️ = permitido con condiciones adicionales

---

## 4. Acceso y membresías

| Acción                | Admin | Secretaria | Tesoreria |
| --------------------- | ----- | ---------- | --------- |
| Ver miembros del club | ✅     | ❌          | ❌         |
| Invitar miembros      | ✅     | ❌          | ❌         |
| Aprobar membresía     | ✅     | ❌          | ❌         |
| Modificar roles       | ✅     | ❌          | ❌         |
| Remover miembro       | ⚠️    | ❌          | ❌         |
| Auto-removerse        | ⚠️    | ⚠️         | ⚠️        |

### Reglas

* ⚠️ No se puede eliminar el último admin activo del club.
* ⚠️ No se puede quitar el rol `admin` al último admin activo del club, aunque conserve otros roles.

---

## 5. Configuración de tesorería

| Acción                         | Admin | Secretaria | Tesoreria |
| ------------------------------ | ----- | ---------- | --------- |
| Ver configuración              | ❌     | ❌          | ✅         |
| Crear cuenta                   | ❌     | ❌          | ✅         |
| Editar cuenta                  | ❌     | ❌          | ✅         |
| Crear categoría                | ❌     | ❌          | ✅         |
| Editar categoría               | ❌     | ❌          | ✅         |
| Crear actividad                | ❌     | ❌          | ✅         |
| Editar actividad               | ❌     | ❌          | ✅         |
| Eliminar actividad             | ❌     | ❌          | ❌         |
| Configurar monedas             | ❌     | ❌          | ✅         |
| Configurar formatos de recibo  | ❌     | ❌          | ✅         |

### Reglas

* Las categorías y actividades pueden quedar ocultas para ambos roles si no tienen visibilidad seleccionada.
* Un elemento oculto sigue siendo editable desde configuración, pero no debe aparecer en formularios operativos.
* La baja de actividades no está permitida en esta versión.

---

## 6. Jornadas diarias

| Acción                | Admin | Secretaria | Tesoreria |
| --------------------- | ----- | ---------- | --------- |
| Ver estado de jornada | ❌     | ✅          | ❌         |
| Abrir jornada         | ❌     | ✅          | ❌         |
| Cerrar jornada        | ❌     | ✅          | ❌         |

### Reglas

* Solo puede existir una jornada por día y club.
* Solo Secretaría opera jornadas.
* El autocierre por cambio de día sigue siendo una operación del dominio de Secretaría, pero se ejecuta únicamente en backend para el club activo.

---

## 7. Movimientos

| Acción              | Admin | Secretaria | Tesoreria |
| ------------------- | ----- | ---------- | --------- |
| Ver dashboard de Tesorería | ❌     | ❌          | ✅         |
| Ver movimientos     | ✅     | ✅          | ✅         |
| Crear movimiento    | ⚠️    | ⚠️         | ⚠️        |
| Editar movimiento   | ❌     | ⚠️         | ⚠️        |
| Cancelar movimiento | ⚠️    | ❌          | ⚠️        |

### Reglas

#### Crear movimiento

* Secretaria:

  * requiere jornada abierta
  * fecha no editable (día actual)
  * un egreso no puede superar el saldo disponible de la cuenta en la moneda seleccionada
  * estado inicial: `pending_consolidation`

* Tesoreria:

  * no requiere jornada
  * puede definir fecha
  * un egreso no puede superar el saldo disponible acumulado de la cuenta en la fecha elegida y moneda seleccionada
  * estado inicial: `posted` o equivalente

* Admin:

  * comportamiento configurable (por defecto como tesoreria)

#### Editar movimiento

* Secretaria:
  * puede editar movimientos de la jornada abierta del club activo
  * no puede editar `movement_date`
  * no puede editar el identificador visible del movimiento
  * puede editar solo campos operativos del movimiento
  * no puede editar un movimiento de forma que deje saldo negativo en la cuenta y moneda afectadas
  * debe auditarse
* Tesoreria:
  * mantiene la corrección auditada durante consolidación
  * debe auditarse

#### Cancelar movimiento

* Debe quedar auditado
* No debe eliminarse físicamente

---

## 8. Transferencias

| Acción              | Admin | Secretaria | Tesoreria |
| ------------------- | ----- | ---------- | --------- |
| Crear transferencia | ❌     | ✅          | ❌         |

### Reglas

* Requiere jornada abierta
* La cuenta origen debe ser visible para `Secretaria`
* La cuenta destino debe ser visible para otros roles operativos y no visible para `Secretaria`
* La cuenta origen debe tener saldo disponible suficiente en la moneda seleccionada
* Genera dos movimientos
* Debe ser transaccional

---

## 9. Operaciones FX

| Acción             | Admin | Secretaria | Tesoreria |
| ------------------ | ----- | ---------- | --------- |
| Crear operación FX | ❌     | ❌          | ✅         |

### Reglas

* No requiere jornada abierta
* La cuenta origen debe tener saldo disponible suficiente en la moneda origen
* Genera dos movimientos
* Debe ser transaccional

---

## 10. Consolidación

| Acción                          | Admin | Secretaria | Tesoreria |
| ------------------------------- | ----- | ---------- | --------- |
| Ver pendientes de consolidación | ✅     | ❌          | ✅         |
| Editar imputaciones             | ⚠️    | ❌          | ⚠️        |
| Integrar movimientos            | ⚠️    | ❌          | ⚠️        |
| Ejecutar consolidación          | ⚠️    | ❌          | ⚠️        |

### Reglas

* Solo Tesorería opera consolidación
* Todas las acciones deben ser auditadas
* No se permite doble impacto contable

---

## 11. Auditoría

| Acción        | Admin | Secretaria | Tesoreria |
| ------------- | ----- | ---------- | --------- |
| Ver auditoría | ⚠️    | ❌          | ✅         |

### Reglas

* Admin puede ver auditoría si se habilita funcionalmente
* Tesorería siempre puede ver auditoría

---

## 12. Resumen por rol

### Admin

* Gestión administrativa del club
* Miembros e invitaciones
* Sin acceso implícito a Tesorería

---

### Secretaria

* Operación diaria
* Jornadas
* Movimientos del día
* Transferencias

---

### Tesoreria

* Control financiero
* Revisión
* Consolidación
* Operaciones FX
* Auditoría

---

## 13. Reglas críticas para implementación

1. Nunca permitir acciones fuera del club activo.
2. Nunca confiar en frontend para validar permisos.
3. No asumir herencia implícita entre `admin` y `tesoreria`.
4. Validar siempre:
   * membership
   * roles
   * status
5. No permitir acciones no listadas.
6. Toda acción de Tesorería sobre movimientos debe auditarse.
7. Toda operación compuesta debe ser transaccional.
8. La consolidación no debe ejecutarse dos veces para la misma fecha.

---

## 14. Uso por parte de IA

Este documento debe utilizarse como:

* fuente de verdad para guards en backend
* referencia para definir políticas RLS
* guía para construir middlewares de autorización
* validación cruzada con `api-contracts.md`

Si existe conflicto entre documentos:

* prevalece este documento para permisos

```
```
