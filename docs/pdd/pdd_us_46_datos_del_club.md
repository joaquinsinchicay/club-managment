# PDD — US-46 · Datos de identidad del club

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E05 · Identidad del Club |
| User Story | Como Admin del club, quiero editar los datos de identidad de mi club, para que figuren correctamente en reportes y comunicaciones oficiales. |
| Prioridad | Alta |
| Objetivo de negocio | Consolidar la identidad institucional del club activo en un único lugar administrable, para que el producto se personalice y los datos oficiales queden disponibles al resto del sistema. |

---

## 2. Problema a resolver

La pantalla de Configuración no expone un lugar completo donde administrar la identidad institucional del club activo. Los datos de contacto oficiales (domicilio, email, teléfono) no existen hoy en el modelo, lo que impide emitir comunicaciones y reportes oficiales con datos consistentes del club.

---

## 3. Objetivo funcional

La pestaña **Datos del club** dentro de `/settings` debe permitir a un Admin editar en un único formulario el conjunto completo de datos de identidad del club activo: nombre, CUIT, tipo legal, domicilio, email, teléfono, colores identificatorios y logo. El formulario persiste todos los cambios en una sola acción y da feedback por toast.

---

## 4. Alcance

### Incluye
- Pestaña **Datos del club** dentro de `/settings`, visible solo para Admin del club activo.
- Formulario precargado con los datos actuales del club.
- Campos: nombre, CUIT, tipo legal, domicilio, email, teléfono, colores primario y secundario, logo.
- Acción **Guardar cambios** que persiste todos los campos en una única transacción.
- Acción **Cancelar** que descarta cambios sin confirmación y reestablece los valores originales.
- Validaciones de obligatoriedad para nombre, CUIT, tipo, domicilio, email y teléfono.
- Feedback post-acción mediante toast (success / error).
- Errores inline por campo cuando la validación cliente-side puede anticiparse.

### No incluye
- Reglas específicas de validación de CUIT — cubiertas por US-48.
- Reglas específicas de validación de email y teléfono — cubiertas por US-49.
- Pipeline de subida y optimización del logo — cubiertos por US-47 y US-50.
- Aislamiento multitenant — cubierto por US-51.
- Aplicar `color_primary` como tema global CSS (solo preview + header).
- Renderizar logo en comprobantes exportables futuros.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `admin` en el club activo.

---

## 6. Precondiciones

- Existe un club activo válido en sesión.
- El usuario tiene rol `admin` en ese club.
- Schema `public.clubs` incluye las columnas de identidad: `name`, `cuit`, `tipo`, `domicilio`, `email`, `telefono`, `logo_url`, `color_primary`, `color_secondary`.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin abre la pestaña Datos del club | Ve el formulario con los datos actuales precargados. |
| No admin abre Configuración | No ve la pestaña y no puede renderizarla vía URL. |
| Admin edita campos válidos y guarda | Los datos se persisten en `public.clubs` y se muestra toast de éxito. |
| Admin cancela cambios | Los valores vuelven al estado guardado sin confirmación. |
| Admin intenta guardar con campo obligatorio vacío | El submit se bloquea, el campo queda marcado con error inline y no se persisten cambios. |
| Falla de red o de servidor al persistir | Los datos no se modifican y se muestra toast de error. |
| Cambio de club activo y reapertura | El formulario se recarga con los datos del nuevo club activo. |

---

## 8. Reglas de negocio

- **Permisos**: solo `admin` del club activo puede editar. Cualquier otro rol no accede a la pantalla.
- **Campos obligatorios**: nombre, CUIT, tipo legal, domicilio, email y teléfono. El logo y los colores son opcionales.
- **Nombre**: string, mínimo 2 caracteres, máximo 80.
- **CUIT**: obligatorio, formato `XX-XXXXXXXX-X`, con dígito verificador válido (ver US-48).
- **Tipo**: obligatorio, enum `asociacion_civil | fundacion | sociedad_civil`.
- **Domicilio**: obligatorio, string mínimo 4 y máximo 200 caracteres.
- **Email**: obligatorio, formato RFC válido (ver US-49).
- **Teléfono**: obligatorio, formato E.164 con prefijo internacional (ver US-49).
- **Colores**: opcionales. Si se completan deben ser HEX válidos (`#RGB` o `#RRGGBB`).
- **Logo**: opcional. Detalle de formatos, tamaños, preview, reemplazo y eliminación cubiertos por US-47.
- **Cancelar**: resetea el form al estado precargado sin pedir confirmación, incluso si había cambios pendientes.
- **Feedback**: toda acción de guardado exitoso o fallido se comunica mediante toast (`flashToast` + `resolveFeedback`). No se usan mensajes inline para feedback post-acción.
- **Errores inline**: los errores de campo bloquean submit y se muestran cerca del input afectado. El toast complementa al finalizar el submit fallido, no lo reemplaza.

---

## 9. Flujo principal

1. Admin entra a `/settings` y abre la pestaña **Datos del club**.
2. El formulario se precarga con los valores actuales del club activo.
3. Admin edita uno o más campos.
4. Admin presiona **Guardar cambios**.
5. El cliente valida obligatoriedad y formatos básicos; si hay errores, se marcan inline y se aborta el submit.
6. La server action `updateClubIdentityAction` valida del lado servidor (incluyendo DV AFIP del CUIT y email/teléfono) y persiste los cambios en `public.clubs`.
7. Se registra un `flashToast` con el resultado y se redirige a `/settings?tab=datos-del-club`.
8. Al rehidratar, el header y la tarjeta superior reflejan los nuevos valores y se muestra el toast correspondiente.

---

## 10. Flujos alternativos

### A. Cancelar con cambios pendientes
1. Admin editó uno o más campos.
2. Admin presiona **Cancelar**.
3. El formulario se resetea sin pedir confirmación y sin persistir nada.

### B. Falla del servidor al guardar
1. Admin presiona **Guardar cambios** con campos válidos.
2. El servidor no puede persistir (red, error de DB).
3. El formulario mantiene los valores editados.
4. Se muestra toast de error con código genérico `unknown_error`.

### C. Usuario no admin
1. Un miembro con rol distinto a `admin` accede a `/settings`.
2. La pestaña **Datos del club** no se renderiza.
3. Si intenta acceder vía `?tab=datos-del-club`, el contenido redirige a la pestaña default o muestra estado sin acceso.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- Vista mobile-first.
- Formulario inline con secciones: **Identidad** (nombre, CUIT, tipo, domicilio, email, teléfono), **Colores identificatorios** y **Logo**.
- Campos obligatorios marcados visualmente (por ejemplo, con un asterisco o etiqueta "Requerido").
- Errores inline por campo con mensaje breve.
- Acción **Guardar cambios** como botón primario al final del formulario.
- Acción **Cancelar** como botón secundario junto al de guardar.
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
| title | `settings.club.identity.section_title` | Título de la sección Identidad. |
| body | `settings.club.identity.section_description` | Descripción breve de la sección. |
| label | `settings.club.identity.name_label` | Label del campo nombre. |
| label | `settings.club.identity.cuit_label` | Label del campo CUIT. |
| label | `settings.club.identity.tipo_label` | Label del campo tipo. |
| label | `settings.club.identity.domicilio_label` | Label del campo domicilio. |
| label | `settings.club.identity.email_label` | Label del campo email. |
| label | `settings.club.identity.telefono_label` | Label del campo teléfono. |
| label | `settings.club.identity.required_field` | Marca visual de campo obligatorio. |
| action | `settings.club.identity.save_cta` | Botón guardar cambios. |
| action | `settings.club.identity.cancel_cta` | Botón cancelar. |
| status | `settings.club.identity.save_loading` | Estado visible durante el guardado. |
| feedback | `settings.club.identity.feedback.club_identity_updated` | Toast de éxito. |
| feedback | `settings.club.identity.feedback.invalid_name` | Error de nombre. |
| feedback | `settings.club.identity.feedback.invalid_domicilio` | Error de domicilio. |
| feedback | `settings.club.identity.feedback.invalid_tipo` | Error de tipo. |
| feedback | `settings.club.identity.feedback.required_field` | Error genérico de campo obligatorio. |
| feedback | `settings.club.identity.feedback.forbidden` | Error de permisos. |
| feedback | `settings.club.identity.feedback.unknown_error` | Error genérico de guardado. |

---

## 13. Persistencia

### Entidades afectadas
- `clubs`: UPDATE sobre el registro del club activo. Columnas afectadas: `name`, `cuit`, `tipo`, `domicilio`, `email`, `telefono`, `color_primary`, `color_secondary`, `logo_url`.
- Toda escritura debe validar ownership por `app.current_club_id` (ver US-51).

Do not reference current code files.

---

## 14. Seguridad

- La escritura debe limitarse al club activo del Admin (ver US-51).
- No debe permitir modificar registros de otros clubes manipulando ids.
- El acceso a la pantalla debe validarse server-side contra el rol `admin`.
- Las validaciones de formato y obligatoriedad deben aplicarse tanto en cliente como en servidor.

---

## 15. Dependencias

- contracts: `Update club identity`.
- domain entities: `clubs`.
- other US: US-47 (logo), US-48 (CUIT), US-49 (email/teléfono), US-50 (optimización logo), US-51 (aislamiento multitenant).

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Clubs legacy sin email/teléfono/domicilio no puedan guardar | Alta | Media | Dejar nullable en DB; forzar obligatoriedad solo a nivel app y comunicar al Admin que debe completarlos. |
| Hardcode de textos en el formulario | Media | Media | Centralizar todo en `lib/texts.json`. |
| Feedback inline sobreviva como único canal y se oculte bajo el fold | Baja | Media | Toast obligatorio al finalizar el submit. |
