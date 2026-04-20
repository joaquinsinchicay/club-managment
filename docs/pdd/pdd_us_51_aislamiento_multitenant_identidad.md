# PDD — US-51 · Aislamiento multitenant de la identidad del club

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E05 · Identidad del Club |
| User Story | Como sistema, quiero garantizar que el Admin solo pueda editar los datos del club activo en su contexto, para preservar el aislamiento entre clubes en el entorno multitenant. |
| Prioridad | Alta |
| Objetivo de negocio | Evitar que cambios o lecturas crucen entre clubes en un entorno donde un mismo usuario puede ser Admin de varios clubes, preservando la integridad de los datos institucionales. |

---

## 2. Problema a resolver

En un entorno multitenant, un mismo usuario puede tener rol `admin` en varios clubes. Las operaciones de lectura y escritura de la identidad del club deben scope-arse siempre al club activo en la sesión (`app.current_club_id`), nunca a un `club_id` recibido desde el cliente o seleccionable arbitrariamente.

---

## 3. Objetivo funcional

Garantizar que todas las operaciones sobre la identidad del club (lectura del formulario, guardado de cambios, subida/eliminación de logo) se limiten al club activo resuelto en el servidor, validado por RLS y por el role `admin` en ese club.

---

## 4. Alcance

### Incluye
- Lectura de datos del formulario scope-ada al club activo.
- UPDATE sobre `clubs` validado por ownership del club activo.
- INSERT/DELETE en el bucket `club-logos` scope-ados al `{club_id}` del path y al role `admin`.
- Policies de RLS sobre `clubs` que permitan UPDATE solo a Admins del mismo club.
- Policies del bucket `club-logos` que restrinjan escritura/borrado al Admin del club identificado por el path.
- Validación server-side del rol `admin`: si el usuario pierde el rol o cambia el club activo, la operación se rechaza.

### No incluye
- Definición del sistema de clubes activos (fuera del scope).
- Features de auditoría de cambios multitenant.
- Features de cross-club reporting.

---

## 5. Actor principal

Sistema, en el contexto de cualquier Admin que opere sobre `/settings` o sobre el bucket de logos.

---

## 6. Precondiciones

- La sesión tiene un `active_club_id` válido.
- El usuario tiene rol `admin` en ese club.
- Las policies de RLS están aplicadas en `public.clubs` y en el bucket `club-logos`.
- Existe una convención de path en Storage: `club-logos/{club_id}/...`.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin de Club A abre la pantalla de Identidad | El formulario carga los datos del Club A únicamente. |
| Admin de Club A guarda cambios | El UPDATE afecta solo al registro del Club A. |
| Admin de Club A sube un logo | El archivo se guarda en `club-logos/{club_A_id}/...` y no afecta a otros clubes. |
| Usuario con rol distinto a Admin accede a la pantalla | La pantalla no se renderiza; se retorna a home. |
| Admin cambia el club activo en el selector | El formulario se recarga con los datos del nuevo club activo. |
| Intento manipular `club_id` en la request | La acción se rechaza; solo se usa el `active_club_id` del servidor. |

---

## 8. Reglas de negocio

- **Fuente del `club_id`**: siempre el `active_club_id` del contexto autenticado en el servidor. Nunca se confía en IDs recibidos desde el cliente.
- **Validación de rol**: la server action valida que el usuario sea `admin` activo del club activo antes de proceder.
- **RLS en `clubs`**:
  - SELECT permitido a Admin del club.
  - UPDATE permitido solo si `auth.uid()` corresponde a un Admin activo del club target.
- **RLS en Storage `club-logos`**:
  - INSERT/UPDATE/DELETE permitidos solo si `split_part(storage.objects.name, '/', 1) = <club_id>` y el usuario es Admin activo de ese club.
  - SELECT público (lectura abierta para renderizar logos).
- **Cambio de club activo**: al cambiar el club activo, la siguiente lectura del form debe reflejar el nuevo club.
- **Pérdida de rol**: si el usuario ya no es Admin (inactividad, cambio de rol), la server action devuelve `forbidden`.

---

## 9. Flujo principal

1. El usuario accede a `/settings`.
2. El servidor resuelve `active_club_id` desde el contexto de sesión y el `app.current_club_id`.
3. El servidor valida que el usuario tenga rol `admin` activo en ese club.
4. La pantalla se renderiza con los datos del club activo.
5. Al guardar, la server action vuelve a validar rol + club activo y ejecuta UPDATE con el `active_club_id`.
6. La respuesta de la DB pasa por RLS, que corta cualquier intento de modificar un club distinto.

---

## 10. Flujos alternativos

### A. Usuario sin rol admin
1. Un usuario con rol `secretaria` o `tesoreria` intenta abrir la pestaña.
2. La server action que renderiza el contenido retorna estado sin acceso.
3. La UI no muestra los campos editables.
4. Si intenta someter vía API, la server action responde `forbidden`.

### B. Cambio de club activo
1. El Admin cambia el club activo desde el selector del header.
2. Se actualiza la sesión y `app.current_club_id`.
3. Al reabrir `/settings?tab=datos-del-club`, los datos mostrados corresponden al nuevo club.

### C. Intento de cross-club
1. Un Admin de Club A manipula el request para incluir `club_id = B`.
2. La server action ignora el ID del request y usa `active_club_id` del servidor.
3. Si aun así el payload llega a DB, RLS bloquea el UPDATE.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- El selector de club activo debe reflejar el scope en el header.
- Cuando no hay acceso, la UI debe redirigir a home sin filtrar datos del club.

---

## 12. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Keys requeridas

| Tipo | Key | Contexto |
|---|---|---|
| feedback | `settings.club.identity.feedback.forbidden` | Error al intentar operar sin rol o sobre otro club. |
| feedback | `settings.club.identity.feedback.club_not_found` | Error si no se puede resolver el club activo. |

---

## 13. Persistencia

### Entidades afectadas
- `clubs`: SELECT y UPDATE scope-ados al club activo.
- Supabase Storage `club-logos`: INSERT/UPDATE/DELETE scope-ados al path `{club_id}/`.

Do not reference current code files.

---

## 14. Seguridad

- RLS activa sobre `public.clubs`.
- Policies del bucket `club-logos` validan ownership del path.
- Cualquier operación de escritura pasa por la server action, que autentica y valida rol.
- Ningún `club_id` viajando desde el cliente es aceptado como source of truth.

---

## 15. Dependencias

- domain entities: `clubs`, `memberships`.
- other US: US-46 (form), US-47 (logo), US-50 (optimización).
- contracts relacionados: contratos de `Update club identity`, `Upload club logo`.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Server action que filtra el `club_id` desde el request | Media | Alta | Prohibir leer `club_id` del request; usar siempre el del servidor. |
| RLS mal configurada permitiendo cross-club | Baja | Alta | Tests automatizados sobre policies; auditoría previa al deploy. |
| Pérdida de rol detectada tarde (usuario editando) | Baja | Media | Validar rol en cada request; si se pierde, retornar `forbidden` y redirigir. |
