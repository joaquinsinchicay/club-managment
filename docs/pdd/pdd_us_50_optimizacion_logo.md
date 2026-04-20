# PDD — US-50 · Optimización del logo al subirlo a Storage

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E05 · Identidad del Club |
| User Story | Como sistema, quiero optimizar el logo del club al subirlo a Supabase Storage, para minimizar tiempos de carga y consumo de ancho de banda. |
| Prioridad | Media |
| Objetivo de negocio | Reducir el peso de los logos almacenados para mejorar la performance del header y de los futuros reportes que incluyan el logo, sin sacrificar calidad visual. |

---

## 2. Problema a resolver

Los logos subidos por los Admins pueden venir con peso excesivo (PNG sin comprimir, SVG con metadata innecesaria) y degradar el tiempo de carga de la app. Además, SVGs con metadata pueden contener scripts o datos innecesarios que conviene eliminar antes de servirlos.

---

## 3. Objetivo funcional

Al subir un logo, el sistema debe optimizarlo antes de persistirlo:

- Si es PNG, aplicar compresión sin pérdida visible.
- Si es SVG, minificarlo eliminando metadata, comentarios y datos innecesarios.
- Si la optimización falla, revertir la operación y mantener el logo vigente intacto.

---

## 4. Alcance

### Incluye
- Pipeline de optimización invocado desde la server action de subida de logo.
- Optimización de PNG mediante compresión sin pérdida visible.
- Minificación de SVG mediante eliminación de metadata, comentarios, namespaces innecesarios y atributos redundantes.
- Persistencia del archivo optimizado en `club-logos/{club_id}/...`.
- Eliminación del archivo anterior del bucket una vez persistido el nuevo.
- Actualización de `logo_url` en la tabla `clubs` apuntando al archivo optimizado.
- Manejo de errores: si la optimización falla, se aborta sin modificar el logo vigente.

### No incluye
- Conversión entre formatos (PNG ↔ SVG).
- Redimensionado del logo.
- Generación de múltiples resoluciones.
- Cache CDN específico (se aprovecha el del bucket público).

---

## 5. Actor principal

Sistema, activado por el Admin al subir un logo nuevo desde el formulario de identidad.

---

## 6. Precondiciones

- El archivo pasó las validaciones previas de formato, tamaño y dimensiones (ver US-47).
- Supabase Storage está disponible y el bucket `club-logos` tiene las policies correctas.
- El pipeline de optimización está instrumentado (dependencias disponibles en runtime).

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| PNG válido de peso considerable | Se comprime sin pérdida visible, se guarda en `club-logos/{club_id}/logo-{timestamp}.png`, se actualiza `logo_url`, y el archivo anterior se elimina. |
| SVG válido con metadata | Se minifica eliminando metadata/comentarios/namespaces innecesarios, se guarda en Storage y se actualiza `logo_url`. |
| Falla del optimizador | La operación se revierte, el logo actual no se modifica, se registra el error en logs y se muestra toast de error. |
| Exito completo | `clubs.logo_url` apunta al archivo optimizado y el archivo anterior ya no existe en el bucket. |

---

## 8. Reglas de negocio

- **PNG**: compresión sin pérdida visible. Nivel de compresión agresivo siempre que no degrade la calidad perceptible.
- **SVG**: minificación estricta. Se eliminan comentarios, metadatos (`<metadata>`, `<title>`, `<desc>`), atributos de editor (`sodipodi:*`, `inkscape:*`), espacios redundantes y namespaces no usados.
- **Seguridad SVG**: eliminar scripts inline (`<script>`, handlers `on*`) por contener riesgo XSS.
- **Transaccionalidad**: la optimización ocurre antes de la subida al bucket. Si cualquiera de los pasos (optimización, upload, update en DB) falla, se aborta y no se modifica el logo vigente.
- **Limpieza**: el archivo anterior se elimina únicamente después del UPDATE exitoso de `logo_url`. Si el UPDATE falla, se debe eliminar también el archivo recién subido para no dejar basura en el bucket.
- **Logs**: los errores de optimización se registran con `console.error` para diagnóstico; el usuario recibe un mensaje genérico.

---

## 9. Flujo principal

1. El Admin sube un logo válido desde el formulario.
2. La server action recibe el archivo y aplica el pipeline según MIME:
   - PNG → compresión.
   - SVG → minificación.
3. El archivo optimizado se sube al bucket `club-logos/{club_id}/logo-{timestamp}.{ext}`.
4. La server action actualiza `logo_url` en `clubs`.
5. Se elimina el archivo anterior del bucket (si existía).
6. Se retorna código `club_identity_updated` y se muestra toast de éxito.

---

## 10. Flujos alternativos

### A. Fallo de optimización
1. El optimizador lanza excepción al procesar el archivo.
2. La server action captura el error y retorna código `logo_optimization_failed`.
3. No se modifica `logo_url` ni se borra el archivo anterior.
4. Se muestra toast de error.

### B. Fallo de subida al bucket
1. El archivo optimizado no puede subirse.
2. La server action retorna `logo_upload_failed`.
3. No se modifica `logo_url`.
4. Se muestra toast de error.

### C. Fallo del UPDATE en DB tras subida exitosa
1. El archivo se subió pero el UPDATE de `logo_url` falló.
2. La server action intenta eliminar el archivo recién subido para no dejar basura.
3. Retorna `unknown_error` y se muestra toast de error.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- El usuario no ve el pipeline en sí: solo el resultado final vía toast.
- Durante la subida, el botón **Guardar cambios** muestra estado pendiente.
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
| feedback | `settings.club.identity.feedback.logo_optimization_failed` | Error del pipeline de optimización. |
| feedback | `settings.club.identity.feedback.logo_upload_failed` | Error al subir al Storage (reutilizado). |

---

## 13. Persistencia

### Entidades afectadas
- Supabase Storage, bucket `club-logos`: INSERT del archivo optimizado, DELETE del archivo anterior.
- `clubs`: UPDATE de `logo_url` apuntando al archivo optimizado.

Do not reference current code files.

---

## 14. Seguridad

- La minificación de SVG debe eliminar scripts y handlers por contener riesgo XSS.
- Las policies del bucket deben estar alineadas con la US-47 y US-51.
- El servidor es la única capa autorizada para escribir/eliminar archivos en el bucket.

---

## 15. Dependencias

- domain entities: `clubs`.
- other US: US-47 (subida de logo), US-51 (multitenant).
- dependencias técnicas: librería de compresión PNG (por ejemplo `sharp`) y minificación SVG (por ejemplo `svgo`) disponibles en runtime.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| `sharp` incompatible con el runtime de Vercel | Media | Alta | Validar en entorno de staging antes de liberar; fallback a upload sin optimizar marcado como error controlado. |
| Minificación de SVG rompe el render (removiendo algo necesario) | Baja | Alta | Usar presets conservadores de `svgo` y testear con SVGs comunes. |
| Archivo anterior queda en el bucket si el UPDATE falla | Baja | Media | Implementar limpieza compensatoria cuando el UPDATE falla tras upload. |
