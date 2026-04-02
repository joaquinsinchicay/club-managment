# PDD — US-02 · Avatar con menú de sesión en el header

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E02 · Navegación |
| User Story | Como usuario autenticado, quiero ver mi avatar en el header y poder acceder a la configuración del club (si soy admin) y cerrar sesión desde ahí. |
| Prioridad | Alta |
| Objetivo de negocio | Centralizar el acceso a acciones de sesión y configuración en un punto consistente del header, respetando el rol del usuario en el club activo y reduciendo fricción de navegación. |

---

## 2. Problema a resolver

Un usuario autenticado necesita identificar rápidamente su contexto de sesión desde cualquier pantalla y disponer de acciones de cuenta y administración del club sin navegar por rutas dispersas. A la vez, el sistema debe evitar que usuarios sin rol admin vean o accedan a configuración restringida y debe permitir un cierre de sesión seguro y explícito.

---

## 3. Objetivo funcional

El sistema debe mostrar en el header global un avatar asociado al usuario autenticado y, al interactuar con él, desplegar un menú de sesión cuyo contenido dependa del rol de la membership activa en el club activo:

- cualquier usuario autenticado puede cerrar sesión desde el menú
- solo un usuario con rol `admin` en el club activo puede ver y abrir la configuración del club
- un usuario no admin no debe poder acceder a la página de configuración del club
- el menú debe poder cerrarse sin ejecutar acciones
- el avatar debe mostrar la foto de perfil disponible o un fallback de iniciales

---

## 4. Alcance

### Incluye
- Renderizado del avatar del usuario autenticado en el header global.
- Fallback a iniciales cuando no hay `avatar_url`.
- Apertura y cierre del menú del avatar.
- Opción de configuración del club visible solo para `admin` del club activo.
- Navegación a configuración del club desde el menú cuando el usuario tiene permisos.
- Protección funcional de la página de configuración para usuarios no admin.
- Cierre de sesión desde el menú con diálogo de confirmación y redirección a login.

### No incluye
- Implementación interna de la pantalla de configuración del club más allá del acceso y la protección de ruta.
- Edición de perfil del usuario o carga manual de avatar.
- Cambio de club activo desde el avatar.
- Gestión de roles o membresías dentro de esta US.

---

## 5. Actor principal

Usuario autenticado con una sesión Supabase activa y una membership asociada al club activo.

---

## 6. Precondiciones

- Existe una sesión autenticada válida resuelta por Supabase Auth.
- El header global está disponible en las pantallas autenticadas de la aplicación.
- El backend puede resolver `auth_user_id`, `active_club_id`, `membership.role` y `membership.status`.
- Existe una ruta o pantalla de configuración del club protegida por permisos.
- El frontend recibe o consulta el contexto de sesión actual mediante un contrato consistente con `Get current session context`.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Usuario autenticado navega cualquier pantalla | El avatar queda visible en el header y representa su perfil con foto o iniciales. |
| Usuario no admin abre el menú | El menú ofrece solo la acción de cerrar sesión. |
| Usuario admin abre el menú | El menú ofrece configuración del club y cerrar sesión. |
| Admin selecciona configuración del club | El sistema navega a la página de configuración del club y el menú queda cerrado. |
| Usuario no admin intenta acceder a configuración | El sistema bloquea el acceso y muestra mensaje de permisos insuficientes o redirige a dashboard. |
| Usuario confirma cierre de sesión | La sesión se cierra y el usuario vuelve a la pantalla de login. |
| Usuario cierra el menú sin seleccionar opción | El menú se oculta sin ejecutar acciones ni cambiar sesión. |

---

## 8. Reglas de negocio

- La visibilidad de la opción de configuración depende exclusivamente del rol de la membership activa del usuario en el club activo.
- Solo `admin` puede acceder a configuración del club.
- `secretaria` y `tesoreria` no deben ver la opción de configuración del club en el menú del avatar.
- Aunque la opción no se muestre en UI, el backend o guard de ruta debe bloquear acceso directo a configuración cuando el usuario no sea `admin` del club activo.
- Solo memberships con `status = activo` habilitan operaciones dentro del club activo.
- El avatar debe priorizar `avatar_url`; si no existe, debe usar iniciales derivadas del nombre o email del usuario autenticado.
- El cierre de sesión debe requerir confirmación explícita antes de invalidar la sesión.
- Cerrar el menú mediante click/tap fuera, re-tap sobre avatar o tecla ESC no debe disparar ninguna acción funcional.
- El menú y el estado visual del header son presentación; la autorización real no debe depender únicamente del frontend.

---

## 9. Flujo principal

1. El usuario autenticado navega a una pantalla privada de la aplicación.
2. El header global muestra el contexto actual del club y el avatar del usuario en la esquina superior derecha.
3. Si existe `avatar_url`, el avatar renderiza la foto de perfil; si no existe, renderiza iniciales como fallback.
4. El usuario toca o hace click en el avatar.
5. El sistema abre un menú contextual anclado al avatar.
6. El sistema determina las opciones del menú según el rol de la membership activa en el club activo.
7. Si el usuario es `admin`, muestra `Configuración del club` y `Cerrar sesión`.
8. Si el usuario no es `admin`, muestra solo `Cerrar sesión`.

---

## 10. Flujos alternativos

### A. Acceso a configuración del club

1. Un usuario `admin` abre el menú del avatar.
2. Selecciona la opción de configuración del club.
3. El sistema cierra el menú.
4. El sistema navega a la página de configuración del club activo.
5. La ruta valida nuevamente que el usuario tenga membership `activo` con rol `admin` en el club activo.

### B. Intento de acceso a configuración sin permisos

1. Un usuario autenticado sin rol `admin` intenta ingresar directamente a la ruta de configuración del club.
2. El backend, server component, server action o route guard resuelve el contexto de sesión y permisos.
3. Si la membership activa no es `admin`, el sistema bloquea la página.
4. El usuario ve un mensaje de permisos insuficientes o es redirigido al dashboard de un club válido.

### C. Cierre de sesión desde avatar

1. El usuario abre el menú del avatar.
2. Selecciona `Cerrar sesión`.
3. El sistema muestra un diálogo de confirmación.
4. Si el usuario confirma, el sistema invalida la sesión Supabase.
5. El sistema redirige a la pantalla de login.
6. Si el usuario cancela el diálogo, la sesión permanece activa y no se ejecuta logout.

### D. Cierre del menú sin acción

1. El menú del avatar está abierto.
2. El usuario toca fuera del menú, vuelve a tocar el avatar o presiona ESC.
3. El sistema cierra el menú.
4. No se ejecuta navegación, logout ni ninguna mutación.

---

## 11. UI / UX

### Fuente de verdad
- `design/design-system.md`

### Reglas
- El header debe ser persistente, compacto y visible en todas las pantallas autenticadas.
- El avatar debe ubicarse en la esquina superior derecha del header y respetar touch target mínimo de 44px.
- El menú del avatar debe abrirse de forma clara, sin ambigüedad de estado, y mantenerse visualmente anclado al avatar.
- El contenido del menú debe reflejar el rol de la membership activa sin exponer acciones prohibidas a usuarios no admin.
- La acción de cierre de sesión debe solicitar confirmación mediante un diálogo explícito antes de ejecutar logout.
- El menú debe soportar cierre por interacción fuera del componente, re-click/re-tap del avatar y tecla ESC.
- La UI debe conservar estilo mobile-first, baja carga visual y foco operativo.
- No debe haber textos hardcodeados en etiquetas, opciones, diálogos, mensajes de error o estados vacíos.

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
| menu_item | `header.avatar_menu.club_settings` | Etiqueta de la opción para navegar a configuración del club. Missing |
| menu_item | `header.avatar_menu.sign_out` | Etiqueta de la opción para cerrar sesión. Missing |
| dialog_title | `auth.sign_out.confirm_title` | Título del diálogo de confirmación de cierre de sesión. Missing |
| dialog_body | `auth.sign_out.confirm_description` | Texto descriptivo del diálogo de confirmación de logout. Missing |
| dialog_action | `auth.sign_out.confirm_cta` | Botón de confirmación del cierre de sesión. Missing |
| dialog_action | `auth.sign_out.cancel_cta` | Botón para cancelar el cierre de sesión. Missing |
| status | `auth.sign_out.loading` | Estado visible mientras se cierra la sesión, si aplica. Missing |
| error | `settings.club.forbidden_title` | Título o mensaje principal cuando un no admin intenta entrar a configuración. Missing |
| error | `settings.club.forbidden_description` | Explicación de permisos insuficientes o instrucción de volver al dashboard. Missing |
| aria | `header.avatar_menu.trigger_aria_label` | Accessible label del botón de avatar. Missing |
| aria | `header.avatar_menu.menu_aria_label` | Accessible label del menú desplegable del avatar. Missing |
| fallback | `header.avatar_menu.fallback_initials_label` | Texto accesible para avatar con iniciales cuando no hay imagen. Missing |

---

## 13. Persistencia

### Entidades afectadas
- `users`: READ para obtener `full_name`, `email` y `avatar_url` del usuario autenticado; no-op para escritura en esta US.
- `memberships`: READ para resolver `role` y `status` de la membership del usuario en el club activo y decidir opciones del menú y acceso a settings; no-op para escritura.
- `user_club_preferences`: READ indirecto si la navegación o el dashboard necesitan mantener el club activo tras volver de settings; no-op en esta US.
- `clubs`: READ para identificar el club activo y la pantalla de configuración asociada; no-op para escritura en esta US.

---

## 14. Seguridad

- Todas las pantallas que renderizan el avatar y su menú requieren sesión autenticada válida.
- La visibilidad de `Configuración del club` debe derivarse del contexto autenticado y del rol de membership activa en backend o server-side data, no de estado local sin validar.
- La ruta/página de configuración del club debe aplicar autorización server-side y permitir acceso solo si `membership.role = admin` y `membership.status = activo` para el `active_club_id`.
- Un usuario no admin no debe poder forzar acceso a configuración manipulando el frontend o escribiendo la URL manualmente.
- El logout debe cerrar la sesión Supabase y eliminar el contexto autenticado usado por la UI.
- Toda lectura de memberships, clubs y datos de configuración debe respetar `app.current_club_id` y RLS.
- No debe existir exposición cross-club de nombres, miembros ni configuración.
- No debe usarse service role para saltear RLS en la autorización de settings o en el armado del menú.

---

## 15. Dependencias

- auth: Supabase Auth con sesión activa y operación de sign out.
- domain entities: `users`, `memberships`, `clubs`, `user_club_preferences`.
- permissions: matriz de permisos donde solo `admin` puede ver configuración.
- other US if relevant: US-01 para login y resolución inicial de sesión; US-03 para contenido funcional de configuración del club; US-04/US-05 para consistencia del club activo y redirecciones post-auth.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Mostrar configuración a no admins por validar solo en UI | Media | Alta | Condicionar UI con contexto server-side y reforzar guard de ruta backend. |
| Permitir acceso directo a settings por URL sin rol admin | Media | Alta | Validar `membership.role`, `membership.status` y `active_club_id` en servidor antes de renderizar la página. |
| Avatar roto o vacío cuando no existe `avatar_url` ni nombre completo | Media | Baja | Implementar fallback determinístico a iniciales desde nombre y, si falta, desde email. |
| Logout sin confirmación puede causar cierre accidental | Media | Media | Exigir diálogo de confirmación antes de ejecutar sign out. |
| Menú queda abierto o ejecuta acciones al cerrarse por ESC/outside click | Baja | Media | Separar explícitamente eventos de cierre y eventos de selección de acción. |
| Hardcode de etiquetas del menú o diálogos | Alta | Media | Declarar y completar las keys faltantes en `lib/texts.json` antes de implementar UI. |

---

## 17. Casos borde

| Caso | Comportamiento esperado |
|---|---|
| Usuario sin `avatar_url` | Mostrar iniciales derivadas de `full_name` o `email`. |
| Usuario sin `full_name` y sin `avatar_url` | Derivar iniciales desde email; si no es posible, usar un fallback visual consistente con texto accesible desde `lib/texts.json`. |
| Membership no activa en el club activo | No habilitar navegación operativa ni settings; el flujo debe resolverse por las reglas de sesión/post-login vigentes. |
| El rol del usuario cambia mientras el menú está abierto | La siguiente lectura de contexto o navegación protegida debe respetar el rol vigente; settings debe bloquearse server-side si ya no es admin. |
| Error al cerrar sesión | Mostrar un mensaje de error controlado desde textos centralizados y mantener sesión/UI en estado consistente. |
| Navegación directa a settings sin `active_club_id` válido | Redirigir a un contexto válido o bloquear acceso según contratos y guards de sesión. |
| Presión de ESC en móvil sin teclado físico | No aplica como interacción principal, pero el menú debe seguir cerrándose por outside tap y re-tap del avatar. |

---

## 18. Criterios de aceptación desarrollados

### Scenario 01: Avatar visible en el header
- Dado que el usuario está autenticado y navega cualquier pantalla privada de la aplicación.
- Cuando el header global se renderiza con el contexto de sesión actual.
- Entonces el usuario ve su avatar en la esquina superior derecha.
- Y el avatar muestra la foto de perfil de Google si `avatar_url` está disponible, o iniciales si no hay foto.

### Scenario 02: Menú del avatar para usuario no admin
- Dado que el usuario está autenticado y su membership activa en el club activo no tiene rol `admin`.
- Cuando toca o hace click en su avatar.
- Entonces el sistema despliega un menú que contiene únicamente la opción `Cerrar sesión`.

### Scenario 03: Menú del avatar para usuario admin
- Dado que el usuario está autenticado y su membership activa en el club activo tiene rol `admin`.
- Cuando toca o hace click en su avatar.
- Entonces el sistema despliega un menú con las opciones `Configuración del club` y `Cerrar sesión`.

### Scenario 04: Acceso a configuración del club
- Dado que el usuario está autenticado, es admin del club activo y el menú del avatar está abierto.
- Cuando selecciona `Configuración del club`.
- Entonces el sistema lo redirige a la página de configuración del club activo.
- Y el menú se cierra.

### Scenario 05: Intento de acceso a configuración sin permisos
- Dado que el usuario está autenticado y no es admin del club activo.
- Cuando intenta acceder a la página de configuración del club, incluyendo acceso manual por URL.
- Entonces el sistema no permite abrir la página.
- Y el usuario ve un mensaje de permisos insuficientes o es redirigido al dashboard.

### Scenario 06: Cierre de sesión desde el avatar
- Dado que el usuario está autenticado y el menú del avatar está abierto.
- Cuando selecciona `Cerrar sesión`.
- Entonces el sistema muestra un diálogo de confirmación.
- Cuando confirma el cierre de sesión.
- Entonces la sesión se cierra y el usuario es redirigido a la pantalla de login.

### Scenario 07: Cierre del menú sin acción
- Dado que el usuario está autenticado y el menú del avatar está abierto.
- Cuando toca fuera del menú, vuelve a tocar el avatar o presiona ESC.
- Entonces el menú se cierra sin ejecutar ninguna acción.

---

## 19. Implementation contract

- Must render an authenticated-user avatar in the persistent header on private screens.
- Must use `avatar_url` when available and a deterministic initials fallback when it is not.
- Must expose `Configuración del club` in the avatar menu only for users whose active membership in the active club is `admin` and `activo`.
- Must expose `Cerrar sesión` in the avatar menu for every authenticated user.
- Must close the avatar menu after selecting `Configuración del club`.
- Must protect the club settings route server-side so non-admin users cannot access it by direct URL.
- Must show a controlled forbidden state or redirect to dashboard when a non-admin attempts to access club settings.
- Must show a confirmation dialog before executing logout.
- Must sign out through Supabase Auth and redirect to login after successful confirmation.
- Must close the menu without side effects on outside click/tap, avatar re-toggle, or ESC.
- Must source all menu, dialog, accessibility and forbidden-state texts from `lib/texts.json`.
- Must not rely on frontend-only role checks as the source of authorization truth.
- Must not fetch data directly from UI components if repository/service layers are available for session context.

---

## 20. No permitido

- Hardcodear labels, mensajes, aria-labels o textos de diálogo en componentes.
- Mostrar la opción de configuración del club a usuarios no admin.
- Confiar solo en ocultamiento visual de UI para proteger `/settings` o rutas equivalentes.
- Permitir logout inmediato sin confirmación si la UX definida exige diálogo.
- Hacer fetch directo a Supabase o DB desde componentes de UI cuando corresponde pasar por repositorios/servicios.
- Duplicar reglas de autorización en múltiples lugares sin una fuente backend consistente.
- Acceder a datos de memberships o clubs sin filtrar por `active_club_id` y sin respetar RLS.
- Introducir features no pedidas en la US, como edición de perfil o selector de club desde el menú de avatar.
