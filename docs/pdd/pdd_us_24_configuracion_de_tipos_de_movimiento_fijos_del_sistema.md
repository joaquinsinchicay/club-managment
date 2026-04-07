# PDD — US-24 · Visualización de tipos de movimiento fijos del sistema

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como usuario con acceso a la configuración de tesorería, quiero visualizar los tipos de movimiento fijos del sistema, para entender qué opciones usa Secretaría en los movimientos manuales. |
| Prioridad | Media |
| Objetivo de negocio | Hacer explícito en la configuración de tesorería que los movimientos manuales operan con el catálogo fijo del sistema `Ingreso` y `Egreso`, sin permitir parametrización por club. |

---

## 2. Problema a resolver

La pantalla de tesorería exponía los tipos de movimiento como una configuración editable, cuando en realidad el sistema debe operar siempre con el catálogo fijo `Ingreso` y `Egreso`. Eso agrega complejidad innecesaria y abre una expectativa funcional que no debe existir.

---

## 3. Objetivo funcional

La solapa `Tesorería` dentro de `Configuración del club` debe mostrar una sección informativa en modo lectura con los tipos fijos del sistema `Ingreso` y `Egreso`. Secretaría debe usar siempre ese catálogo fijo en el formulario manual de movimientos.

---

## 4. Alcance

### Incluye
- Sección read-only de tipos de movimiento en `Configuración del club > Tesorería`.
- Visualización del catálogo fijo `Ingreso` y `Egreso`.
- Consumo del mismo catálogo fijo en el formulario manual de movimientos de Secretaría.
- Validación server-side para aceptar únicamente `Ingreso` y `Egreso`.

### No incluye
- Configuración o persistencia por club de tipos de movimiento.
- Nuevos tipos de movimiento distintos del catálogo fijo del sistema.
- Cambios en la lógica de impacto del saldo: `Ingreso` suma y `Egreso` resta.
- Restricciones sobre movimientos generados por el sistema, como ajustes automáticos.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol con acceso a `Tesorería` para visualizar; usuario `secretaria` para consumir el catálogo fijo en la carga manual.

---

## 6. Precondiciones

- El club activo está resuelto.
- El usuario con permisos de tesorería puede acceder a `Configuración del club`.
- Secretaría ya puede registrar movimientos sobre una jornada abierta.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Usuario con acceso abre Tesorería | Ve la sección de tipos de movimiento en modo lectura. |
| Secretaría abre el formulario manual | Ve siempre `Ingreso` y `Egreso` como opciones disponibles. |
| Secretaría registra un movimiento válido | El importe sigue siendo positivo y el impacto del saldo depende del tipo seleccionado. |

---

## 8. Reglas de negocio

- El catálogo fijo del sistema para movimientos manuales es `Ingreso` y `Egreso`.
- La sección de tipos de movimiento en settings es solo informativa y no editable.
- Secretaría siempre puede registrar movimientos manuales con `Ingreso` y `Egreso`.
- El importe se sigue cargando siempre como valor positivo.
- El saldo se actualiza según la regla existente: `Ingreso` suma, `Egreso` resta.
- Los movimientos del sistema no dependen de esta visualización para preservar cierres y ajustes automáticos.

---

## 9. Flujo principal

1. Un usuario con acceso a `Tesorería` entra a `Configuración del club`.
2. Abre la solapa `Tesorería`.
3. Visualiza la sección de tipos de movimiento.
4. La UI muestra `Ingreso` y `Egreso` en modo lectura.
5. Secretaría abre el formulario manual de movimientos.
6. Ve `Ingreso` y `Egreso` como únicas opciones de tipo.

---

## 10. Flujos alternativos

### A. Usuario sin acceso a Tesorería

1. Un usuario sin permisos intenta acceder a la configuración de tesorería.
2. El sistema mantiene el bloqueo de la pantalla según la política de acceso vigente.

### B. Envío manual de tipo inválido

1. Secretaría intenta enviar un valor distinto de `Ingreso` o `Egreso` mediante manipulación manual del formulario.
2. El backend rechaza la operación con `movement_type_required`.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La sección debe convivir con monedas, cuentas, categorías, actividades y formatos en `Tesorería`.
- La visualización debe resolverse como bloque read-only, sin checkboxes, switches ni CTA.
- No debe haber textos hardcodeados.

---

## 12. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Keys requeridas

| Tipo | Key | Contexto |
|---|---|---|
| title | `settings.club.treasury.movement_types_title` | Encabezado de la sección. |
| body | `settings.club.treasury.movement_types_description` | Descripción de la sección. |
| label | `settings.club.treasury.movement_type_selection_label` | Grupo informativo de tipos del sistema. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_movements`: validación del tipo manual antes de registrar el movimiento.

Do not reference current code files.

---

## 14. Seguridad

- La lectura de la sección se resuelve sobre el club activo y el permiso existente para ver `Tesorería`.
- La validación de tipos permitidos debe ejecutarse server-side al crear movimientos manuales.

---

## 15. Dependencias

- contracts: `Create treasury movement`.
- domain entities: `treasury_movements`.
- other US if relevant: US-11, US-12, US-13, US-14, US-15, US-23.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Mantener affordances de edición en la UI | Media | Media | Renderizar la sección como bloque read-only, sin controles ni CTA. |
| Permitir un tipo inválido por manipulación del cliente | Media | Alta | Validar server-side contra el catálogo fijo del sistema. |
| Afectar cálculos automáticos de saldo | Baja | Alta | Mantener intacta la regla existente: `Ingreso` suma y `Egreso` resta. |
