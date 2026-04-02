# PDD · US-01 — Iniciar sesión con Google

## 1. Objetivo

Definir el diseño funcional y técnico de la user story `US-01 — Iniciar sesión con Google`, alineado con el backlog del MVP, las decisiones de arquitectura, el modelo de dominio, la matriz de permisos y el design system del repositorio.

Esta funcionalidad debe permitir que un usuario:

* inicie sesión con Google usando Supabase Auth
* reutilice su cuenta si ya existe
* sea redirigido según su contexto de memberships
* no cree duplicados
* quede en estado de espera si todavía no tiene acceso operativo a ningún club

---

## 2. Referencias del repositorio

Fuentes usadas para este PDD:

* `docs/prod/backlog_us_mvp.md`
* `docs/architecture/decisions.md`
* `docs/architecture/tech-stack.md`
* `docs/contracts/api-contracts.md`
* `docs/contracts/permission-matrix.md`
* `docs/domain/domain-model.md`
* `docs/database/README.md`
* `docs/design/design-system.md`

---

## 3. User Story

> Como usuario, quiero iniciar sesión con mi cuenta de Google, para acceder al sistema del club sin crear una contraseña nueva.

---

## 4. Acceptance Criteria Base

La implementación debe cubrir los escenarios ya definidos en backlog:

1. Primer ingreso sin asignación.
2. Usuario existente sin asignación.
3. Usuario existente con asignación.
4. Cancelación del flujo OAuth.
5. Usuario ya autenticado.

---

## 5. Alcance

### Incluido

* pantalla de login con CTA `Ingresar con Google`
* inicio de flujo OAuth con Google vía Supabase Auth
* resolución de sesión autenticada
* creación o reutilización del usuario global
* lectura de memberships del usuario autenticado
* redirección según disponibilidad de clubes activos
* pantalla de espera de aprobación para usuarios sin acceso operativo

### No incluido

* invitación a clubes
* aprobación manual de memberships
* selector de club
* avatar y menú de sesión
* gestión de miembros

Esos puntos quedan cubiertos por historias posteriores del backlog.

---

## 6. Resultado esperado de negocio

La autenticación debe resolver el acceso al sistema sin fricción y sin ambigüedad:

* si el usuario no tiene memberships activas, entra pero no opera
* si el usuario ya pertenece a uno o más clubes activos, entra y continúa al contexto correcto
* si el usuario cancela OAuth, no se debe crear ningún registro inconsistente

---

## 7. Actores

### Usuario no autenticado

Puede ver la pantalla de login e iniciar OAuth con Google.

### Usuario autenticado sin memberships activas

Puede quedar autenticado, pero solo debe ver la pantalla de espera de aprobación.

### Usuario autenticado con memberships activas

Debe ser redirigido al dashboard del club activo o resolverse mediante el flujo de club activo.

---

## 8. Reglas funcionales

1. La autenticación usa exclusivamente `Google OAuth` mediante `Supabase Auth`.
2. El usuario global existe una sola vez en el sistema.
3. La identidad canónica del usuario es su email autenticado en Google, asociada a `auth.uid()`.
4. No se deben crear usuarios duplicados si el email ya existe.
5. Los permisos no dependen del usuario global sino de `memberships`.
6. Solo las memberships con estado `activo` habilitan acceso operativo.
7. Si el usuario ya tiene sesión activa, no debe volver a iniciar el flujo OAuth.
8. La lógica de resolución de acceso debe ejecutarse en backend.

---

## 9. Flujo UX

## 9.1 Pantalla de login

Pantalla mínima, clara y enfocada en una sola acción primaria:

* título de acceso
* breve texto explicativo
* botón primario `Ingresar con Google`

Reglas de diseño:

* una sola acción primaria visible
* lenguaje explícito
* no agregar ruido visual
* mantener layout simple, operacional y mobile-first

## 9.2 Inicio del flujo OAuth

Cuando el usuario presiona `Ingresar con Google`:

* se dispara `supabase.auth.signInWithOAuth`
* el proveedor es Google
* se configura redirect/callback al entorno de la app

## 9.3 Retorno desde OAuth

Al volver desde Google:

* se resuelve la sesión de Supabase
* se obtiene el usuario autenticado
* se sincroniza o crea el perfil interno del usuario
* se cargan memberships y preferencia de club activo

## 9.4 Resolución post-login

Hay tres salidas posibles:

### Caso A: sin memberships activas

Redirigir a pantalla `espera de aprobación`.

### Caso B: con una o más memberships activas

Redirigir al flujo que resuelve `active_club_id` y luego al dashboard del club.

### Caso C: usuario ya autenticado entra a `/login`

Bypass del login y redirección automática.

---

## 10. Pantallas y estados

## 10.1 Login

### Elementos

* título
* descripción corta
* botón `Ingresar con Google`

### Estados

* idle
* loading al iniciar OAuth
* error recuperable si falla el inicio del flujo

## 10.2 Espera de aprobación

### Objetivo

Informar que la cuenta existe pero todavía no tiene acceso operativo a un club.

### Contenido mínimo

* mensaje principal de espera
* explicación breve
* opción de cerrar sesión

### Restricciones

* no mostrar módulos operativos
* no renderizar dashboard

## 10.3 Redirect guard en login

Si existe sesión válida:

* no mostrar CTA de login
* ejecutar redirección inmediata

---

## 11. Modelo de datos impactado

## 11.1 Entidades involucradas

### User

Campos relevantes:

* `id`
* `email`
* `full_name`
* `avatar_url`

### Membership

Campos relevantes:

* `user_id`
* `club_id`
* `role`
* `status`

Estados relevantes:

* `pendiente_aprobacion`
* `activo`
* `inactivo`

### UserClubPreference

Campos relevantes:

* `user_id`
* `last_active_club_id`

## 11.2 Reglas de persistencia

1. Si el usuario autenticado no existe en tabla `users`, debe crearse.
2. Si ya existe, deben actualizarse al menos `full_name` y `avatar_url` si aplica la estrategia elegida por negocio.
3. No deben crearse memberships automáticas en esta historia.
4. `last_active_club_id` solo se usa para resolver redirección si existe y es válido.

---

## 12. Contrato funcional requerido

Esta historia depende explícitamente de un contrato similar a `Get current session context` definido en `docs/contracts/api-contracts.md`.

## 12.1 Operación requerida

### Get current session context

Debe devolver:

* usuario autenticado
* memberships
* `active_club_id`

## 12.2 Uso en US-01

Después de autenticar:

1. obtener sesión
2. resolver usuario del sistema
3. resolver memberships activas
4. resolver `active_club_id`
5. decidir redirección

---

## 13. Lógica de negocio detallada

## 13.1 Primer ingreso sin asignación

Condición:

* usuario nuevo autenticado con Google
* sin memberships

Resultado:

* se crea `User`
* no se crea club ni membership
* se muestra espera de aprobación

## 13.2 Usuario existente sin asignación

Condición:

* existe `User`
* no tiene memberships activas

Resultado:

* no se crea duplicado
* se reutiliza la cuenta
* se muestra espera de aprobación

## 13.3 Usuario existente con asignación

Condición:

* existe `User`
* tiene al menos una membership `activo`

Resultado:

* se reutiliza la cuenta
* se resuelve club activo
* se redirige al dashboard

## 13.4 Cancelación del flujo OAuth

Condición:

* usuario cancela en Google

Resultado:

* no se crea usuario interno nuevo
* no se crean memberships
* vuelve a login con feedback recuperable si hace falta

## 13.5 Usuario ya autenticado

Condición:

* sesión de Supabase vigente

Resultado:

* `/login` actúa como guard inverso
* redirige al destino resuelto

---

## 14. Resolución de club activo

Aunque el detalle completo queda profundizado en historias posteriores, US-01 debe respetar estas reglas:

1. Solo considerar memberships con estado `activo`.
2. Si existe `last_active_club_id` válido, usarlo.
3. Si no existe, elegir un club activo disponible.
4. Si no hay ninguno, devolver `active_club_id = null`.

Esto debe resolverse en backend.

---

## 15. Requisitos técnicos

## 15.1 Frontend

* Next.js App Router
* pantalla de login en grupo auth
* uso de Server Components por defecto
* Client Component solo para interacción del botón si fuera necesario

## 15.2 Backend

* Supabase Auth para sesión
* lógica de resolución en server action, route handler o capa server
* no resolver permisos críticos solo en cliente

## 15.3 Seguridad

* usar `auth.uid()` como fuente de verdad
* no crear sesiones custom
* no confiar en parámetros de frontend para memberships

---

## 16. Estados de error

## 16.1 Error al iniciar OAuth

Mostrar mensaje legible:

* no se pudo iniciar sesión con Google
* intentá nuevamente

## 16.2 Sesión inválida al volver del callback

Resultado:

* limpiar estado transitorio si aplica
* volver a login

## 16.3 Usuario autenticado pero sin contexto resoluble

Resultado:

* si no hay memberships activas, mostrar espera de aprobación
* no tratarlo como error técnico

## 16.4 Error inesperado de backend

Resultado:

* log en backend
* mensaje genérico al usuario
* no exponer detalles internos

---

## 17. Copys sugeridos

## 17.1 Login

### Título

`Ingresá al sistema`

### Texto

`Usá tu cuenta de Google para acceder al club.`

### CTA

`Ingresar con Google`

## 17.2 Espera de aprobación

### Título

`Tu acceso está pendiente de aprobación`

### Texto

`Ya iniciamos tu sesión, pero todavía no tenés un club activo habilitado. Cuando un administrador apruebe tu acceso, vas a poder ingresar al sistema.`

---

## 18. Consideraciones de diseño

Basado en `docs/design/design-system.md`:

1. La pantalla debe priorizar claridad operativa.
2. Debe existir una sola acción primaria.
3. El texto debe ser corto y escaneable.
4. No usar recursos visuales decorativos innecesarios.
5. Si hay estado de espera, debe ser explícito y no ambiguo.

---

## 19. Métricas de aceptación funcional

La historia se considera bien implementada si:

1. el usuario puede autenticarse con Google
2. no se generan usuarios duplicados
3. un usuario sin memberships activas ve espera de aprobación
4. un usuario con memberships activas llega al dashboard
5. un usuario autenticado no vuelve a pasar por login
6. cancelar OAuth no deja registros inconsistentes

---

## 20. Casos límite

1. Usuario con email válido en Auth pero sin registro interno.
2. Usuario con registro interno pero sin memberships.
3. Usuario con memberships solo en estado `pendiente_aprobacion`.
4. Usuario con `last_active_club_id` apuntando a un club ya no disponible.
5. Usuario con avatar nulo.
6. Usuario con nombre vacío o incompleto desde Google.

---

## 21. Testing sugerido

## 21.1 Manual

1. Login con usuario completamente nuevo.
2. Login con usuario existente sin memberships activas.
3. Login con usuario existente con una membership activa.
4. Login con usuario existente con múltiples memberships activas.
5. Cancelación manual del flujo OAuth.
6. Reingreso a `/login` con sesión vigente.

## 21.2 Backend

Validar:

* creación idempotente de usuario
* resolución de memberships activas
* resolución correcta de `active_club_id`

## 21.3 Seguridad

Validar:

* no exposición de datos de clubes sin membership
* lectura de contexto solo desde backend
* funcionamiento correcto con Supabase Auth

---

## 22. Dependencias

Para implementar US-01 se necesita:

* proyecto Supabase configurado
* Google OAuth habilitado
* estructura base de tabla `users`
* estructura base de tabla `memberships`
* contrato de `current session context`

---

## 23. Riesgos

1. Duplicación de usuarios si no se define bien la sincronización entre Auth y tabla `users`.
2. Redirecciones inconsistentes si `active_club_id` se resuelve parcialmente en frontend.
3. Mala UX si la pantalla de espera no explica claramente por qué no hay acceso.
4. Errores de sesión si callback y dominio de redirect no están bien configurados en Supabase.

---

## 24. Criterio de Done

US-01 está completa cuando:

1. existe una pantalla de login funcional con Google OAuth
2. existe un flujo de callback/resolución de sesión
3. el sistema crea o reutiliza correctamente el usuario
4. la redirección post-login sigue las reglas del dominio
5. existe pantalla de espera para usuarios sin acceso operativo
6. los cinco acceptance criteria del backlog pasan validación manual

---

## 25. Supuestos explícitos

1. La tabla de usuarios interna está desacoplada de `auth.users`, pero se sincroniza con ella.
2. La creación automática de `Membership` no forma parte de US-01.
3. La resolución completa de múltiples clubes se apoya en historias posteriores, pero US-01 debe dejar encaminado el contexto correctamente.
