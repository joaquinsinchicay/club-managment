# PDD — US-01 · Iniciar sesión con Google

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E01 · Autenticación y gestión de roles |
| User Story | Como usuario, quiero iniciar sesión con mi cuenta de Google, para acceder al sistema del club sin crear una contraseña nueva. |
| Prioridad | Alta |
| Objetivo de negocio | Habilitar un acceso seguro y de baja fricción mediante Google OAuth, reutilizando cuentas existentes por email y derivando al usuario al estado correcto de acceso. |

---

## 2. Problema a resolver

El sistema necesita un mecanismo de autenticación único, simple y seguro que evite credenciales locales, permita reconocer usuarios ya existentes sin duplicarlos y determine correctamente si el usuario debe quedar en espera de aprobación o ingresar al dashboard de un club activo.

---

## 3. Objetivo funcional

Cuando un usuario interactúa con la pantalla de login, el sistema debe iniciar autenticación con Google mediante Supabase Auth. Tras un resultado exitoso, debe identificar si el email ya corresponde a un usuario existente, crear el usuario solo cuando no exista, y resolver el destino inmediato según su contexto de memberships:

- si no tiene memberships activas en ningún club, debe ver la pantalla de espera de aprobación
- si tiene al menos una membership activa, debe ingresar al sistema sobre un club activo válido
- si cancela OAuth, debe volver al login sin efectos persistentes
- si ya tiene una sesión activa, no debe iniciar un nuevo flujo OAuth y debe ser redirigido directamente

---

## 4. Alcance

### Incluye
- Inicio de sesión con Google usando Supabase Auth.
- Reutilización de usuario existente por email autenticado.
- Creación inicial del perfil global del usuario cuando no existe.
- Determinación del estado post-login entre espera de aprobación y acceso al dashboard.
- Redirección automática desde login cuando ya existe una sesión activa.
- Manejo de cancelación del flujo OAuth sin crear registros.

### No incluye
- Alta automática a clubes por invitación preexistente.
- Lógica detallada para selección del club activo entre múltiples clubes.
- Gestión manual de roles, aprobaciones o membresías desde UI.
- Autenticación por email/contraseña u otros proveedores.

---

## 5. Actor principal

Usuario no autenticado o usuario ya autenticado que accede a la pantalla de login.

---

## 6. Precondiciones

- Google OAuth está habilitado en Supabase Auth.
- El sistema puede obtener identidad autenticada confiable desde Supabase Auth.
- Existe una pantalla de login pública y una pantalla de espera de aprobación.
- El backend puede consultar usuarios, memberships y preferencia de club activo respetando RLS y validaciones de contexto.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Usuario nuevo sin asignación | Se crea un registro global de usuario y el acceso queda en estado de espera de aprobación. |
| Usuario existente sin asignación | Se reutiliza el usuario existente sin duplicados y el acceso queda en estado de espera de aprobación. |
| Usuario existente con asignación activa | Se reutiliza el usuario existente y la sesión ingresa al sistema sobre un club activo válido. |
| Cancelación de OAuth | No se crea usuario ni membership y el usuario vuelve al login. |
| Usuario ya autenticado | No se inicia OAuth de nuevo y el usuario es redirigido automáticamente al dashboard de un club activo válido. |

---

## 8. Reglas de negocio

- La autenticación oficial del MVP es Google OAuth mediante Supabase Auth.
- El usuario global del sistema es único por email.
- Un login exitoso nunca debe crear un usuario duplicado si ya existe una cuenta con el mismo email.
- Los permisos no dependen del usuario global sino de sus memberships por club.
- Un usuario sin memberships activas no puede acceder al dashboard y debe quedar en espera de aprobación.
- Un usuario con al menos una membership activa puede ingresar al sistema en el contexto de un club válido.
- La resolución del club destino debe considerar únicamente memberships con `status = activo`.
- Cancelar el consentimiento de Google no debe generar efectos persistentes.
- Si ya existe una sesión válida, la pantalla de login actúa solo como punto de redirección y no como iniciador de un nuevo login.
- Esta US no debe asignar clubes ni roles automáticamente fuera de los casos definidos en historias específicas de invitaciones.

---

## 9. Flujo principal

1. El usuario accede a la pantalla de login sin sesión activa.
2. La UI ofrece la acción de iniciar sesión con Google.
3. El usuario selecciona la acción y el sistema inicia el flujo OAuth con Google mediante Supabase Auth.
4. Google autentica al usuario y devuelve identidad válida al sistema.
5. El backend busca un usuario existente por email autenticado.
6. Si no existe usuario, crea el perfil global con email, nombre y avatar provistos por el proveedor.
7. El sistema consulta las memberships del usuario y determina si existe al menos una con estado `activo`.
8. Si no existe ninguna membership activa, el sistema muestra la pantalla de espera de aprobación.
9. Si existe al menos una membership activa, el sistema resuelve un club activo válido y redirige al dashboard correspondiente.

---

## 10. Flujos alternativos

### A. Usuario existente sin asignación activa

1. El usuario completa OAuth correctamente.
2. El sistema encuentra un usuario existente por email.
3. El sistema no crea un nuevo registro de usuario.
4. El sistema verifica que no existen memberships activas.
5. El usuario ve la pantalla de espera de aprobación.

### B. Cancelación del flujo OAuth

1. El usuario inicia el flujo de Google.
2. El usuario cancela el consentimiento o abandona el flujo.
3. El sistema vuelve a la pantalla de login.
4. No se persiste ningún usuario nuevo ni cambios de acceso.

### C. Usuario ya autenticado

1. El usuario accede a la pantalla de login con una sesión vigente.
2. El sistema detecta la sesión antes de renderizar acciones de ingreso.
3. El sistema redirige automáticamente al dashboard de un club activo válido.
4. No se dispara un nuevo flujo OAuth.

### D. Usuario existente con memberships no activas

1. El usuario completa OAuth correctamente.
2. El sistema reutiliza el usuario existente.
3. El sistema detecta que tiene memberships, pero ninguna en estado `activo`.
4. El usuario ve la pantalla de espera de aprobación y no accede al dashboard.

---

## 11. UI / UX

### Fuente de verdad
- `design/design-system.md`

### Reglas
- La pantalla de login debe ser mobile-first y priorizar una única acción principal de acceso.
- La acción principal debe iniciar Google OAuth de forma explícita y visible.
- Si el usuario ya tiene sesión activa, la pantalla no debe fomentar una segunda autenticación; debe redirigir automáticamente.
- La pantalla de espera de aprobación debe comunicar claramente que el usuario todavía no tiene acceso operativo.
- Los estados de carga y redirección deben ser claros y no ambiguos.
- La interfaz no debe exponer decisiones de permisos en frontend como fuente de verdad; solo refleja el estado resuelto por backend.
- El flujo debe evitar ruido visual y mantener foco operativo en el estado de acceso del usuario.

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
| button | `auth.login.google_sign_in_cta` | Texto del botón principal para iniciar sesión con Google. Missing |
| title | `auth.login.title` | Título de la pantalla de login. Missing |
| body | `auth.login.description` | Texto breve de apoyo en la pantalla de login. Missing |
| status | `auth.login.redirecting_authenticated_user` | Mensaje durante la redirección automática de un usuario con sesión activa. Missing |
| title | `auth.pending_approval.title` | Título de la pantalla de espera de aprobación. Missing |
| body | `auth.pending_approval.description` | Explicación del estado sin club o sin membership activa. Missing |
| action | `auth.pending_approval.primary_action` | Acción principal disponible en pantalla de espera si se define una. Missing |
| error | `auth.login.oauth_cancelled` | Mensaje opcional al volver al login tras cancelar OAuth, si la UX decide informarlo. Missing |
| error | `auth.login.oauth_generic_error` | Mensaje de error genérico si la autenticación falla por una razón distinta a cancelación. Missing |
| status | `auth.login.loading` | Estado visible mientras se inicia el flujo de autenticación. Missing |

---

## 13. Persistencia

### Entidades afectadas
List tables/entities and expected write behavior:
- `users`: INSERT cuando el email autenticado no existe; UPDATE solo para sincronizar atributos globales permitidos del perfil si el sistema decide refrescarlos de forma controlada; READ para reutilizar cuentas existentes.
- `memberships`: READ para determinar si el usuario posee memberships y si alguna está en estado `activo`; no-op en esta US para usuarios sin invitación.
- `user_club_preferences`: READ opcional para recuperar el último club activo válido durante la resolución de destino; no-op cuando el usuario no tiene club activo disponible.
- `clubs`: READ indirecto o derivado solo para validar el club de destino cuando existan memberships activas.
- `club_invitations`: no-op en esta US; el procesamiento de invitaciones vigentes pertenece a US-08.

Do not reference current code files.

---

## 14. Seguridad

List:
- La autenticación debe resolverse exclusivamente con Supabase Auth y Google OAuth.
- La identidad autenticada confiable debe provenir de `auth.uid()` y del email devuelto por el proveedor autenticado.
- La resolución del acceso post-login debe considerar únicamente memberships activas del usuario autenticado.
- No debe otorgarse acceso al dashboard cuando el usuario no tenga ninguna membership activa.
- El backend debe resolver el club activo; no debe confiar solo en parámetros de frontend.
- Toda consulta autenticada posterior debe respetar `app.current_club_id` y las políticas RLS.
- No debe existir acceso cross-club durante la determinación del destino de login.
- Esta US no debe usar service role para bypass de RLS en lógica de negocio.

---

## 15. Dependencias

List dependencies on:
- auth: Supabase Auth con Google OAuth habilitado.
- domain entities: `users`, `memberships`, `clubs`, `user_club_preferences`.
- permissions: reglas basadas en `membership.status = activo` dentro del club activo.
- other US if relevant: US-05 para la política detallada de redirección post-login entre múltiples clubes; US-08 para procesamiento de invitaciones preexistentes; US-03 para aprobación y asignación de rol posteriores.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Duplicar usuarios por no reutilizar email autenticado | Media | Alta | Forzar búsqueda y reconciliación por email antes de crear perfil global. |
| Redirigir a un club no válido o no activo | Media | Alta | Resolver destino solo con memberships `activo` y validación backend del club activo. |
| Crear efectos persistentes cuando el usuario cancela OAuth | Baja | Media | Persistir únicamente después de una autenticación confirmada por proveedor. |
| Mezclar en esta US la lógica de invitaciones y ampliar alcance | Media | Media | Limitar explícitamente la historia al flujo general y delegar invitaciones a US-08. |
| Dejar textos hardcodeados durante implementación | Alta | Media | Definir y completar las keys faltantes en `lib/texts.json` antes de desarrollar la UI. |
