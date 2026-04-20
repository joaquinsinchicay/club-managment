# PDD — US-48 · Validación de CUIT

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E05 · Identidad del Club |
| User Story | Como sistema, quiero validar el formato del CUIT al guardar, para prevenir datos inválidos en reportes oficiales del club. |
| Prioridad | Alta |
| Objetivo de negocio | Garantizar que el CUIT almacenado para cada club sea válido según el algoritmo AFIP, evitando comprobantes y reportes con datos incorrectos. |

---

## 2. Problema a resolver

La validación actual del CUIT se limita a comprobar la estructura de texto (`XX-XXXXXXXX-X`). Esto permite guardar CUITs sintácticamente correctos pero inválidos (por ejemplo con dígito verificador incorrecto), lo que degrada la calidad de los datos y compromete reportes oficiales.

---

## 3. Objetivo funcional

El sistema debe aceptar únicamente CUITs con estructura válida **y** dígito verificador correcto según el algoritmo AFIP. Además debe asistir al Admin con formateo automático al salir del campo.

---

## 4. Alcance

### Incluye
- Validación de estructura: 11 dígitos, con o sin guiones al ingreso, reformateado a `XX-XXXXXXXX-X`.
- Validación del dígito verificador usando algoritmo AFIP.
- Formateo automático del campo al perder el foco (`blur`) si el Admin ingresó los 11 dígitos sin guiones.
- Mensaje de error inline cuando la estructura o el DV son inválidos.
- Validación aplicada tanto en cliente (UX anticipada) como en servidor (fuente de verdad).

### No incluye
- Validación contra el padrón real de AFIP (web service).
- Normalización de otros documentos (DNI, CUIL).
- Persistencia del DV separado.

---

## 5. Actor principal

Usuario autenticado con rol `admin` editando la pestaña **Datos del club**.

---

## 6. Precondiciones

- El Admin tiene abierto el formulario de identidad del club activo.
- El campo CUIT es obligatorio (ver US-46).

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin ingresa CUIT válido con estructura y DV correctos | El campo se acepta y el submit procede. |
| Admin ingresa 11 dígitos sin guiones con DV válido | Al salir del campo, el valor visual se reformatea a `XX-XXXXXXXX-X` y el submit procede. |
| Admin ingresa menos de 11 dígitos o estructura inválida | Se muestra error inline "Formato de CUIT inválido" y el submit se bloquea. |
| Admin ingresa 11 dígitos pero DV no coincide con el algoritmo AFIP | Se muestra error inline "CUIT no válido" y el submit se bloquea. |
| Admin corrige el error y vuelve a submitear | La validación pasa y el CUIT se persiste. |

---

## 8. Reglas de negocio

- **Estructura**: exactamente 11 dígitos numéricos. Se aceptan con o sin guiones al ingreso. El valor persistido se almacena con formato `XX-XXXXXXXX-X`.
- **Algoritmo AFIP**: los primeros 10 dígitos se multiplican respectivamente por `[5, 4, 3, 2, 7, 6, 5, 4, 3, 2]`, se suman, se calcula `resto = suma mod 11`, el DV esperado es:
  - si `resto == 0` → DV `0`.
  - si `resto == 1` → CUIT inválido (caso excepcional).
  - resto → DV `11 - resto`.
- **Formateo automático** (solo UI): al perder el foco, si el valor tiene exactamente 11 dígitos sin guiones, se reformatea visualmente a `XX-XXXXXXXX-X`. No altera lo que escribe el usuario en pleno.
- **Validación dual**: el cliente valida estructura y DV para anticipar errores; el servidor vuelve a validar antes de persistir.
- **Errores**: mensajes diferenciados para estructura inválida (`invalid_cuit`) y DV inválido (`invalid_cuit_dv`).

---

## 9. Flujo principal

1. Admin ingresa un CUIT en el campo correspondiente.
2. Al perder el foco, si el Admin escribió los 11 dígitos sin guiones, la UI reformatea el valor a `XX-XXXXXXXX-X`.
3. Admin presiona **Guardar cambios**.
4. El cliente valida estructura y DV. Si alguno falla, se marca el campo con error inline y se aborta el submit.
5. El servidor vuelve a validar estructura y DV en la server action.
6. Si ambas validaciones pasan, el CUIT se persiste en `public.clubs.cuit`.

---

## 10. Flujos alternativos

### A. Estructura inválida
1. Admin ingresa menos de 11 dígitos o caracteres no numéricos.
2. El cliente muestra error inline "Formato de CUIT inválido".
3. El submit se bloquea.

### B. DV inválido
1. Admin ingresa 11 dígitos válidos estructuralmente pero con DV incorrecto.
2. El cliente (o el servidor) calcula el DV esperado y detecta la diferencia.
3. Se muestra error inline "CUIT no válido".
4. El submit se bloquea.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- Vista mobile-first.
- El campo CUIT debe tener `inputmode="numeric"` para favorecer el teclado numérico en mobile.
- Error inline cerca del campo, rojo, breve y accionable.
- Helper con el formato esperado visible debajo del campo cuando no hay error.

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
| label | `settings.club.identity.cuit_label` | Label del campo CUIT. |
| placeholder | `settings.club.identity.cuit_placeholder` | Placeholder con ejemplo. |
| body | `settings.club.identity.cuit_helper` | Helper con formato esperado. |
| feedback | `settings.club.identity.feedback.invalid_cuit` | Error de estructura. |
| feedback | `settings.club.identity.feedback.invalid_cuit_dv` | Error de dígito verificador. |

---

## 13. Persistencia

### Entidades afectadas
- `clubs`: UPDATE sobre `cuit` del club activo cuando la validación completa pasa.

Do not reference current code files.

---

## 14. Seguridad

- La validación no es suficiente como control de seguridad; solo previene datos mal formados.
- No exponer el algoritmo detallado en mensajes de error al usuario: indicar "CUIT no válido" sin detallar el cálculo.

---

## 15. Dependencias

- domain entities: `clubs`.
- other US: US-46 (form contenedor y obligatoriedad), US-51 (multitenant).

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Algoritmo AFIP implementado incorrectamente | Media | Alta | Test con casos conocidos de CUIT válidos e inválidos. |
| Formateo automático pisa la edición del usuario | Media | Media | Formatear solo al `blur` y solo si son 11 dígitos completos. |
| Divergencia cliente/servidor | Baja | Media | Compartir la función de validación en una util común. |
