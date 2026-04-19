# PDD — US-31 · Datos del club

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E01 · Autenticación y gestión de roles |
| User Story | Como administrador, quiero editar los datos institucionales y visuales del club activo (nombre, CUIT, tipo, logo y colores identificatorios), para que la identidad del club se refleje en toda la aplicación. |
| Prioridad | Alta |
| Objetivo de negocio | Consolidar la identidad del club activo para que sea reconocible en el header, comprobantes y comunicaciones, y para dejar disponible un lugar único donde administrar sus datos institucionales. |

---

## 2. Problema a resolver

La pantalla de Configuración no expone un lugar donde administrar la identidad del club activo. El header usa solo la inicial del nombre y no hay forma de editar CUIT, tipo, logo ni colores. Esto impide que el producto se personalice por club y que los datos institucionales se usen en el resto del sistema.

---

## 3. Objetivo funcional

La pantalla de Configuración debe incluir una pestaña **Datos del club** que permita al admin:

- ver los datos institucionales actuales del club activo
- editar nombre, CUIT y tipo legal
- subir, reemplazar o quitar el logo
- definir colores primario y secundario en formato HEX
- ver una vista previa del logo y la paleta antes de guardar
- recibir feedback post-acción mediante toast

---

## 4. Alcance

### Incluye
- Pestaña **Datos del club** como primera y default en `/settings`.
- Formulario inline con secciones **Identidad** y **Colores identificatorios**.
- Subida de logo a Supabase Storage (`bucket club-logos`) y validación de tipo/tamaño.
- Validación de CUIT con formato `XX-XXXXXXXX-X`.
- Select cerrado para `tipo` con opciones `asociacion_civil`, `fundacion`, `sociedad_civil`.
- Validación de colores como HEX (`#RGB` o `#RRGGBB`).
- Replicación del logo y colores en el header del dashboard (`app-header.tsx`) y en la tarjeta superior de Configuración.
- Feedback post-acción mediante toast (success / error).

### No incluye
- Aplicar `color_primary` como tema global CSS de la app (solo preview local).
- Campos de contacto del club (email, teléfono, domicilio) — iteración futura.
- Renderizar el logo en comprobantes / reportes (cuando existan esos módulos).
- Crear un nuevo club desde esta pantalla.
- Multi-logo por modo (claro/oscuro) o por tamaño.

---

## 5. Actor principal

Usuario autenticado con membership activa y rol `admin` en el club activo.

---

## 6. Precondiciones

- Existe un club activo válido en sesión.
- El usuario tiene rol `admin` en ese club.
- Supabase Storage tiene el bucket `club-logos` configurado con las policies del sistema.
- Schema `clubs` incluye las columnas `cuit`, `tipo`, `logo_url`, `color_primary`, `color_secondary`.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin abre Configuración | La pestaña **Datos del club** aparece primera y se muestra por default. |
| Admin edita nombre, CUIT o tipo y guarda | Los datos se persisten en `public.clubs` y el header refleja el nuevo nombre. |
| Admin sube un logo válido | El archivo se persiste en `club-logos/{club_id}/...`, se guarda `logo_url` en `clubs`, y el header y la tarjeta superior muestran el logo. |
| Admin quita el logo | Se persiste `logo_url = null`; el header vuelve a mostrar las iniciales. |
| Admin define colores HEX válidos | Se persisten `color_primary` y `color_secondary`; el preview refleja la paleta. |
| Admin ingresa CUIT inválido | La acción no persiste cambios y se muestra toast de error con el detalle del formato esperado. |
| Admin ingresa tipo fuera del enum | La acción no persiste cambios y se muestra toast de error. |
| Admin sube un archivo que excede 2 MB o tipo no permitido | La acción no persiste cambios y se muestra toast de error. |
| Usuario sin rol admin abre la pestaña | Ve los datos del club en modo lectura; no puede modificarlos. |
| Usuario sin permiso en la página | Recibe la pantalla de acceso denegado estándar de Configuración. |

---

## 8. Reglas de negocio

- **Permisos**: solo `admin` del club activo puede editar. El resto ve el contenido sin poder guardar.
- **Nombre**: mínimo 2 caracteres, no se permite vacío.
- **CUIT**: opcional. Si se completa debe respetar el formato `XX-XXXXXXXX-X` (11 dígitos con guiones).
- **Tipo**: opcional. Valores válidos: `asociacion_civil`, `fundacion`, `sociedad_civil`.
- **Colores**: opcionales. Si se completan deben ser HEX válidos (`#RGB` o `#RRGGBB`).
- **Logo**: opcional. Tipos permitidos: `image/png`, `image/jpeg`, `image/svg+xml`, `image/webp`. Tamaño máximo: 2 MB.
- **Storage**: los archivos se guardan en `club-logos/{club_id}/logo-{timestamp}.{ext}`. La lectura es pública y la escritura exige rol admin del club en el path.
- **Replicación**: cualquier cambio en nombre o logo impacta inmediatamente en `app-header.tsx` y en la tarjeta superior de `/settings` luego del revalidate del path.
- **Feedback**: toda acción de guardado exitoso o fallido se comunica mediante toast (patrón `flashToast` + `resolveFeedback`), con redirect a `?tab=datos-del-club`.

---

## 9. Flujo principal

1. Admin entra a `/settings`. La pestaña **Datos del club** aparece primera y activa.
2. El formulario se pre-carga con los valores actuales del club activo.
3. Admin edita uno o más campos (nombre, CUIT, tipo, colores) y/o selecciona un archivo de logo.
4. La vista previa muestra inmediatamente el logo cargado y los colores elegidos.
5. Admin presiona **Guardar cambios**.
6. La server action `updateClubIdentityAction` valida input, sube el logo (si aplica) a Storage y actualiza la tabla `clubs`.
7. El sistema registra un flashToast con el resultado (success o error) y redirige a `/settings?tab=datos-del-club`.
8. Al rehidratar, el header y la tarjeta superior muestran los nuevos valores; el toast aparece con el mensaje correspondiente.

---

## 10. Validaciones & Feedback

| Código | Tipo | Mensaje (usuario) |
|---|---|---|
| `club_identity_updated` | success | Los datos del club se actualizaron correctamente. |
| `invalid_name` | error | El nombre del club debe tener al menos 2 caracteres. |
| `invalid_cuit` | error | Revisa el formato del CUIT (XX-XXXXXXXX-X). |
| `invalid_tipo` | error | El tipo seleccionado no es válido. |
| `invalid_color` | error | Los colores deben ser códigos hexadecimales válidos. |
| `invalid_logo` | error | El logo debe ser PNG, JPG, SVG o WEBP y pesar menos de 2 MB. |
| `logo_upload_failed` | error | No pudimos subir el logo. Vuelve a intentarlo. |
| `forbidden` | error | No tienes permisos para editar los datos del club. |
| `club_not_found` | error | No encontramos el club activo. Vuelve a ingresar. |
| `unknown_error` | error | No pudimos guardar los cambios. Vuelve a intentarlo. |

Todo feedback se entrega vía toast (success o error). No se usan mensajes inline transitorios en esta pantalla.
