# Definition of Done (DoD)

## Objetivo

Definir los criterios obligatorios que debe cumplir una User Story para considerarse finalizada.

Este documento es la base para:

* validación de calidad
* control de releases
* uso consistente de IA
* evitar deuda técnica

---

## 1. Principio general

Una User Story está "Done" solo si:

* cumple su PDD
* respeta toda la documentación del repositorio
* pasa auditoría
* pasa QA
* no introduce inconsistencias

---

## 2. Checklist obligatorio

---

### 2.1 PDD

* [ ] Existe PDD para la US
* [ ] El PDD está aprobado
* [ ] El PDD sigue el formato estándar
* [ ] No contiene ambigüedades
* [ ] Todos los textos están definidos en `lib/texts.json`

---

### 2.2 Implementación

* [ ] Implementación respeta el PDD
* [ ] No se agregaron comportamientos no definidos
* [ ] No hay lógica duplicada
* [ ] No hay hacks o soluciones temporales

---

### 2.3 Textos (CRÍTICO)

* [ ] No hay strings hardcodeados
* [ ] Todos los textos vienen de `lib/texts.json`
* [ ] No hay textos duplicados
* [ ] Keys nuevas están correctamente nombradas

---

### 2.4 Seguridad

* [ ] Usuario autenticado validado
* [ ] Membership validada
* [ ] Rol validado
* [ ] Club activo validado
* [ ] No hay acceso cross-club
* [ ] RLS respetado

---

### 2.5 Multi-tenancy

* [ ] Todas las queries filtran por `club_id`
* [ ] No hay filtrado solo por `user_id`
* [ ] No hay fugas de datos entre clubes

---

### 2.6 Permisos

* [ ] Respeta `permission-matrix.md`
* [ ] No hay acciones disponibles para roles incorrectos
* [ ] UI respeta visibilidad por rol

---

### 2.7 Persistencia

* [ ] Usa las tablas correctas (`schema.sql`)
* [ ] No crea estructuras paralelas
* [ ] No rompe consistencia de datos
* [ ] Side effects correctos (ej: movimientos derivados)

---

### 2.8 Estados

* [ ] Respeta estados del sistema:

  * sesión (open/closed)
  * movimientos
  * consolidación
* [ ] UI refleja correctamente los estados

---

### 2.9 UX / UI

* [ ] Respeta `design-system.md`
* [ ] No introduce patrones nuevos
* [ ] Flujos son claros y consistentes
* [ ] Formularios tienen validación correcta
* [ ] Estados (loading / empty / error) están contemplados
* [ ] Toda acción async mutante muestra loader inmediato en CTA y bloquea el formulario o bloque afectado
* [ ] El feedback post-acción usa toast salvo excepción justificada
* [ ] Si la pantalla tenía feedback inline legacy transitorio, fue migrado

---

### 2.10 API / contratos

* [ ] Respeta `api-contracts.md`
* [ ] Inputs correctos
* [ ] Outputs correctos
* [ ] Manejo de errores consistente

---

### 2.11 Auditoría

* [ ] Audit ejecutado (`audit-pdd-vs-code`)
* [ ] No hay issues críticos
* [ ] Issues medios resueltos o justificados

---

### 2.12 QA

* [ ] Flujos principales funcionan
* [ ] Flujos alternativos funcionan
* [ ] Edge cases cubiertos
* [ ] Validaciones funcionan
* [ ] Errores manejados correctamente

---

## 3. Condiciones de bloqueo (NO DONE)

La US NO puede considerarse terminada si:

* ❌ faltan textos en `texts.json`
* ❌ hay strings hardcodeados
* ❌ hay issues críticos en auditoría
* ❌ hay acceso cross-club
* ❌ no respeta roles
* ❌ no respeta estados del sistema
* ❌ introduce feedback post-acción inline fuera del patrón definido
* ❌ rompe el dominio definido

---

## 4. Uso con IA

---

### Antes de implementar

* Debe existir PDD
* PDD debe estar aprobado

---

### Después de implementar

* Ejecutar audit:

```
Audit implementation of {US_ID}
```

---

### Antes de cerrar la US

* Validar este checklist completo

---

## 5. Automatización (recomendado)

La IA debe poder validar este DoD con prompts como:

```
Validate if US {US_ID} meets Definition of Done.
List missing items.
```

---

## 6. Regla final

Si hay duda:

👉 No está Done.

---

## 7. Resultado esperado

Este DoD garantiza:

* consistencia entre features
* calidad constante
* bajo nivel de bugs
* control total del sistema aun usando IA
