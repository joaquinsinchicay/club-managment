# PRODUCT BACKLOG · MVP
## Club managment

User Stories con Acceptance Criteria en formato Gherkin — ordenadas por prioridad de desarrollo.

---

### E01 🔐 Autenticación y gestión de roles / US-01 — Registro con Google

> *Como usuario, quiero iniciar sesión con mi cuenta de Google, para acceder al sistema del club sin crear una contraseña nueva.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-01 — Registro con Google

  Scenario 01: Primer ingreso sin asignación
    Given soy un usuario nuevo sin cuenta
    And no tengo rol asignado
    And no tengo club asignado
    When selecciono "Ingresar con Google" y autorizo el acceso
    Then el sistema crea mi perfil con estado "pendiente_aprobacion"
    And veo la pantalla de espera de aprobación

  Scenario 02: Usuario existente sin asignación
    Given ya existe una cuenta con mi email
    And no tengo rol asignado
    And no tengo club asignado
    When inicio sesión con Google
    Then accedo a la cuenta existente sin crear un duplicado
    And veo la pantalla de espera de aprobación

  Scenario 03: Usuario existente con asignación
    Given ya existe una cuenta con mi email
    And tengo al menos un rol asignado
    And tengo al menos un club asignado
    When inicio sesión con Google
    Then accedo a la cuenta existente sin crear un duplicado
    And soy redirigido al dashboard del club activo

  Scenario 04: Cancelación del flujo OAuth
    Given estoy en el flujo de autorización de Google
    When cancelo el permiso
    Then regreso a la pantalla de login
    And no se crea ninguna cuenta

  Scenario 05: Usuario ya autenticado
    Given ya tengo una sesión activa
    When accedo a la pantalla de login
    Then soy redirigido automáticamente al dashboard del club activo
    And no se inicia un nuevo flujo de autenticación
```

---

### E02 Navegación / US-02 — Avatar con menú de sesión en el header

> *Como usuario autenticado, quiero ver mi avatar en el header y poder acceder a la configuración del club (si soy admin) y cerrar sesión desde ahí.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-02 — Avatar con menú de sesión en el header

  Scenario 01: Avatar visible en el header
    Given estoy autenticado
    And estoy en cualquier pantalla de la aplicación
    Then veo mi avatar en la esquina superior derecha del header
    And el avatar muestra mi foto de perfil de Google o mis iniciales si no hay foto

  Scenario 02: Menú del avatar para usuario no admin
    Given estoy autenticado
    And no soy admin del club activo
    When toco mi avatar
    Then se despliega un menú con la opción "Cerrar sesión"

  Scenario 03: Menú del avatar para usuario admin
    Given estoy autenticado
    And soy admin del club activo
    When toco mi avatar
    Then se despliega un menú con las opciones "Configuración del club" y "Cerrar sesión"

  Scenario 04: Acceso a configuración del club
    Given estoy autenticado
    And soy admin del club activo
    And el menú del avatar está abierto
    When selecciono "Configuración del club"
    Then soy redirigido a la página de configuración del club
    And el menú se cierra

  Scenario 05: Intento de acceso a configuración sin permisos
    Given estoy autenticado
    And no soy admin del club activo
    When intento acceder a la página de configuración del club
    Then no tengo acceso a la página
    And veo un mensaje de permisos insuficientes o soy redirigido al dashboard

  Scenario 06: Cierre de sesión desde el avatar
    Given estoy autenticado
    And el menú del avatar está abierto
    When selecciono "Cerrar sesión"
    Then se muestra un diálogo de confirmación
    When confirmo el cierre de sesión
    Then mi sesión se cierra
    And soy redirigido a la pantalla de login

  Scenario 07: Cierre del menú sin acción
    Given estoy autenticado
    And el menú del avatar está abierto
    When toco fuera del menú
    Or vuelvo a tocar el avatar
    Or presiono ESC
    Then el menú se cierra sin ejecutar ninguna acción
```

---

### E01 🔐 Autenticación y gestión de roles / US-03 — Asignación de rol

> *Como administrador, quiero aprobar el ingreso de un usuario y asignarle un rol, para que pueda operar el sistema con los permisos correctos.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-03 — Asignación de rol

  Scenario 01: Acceso a configuración del club
    Given estoy autenticado
    And soy admin del club activo
    When accedo a la configuración del club desde el menú del avatar
    Then veo la pantalla de configuración del club activo

  Scenario 02: Ver lista de miembros del club activo
    Given estoy autenticado
    And soy admin del club activo
    And estoy en la pantalla de configuración del club activo
    When la pantalla carga
    Then veo la lista de miembros del club activo con su nombre, avatar, rol en ese club y estado en ese club

  Scenario 03: Aprobación y asignación de rol a usuario pendiente en el club activo
    Given estoy autenticado
    And soy admin del club activo
    And existe un usuario con estado "pendiente_aprobacion" en el club activo
    When selecciono el usuario y le asigno un rol en el club activo
    Then el sistema actualiza su estado a "activo" en el club activo
    And el usuario obtiene permisos según el rol asignado en el club activo

  Scenario 04: Usuario pendiente no aprobado en el club activo
    Given estoy autenticado
    And soy admin del club activo
    And existe un usuario con estado "pendiente_aprobacion" en el club activo
    When decido no aprobar al usuario
    Then el usuario permanece en estado "pendiente_aprobacion" en el club activo
    And no tiene acceso operativo a ese club

  Scenario 05: Cambio de rol a usuario activo en el club activo
    Given estoy autenticado
    And soy admin del club activo
    And existe un usuario con estado "activo" en el club activo
    And tiene un rol asignado en el club activo
    When modifico el rol del usuario en el club activo
    Then el sistema actualiza el rol del usuario en el club activo
    And los permisos del usuario se actualizan para ese club

  Scenario 06: Un mismo usuario puede tener distintos roles en distintos clubes
    Given existe un usuario que pertenece a más de un club
    And tiene un rol asignado en otro club
    When le asigno un rol en el club activo
    Then el rol asignado en el club activo no modifica sus roles en otros clubes

  Scenario 07: Un admin solo puede gestionar roles de su club activo
    Given estoy autenticado
    And soy admin del club activo
    When intento gestionar el rol de un usuario de otro club donde no soy admin
    Then no tengo permisos para realizar esa acción
```

---

### E02 Navegación / US-04 — Selector de club activo en el dashboard

> *Como usuario con acceso a más de un club, quiero ver y cambiar el club activo desde el dashboard, para operar dentro del contexto correcto.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-04 — Selector de club activo en el dashboard

  Scenario 01: Usuario con un solo club no ve selector
    Given estoy autenticado
    And tengo acceso a un solo club
    When ingreso al dashboard
    Then no veo un selector de club
    And el dashboard se muestra directamente para mi único club

  Scenario 02: Usuario con múltiples clubes ve el selector en el dashboard
    Given estoy autenticado
    And tengo acceso a más de un club
    When ingreso al dashboard
    Then veo el selector de club activo en el dashboard
    And veo identificado el club activo actual

  Scenario 03: Cambio de club activo desde el selector
    Given estoy autenticado
    And tengo acceso a más de un club
    And estoy viendo el dashboard de un club activo
    When selecciono otro club desde el selector
    Then el sistema actualiza el club activo
    And veo el dashboard correspondiente al nuevo club activo
    And solo veo la información y acciones permitidas para mi rol en ese club

  Scenario 04: Persistencia del club activo
    Given estoy autenticado
    And tengo acceso a más de un club
    And seleccioné un club como club activo
    When navego a otra pantalla y regreso al dashboard
    Then el sistema conserva el club activo seleccionado

  Scenario 05: Ingreso con último club activo disponible
    Given estoy autenticado
    And tengo acceso a más de un club
    And existe un último club activo previamente seleccionado
    When inicio sesión e ingreso al sistema
    Then el sistema me redirige al dashboard de ese último club activo

  Scenario 06: Último club activo ya no disponible
    Given estoy autenticado
    And tengo acceso a más de un club
    And el último club activo previamente seleccionado ya no está disponible para mí
    When ingreso al dashboard
    Then el sistema asigna automáticamente otro club disponible como club activo
    And veo el dashboard de ese club

  Scenario 07: Usuario sin acceso al club seleccionado
    Given estoy autenticado
    And no tengo acceso a un determinado club
    When intento acceder manualmente al dashboard de ese club
    Then no tengo acceso a la información de ese club
    And veo un mensaje de permisos insuficientes o soy redirigido a un club válido

  Scenario 08: El selector muestra solo clubes disponibles para el usuario
    Given estoy autenticado
    And tengo acceso a uno o más clubes
    When abro el selector de club en el dashboard
    Then veo únicamente los clubes a los que tengo acceso
    And no veo clubes donde no pertenezco
```

---

### E02 Navegación / US-05 — Redirección post login según clubes del usuario

> *Como usuario autenticado, quiero ser redirigido automáticamente después de iniciar sesión según los clubes a los que pertenezco, para acceder rápidamente al contexto correcto.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-05 — Redirección post login según clubes del usuario

  Scenario 01: Usuario sin clubes asignados
    Given estoy autenticado
    And no tengo clubes asignados
    When ingreso al sistema
    Then veo la pantalla de espera de aprobación
    And no tengo acceso al dashboard

  Scenario 02: Usuario con un solo club
    Given estoy autenticado
    And tengo acceso a un solo club con estado "activo"
    When ingreso al sistema
    Then soy redirigido automáticamente al dashboard de ese club

  Scenario 03: Usuario con múltiples clubes y último club activo válido
    Given estoy autenticado
    And tengo acceso a más de un club con estado "activo"
    And existe un último club activo previamente seleccionado
    And ese club sigue disponible para mí
    When ingreso al sistema
    Then soy redirigido automáticamente al dashboard de ese último club activo

  Scenario 04: Usuario con múltiples clubes sin último club activo
    Given estoy autenticado
    And tengo acceso a más de un club con estado "activo"
    And no existe un último club activo previamente seleccionado
    When ingreso al sistema
    Then soy redirigido al dashboard de uno de sus clubes disponibles
    And el sistema define ese club como club activo

  Scenario 05: Usuario con múltiples clubes y último club inválido
    Given estoy autenticado
    And tengo acceso a más de un club con estado "activo"
    And existe un último club activo previamente seleccionado
    And ese club ya no está disponible para mí
    When ingreso al sistema
    Then soy redirigido al dashboard de otro club disponible
    And el sistema actualiza el club activo

  Scenario 06: Usuario con membresía no activa en todos los clubes
    Given estoy autenticado
    And tengo clubes asignados pero ninguno con estado "activo"
    When ingreso al sistema
    Then veo la pantalla de espera de aprobación
    And no tengo acceso al dashboard

  Scenario 07: Validación de acceso al club en la redirección
    Given estoy autenticado
    When el sistema determina el club al que debo ser redirigido
    Then solo considera clubes donde tengo estado "activo"
    And nunca soy redirigido a un club donde no tengo permisos
```

---

### E02 Navegación / US-06 — Visualización del rol en el club activo en el header

> *Como usuario autenticado, quiero ver mi nombre y mi rol dentro del club activo en el header, para entender rápidamente qué permisos tengo en ese contexto.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-06 — Visualización del rol en el club activo en el header

  Scenario 01: Visualización de nombre y rol en el header
    Given estoy autenticado
    And tengo un club activo
    And tengo un rol asignado en ese club
    When estoy en cualquier pantalla del sistema
    Then veo en el header el mensaje "Bienvenido/a <Nombre>, tu rol es <Rol>"
    And el nombre corresponde a mi perfil de usuario
    And el rol corresponde a mi rol en el club activo

  Scenario 02: Cambio de club actualiza el rol mostrado
    Given estoy autenticado
    And tengo acceso a más de un club
    And cada club tiene un rol distinto asignado
    When cambio el club activo desde el selector
    Then el header se actualiza mostrando el nombre del usuario
    And muestra el rol correspondiente al nuevo club activo

  Scenario 03: Usuario sin rol activo en el club
    Given estoy autenticado
    And tengo un club activo
    And no tengo rol asignado en ese club
    When estoy en el sistema
    Then no veo el mensaje de rol en el header
    And no tengo acceso a funcionalidades operativas

  Scenario 04: Persistencia del rol en navegación interna
    Given estoy autenticado
    And tengo un club activo
    When navego entre distintas pantallas del sistema
    Then el header mantiene visible el nombre y rol del usuario
    And el rol no cambia mientras el club activo no cambie

  Scenario 05: Consistencia con permisos del sistema
    Given estoy autenticado
    And tengo un rol asignado en el club activo
    When visualizo el rol en el header
    Then las funcionalidades disponibles en la interfaz coinciden con los permisos de ese rol

  Scenario 06: Usuario no autenticado no ve información en el header
    Given no estoy autenticado
    When accedo a una pantalla pública o de login
    Then no veo información de usuario ni rol en el header
```

---
*Joaquin Fernandez Sinchi — Product Manager · A-CSPO | Buenos Aires, Argentina | Marzo 2026*