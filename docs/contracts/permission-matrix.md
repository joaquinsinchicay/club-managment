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
4. Los permisos no se heredan ni combinan (un solo rol por membership).
5. La validación de permisos debe ocurrir en backend, no en frontend.

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
| Modificar rol         | ✅     | ❌          | ❌         |
| Remover miembro       | ⚠️    | ❌          | ❌         |
| Auto-removerse        | ⚠️    | ⚠️         | ⚠️        |

### Reglas

* ⚠️ No se puede eliminar el último admin activo del club.

---

## 5. Configuración de tesorería

| Acción                         | Admin | Secretaria | Tesoreria |
| ------------------------------ | ----- | ---------- | --------- |
| Ver configuración              | ✅     | ❌          | ❌         |
| Crear cuenta                   | ✅     | ❌          | ❌         |
| Editar cuenta                  | ✅     | ❌          | ❌         |
| Crear categoría                | ✅     | ❌          | ❌         |
| Editar categoría               | ✅     | ❌          | ❌         |
| Crear actividad                | ✅     | ❌          | ❌         |
| Editar actividad               | ✅     | ❌          | ❌         |
| Configurar monedas             | ✅     | ❌          | ❌         |
| Configurar tipos de movimiento | ✅     | ❌          | ❌         |
| Configurar reglas de campos    | ✅     | ❌          | ❌         |
| Configurar formatos de recibo  | ✅     | ❌          | ❌         |

---

## 6. Jornadas diarias

| Acción                | Admin | Secretaria | Tesoreria |
| --------------------- | ----- | ---------- | --------- |
| Ver estado de jornada | ✅     | ✅          | ❌         |
| Abrir jornada         | ❌     | ✅          | ❌         |
| Cerrar jornada        | ❌     | ✅          | ❌         |

### Reglas

* Solo puede existir una jornada por día y club.
* Solo Secretaría opera jornadas.

---

## 7. Movimientos

| Acción              | Admin | Secretaria | Tesoreria |
| ------------------- | ----- | ---------- | --------- |
| Ver movimientos     | ✅     | ✅          | ✅         |
| Crear movimiento    | ⚠️    | ⚠️         | ⚠️        |
| Editar movimiento   | ❌     | ❌          | ⚠️        |
| Cancelar movimiento | ⚠️    | ❌          | ⚠️        |

### Reglas

#### Crear movimiento

* Secretaria:

  * requiere jornada abierta
  * fecha no editable (día actual)
  * estado inicial: `pending_consolidation`

* Tesoreria:

  * no requiere jornada
  * puede definir fecha
  * estado inicial: `posted` o equivalente

* Admin:

  * comportamiento configurable (por defecto como tesoreria)

#### Editar movimiento

* Solo Tesorería durante consolidación
* Debe auditarse

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
* Genera dos movimientos
* Debe ser transaccional

---

## 9. Operaciones FX

| Acción             | Admin | Secretaria | Tesoreria |
| ------------------ | ----- | ---------- | --------- |
| Crear operación FX | ❌     | ✅          | ❌         |

### Reglas

* Requiere jornada abierta
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

* Solo Tesorería (y Admin) operan consolidación
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

* Gestión completa del club
* Configuración
* Supervisión
* Puede intervenir en consolidación

---

### Secretaria

* Operación diaria
* Jornadas
* Movimientos del día
* Transferencias y FX

---

### Tesoreria

* Control financiero
* Revisión
* Consolidación
* Auditoría

---

## 13. Reglas críticas para implementación

1. Nunca permitir acciones fuera del club activo.
2. Nunca confiar en frontend para validar permisos.
3. Validar siempre:

   * membership
   * role
   * status
4. No permitir acciones no listadas.
5. Toda acción de Tesorería sobre movimientos debe auditarse.
6. Toda operación compuesta debe ser transaccional.
7. La consolidación no debe ejecutarse dos veces para la misma fecha.

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
