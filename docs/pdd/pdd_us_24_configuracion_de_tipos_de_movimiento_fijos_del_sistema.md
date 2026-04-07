# PDD — US-24 · Configuración de tipos de movimiento fijos del sistema

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Admin del club, quiero configurar qué tipos de movimiento fijos del sistema estarán disponibles en tesorería, para que Secretaria pueda registrar ingresos y egresos de forma consistente. |
| Prioridad | Media |
| Objetivo de negocio | Permitir que cada club limite la operatoria manual de Secretaría a los tipos de movimiento que efectivamente utiliza, sin romper el cálculo de saldos ni la consistencia del impacto contable. |

---

## 2. Problema a resolver

El formulario manual de Secretaría hoy asume siempre el catálogo completo `Ingreso` y `Egreso`. Eso impide que el club restrinja la operatoria disponible cuando necesita trabajar solo con un subconjunto controlado del listado fijo del sistema.

---

## 3. Objetivo funcional

Un usuario `admin` debe poder configurar desde la solapa `Tesorería` cuáles de los tipos fijos del sistema `Ingreso` y `Egreso` quedan habilitados para el club activo. Secretaría debe ver solo los tipos habilitados en el formulario manual y la validación server-side debe bloquear cualquier tipo no permitido.

---

## 4. Alcance

### Incluye
- Sección de tipos de movimiento en `Configuración del club > Tesorería`.
- Catálogo fijo del sistema con `Ingreso` y `Egreso`.
- Persistencia por club activo.
- Consumo de la configuración en el formulario manual de movimientos.
- Validación server-side del tipo seleccionado.

### No incluye
- Nuevos tipos de movimiento distintos del catálogo fijo del sistema.
- Cambios en la lógica de impacto del saldo: `Ingreso` suma y `Egreso` resta.
- Restricciones sobre movimientos generados por el sistema, como ajustes automáticos.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `admin` para configurar; usuario `secretaria` para consumir la configuración.

---

## 6. Precondiciones

- El club activo está resuelto.
- El usuario `admin` puede acceder a `Configuración del club`.
- Secretaría ya puede registrar movimientos sobre una jornada abierta.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin guarda tipos habilitados | La configuración queda asociada solo al club activo. |
| Admin intenta guardar sin tipos | El sistema bloquea la operación. |
| Secretaría abre el formulario | Solo ve los tipos habilitados para su club activo. |
| Secretaría registra un movimiento válido | El importe sigue siendo positivo y el impacto del saldo depende del tipo seleccionado. |

---

## 8. Reglas de negocio

- Solo `admin` puede modificar la configuración de tipos.
- El catálogo fijo disponible para configuración es `Ingreso` y `Egreso`.
- Debe existir al menos un tipo habilitado.
- La configuración aplica únicamente al club activo.
- Secretaría solo puede registrar movimientos manuales con tipos habilitados para el club activo.
- El importe se sigue cargando siempre como valor positivo.
- El saldo se actualiza según la regla existente: `Ingreso` suma, `Egreso` resta.
- Los movimientos del sistema no deben depender de esta configuración para preservar cierres y ajustes automáticos.

---

## 9. Flujo principal

1. Un admin entra a `Configuración del club`.
2. Abre la solapa `Tesorería`.
3. Visualiza la sección de tipos de movimiento con `Ingreso` y `Egreso`.
4. Selecciona uno o más tipos.
5. Confirma la configuración.
6. Secretaría abre el formulario manual de movimientos.
7. Ve únicamente los tipos habilitados para el club activo.

---

## 10. Flujos alternativos

### A. Sin tipos seleccionados

1. El admin intenta guardar sin seleccionar ningún tipo.
2. El sistema devuelve `movement_types_required`.

### B. Cambio de club activo

1. El usuario cambia de club activo.
2. El sistema carga la configuración correspondiente al nuevo club sin afectar otros clubes.

### C. Envío manual de tipo no habilitado

1. Secretaría intenta enviar un tipo no habilitado mediante manipulación manual del formulario.
2. El backend rechaza la operación con `movement_type_required`.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La sección debe convivir con monedas, cuentas, categorías, actividades y formatos en `Tesorería`.
- El selector puede resolverse con checkboxes porque el catálogo es fijo y pequeño.
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
| label | `settings.club.treasury.movement_type_selection_label` | Grupo de tipos habilitados. |
| action | `settings.club.treasury.save_movement_types_cta` | Guardado de configuración. |
| feedback | `settings.club.treasury.feedback.movement_types_updated` | Guardado exitoso. |
| feedback | `settings.club.treasury.feedback.movement_types_required` | Sin tipos seleccionados. |

---

## 13. Persistencia

### Entidades afectadas
- `club_movement_type_config`: READ y reemplazo completo de la configuración por club.
- `treasury_movements`: validación del tipo manual antes de registrar el movimiento.

Do not reference current code files.

---

## 14. Seguridad

- La lectura y escritura se resuelven por club activo.
- Solo `admin` puede cambiar la configuración.
- La validación de tipos habilitados debe ejecutarse server-side al crear movimientos manuales.

---

## 15. Dependencias

- contracts: `Set movement types`, `Create treasury movement`.
- domain entities: `club_movement_type_config`, `treasury_movements`.
- permissions: `Configurar tipos de movimiento` solo para `admin`.
- other US if relevant: US-11, US-12, US-13, US-14, US-15, US-23.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Permitir un tipo deshabilitado por manipulación del cliente | Media | Alta | Validar server-side contra la configuración del club. |
| Dejar al club sin tipos habilitados | Media | Alta | Exigir al menos un tipo en el guardado. |
| Afectar cálculos automáticos de saldo | Baja | Alta | Limitar esta configuración al formulario manual de Secretaría. |
