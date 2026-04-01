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

### E01 🔐 Autenticación y gestión de roles / US-07 — Invitar usuario al club

> *Como administrador, quiero invitar un usuario al club activo asignándole un rol, para incorporarlo al sistema con los permisos correctos.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-07 — Invitar usuario al club

  Scenario 01: Acceso a la acción de invitar usuario
    Given estoy autenticado
    And soy admin del club activo
    And estoy en la pantalla de configuración del club activo
    When la pantalla carga
    Then veo una acción para invitar un usuario al club

  Scenario 02: Formulario de invitación
    Given estoy autenticado
    And soy admin del club activo
    And estoy en la pantalla de configuración del club activo
    When selecciono la acción de invitar usuario
    Then veo un formulario de invitación
    And veo un campo para ingresar el email del usuario
    And veo un selector de rol
    And veo las acciones "Invitar" y "Cancelar"

  Scenario 03: Invitación exitosa a usuario no existente
    Given estoy autenticado
    And soy admin del club activo
    And ingreso un email que no pertenece a ningún usuario existente
    And selecciono un rol válido
    When confirmo la invitación
    Then el sistema registra la invitación para ese email en el club activo
    And el usuario queda asociado al club activo con el rol seleccionado
    And veo un mensaje de confirmación

  Scenario 04: Invitación exitosa a usuario ya existente
    Given estoy autenticado
    And soy admin del club activo
    And ingreso un email que pertenece a un usuario existente
    And ese usuario no pertenece al club activo
    And selecciono un rol válido
    When confirmo la invitación
    Then el sistema asocia al usuario existente al club activo con el rol seleccionado
    And veo un mensaje de confirmación

  Scenario 05: Usuario ya pertenece al club activo
    Given estoy autenticado
    And soy admin del club activo
    And ingreso un email de un usuario que ya pertenece al club activo
    When confirmo la invitación
    Then el sistema no crea una nueva invitación ni una membresía duplicada
    And veo un mensaje indicando que el usuario ya pertenece al club

  Scenario 06: Email obligatorio
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de invitación
    When intento invitar sin completar el email
    Then veo un mensaje indicando que el email es obligatorio
    And la invitación no se procesa

  Scenario 07: Rol obligatorio
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de invitación
    When intento invitar sin seleccionar un rol
    Then veo un mensaje indicando que el rol es obligatorio
    And la invitación no se procesa

  Scenario 08: Email inválido
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de invitación
    When ingreso un email con formato inválido
    And confirmo la invitación
    Then veo un mensaje indicando que el email no es válido
    And la invitación no se procesa

  Scenario 09: Cancelación del formulario
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de invitación
    When selecciono "Cancelar"
    Then el formulario se cierra sin crear la invitación

  Scenario 10: Admin solo puede invitar al club activo
    Given estoy autenticado
    And soy admin de un club activo
    When invito un usuario desde la configuración del club
    Then la invitación se genera únicamente para el club activo
    And no afecta la membresía del usuario en otros clubes
```

---

### E01 🔐 Autenticación y gestión de roles / US-08 — Ingreso al club con invitación preexistente al iniciar sesión con Google

> *Como usuario invitado a un club, quiero que al iniciar sesión con Google el sistema reconozca mi invitación y me otorgue acceso al club con el rol asignado, para comenzar a usar el sistema sin pasos manuales adicionales.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-08 — Ingreso al club con invitación preexistente al iniciar sesión con Google

  Scenario 01: Ingreso exitoso con invitación preexistente
    Given existe una invitación vigente para mi email en un club
    And la invitación tiene un rol asignado
    And no tengo una cuenta previa en el sistema
    When inicio sesión con Google usando ese mismo email
    Then el sistema crea mi cuenta
    And me asocia al club de la invitación
    And me asigna el rol definido en la invitación
    And mi estado en ese club es "activo"
    And soy redirigido al dashboard de ese club

  Scenario 02: Usuario existente con invitación a un nuevo club
    Given ya tengo una cuenta en el sistema
    And existe una invitación vigente para mi email en un club al que todavía no pertenezco
    And la invitación tiene un rol asignado
    When inicio sesión con Google usando ese mismo email
    Then el sistema asocia mi cuenta existente al club de la invitación
    And me asigna el rol definido en la invitación
    And mi estado en ese club es "activo"

  Scenario 03: Usuario existente con un solo club previo más un nuevo club invitado
    Given ya tengo una cuenta en el sistema
    And ya pertenezco a un club con estado "activo"
    And existe una invitación vigente para mi email en un segundo club
    When inicio sesión con Google usando ese mismo email
    Then el sistema me asocia también al nuevo club invitado
    And conservo mi acceso al club anterior
    And mis roles y estados en cada club se mantienen independientes

  Scenario 04: Invitación ya utilizada
    Given existe una invitación para mi email
    And esa invitación ya fue utilizada
    When inicio sesión con Google usando ese mismo email
    Then el sistema no vuelve a procesar la invitación
    And no crea una membresía duplicada

  Scenario 05: No existe invitación para el email
    Given no existe una invitación para mi email
    And no tengo clubes asignados
    When inicio sesión con Google
    Then el sistema crea mi cuenta con estado pendiente según el flujo general de acceso
    And no me asigna automáticamente a ningún club

  Scenario 06: El email autenticado no coincide con el email invitado
    Given existe una invitación vigente para un email
    When inicio sesión con Google usando un email diferente
    Then el sistema no aplica esa invitación
    And no me asigna al club asociado a esa invitación

  Scenario 07: Múltiples invitaciones para distintos clubes
    Given existen múltiples invitaciones vigentes para mi email en distintos clubes
    And cada invitación tiene un rol asignado
    When inicio sesión con Google usando ese mismo email
    Then el sistema me asocia a todos los clubes de las invitaciones vigentes
    And me asigna en cada club el rol definido en su invitación
    And define un club activo inicial válido para mi sesión

  Scenario 08: La invitación no afecta otros clubes del usuario
    Given ya tengo acceso a uno o más clubes
    And existe una invitación vigente para mi email en otro club
    When inicio sesión con Google usando ese mismo email
    Then el sistema agrega únicamente la membresía correspondiente al club invitante
    And no modifica mis roles ni estados en los demás clubes
```

---


### E01 🔐 Autenticación y gestión de roles / US-09 — Gestión de miembros del club

> *Como administrador, quiero gestionar los miembros del club activo (ver, modificar roles y removerlos), para mantener el control de acceso y la correcta operación del club.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-09 — Gestión de miembros del club

  Scenario 01: Visualización de miembros del club
    Given estoy autenticado
    And soy admin del club activo
    When accedo a la configuración del club
    Then veo la lista de miembros del club activo
    And cada miembro muestra nombre, avatar, rol y estado en ese club

  Scenario 02: Cambio de rol de un miembro
    Given estoy autenticado
    And soy admin del club activo
    And existe un miembro con estado "activo"
    When modifico el rol de ese miembro
    Then el sistema actualiza el rol del miembro en el club activo
    And los permisos del miembro se actualizan según el nuevo rol

  Scenario 03: Remover miembro del club
    Given estoy autenticado
    And soy admin del club activo
    And existe un miembro en el club activo
    When selecciono remover al miembro
    Then el sistema elimina la membresía del usuario en ese club
    And el usuario pierde acceso a ese club
    And no se modifica su acceso a otros clubes

  Scenario 04: Confirmación al remover miembro
    Given estoy autenticado
    And soy admin del club activo
    And selecciono remover a un miembro
    When confirmo la acción
    Then el miembro es removido del club
    When cancelo la acción
    Then el miembro no es removido

  Scenario 05: Un usuario puede removerse a sí mismo
    Given estoy autenticado
    And soy miembro del club activo
    When selecciono salir del club
    Then el sistema elimina mi membresía en ese club
    And pierdo acceso a ese club

  Scenario 06: No se puede eliminar el último admin del club
    Given estoy autenticado
    And soy admin del club activo
    And soy el único admin del club
    When intento removerme o cambiar mi rol a no admin
    Then el sistema bloquea la acción
    And veo un mensaje indicando que debe existir al menos un admin

  Scenario 07: No se puede dejar al club sin admins
    Given estoy autenticado
    And soy admin del club activo
    And existe solo un admin en el club
    When intento remover a ese admin o cambiar su rol
    Then el sistema bloquea la acción
    And veo un mensaje indicando que debe existir al menos un admin

  Scenario 08: Remover miembro pendiente
    Given estoy autenticado
    And soy admin del club activo
    And existe un usuario con estado "pendiente_aprobacion"
    When lo remuevo
    Then el sistema elimina su relación con el club
    And no queda pendiente en el sistema para ese club

  Scenario 09: Admin solo puede gestionar miembros de su club
    Given estoy autenticado
    And soy admin de un club activo
    When intento gestionar miembros de otro club donde no soy admin
    Then no tengo permisos para realizar esa acción

  Scenario 10: Consistencia con el club activo
    Given estoy autenticado
    And soy admin del club activo
    When gestiono miembros
    Then todas las acciones aplican únicamente al club activo
```

---

### E03 💰 Tesorería / US-10 — Apertura y cierre diario de movimientos

> *Como administrador, quiero gestionar los miembros del club activo (ver, modificar roles y removerlos), para mantener el control de acceso y la correcta operación del club.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-10 — Apertura y cierre diario de movimientos

  Scenario 01: Acceso a la funcionalidad según rol
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    When ingreso al módulo de tesorería
    Then veo la opción de apertura y cierre diario

  Scenario 02: Usuario sin rol no accede
    Given estoy autenticado
    And no tengo rol "Secretaria" en el club activo
    When intento acceder al módulo de apertura y cierre diario
    Then no tengo acceso a la funcionalidad

  Scenario 03: Apertura de jornada
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existe una apertura de jornada activa para el día actual
    When realizo la apertura de jornada
    Then el sistema registra la fecha y hora de apertura
    And asocia la apertura a mi usuario y al club activo
    And habilita el registro de movimientos del día

  Scenario 04: No se puede abrir más de una jornada por día
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And ya existe una apertura de jornada para el día actual
    When intento abrir una nueva jornada
    Then el sistema bloquea la acción
    And veo un mensaje indicando que la jornada ya fue abierta

  Scenario 05: Registro de movimientos durante jornada abierta
    Given existe una jornada abierta para el día actual
    When registro ingresos o egresos en cuentas
    Then los movimientos quedan asociados a la jornada activa
    And impactan en el saldo de cada cuenta

  Scenario 06: Cierre de jornada
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    When realizo el cierre de jornada
    Then el sistema registra la fecha y hora de cierre
    And calcula el saldo final de cada cuenta del día
    And bloquea la modificación de los movimientos del día

  Scenario 07: No se puede cerrar jornada sin apertura previa
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existe una jornada abierta para el día actual
    When intento cerrar la jornada
    Then el sistema bloquea la acción
    And veo un mensaje indicando que no hay jornada abierta

  Scenario 08: No se pueden registrar movimientos fuera de una jornada abierta
    Given no existe una jornada abierta para el día actual
    When intento registrar un movimiento
    Then el sistema bloquea la acción
    And veo un mensaje indicando que debo abrir la jornada

  Scenario 09: Registro de horario laboral implícito
    Given realizo la apertura y cierre de jornada
    When la jornada queda cerrada
    Then el sistema registra el rango horario trabajado
    And ese registro queda asociado a mi usuario y al club activo

  Scenario 10: Consistencia por club activo
    Given estoy autenticado
    And tengo rol "Secretaria" en distintos clubes
    When realizo apertura o cierre de jornada
    Then la operación aplica únicamente al club activo
    And no afecta la información de otros clubes
```

---

### E03 💰 Tesorería / US-11 — Registro de movimientos diarios

> *Como administrador, quiero gestionar los miembros del club activo (ver, modificar roles y removerlos), para mantener el control de acceso y la correcta operación del club.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-11 — Registro de movimientos diarios

  Scenario 01: Secretaria ve la opción de registrar movimientos con jornada abierta
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    When ingreso al módulo de tesorería
    Then veo la opción para registrar movimientos diarios

  Scenario 02: Usuario sin rol Secretaria no ve la opción
    Given estoy autenticado
    And no tengo rol "Secretaria" en el club activo
    When ingreso al módulo de tesorería
    Then no veo la opción para registrar movimientos diarios

  Scenario 03: No se muestra la opción sin jornada abierta
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existe una jornada abierta para el día actual
    When ingreso al módulo de tesorería
    Then no veo la opción para registrar movimientos diarios

  Scenario 04: Campos visibles al iniciar la carga
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    When abro el formulario de registro de movimientos
    Then veo el campo "Fecha" completo por defecto y no editable
    And veo el campo "Cuenta"
    And veo el campo "Tipo"
    And veo el campo "Categoría"
    And veo el campo "Concepto"
    And veo el campo "Importe ARS"
    And veo la acción "Crear"
    And no veo campos condicionales que todavía no aplican

  Scenario 05: La fecha se completa automáticamente
    Given estoy viendo el formulario de registro de movimientos
    When el formulario carga
    Then el campo "Fecha" muestra por defecto la fecha del día
    And no puedo editar ese valor

  Scenario 06: Cuenta obligatoria
    Given estoy viendo el formulario de registro de movimientos
    When intento guardar sin seleccionar una cuenta
    Then veo un mensaje indicando que la cuenta es obligatoria
    And el movimiento no se registra

  Scenario 07: Tipo obligatorio y siempre visible
    Given estoy viendo el formulario de registro de movimientos
    Then veo siempre el campo "Tipo"
    When intento guardar sin completar el tipo
    Then veo un mensaje indicando que el tipo es obligatorio
    And el movimiento no se registra

  Scenario 08: Categoría obligatoria y siempre visible
    Given estoy viendo el formulario de registro de movimientos
    Then veo siempre el campo "Categoría"
    When intento guardar sin completar la categoría
    Then veo un mensaje indicando que la categoría es obligatoria
    And el movimiento no se registra

  Scenario 09: Concepto obligatorio
    Given estoy viendo el formulario de registro de movimientos
    When intento guardar sin completar el concepto
    Then veo un mensaje indicando que el concepto es obligatorio
    And el movimiento no se registra

  Scenario 10: Importe obligatorio
    Given estoy viendo el formulario de registro de movimientos
    When intento guardar sin completar el importe
    Then veo un mensaje indicando que el importe es obligatorio
    And el movimiento no se registra

  Scenario 11: Importe mayor a cero
    Given estoy viendo el formulario de registro de movimientos
    When ingreso un importe igual a cero o negativo
    Then veo un mensaje indicando que el importe debe ser mayor a cero
    And el movimiento no se registra

  Scenario 12: Fecha de transferencia visible y obligatoria para cuenta bancaria
    Given estoy viendo el formulario de registro de movimientos
    When selecciono una cuenta de tipo "Bancaria"
    Then veo el campo "Fecha de transf."
    And ese campo es obligatorio
    When intento guardar sin completar la fecha de transferencia
    Then veo un mensaje indicando que la fecha de transferencia es obligatoria
    And el movimiento no se registra

  Scenario 13: Fecha de transferencia oculta para cuentas no bancarias
    Given estoy viendo el formulario de registro de movimientos
    When selecciono una cuenta que no es de tipo "Bancaria"
    Then no veo el campo "Fecha de transf."

  Scenario 14: Actividad visible y obligatoria para categorías específicas
    Given estoy viendo el formulario de registro de movimientos
    When selecciono la categoría "Ligas/Jornadas" o la categoría "Sueldos"
    Then veo el campo "Actividad"
    And ese campo es obligatorio
    When intento guardar sin completar la actividad
    Then veo un mensaje indicando que la actividad es obligatoria
    And el movimiento no se registra

  Scenario 15: Actividad oculta para categorías que no la requieren
    Given estoy viendo el formulario de registro de movimientos
    When selecciono una categoría distinta de "Ligas/Jornadas" y "Sueldos"
    Then no veo el campo "Actividad"

  Scenario 16: Recibo visible y obligatorio para categorías específicas
    Given estoy viendo el formulario de registro de movimientos
    When selecciono la categoría "Cuotas" o la categoría "Fichajes"
    Then veo el campo "Recibo"
    And ese campo es obligatorio
    When intento guardar sin asociar un recibo
    Then veo un mensaje indicando que el recibo es obligatorio
    And el movimiento no se registra

  Scenario 17: Recibo oculto para categorías que no lo requieren
    Given estoy viendo el formulario de registro de movimientos
    When selecciono una categoría distinta de "Cuotas" y "Fichajes"
    Then no veo el campo "Recibo"

  Scenario 18: Calendario visible y obligatorio para categorías específicas
    Given estoy viendo el formulario de registro de movimientos
    When selecciono la categoría "Alquileres" o la categoría "Eventos" o la categoría "Ligas/Jornadas"
    Then veo el campo "Calendario"
    And ese campo es obligatorio
    When intento guardar sin asociar una actividad de calendario
    Then veo un mensaje indicando que la actividad de calendario es obligatoria
    And el movimiento no se registra

  Scenario 19: Calendario oculto para categorías que no lo requieren
    Given estoy viendo el formulario de registro de movimientos
    When selecciono una categoría distinta de "Alquileres", "Eventos" y "Ligas/Jornadas"
    Then no veo el campo "Calendario"

  Scenario 20: Actualización dinámica de campos condicionales
    Given estoy viendo el formulario de registro de movimientos
    And completé uno o más campos condicionales
    When cambio la cuenta o la categoría
    Then el sistema actualiza los campos visibles según la nueva selección
    And oculta los campos que ya no aplican
    And limpia los valores cargados en campos que dejaron de aplicar

  Scenario 21: Registro exitoso del movimiento
    Given estoy viendo el formulario de registro de movimientos
    And completé correctamente todos los campos obligatorios visibles
    When selecciono "Crear"
    Then el sistema registra el movimiento en el club activo
    And asocia el movimiento a la jornada abierta actual
    And impacta el saldo de la cuenta correspondiente
    And veo un mensaje de confirmación

  Scenario 22: Registro exitoso asociado a jornada y usuario responsable
    Given estoy viendo el formulario de registro de movimientos
    And existe una jornada abierta para el día actual
    And completé correctamente todos los campos obligatorios visibles
    When selecciono "Crear"
    Then el sistema persiste el movimiento vinculado a la jornada activa
    And registra la fecha y hora de creación
    And registra el usuario responsable de la carga

  Scenario 23: Borrar formulario
    Given estoy viendo el formulario de registro de movimientos
    And completé uno o más campos
    When selecciono "Borrar formulario"
    Then el formulario vuelve a su estado inicial
    And conserva la fecha cargada por defecto

  Scenario 24: Consistencia por club activo
    Given estoy autenticado
    And tengo rol "Secretaria" en más de un club
    And existe una jornada abierta en el club activo
    When registro un movimiento
    Then el movimiento se registra únicamente en el club activo
    And no impacta cuentas ni jornadas de otros clubes

  Scenario 25: Confirmación y reseteo del formulario después de un registro exitoso
    Given registré exitosamente un movimiento
    When el sistema confirma el registro
    Then veo un mensaje de éxito
    And el formulario vuelve a quedar listo para cargar un nuevo movimiento
    And conserva la fecha cargada por defecto
```

---

### E02 Navegación / US-12 — Card de saldos y operación diaria en el dashboard

> *Como Secretaria del club, quiero ver en el dashboard una card con los saldos de las cuentas y acciones de apertura/cierre de jornada y registro de movimientos, para operar de forma rápida y centralizada.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-12 — Card de saldos y operación diaria en el dashboard

  Scenario 01: Visualización de la card para Secretaria
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    When ingreso al dashboard del club activo
    Then veo una card de "Saldos de cuentas"
    And veo el listado de cuentas con su saldo actual

  Scenario 02: Usuario sin rol Secretaria no ve la card
    Given estoy autenticado
    And no tengo rol "Secretaria" en el club activo
    When ingreso al dashboard del club activo
    Then no veo la card de "Saldos de cuentas"

  Scenario 03: Visualización de saldos por cuenta
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    When veo la card de saldos
    Then veo cada cuenta con su nombre
    And veo el saldo actualizado del día para cada cuenta

  Scenario 04: Visualización con múltiples cuentas
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existen múltiples cuentas en el club
    When veo la card de saldos
    Then veo todas las cuentas habilitadas para el rol Secretaria
    And cada una muestra su saldo correspondiente

  Scenario 05: Estado de jornada visible
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    When veo la card de saldos
    Then veo el estado de la jornada del día
    And el estado puede ser "Abierta" o "Cerrada"

  Scenario 06: CTA abrir jornada cuando no hay jornada abierta
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existe una jornada abierta para el día actual
    When veo la card de saldos
    Then veo el botón "Abrir jornada"
    And no veo el botón "Cerrar jornada"
    And no veo el botón "Registrar movimiento"

  Scenario 07: CTA cerrar jornada cuando hay jornada abierta
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    When veo la card de saldos
    Then veo el botón "Cerrar jornada"
    And veo el botón "Registrar movimiento"
    And no veo el botón "Abrir jornada"

  Scenario 08: Acción de abrir jornada desde la card
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existe una jornada abierta
    When selecciono "Abrir jornada"
    Then el sistema abre la jornada del día
    And actualiza el estado a "Abierta"
    And se actualizan los CTA disponibles

  Scenario 09: Acción de cerrar jornada desde la card
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta
    When selecciono "Cerrar jornada"
    Then el sistema cierra la jornada del día
    And actualiza el estado a "Cerrada"
    And se actualizan los CTA disponibles

  Scenario 10: Acceso a registro de movimiento desde la card
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta
    When selecciono "Registrar movimiento"
    Then soy redirigido al formulario de registro de movimientos

  Scenario 11: Consistencia de datos con el club activo
    Given estoy autenticado
    And tengo acceso a más de un club
    When visualizo la card en el dashboard
    Then los saldos corresponden únicamente al club activo
    And los CTA operan únicamente sobre ese club

  Scenario 12: Actualización de saldos tras movimientos
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta
    When se registra un nuevo movimiento
    Then los saldos en la card se actualizan reflejando el nuevo estado

  Scenario 13: Estado sin cuentas configuradas
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existen cuentas configuradas
    When ingreso al dashboard
    Then veo la card con un estado vacío
    And veo un mensaje indicando que no hay cuentas disponibles
```

---

### E03 💰 Tesorería / US-13 — Consulta detallada de movimientos y saldos por cuenta

> *Como Secretaria del club, quiero consultar el detalle de movimientos y saldos por cuenta, para controlar la operatoria diaria y verificar el estado de cada cuenta del club activo.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-13 — Consulta detallada de movimientos y saldos por cuenta

  Scenario 01: Acceso al detalle desde la card del dashboard
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existen cuentas configuradas en el club activo
    When selecciono una cuenta o la acción de ver detalle desde la card de saldos
    Then accedo a la vista detallada de esa cuenta

  Scenario 02: Usuario sin rol Secretaria no accede al detalle
    Given estoy autenticado
    And no tengo rol "Secretaria" en el club activo
    When intento acceder al detalle de movimientos y saldos por cuenta
    Then no tengo acceso a la funcionalidad

  Scenario 03: Visualización del saldo actual de la cuenta
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And accedí al detalle de una cuenta
    When la vista carga
    Then veo el nombre de la cuenta
    And veo el saldo actual de esa cuenta
    And veo el estado de la jornada del día

  Scenario 04: Visualización del listado de movimientos del día
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And accedí al detalle de una cuenta
    When la vista carga
    Then veo el listado de movimientos de la jornada actual para esa cuenta
    And cada movimiento muestra fecha y hora
    And cada movimiento muestra concepto
    And cada movimiento muestra categoría
    And cada movimiento muestra tipo
    And cada movimiento muestra importe
    And cada movimiento muestra usuario responsable

  Scenario 05: Orden cronológico de movimientos
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existen múltiples movimientos en la cuenta durante la jornada
    When visualizo el detalle de la cuenta
    Then veo los movimientos ordenados cronológicamente

  Scenario 06: Visualización sin movimientos
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And accedí al detalle de una cuenta sin movimientos en la jornada actual
    When la vista carga
    Then veo el saldo actual de la cuenta
    And veo un estado vacío indicando que no hay movimientos registrados para esa jornada

  Scenario 07: Consistencia con el club activo
    Given estoy autenticado
    And tengo rol "Secretaria" en más de un club
    When accedo al detalle de una cuenta
    Then solo veo información de cuentas y movimientos del club activo
    And no veo movimientos de otros clubes

  Scenario 08: Actualización del detalle luego de registrar un movimiento
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And estoy visualizando el detalle de una cuenta
    When se registra un nuevo movimiento en esa cuenta durante la jornada activa
    Then el listado incorpora el nuevo movimiento
    And el saldo actual de la cuenta se actualiza

  Scenario 09: Visualización de movimientos solo de la cuenta seleccionada
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existen movimientos en múltiples cuentas del club
    When accedo al detalle de una cuenta específica
    Then veo únicamente los movimientos correspondientes a esa cuenta

  Scenario 10: Acceso a registrar movimiento desde el detalle de cuenta
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    And estoy visualizando el detalle de una cuenta
    When selecciono "Registrar movimiento"
    Then accedo al formulario de registro de movimientos
    And la cuenta seleccionada puede quedar precargada

  Scenario 11: No se muestra acción de registrar movimiento con jornada cerrada
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existe una jornada abierta para el día actual
    When accedo al detalle de una cuenta
    Then no veo la acción "Registrar movimiento"

  Scenario 12: Cambio entre cuentas
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existen múltiples cuentas configuradas
    When selecciono otra cuenta para consultar
    Then veo el saldo y los movimientos correspondientes a la nueva cuenta seleccionada

  Scenario 13: Estado sin cuentas configuradas
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existen cuentas configuradas
    When intento acceder a la consulta detallada de cuentas
    Then veo un estado vacío indicando que no hay cuentas disponibles
```

---

### E03 💰 Tesorería / US-14 — Apertura y cierre diario con validación de saldos por cuenta

> *Como Secretaria del club, quiero abrir y cerrar la jornada validando los saldos de cada cuenta disponible, para asegurar que los saldos iniciales y finales queden correctamente registrados y que cualquier diferencia genere el movimiento correspondiente.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-14 — Apertura y cierre diario con validación de saldos por cuenta

  Scenario 01: Acceso a apertura diaria
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existe una jornada abierta para el día actual
    When ingreso a la acción de apertura diaria
    Then veo la pantalla de apertura de jornada

  Scenario 02: Acceso a cierre diario
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    When ingreso a la acción de cierre diario
    Then veo la pantalla de cierre de jornada

  Scenario 03: Usuario sin rol Secretaria no accede
    Given estoy autenticado
    And no tengo rol "Secretaria" en el club activo
    When intento acceder a la apertura o cierre diario
    Then no tengo acceso a la funcionalidad

  Scenario 04: Apertura muestra todas las cuentas disponibles para Secretaria
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existe una jornada abierta para el día actual
    And existen cuentas habilitadas para Secretaria
    When ingreso a la apertura diaria
    Then veo todas las cuentas disponibles para Secretaria
    And cada cuenta muestra su saldo preingresado según el saldo actual
    And puedo editar el saldo de cada cuenta

  Scenario 05: Cierre muestra todas las cuentas disponibles para Secretaria
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    And existen cuentas habilitadas para Secretaria
    When ingreso al cierre diario
    Then veo todas las cuentas disponibles para Secretaria
    And cada cuenta muestra su saldo preingresado según el saldo actual
    And puedo editar el saldo de cada cuenta

  Scenario 06: Apertura exitosa sin diferencias
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existe una jornada abierta para el día actual
    And estoy viendo la apertura diaria
    And no modifiqué ninguno de los saldos preingresados
    When confirmo la apertura
    Then el sistema registra la apertura de la jornada
    And registra la fecha y hora de apertura
    And registra el usuario responsable
    And habilita la carga de movimientos
    And no genera movimientos adicionales por diferencia

  Scenario 07: Cierre exitoso sin diferencias
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    And estoy viendo el cierre diario
    And no modifiqué ninguno de los saldos preingresados
    When confirmo el cierre
    Then el sistema registra el cierre de la jornada
    And registra la fecha y hora de cierre
    And registra el usuario responsable
    And no genera movimientos adicionales por diferencia

  Scenario 08: Edición de saldo en apertura detecta diferencia
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existe una jornada abierta para el día actual
    And estoy viendo la apertura diaria
    When edito el saldo de una cuenta
    Then el sistema detecta que existe una diferencia
    And veo un mensaje indicando que se registrará un movimiento por el monto equivalente a esa diferencia

  Scenario 09: Edición de saldo en cierre detecta diferencia
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    And estoy viendo el cierre diario
    When edito el saldo de una cuenta
    Then el sistema detecta que existe una diferencia
    And veo un mensaje indicando que se registrará un movimiento por el monto equivalente a esa diferencia

  Scenario 10: Visualización del movimiento a generar por diferencia en apertura
    Given estoy viendo la apertura diaria
    And existe una diferencia en una o más cuentas
    When el sistema calcula la diferencia
    Then veo el detalle del movimiento que se generará por cada diferencia detectada
    And veo la cuenta afectada
    And veo el importe de la diferencia
    And veo el tipo de ajuste correspondiente
    And veo las acciones "Confirmar" y "Cancelar"

  Scenario 11: Visualización del movimiento a generar por diferencia en cierre
    Given estoy viendo el cierre diario
    And existe una diferencia en una o más cuentas
    When el sistema calcula la diferencia
    Then veo el detalle del movimiento que se generará por cada diferencia detectada
    And veo la cuenta afectada
    And veo el importe de la diferencia
    And veo el tipo de ajuste correspondiente
    And veo las acciones "Confirmar" y "Cancelar"

  Scenario 12: Confirmación de apertura con diferencias
    Given estoy viendo la apertura diaria
    And existe una diferencia en una o más cuentas
    And estoy viendo el detalle de los movimientos a generar
    When selecciono "Confirmar"
    Then el sistema registra la apertura de la jornada
    And genera los movimientos de ajuste correspondientes
    And asocia esos movimientos a la jornada abierta
    And registra el usuario responsable de la operación

  Scenario 13: Confirmación de cierre con diferencias
    Given estoy viendo el cierre diario
    And existe una diferencia en una o más cuentas
    And estoy viendo el detalle de los movimientos a generar
    When selecciono "Confirmar"
    Then el sistema registra el cierre de la jornada
    And genera los movimientos de ajuste correspondientes
    And asocia esos movimientos a la jornada del día
    And registra el usuario responsable de la operación

  Scenario 14: Cancelación de apertura con diferencias
    Given estoy viendo la apertura diaria
    And existe una diferencia en una o más cuentas
    And estoy viendo el detalle de los movimientos a generar
    When selecciono "Cancelar"
    Then la apertura no se confirma
    And no se genera ningún movimiento de ajuste

  Scenario 15: Cancelación de cierre con diferencias
    Given estoy viendo el cierre diario
    And existe una diferencia en una o más cuentas
    And estoy viendo el detalle de los movimientos a generar
    When selecciono "Cancelar"
    Then el cierre no se confirma
    And no se genera ningún movimiento de ajuste

  Scenario 16: No se puede abrir una nueva jornada si ya existe una abierta
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And ya existe una jornada abierta para el día actual
    When intento iniciar una nueva apertura diaria
    Then el sistema bloquea la acción
    And veo un mensaje indicando que ya existe una jornada abierta

  Scenario 17: No se puede cerrar una jornada inexistente
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existe una jornada abierta para el día actual
    When intento iniciar el cierre diario
    Then el sistema bloquea la acción
    And veo un mensaje indicando que no existe una jornada abierta

  Scenario 18: Apertura sin cuentas disponibles
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existe una jornada abierta para el día actual
    And no existen cuentas habilitadas para Secretaria
    When ingreso a la apertura diaria
    Then veo un estado vacío indicando que no hay cuentas disponibles
    And no puedo confirmar la apertura

  Scenario 19: Cierre sin cuentas disponibles
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    And no existen cuentas habilitadas para Secretaria
    When ingreso al cierre diario
    Then veo un estado vacío indicando que no hay cuentas disponibles
    And no puedo confirmar el cierre

  Scenario 20: Saldo editado obligatorio al confirmar apertura
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And estoy viendo la apertura diaria
    When dejo el saldo de una cuenta vacío e intento confirmar
    Then veo un mensaje indicando que el saldo es obligatorio
    And la apertura no se confirma

  Scenario 21: Saldo editado obligatorio al confirmar cierre
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And estoy viendo el cierre diario
    When dejo el saldo de una cuenta vacío e intento confirmar
    Then veo un mensaje indicando que el saldo es obligatorio
    And el cierre no se confirma

  Scenario 22: Saldo editado debe ser válido en apertura
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And estoy viendo la apertura diaria
    When ingreso un saldo inválido en una cuenta e intento confirmar
    Then veo un mensaje indicando que el saldo no es válido
    And la apertura no se confirma

  Scenario 23: Saldo editado debe ser válido en cierre
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And estoy viendo el cierre diario
    When ingreso un saldo inválido en una cuenta e intento confirmar
    Then veo un mensaje indicando que el saldo no es válido
    And el cierre no se confirma

  Scenario 24: Consistencia por club activo
    Given estoy autenticado
    And tengo rol "Secretaria" en más de un club
    When realizo la apertura o el cierre diario
    Then la operación aplica únicamente al club activo
    And solo considera las cuentas habilitadas de ese club
```

---

*Joaquin Fernandez Sinchi — Product Manager · A-CSPO | Buenos Aires, Argentina | Marzo 2026*