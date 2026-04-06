# PDD — US-03 · Asignación de rol

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E01 · Autenticación y gestión de roles |
| User Story | Como administrador, quiero aprobar el ingreso de un usuario y asignarle un rol, para que pueda operar el sistema con los permisos correctos. |
| Prioridad | Alta |
| Objetivo de negocio | Habilitar la aprobación operativa de miembros pendientes dentro del club activo, garantizando que los permisos se definan por membership y no por usuario global. |

---

## 2. Problema a resolver

Luego del login inicial, un usuario puede quedar en estado `pendiente_aprobacion`. El sistema necesita una forma segura para que un `admin` del club activo vea esos miembros, les asigne un rol y active su acceso sin afectar otros clubes ni romper reglas multi-tenant.

---

## 3. Objetivo funcional

Desde la pantalla de configuración del club activo, un usuario `admin` debe poder:

- ver la lista de miembros del club activo con su contexto básico
- identificar miembros en estado `pendiente_aprobacion`
- asignarles un rol válido del sistema
- aprobar la membership para que su estado pase a `activo`
- cambiar luego el rol de memberships activas del mismo club

---

## 4. Alcance

### Incluye
- Lectura de miembros del club activo para `admin`.
- Listado con nombre, avatar, email, rol y estado por membership.
- Aprobación de memberships pendientes con asignación de rol.
- Cambio de rol de memberships activas del club activo.
- Validaciones server-side de permisos y pertenencia al club activo.

### No incluye
- Invitaciones a usuarios nuevos o existentes.
- Procesamiento automático de invitaciones en login.
- Cambio de club activo.
- Remoción de miembros del club.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `admin` en el club activo.

---

## 6. Precondiciones

- Existe sesión autenticada válida.
- El usuario tiene un club activo resuelto.
- La ruta de configuración del club ya está protegida para `admin`.
- Existen registros en `memberships` asociados al club activo.
- Los roles válidos del sistema son `admin`, `secretaria` y `tesoreria`.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin abre settings del club | Ve la lista de miembros del club activo. |
| Admin aprueba membership pendiente | La membership cambia a `activo` y queda con el rol seleccionado. |
| Admin cambia rol de membership activa | La membership conserva su club y usuario, pero actualiza su rol. |
| Usuario sin permisos intenta operar | La acción se bloquea server-side sin modificar datos. |

---

## 8. Reglas de negocio

- Toda aprobación o cambio de rol aplica únicamente a la membership del club activo.
- Un usuario puede tener distintos roles en distintos clubes; ninguna acción debe afectar memberships de otros clubes.
- Solo `admin` puede aprobar members o cambiar roles en el club activo.
- La aprobación debe usar un rol válido del catálogo de roles del dominio.
- Cambiar el rol de una membership activa debe actualizar los permisos efectivos para ese club.
- La UI no es fuente de verdad para permisos; todas las validaciones deben hacerse server-side.

---

## 9. Flujo principal

1. Un `admin` accede a configuración del club activo.
2. El sistema obtiene la lista de miembros del club activo.
3. La UI muestra cada miembro con nombre, avatar, rol y estado.
4. Si una membership está pendiente, el admin selecciona un rol y confirma aprobación.
5. El sistema valida permisos, pertenencia al club activo y rol válido.
6. La membership pasa a `activo` con el rol elegido.

---

## 10. Flujos alternativos

### A. Cambio de rol sobre membership activa

1. El admin visualiza un miembro activo del club.
2. Selecciona un nuevo rol válido.
3. El sistema actualiza la membership del club activo.
4. Los permisos efectivos del usuario cambian en ese club.

### B. Intento de aprobación sin permisos

1. Un usuario no `admin` intenta ejecutar la acción.
2. El sistema valida la sesión y el rol activo.
3. La acción se rechaza sin mutar datos.

### C. Membership inexistente o fuera del club activo

1. El admin envía una acción sobre una membership no visible en el club activo.
2. El sistema no encuentra la membership válida en contexto.
3. La operación falla sin efectos persistentes.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La lista de miembros debe mostrarse dentro de la pantalla de configuración del club activo.
- Los miembros pendientes deben ser fácilmente distinguibles del resto.
- Las acciones de aprobación y cambio de rol deben estar disponibles cerca del miembro afectado.
- La interfaz debe ser mobile-first y legible en pantallas pequeñas.
- No debe haber textos hardcodeados en etiquetas, estados, botones o mensajes.

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
| title | `settings.club.members.section_title` | Título de la sección de miembros. |
| body | `settings.club.members.section_description` | Descripción operativa de la sección. |
| label | `settings.club.members.role_label` | Etiqueta del selector de rol. |
| action | `settings.club.members.approve_cta` | Acción para aprobar membresía pendiente. |
| action | `settings.club.members.update_role_cta` | Acción para actualizar rol de miembro activo. |
| feedback | `settings.club.members.feedback.membership_approved` | Confirmación de aprobación exitosa. |
| feedback | `settings.club.members.feedback.membership_role_updated` | Confirmación de cambio de rol exitoso. |
| feedback | `settings.club.members.feedback.invalid_role` | Error por rol inválido. |
| feedback | `settings.club.members.feedback.membership_not_pending` | Error al aprobar una membership no pendiente. |
| feedback | `settings.club.members.feedback.membership_not_active` | Error al editar rol de membership no activa. |
| label | `settings.club.members.roles.admin` | Label del rol admin. |
| label | `settings.club.members.roles.secretaria` | Label del rol secretaria. |
| label | `settings.club.members.roles.tesoreria` | Label del rol tesoreria. |

---

## 13. Persistencia

### Entidades afectadas
- `memberships`: READ para listar miembros del club activo; UPDATE para cambiar `status`, `role`, `approved_at`, `approved_by_user_id` y `joined_at` en aprobaciones; UPDATE para modificar `role` en miembros activos.
- `users`: READ para obtener nombre, email y avatar de cada miembro listado.
- `clubs`: READ para resolver el club activo.

Do not reference current code files.

---

## 14. Seguridad

- Solo un `admin` con membership `activo` en el club activo puede aprobar o cambiar roles.
- Toda operación debe validarse contra el club activo, no contra ids enviados por frontend aislados.
- Las acciones nunca deben permitir edición cross-club.
- La autorización real debe vivir server-side y respetar RLS.
- No debe usarse service role para bypass de permisos de negocio.

---

## 15. Dependencias

- auth: sesión autenticada resuelta por Supabase Auth o modo mock equivalente.
- contracts: `Get club members`, `Approve membership`, `Update membership role`.
- domain entities: `users`, `memberships`, `clubs`.
- permissions: matriz de permisos donde solo `admin` gestiona miembros.
- other US if relevant: US-02 para acceso a settings desde el avatar; US-09 para remoción y gestión completa de miembros.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Aprobar o editar membresías de otro club por no filtrar por club activo | Media | Alta | Resolver y validar siempre contra el club activo server-side. |
| Aceptar roles inválidos desde frontend | Media | Media | Validar catálogo cerrado de roles en backend. |
| Mostrar datos incompletos de miembros | Baja | Media | Resolver datos de `users` y `memberships` antes de renderizar la lista. |
| Hardcodear etiquetas de roles o acciones | Alta | Media | Declarar todas las keys requeridas en `lib/texts.json` antes de implementar UI. |

---

## 17. Casos borde

| Caso | Comportamiento esperado |
|---|---|
| Membership pendiente ya aprobada por otra acción concurrente | La operación falla de forma segura y no duplica cambios. |
| Admin intenta editar una membership pendiente como si fuera activa | La operación debe rechazarse. |
| Usuario sin avatar | La UI debe usar fallback visual consistente. |

---

## 18. Criterios de aceptación desarrollados

### Scenario 03: Aprobación y asignación de rol a usuario pendiente en el club activo
- Dado que existe una membership `pendiente_aprobacion` en el club activo.
- Cuando un admin selecciona un rol válido y confirma la acción.
- Entonces el sistema actualiza la membership a `activo`.
- Y el usuario obtiene permisos del rol asignado en ese club.

### Scenario 05: Cambio de rol a usuario activo en el club activo
- Dado que existe una membership `activo` con rol asignado en el club activo.
- Cuando un admin selecciona un nuevo rol válido.
- Entonces el sistema actualiza únicamente la membership de ese club.
- Y los permisos resultantes cambian solo para ese contexto.
