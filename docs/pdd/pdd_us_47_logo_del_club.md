# PDD — US-47 · Logo del club

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E05 · Identidad del Club |
| User Story | Como Admin del club, quiero subir y reemplazar el logo del club, para personalizar su identidad visual en la plataforma. |
| Prioridad | Alta |
| Objetivo de negocio | Permitir que cada club tenga una marca visual reconocible en el header, tarjetas y comprobantes, reforzando la identidad institucional. |

---

## 2. Problema a resolver

Sin un logo institucional, los usuarios ven un placeholder genérico con la inicial del club en el header y la tarjeta superior de Configuración. No hay forma de personalizar visualmente la plataforma para reflejar la identidad del club.

---

## 3. Objetivo funcional

La sección **Logo del club** dentro de la pestaña **Datos del club** debe permitir al Admin ver el logo actual, subir un archivo nuevo, previsualizarlo antes de confirmar y reemplazar el logo vigente por el nuevo. Opcionalmente debe permitir quitar el logo y volver al placeholder de iniciales.

---

## 4. Alcance

### Incluye
- Sección **Logo** dentro del formulario de identidad del club.
- Visualización del logo vigente o placeholder con la inicial del nombre del club.
- Carga de archivos PNG o SVG desde el dispositivo del Admin.
- Preview local del archivo seleccionado antes de confirmar.
- Botón **Reemplazar logo** cuando ya hay uno cargado.
- Botón **Quitar logo** que elimina la referencia y vuelve al placeholder de iniciales.
- Persistencia del archivo en Supabase Storage al confirmar el submit del formulario.
- Renderizado del logo en el header de la app y en la tarjeta superior de Configuración.

### No incluye
- Optimización del archivo (compresión PNG, minificación SVG) — cubierto por US-50.
- Multi-logo por tamaño o modo claro/oscuro.
- Edición o recorte dentro de la app.
- Renderizado en comprobantes o reportes (futuras iteraciones).

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `admin` en el club activo.

---

## 6. Precondiciones

- Existe un club activo válido en sesión.
- El usuario tiene rol `admin` en ese club.
- Supabase Storage tiene el bucket `club-logos` configurado con policies de ownership por `club_id`.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin entra a Datos del club y el club no tiene logo | Ve un placeholder con la inicial del nombre. |
| Admin entra y el club tiene logo | Ve el logo vigente renderizado. |
| Admin selecciona un archivo PNG válido | Se muestra preview local sin persistir aún. |
| Admin selecciona un archivo SVG válido | Se muestra preview local sin persistir aún. |
| Admin confirma el submit con preview | El archivo se sube a `club-logos/{club_id}/...`, se guarda `logo_url` en `clubs`, el archivo anterior (si existía) se elimina, y el header refleja el cambio. |
| Admin sube un archivo con formato inválido (JPG, WEBP, etc.) | Se bloquea la carga, se muestra toast de error y el logo actual no se modifica. |
| Admin sube un archivo menor a 256×256px (PNG) | Se bloquea la carga, se muestra toast de error indicando el tamaño mínimo y el logo actual no se modifica. |
| Fallo en la subida al Storage | La operación se revierte, el logo actual no se modifica y se muestra toast de error. |
| Admin pulsa Quitar logo y guarda | Se persiste `logo_url = null`, el archivo anterior se elimina del bucket y el header vuelve a mostrar las iniciales. |

---

## 8. Reglas de negocio

- **Formatos permitidos**: únicamente `image/png` y `image/svg+xml`. JPG, WEBP y otros se rechazan.
- **Tamaño máximo**: 2 MB por archivo.
- **Dimensiones mínimas**: 256×256 px para PNG. Para SVG, si define `viewBox` o `width/height`, se valida; en ausencia de esas dimensiones se acepta.
- **Placeholder**: la inicial del nombre del club, centrada sobre el color primario (si está definido) o color neutro de fallback.
- **Preview local**: se muestra apenas el archivo es seleccionado, sin subirlo al servidor.
- **Persistencia**: al confirmar el submit del formulario se sube a `club-logos/{club_id}/logo-{timestamp}.{ext}`.
- **Reemplazo**: al subir un logo nuevo, el archivo previo se elimina del bucket.
- **Quitar logo**: el botón elimina la referencia (`logo_url = null`) y el archivo del bucket, y vuelve al placeholder de iniciales.
- **Feedback**: toda acción exitosa o fallida se comunica mediante toast.
- **Visualización en el header**: el header y la tarjeta superior de Configuración leen `logo_url` del club activo y la renderizan. Si está en `null`, muestran la inicial.

---

## 9. Flujo principal

1. Admin entra a la pestaña **Datos del club** y ve la sección **Logo**.
2. Si hay logo cargado, lo ve; si no, ve el placeholder con la inicial del club.
3. Admin hace click en **Subir logo** (o **Reemplazar logo** si ya hay uno).
4. El sistema abre un picker de archivos restringido a PNG/SVG.
5. Admin selecciona un archivo válido.
6. El cliente muestra el preview local y valida tipo y tamaño en el navegador.
7. Admin presiona **Guardar cambios** (submit del formulario de identidad).
8. La server action sube el archivo a Supabase Storage, valida dimensiones y tipo del lado servidor, elimina el logo anterior y actualiza `logo_url` en `public.clubs`.
9. Se registra un `flashToast` con el resultado y se redirige a `/settings?tab=datos-del-club`.
10. Al rehidratar, el header y la tarjeta superior muestran el nuevo logo y se ve el toast correspondiente.

---

## 10. Flujos alternativos

### A. Quitar logo
1. Admin pulsa **Quitar logo**.
2. El preview local muestra el placeholder de iniciales.
3. Admin guarda el formulario.
4. La server action persiste `logo_url = null` y elimina el archivo del bucket.
5. El header vuelve a mostrar la inicial.

### B. Formato inválido
1. Admin selecciona un archivo JPG o WEBP.
2. El cliente rechaza la selección vía `accept="image/png,image/svg+xml"` y, como fallback, la validación server-side aborta la carga.
3. Se muestra toast de error y el logo actual no se modifica.

### C. Dimensiones insuficientes
1. Admin selecciona un archivo PNG de 200×200 px.
2. La server action lee dimensiones del header del PNG y detecta que es menor a 256×256.
3. La operación se aborta sin modificar el logo vigente.
4. Se muestra toast de error con el mensaje indicando el tamaño mínimo.

### D. Fallo en la subida
1. Supabase Storage no responde o devuelve error.
2. El servidor no persiste cambios y devuelve código `logo_upload_failed`.
3. Se muestra toast de error y el logo actual no se modifica.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- Vista mobile-first.
- Preview del logo o placeholder en un contenedor redondo, consistente con la tarjeta superior de Configuración.
- Botones **Subir/Reemplazar** y **Quitar** visibles, con jerarquía secundaria al botón primario **Guardar cambios**.
- Helper text debajo del botón con los formatos válidos y el tamaño mínimo.
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
| label | `settings.club.identity.logo_label` | Título del bloque de logo. |
| body | `settings.club.identity.logo_description` | Helper con formatos y tamaño mínimo. |
| action | `settings.club.identity.logo_upload_cta` | Botón subir logo cuando no hay uno. |
| action | `settings.club.identity.logo_replace_cta` | Botón reemplazar cuando ya hay logo. |
| action | `settings.club.identity.logo_remove_cta` | Botón quitar logo. |
| feedback | `settings.club.identity.feedback.invalid_logo` | Error de formato o tamaño. |
| feedback | `settings.club.identity.feedback.invalid_logo_dimensions` | Error de dimensiones insuficientes. |
| feedback | `settings.club.identity.feedback.logo_upload_failed` | Error en la subida al Storage. |

---

## 13. Persistencia

### Entidades afectadas
- `clubs`: UPDATE sobre `logo_url` del club activo.
- Supabase Storage, bucket `club-logos`: INSERT del nuevo archivo, DELETE del archivo anterior.

Do not reference current code files.

---

## 14. Seguridad

- La escritura en `clubs.logo_url` debe limitarse al club activo del Admin (ver US-51).
- Las policies del bucket `club-logos` deben permitir INSERT/UPDATE/DELETE solo a Admin del club identificado por el segmento `{club_id}` del path.
- El lado cliente no debe aceptar formatos no permitidos (atributo `accept` + validación previa al submit).
- El lado servidor debe revalidar MIME, tamaño y dimensiones aunque el cliente haya pasado.

---

## 15. Dependencias

- contracts: `Update club identity`, `Upload club logo`.
- domain entities: `clubs`.
- other US: US-46 (form contenedor), US-50 (optimización), US-51 (multitenant).

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Archivos viejos quedan huérfanos en el bucket | Media | Media | Borrar el archivo anterior antes del upsert del nuevo. |
| SVG malicioso con scripts embebidos | Media | Alta | Minificar y sanitizar (ver US-50); servir desde bucket público read-only. |
| Fallo parcial: subida OK pero update de DB falla | Baja | Alta | Ejecutar DELETE del anterior solo después del UPDATE exitoso de `logo_url`. |
