# Development Workflow

## Objetivo

Definir el proceso estándar para desarrollar features desde User Stories hasta producción utilizando IA (Claude / Codex) de forma consistente, auditable y escalable.

Este workflow es obligatorio para cualquier desarrollo en el proyecto.

---

## Principios

1. La fuente de verdad es la documentación del repositorio.
2. No se implementa sin PDD.
3. No se libera sin auditoría.
4. No se permiten textos hardcodeados.
5. Todo debe respetar multi-tenancy y roles.
6. La IA es una herramienta, no una fuente de decisiones.

---

## Flujo completo

---

### 1. Definición de User Story

**Input**

* User Story
* Acceptance Criteria (Gherkin)

**Objetivo**

* Definir claramente el comportamiento esperado

**Output**

* US lista para generar PDD

---

### 2. Generación de PDD

**Tool**

* `generate-pdd` skill

**Prompt ejemplo**

```
Generate PDD for {US_ID} using repository documentation
```

**Reglas**

* Debe usar toda la documentación del repo
* Debe mapear todos los textos a `lib/texts.json`
* No debe incluir referencias a código actual

**Output**

* PDD completo

---

### 3. Validación de PDD

**Tipo**

* Manual + IA

**Checklist**

* ¿respeta `domain-model.md`?
* ¿respeta roles (`permission-matrix.md`)?
* ¿respeta contratos (`api-contracts.md`)?
* ¿respeta diseño (`design-system.md`)?
* ¿define correctamente `texts.json`?
* ¿no hay ambigüedades?

**Output**

* PDD aprobado

---

### 4. Implementación

**Tool**

* Claude o Codex

**Prompt ejemplo**

```
Implement feature based on PDD {US_ID}.
Follow all repository documentation.
Do not introduce behavior not defined in PDD.
```

**Reglas**

* Respetar RLS
* Respetar multi-club
* Respetar roles
* No hardcodear textos
* Usar `lib/texts.json`
* Migrar feedback inline transitorio a toast si la pantalla es modificada

**Output**

* Feature implementada

---

### 5. Auditoría

**Tool**

* `audit-pdd-vs-code` skill

**Prompt ejemplo**

```
Audit implementation of {US_ID} against its PDD and repository documentation
```

**Objetivo**

* Detectar gaps
* Detectar errores
* Detectar violaciones de reglas

**Output**

* Audit estructurado

---

### 6. Corrección

**Tool**

* Claude o Codex

**Prompt ejemplo**

```
Fix all issues found in audit for {US_ID}.
Do not change intended behavior.
```

**Output**

* Issues corregidos

---

### 7. QA final

**Tipo**

* Manual + IA

**Checklist mínimo**

* Flujos principales
* Flujos alternativos
* Edge cases
* Roles
* Multi-club
* Textos (texts.json)
* Estados (session, movements, etc)

---

### 8. Release

**Condición**

* PDD aprobado
* Auditoría sin issues críticos
* QA validado

**Output**

* Feature lista para producción

---

## Reglas globales

---

### 1. Documentación obligatoria

Toda implementación debe respetar:

* `domain/domain-model.md`
* `domain/schema.sql`
* `database/rls-policies.sql`
* `contracts/api-contracts.md`
* `contracts/permission-matrix.md`
* `architecture/decisions.md`
* `architecture/tech-stack.md`
* `design/design-system.md`

---

### 2. Regla de textos

Todos los textos deben venir de:

```
lib/texts.json
```

No permitido:

* hardcoded strings
* textos en componentes
* textos en server actions

---

### 2.1 Regla de feedback UX

Todo feedback post-acción de éxito o error debe usar toast reusable.

Toda acción async mutante debe mostrar loading inmediato y local:

* CTA con spinner y texto de carga
* formulario o bloque afectado deshabilitado mientras `pending === true`
* no usar overlay fullscreen salvo que el flujo completo quede bloqueado por diseño

Solo se permite:

* inline para validación de formularios o estados persistentes
* modal para confirmaciones previas o acciones irreversibles

Si una implementación toca una pantalla con feedback inline legacy transitorio, debe migrarlo dentro del mismo alcance.

---

### 3. Seguridad

Siempre validar:

* usuario autenticado
* membership activa
* rol correcto
* club activo

Nunca permitir:

* acceso cross-club
* bypass de RLS

---

### 4. Multi-tenancy

Toda operación debe:

* usar `club_id`
* respetar aislamiento por club

---

### 5. Estados

El sistema es state-driven:

* sesión (open / closed)
* movimientos (pending / consolidated / etc)
* consolidación

La UI y lógica deben reflejar estos estados.

---

### 6. No permitido

* modificar PDD durante implementación
* agregar lógica no definida
* duplicar fuentes de verdad
* romper consistencia entre módulos
* ignorar documentación del repo

---

## Uso de IA

---

### Claude / Codex

Se usan para:

* implementación
* corrección
* generación de código

---

### Skills

#### `generate-pdd`

* genera PDD a partir de US

#### `audit-pdd-vs-code`

* audita implementación vs PDD

---

## Prompts recomendados

---

### Generar PDD

```
Generate PDD for {US_ID} using repository documentation
```

---

### Implementar

```
Implement feature based on PDD {US_ID}.
Follow all repository documentation.
```

---

### Auditar

```
Audit implementation of {US_ID} against PDD and documentation
```

---

### Corregir

```
Fix issues from audit for {US_ID}
```

---

## Estructura recomendada por feature

```
/pdd/{US_ID}.md
/docs/audit/{US_ID}.md
```

---

## Resumen

Este workflow asegura:

* consistencia
* trazabilidad
* calidad
* escalabilidad

y permite usar IA sin perder control del producto.
