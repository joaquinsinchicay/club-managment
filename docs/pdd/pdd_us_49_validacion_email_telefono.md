# PDD — US-49 · Validación de email y teléfono

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E05 · Identidad del Club |
| User Story | Como sistema, quiero validar el formato del email y del teléfono al guardar, para garantizar comunicaciones efectivas con el club. |
| Prioridad | Alta |
| Objetivo de negocio | Asegurar que los datos de contacto oficial del club sean utilizables para enviar notificaciones, facturas y comunicaciones, evitando rebotes y errores de envío. |

---

## 2. Problema a resolver

Los campos email y teléfono recién se incorporan a la identidad del club (ver US-46). Sin validaciones específicas de formato, podrían almacenarse valores arbitrarios que luego rompan integraciones futuras de comunicación (mails transaccionales, mensajería, etc.).

---

## 3. Objetivo funcional

El sistema debe validar que el email cumple con estructura RFC básica y que el teléfono cumple con el formato E.164 con prefijo internacional obligatorio, tanto en el cliente como en el servidor.

---

## 4. Alcance

### Incluye
- Validación de email con regex práctica compatible con RFC 5322.
- Validación de teléfono en formato E.164 (`+` seguido de código país y número, sin espacios ni caracteres especiales más allá de los dígitos).
- Tolerancia a espacios y guiones ASCII en el input del teléfono: se normalizan antes de validar.
- Mensajes de error inline por campo.
- Validación aplicada en cliente (UX) y servidor (fuente de verdad).

### No incluye
- Verificación de existencia real del email (double opt-in).
- Validación por país específico del teléfono.
- Integración con servicios de SMS o de email marketing.

---

## 5. Actor principal

Usuario autenticado con rol `admin` editando la pestaña **Datos del club**.

---

## 6. Precondiciones

- El Admin tiene abierto el formulario de identidad.
- Los campos email y teléfono son obligatorios (ver US-46).

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin ingresa email con estructura RFC válida | El campo se acepta y el submit procede. |
| Admin ingresa email sin `@` o con caracteres no permitidos | Se muestra error inline "Email inválido" y el submit se bloquea. |
| Admin ingresa teléfono con código de país (E.164) | El campo se acepta y el submit procede. |
| Admin ingresa teléfono sin prefijo `+` | Se muestra error inline indicando que debe incluir código de país. |
| Admin ingresa teléfono con letras o símbolos | Se muestra error inline "Formato de teléfono inválido" y el submit se bloquea. |

---

## 8. Reglas de negocio

- **Email**: regex práctica:  
  `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`.  
  Suficiente para descartar casos claramente inválidos sin bloquear emails raros pero válidos.
- **Teléfono**: formato E.164:  
  - Debe empezar con `+` seguido de 1 a 15 dígitos.  
  - Antes de validar, se normaliza eliminando espacios y guiones ASCII.  
  - Regex final sobre el valor normalizado: `^\+[1-9]\d{1,14}$`.  
  - Se persiste el valor normalizado (sin espacios ni guiones).
- **Validación dual**: el cliente valida vía atributos HTML (`type="email"`, `pattern`) y regex JS; el servidor vuelve a validar antes de persistir.
- **Errores diferenciados**:
  - `invalid_email` para problemas de email.
  - `invalid_telefono_missing_prefix` cuando falta el prefijo internacional.
  - `invalid_telefono` para el resto de errores de formato.

---

## 9. Flujo principal

1. Admin ingresa email y teléfono en los campos correspondientes.
2. Al presionar **Guardar cambios**, el cliente aplica las validaciones y marca errores inline si existen.
3. El servidor re-valida en la server action.
4. Si pasan, persiste los valores normalizados en `public.clubs.email` y `public.clubs.telefono`.

---

## 10. Flujos alternativos

### A. Email inválido
1. Admin ingresa `juan@` o `juan.ejemplo.com`.
2. El cliente muestra error inline "Email inválido".
3. El submit se bloquea.

### B. Teléfono sin prefijo
1. Admin ingresa `221 425-8100` sin `+54` inicial.
2. El cliente muestra error inline "El teléfono debe incluir código de país (ej. +54)".
3. El submit se bloquea.

### C. Teléfono con caracteres inválidos
1. Admin ingresa `+54-221 TEL 4258100`.
2. Tras normalizar espacios y guiones, el valor queda `+54221TEL4258100` y falla la regex E.164.
3. El cliente muestra error inline "Formato de teléfono inválido".

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- Vista mobile-first.
- Email: input `type="email"` con `autocomplete="email"` y `inputmode="email"`.
- Teléfono: input `type="tel"` con `inputmode="tel"`, helper con ejemplo `+54 221 425-8100`.
- Errores inline cerca del campo, en tono destructivo del design system.
- No debe haber textos hardcodeados.

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
| label | `settings.club.identity.email_label` | Label del campo email. |
| placeholder | `settings.club.identity.email_placeholder` | Placeholder de email. |
| label | `settings.club.identity.telefono_label` | Label del campo teléfono. |
| placeholder | `settings.club.identity.telefono_placeholder` | Placeholder de teléfono. |
| body | `settings.club.identity.telefono_helper` | Helper con ejemplo de formato internacional. |
| feedback | `settings.club.identity.feedback.invalid_email` | Error de email. |
| feedback | `settings.club.identity.feedback.invalid_telefono` | Error de teléfono. |
| feedback | `settings.club.identity.feedback.invalid_telefono_missing_prefix` | Error por falta de prefijo. |

---

## 13. Persistencia

### Entidades afectadas
- `clubs`: UPDATE sobre `email` y `telefono` del club activo cuando la validación pasa.

Do not reference current code files.

---

## 14. Seguridad

- La validación no protege contra phishing ni suplantación; solo asegura formato.
- No exponer los emails de los clubes a otros clubes (aplicable cuando haya features multi-club).

---

## 15. Dependencias

- domain entities: `clubs`.
- other US: US-46 (form contenedor y obligatoriedad), US-51 (multitenant).

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Emails válidos pero raros rechazados | Baja | Baja | Usar regex práctica, no RFC 5322 completa. |
| Teléfonos válidos con caracteres especiales del país rechazados | Media | Baja | Normalizar espacios y guiones antes de validar; documentar el formato en helper. |
| Divergencia cliente/servidor | Baja | Media | Extraer la util de validación a un módulo compartido. |
