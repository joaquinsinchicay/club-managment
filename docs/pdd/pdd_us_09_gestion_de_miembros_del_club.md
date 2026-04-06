# PDD — US-09 · Gestión de miembros del club

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E01 · Autenticación y gestión de roles |
| User Story | Como administrador, quiero gestionar los miembros del club activo (ver, modificar roles y removerlos), para mantener el control de acceso y la correcta operación del club. |
| Prioridad | Alta |
| Objetivo de negocio | Completar la administración del plantel operativo del club activo, incluyendo visualización, edición y remoción segura de memberships. |

---

## 2. Problema a resolver

La configuración del club necesita evolucionar desde un acceso protegido hacia una pantalla operativa de administración de miembros. Sin esta historia, el admin no puede mantener limpia la membresía del club ni garantizar reglas críticas como conservar al menos un `admin` activo.

---

## 3. Objetivo funcional

La pantalla de configuración del club activo debe permitir:

- ver todos los miembros del club activo
- cambiar los roles asignados de memberships activas
- remover memberships del club activo
- permitir auto-remoción del usuario actual
- bloquear cualquier acción que deje al club sin admins activos

---

## 4. Alcance

### Incluye
- Visualización de miembros del club activo con datos de usuario y membership.
- Gestión de múltiples roles para memberships activas.
- Remoción de miembros del club activo.
- Auto-remoción del club activo.
- Diálogo explícito de confirmación para remoción.
- Validación de regla “debe existir al menos un admin activo”.
- Visualización consistente de memberships activas originadas por invitaciones ya consumidas.
- Acción visible para volver al dashboard desde la configuración del club.

### No incluye
- Invitaciones a miembros.
- Alta automática al iniciar sesión.
- Gestión de miembros de otros clubes.
- Selector de club activo.

---

## 5. Actor principal

Usuario autenticado con membership activa en el club activo; normalmente `admin`, salvo el caso especial de auto-remoción.

---

## 6. Precondiciones

- Existe un club activo válido en sesión.
- La pantalla de configuración del club activo es accesible solo para `admin`.
- Las memberships del club activo se pueden listar desde backend.
- Existe un mecanismo de confirmación previo a remoción.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin ve miembros del club | Obtiene lista completa del club activo con roles y estado. |
| Admin cambia roles de miembro | La membership actualiza sus roles sin afectar otros clubes. |
| Admin remueve miembro | La membership se elimina del club activo. |
| Usuario se auto-remueve | Pierde acceso a ese club y el sistema resuelve un nuevo destino válido. |
| Último admin intenta salir o ser degradado | La acción se bloquea sin cambios persistentes. |
| Invitado ya autenticado | El admin ve al usuario invitado como miembro activo una vez consumida la invitación. |
| Admin quiere salir de settings | Puede volver al dashboard sin usar navegación externa del navegador. |
| Admin ejecuta una acción sobre miembros | El sistema vuelve a settings mostrando feedback visible de éxito o error. |

---

## 8. Reglas de negocio

- Todas las acciones aplican únicamente al club activo.
- Un `admin` solo puede gestionar memberships del club activo.
- Cada membership del club puede combinar múltiples roles operativos a la vez.
- Los permisos de una membership se resuelven por unión de roles.
- Un usuario puede auto-removerse del club activo aunque no sea `admin`.
- No se puede remover o degradar al último `admin` activo del club.
- Remover una membership elimina el acceso de ese usuario solo para ese club.
- La remoción o cambio de rol no modifica memberships de otros clubes.
- Las confirmaciones visuales no reemplazan validaciones de negocio server-side.
- El listado administrativo debe resolver memberships activas del club aunque provengan de invitaciones consumidas en un login previo.

---

## 9. Flujo principal

1. Un admin abre la configuración del club activo.
2. El sistema muestra la lista de miembros del club con su información clave.
3. El admin puede seleccionar uno o más roles para miembros activos.
4. El admin puede iniciar la remoción de un miembro.
5. El sistema abre un diálogo de confirmación.
6. Si el admin confirma, la membership se elimina del club activo.

---

## 10. Flujos alternativos

### A. Auto-remoción

1. El usuario actual selecciona salir del club.
2. El sistema solicita confirmación.
3. Si confirma, elimina la membership del club activo.
4. El sistema resuelve otro club activo válido o deriva a espera de aprobación.

### B. Bloqueo por último admin

1. Se intenta remover o quitar el rol `admin` al único admin activo del club.
2. El sistema valida cantidad de admins activos.
3. La acción se rechaza sin mutar datos.

### C. Intento de gestión cross-club

1. Un admin intenta operar sobre una membership de otro club.
2. El sistema no encuentra una membership válida dentro del club activo.
3. La acción falla sin efectos persistentes.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La sección de miembros debe ser legible en mobile y desktop.
- Cada miembro debe mostrar nombre, email, roles, estado y acción disponible.
- La acción de remoción debe requerir confirmación explícita en diálogo.
- Debe existir un tratamiento visual claro para el usuario actual.
- Un usuario que ya consumió su invitación no debe desaparecer del listado administrativo del club.
- Debe existir una acción explícita para volver al dashboard desde la pantalla de configuración.
- La UI de edición de roles debe permitir multi-selección explícita y comprensible.
- Los mensajes de error o éxito deben ser breves, visibles y no ambiguos.
- Luego de aprobar, actualizar roles o remover, la pantalla debe volver al bloque de feedback para evitar que el mensaje quede fuera del viewport.
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
| action | `settings.club.back_to_dashboard_cta` | Volver al dashboard desde settings del club. |
| badge | `settings.club.members.current_user_badge` | Identifica al usuario actual en la lista. |
| badge | `settings.club.members.pending_badge` | Indica membresía pendiente. |
| label | `settings.club.members.roles_label` | Etiqueta para visualizar o editar múltiples roles. |
| action | `settings.club.members.update_roles_cta` | Confirmar actualización de roles. |
| action | `settings.club.members.remove_cta` | Remover miembro administrado por admin. |
| action | `settings.club.members.leave_club_cta` | Auto-remoción del usuario actual. |
| dialog | `settings.club.members.remove_dialog_title` | Título de confirmación de remoción. |
| dialog | `settings.club.members.remove_dialog_description` | Explicación del impacto de la remoción. |
| dialog | `settings.club.members.remove_dialog_confirm_cta` | Confirmar remoción. |
| dialog | `settings.club.members.remove_dialog_cancel_cta` | Cancelar remoción. |
| feedback | `settings.club.members.feedback.membership_removed` | Remoción exitosa de otro miembro. |
| feedback | `settings.club.members.feedback.self_removed` | Auto-remoción exitosa. |
| feedback | `settings.club.members.feedback.membership_roles_updated` | Confirmación de actualización de roles. |
| feedback | `settings.club.members.feedback.last_admin_required` | Error por último admin. |
| feedback | `settings.club.members.feedback.forbidden` | Error por permisos insuficientes. |

---

## 13. Persistencia

### Entidades afectadas
- `memberships`: READ para listar miembros; DELETE para remoción de memberships.
- `membership_roles`: READ para listar roles por membership; INSERT/DELETE para actualizar la combinación de roles.
- `users`: READ para mostrar nombre, avatar y email en el listado.
- `user_club_preferences`: UPDATE opcional cuando una auto-remoción obliga a resolver otro club activo.

Do not reference current code files.

---

## 14. Seguridad

- Solo `admin` puede listar miembros del club activo y remover a otros usuarios.
- La auto-remoción debe limitarse estrictamente a la membership del usuario autenticado.
- Ninguna remoción o cambio de roles puede ejecutarse fuera del club activo.
- La regla del último admin debe validarse server-side antes de mutar datos.
- La autorización debe respetar RLS y no depender del frontend.
- La lectura administrativa del listado debe ser consistente entre entornos y no depender exclusivamente de configuraciones opcionales del runtime.

---

## 15. Dependencias

- auth: sesión autenticada.
- contracts: `Get club members`, `Update membership roles`, `Remove membership`.
- domain entities: `users`, `memberships`, `membership_roles`, `user_club_preferences`.
- permissions: `admin` gestiona miembros; cualquier usuario puede auto-removerse según regla de negocio.
- other US if relevant: US-03 para aprobación y asignación inicial de rol; US-04 y US-05 para resolución más amplia del club activo luego de cambios de membresía.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Dejar al club sin admins activos | Media | Alta | Validar conteo de admins activos antes de remover o quitar el rol admin. |
| Auto-remover al usuario y dejar la sesión apuntando a un club inválido | Media | Alta | Resolver destino y preferencia del club activo después de la remoción. |
| Remover miembros de otro club por ids manipulados | Media | Alta | Validar pertenencia al club activo server-side. |
| Falta de confirmación previa a remoción | Baja | Media | Usar diálogo explícito antes de ejecutar delete. |

---

## 17. Casos borde

| Caso | Comportamiento esperado |
|---|---|
| Solo existe un admin activo en el club | No puede removerse ni perder el rol `admin`. |
| Un miembro pendiente es removido | Se elimina la relación con el club sin dejar residuos operativos para ese club. |
| El usuario actual se remueve y no tiene otros clubes activos | Debe quedar en pantalla de espera de aprobación. |
| El usuario actual se remueve y sí tiene otros clubes activos | Debe resolverse otro club activo válido. |
| Un invitado consume su invitación y luego un admin abre settings | El nuevo miembro debe aparecer en el listado del club con estado activo y rol asignado. |

---

## 18. Criterios de aceptación desarrollados

### Scenario 03: Remover miembro del club
- Dado que el usuario actual es admin del club activo.
- Cuando confirma la remoción de un miembro del mismo club.
- Entonces la membership se elimina.
- Y el usuario removido pierde acceso solo a ese club.

### Scenario 06: No se puede eliminar el último admin del club
- Dado que solo existe un admin activo en el club.
- Cuando intenta removerse o cambiar su rol.
- Entonces el sistema bloquea la acción.
- Y muestra un mensaje indicando que debe existir al menos un admin.
