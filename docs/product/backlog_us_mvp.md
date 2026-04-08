# PRODUCT BACKLOG · MVP
## Club managment

User Stories con Acceptance Criteria en formato Gherkin — ordenadas por prioridad de desarrollo.

---

### E01 🔐 Autenticación y gestión de roles / US-01 — Iniciar sesión con Google

> *Como usuario, quiero iniciar sesión con mi cuenta de Google, para acceder al sistema del club sin crear una contraseña nueva.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-01 — Iniciar sesión con Google

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
    And veo identificado el club activo actual en el upper bar

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
    Then veo en el header el nombre del club activo
    And veo en el header el mensaje "Bienvenido/a <Nombre>, tu rol es <Rol>"
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

> *Como Secretaria del club, quiero realizar la apertura y cierre diario de movimientos, para registrar la operatoria del día, obtener saldos por cuenta y dejar trazabilidad de mi jornada laboral.*

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

> *Como Secretaria del club, quiero registrar movimientos diarios, para imputar correctamente ingresos y egresos en las cuentas del club durante una jornada abierta.*

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
    And veo el campo "Moneda"
    And veo el campo "Importe"
    And veo la acción "Crear"

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

  Scenario 12: Moneda obligatoria
    Given estoy viendo el formulario de registro de movimientos
    When intento guardar sin seleccionar la moneda
    Then veo un mensaje indicando que la moneda es obligatoria
    And el movimiento no se registra

  Scenario 13: Registro exitoso del movimiento
    Given estoy viendo el formulario de registro de movimientos
    And completé correctamente todos los campos obligatorios visibles
    When selecciono "Crear"
    Then el sistema registra el movimiento en el club activo
    And asocia el movimiento a la jornada abierta actual
    And impacta el saldo de la cuenta correspondiente
    And veo un mensaje de confirmación

  Scenario 14: Registro exitoso asociado a jornada y usuario responsable
    Given estoy viendo el formulario de registro de movimientos
    And existe una jornada abierta para el día actual
    And completé correctamente todos los campos obligatorios visibles
    When selecciono "Crear"
    Then el sistema persiste el movimiento vinculado a la jornada activa
    And registra la fecha y hora de creación
    And registra el usuario responsable de la carga

  Scenario 15: Borrar formulario
    Given estoy viendo el formulario de registro de movimientos
    And completé uno o más campos
    When selecciono "Borrar formulario"
    Then el formulario vuelve a su estado inicial
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
    And veo el listado de cuentas con su saldo acumulado actual

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
    And veo el saldo acumulado actualizado del día para cada cuenta

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

> *Como usuario operativo del club con rol Secretaría o Tesorería, quiero consultar el detalle de movimientos y saldos por cuenta, para controlar el estado de cada cuenta visible dentro del club activo.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-13 — Consulta detallada de movimientos y saldos por cuenta

  Scenario 01: Acceso al detalle desde la vista origen
    Given estoy autenticado
    And tengo rol "Secretaria" o "Tesorería" en el club activo
    And existen cuentas visibles para mi rol en el club activo
    When selecciono una cuenta o la acción de ver detalle desde mi vista origen
    Then accedo a la vista detallada de esa cuenta

  Scenario 02: Usuario sin rol habilitado no accede al detalle
    Given estoy autenticado
    And no tengo rol "Secretaria" ni "Tesorería" en el club activo
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
    And veo un mensaje indicando que se registrará un movimiento por el monto equivalente a esa diferencia con categoría = Ajuste

  Scenario 09: Edición de saldo en cierre detecta diferencia
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    And estoy viendo el cierre diario
    When edito el saldo de una cuenta
    Then el sistema detecta que existe una diferencia
    And veo un mensaje indicando que se registrará un movimiento por el monto equivalente a esa diferencia con categoría = Ajuste

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

### E03 💰 Tesorería / US-15 — Configuración de cuentas y categorías del club

> *Como Admin del club, quiero configurar las cuentas y categorías de tesorería del club activo, para definir los parámetros que utilizará Secretaria en la operatoria diaria.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-15 — Configuración de cuentas y categorías del club

  Scenario 01: Acceso a la configuración de tesorería desde Configuración del club
    Given estoy autenticado
    And soy admin del club activo
    When ingreso a "Configuración del club"
    Then veo la solapa "Tesorería"

  Scenario 02: Usuario no admin no accede a la configuración de tesorería
    Given estoy autenticado
    And no soy admin del club activo
    When intento acceder a la configuración de tesorería del club
    Then no tengo acceso a la funcionalidad

  Scenario 03: Visualización de configuración de cuentas
    Given estoy autenticado
    And soy admin del club activo
    And estoy en la solapa "Tesorería"
    When la pantalla carga
    Then veo el listado de cuentas del club activo
    And cada cuenta muestra nombre, tipo, estado, visibilidad y emoji

  Scenario 04: Visualización de configuración de categorías
    Given estoy autenticado
    And soy admin del club activo
    And estoy en la solapa "Tesorería"
    When la pantalla carga
    Then veo el listado de categorías del club activo
    And cada categoría muestra nombre, visibilidad por rol, estado y emoji

  Scenario 05: Alta de cuenta
    Given estoy autenticado
    And soy admin del club activo
    And estoy en la solapa "Tesorería"
    When selecciono crear una cuenta
    Then veo un formulario con los campos "Nombre", "Tipo", "Visibilidad", "Estado" y "Emoji"
    And el campo "Tipo" ofrece las opciones "Efectivo", "Bancaria" y "Billetera virtual"
    And el campo "Visibilidad" ofrece las opciones "Secretaria" y "Tesoreria"
    And el campo "Emoji" ofrece un listado simple de emojis predefinidos

  Scenario 06: Creación exitosa de cuenta
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de cuenta
    When completo un nombre válido
    And selecciono un tipo válido
    And defino su visibilidad por rol
    And selecciono un emoji del listado
    And defino su estado
    And confirmo la creación
    Then el sistema registra la cuenta en el club activo
    And la cuenta queda disponible según su configuración

  Scenario 07: Nombre de cuenta obligatorio
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de cuenta
    When intento guardar sin completar el nombre
    Then veo un mensaje indicando que el nombre es obligatorio
    And la cuenta no se registra

  Scenario 08: Tipo de cuenta obligatorio
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de cuenta
    When intento guardar sin seleccionar el tipo
    Then veo un mensaje indicando que el tipo es obligatorio
    And la cuenta no se registra

  Scenario 09: La cuenta debe tener al menos una visibilidad
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de cuenta
    When intento guardar sin seleccionar ninguna visibilidad
    Then veo un mensaje indicando que debo seleccionar al menos una visibilidad
    And la cuenta no se registra

  Scenario 10: No se permite duplicar cuentas activas con el mismo nombre en el club activo
    Given estoy autenticado
    And soy admin del club activo
    And ya existe una cuenta activa con un nombre determinado en el club activo
    When intento crear otra cuenta con ese mismo nombre
    Then el sistema bloquea la acción
    And veo un mensaje indicando que la cuenta ya existe

  Scenario 11: Alta de categoría
    Given estoy autenticado
    And soy admin del club activo
    And estoy en la solapa "Tesorería"
    When selecciono crear una categoría
    Then veo un formulario con los campos "Nombre", "Visibilidad", "Estado" y "Emoji"
    And el campo "Nombre" permite seleccionar o cargar una categoría para el club
    And el campo "Visibilidad" ofrece las opciones "Secretaria" y "Tesoreria"
    And el campo "Emoji" ofrece un listado simple de emojis predefinidos

  Scenario 12: Creación exitosa de categoría
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de categoría
    When completo un nombre válido
    And defino su visibilidad por rol
    And selecciono un emoji del listado
    And defino su estado
    And confirmo la creación
    Then el sistema registra la categoría en el club activo
    And la categoría queda disponible según su configuración

  Scenario 13: Nombre de categoría obligatorio
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de categoría
    When intento guardar sin completar el nombre
    Then veo un mensaje indicando que el nombre es obligatorio
    And la categoría no se registra

  Scenario 14: No se permite duplicar categorías activas con el mismo nombre en el club activo
    Given estoy autenticado
    And soy admin del club activo
    And ya existe una categoría activa con un nombre determinado en el club activo
    When intento crear otra categoría con ese mismo nombre
    Then el sistema bloquea la acción
    And veo un mensaje indicando que la categoría ya existe

  Scenario 15: Edición de cuenta
    Given estoy autenticado
    And soy admin del club activo
    And existe una cuenta en el club activo
    When edito su nombre, tipo, visibilidad, estado o emoji
    Then el sistema actualiza la cuenta
    And los cambios aplican solo al club activo

  Scenario 16: Edición de categoría
    Given estoy autenticado
    And soy admin del club activo
    And existe una categoría en el club activo
    When edito su nombre, visibilidad por rol, estado o emoji
    Then el sistema actualiza la categoría
    And los cambios aplican solo al club activo

  Scenario 17: Cuenta inactiva no aparece para Secretaria
    Given existe una cuenta inactiva en el club activo
    When Secretaria accede a apertura, cierre o registro de movimientos
    Then esa cuenta no aparece entre las opciones disponibles

  Scenario 18: Cuenta sin visibilidad para Secretaria no aparece en su operatoria
    Given existe una cuenta activa en el club activo
    And la cuenta no está marcada como visible para Secretaria
    When Secretaria accede a apertura, cierre o registro de movimientos
    Then esa cuenta no aparece entre las opciones disponibles

  Scenario 19: Categoría inactiva no aparece para Secretaria
    Given existe una categoría inactiva en el club activo
    When Secretaria accede al registro de movimientos
    Then esa categoría no aparece entre las opciones disponibles

  Scenario 20: Categoría no visible para Secretaria no aparece en su operatoria
    Given existe una categoría activa en el club activo
    And la categoría no está marcada como visible para Secretaria
    When Secretaria accede al registro de movimientos
    Then esa categoría no aparece entre las opciones disponibles

  Scenario 21: Inicialización desde template
    Given estoy autenticado
    And soy admin del club activo
    And el club aún no tiene configuración de tesorería
    When ingreso a la solapa "Tesorería"
    Then puedo iniciar la configuración a partir de un template base del sistema

  Scenario 22: Template crea configuración editable
    Given estoy autenticado
    And soy admin del club activo
    And seleccioné un template base
    When confirmo su aplicación
    Then el sistema crea cuentas iniciales con los tipos "Efectivo", "Bancaria" y "Billetera virtual"
    And el sistema crea categorías iniciales del template base
    And esas configuraciones pueden editarse, activarse o desactivarse posteriormente

  Scenario 23: Template base de categorías del sistema
    Given estoy autenticado
    And soy admin del club activo
    When consulto el template base de categorías
    Then veo las categorías "Alquileres", "Cuotas", "Eventos", "Fichajes", "Impuestos", "Indumentaria", "Inversiones", "Ligas/Jornadas", "Mantenimiento", "Obra", "Otros", "Préstamo", "Servicios", "Sponsor", "Subsidios", "Sueldos", "Utilería" y "Ajuste"

  Scenario 23: Consistencia por club activo
    Given estoy autenticado
    And soy admin en más de un club
    When creo, edito o desactivo cuentas o categorías
    Then la configuración aplica únicamente al club activo
    And no afecta la configuración de otros clubes
```

---

### E03 💰 Tesorería / US-16 — Configuración de campos adicionales del formulario de movimientos

Historia retirada. El formulario manual mantiene `Actividad`, `Recibo` y `Calendario` como campos opcionales fijos y ya no existe configuración por categoría para estos campos.

---

### E03 💰 Tesorería / US-17 — Vinculación de movimientos con recibos del sistema de socios

> *Como Secretaria del club, quiero asociar un movimiento a un número de recibo del sistema de socios, para vincular correctamente el ingreso o egreso con su comprobante correspondiente.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-17 — Vinculación de movimientos con recibos del sistema de socios

  Scenario 01: Visualización del campo Recibo según configuración
    Given tengo rol "Secretaria" en el club activo
    And existe una configuración que hace visible el campo "Recibo" para una categoría
    When selecciono una categoría que requiere recibo en el formulario de movimientos
    Then veo el campo "Recibo"

  Scenario 02: Campo Recibo no visible cuando no aplica
    Given tengo rol "Secretaria" en el club activo
    And no existe una configuración que haga visible el campo "Recibo" para una categoría
    When selecciono una categoría que no requiere recibo en el formulario de movimientos
    Then no veo el campo "Recibo"

  Scenario 03: Campo Recibo obligatorio según configuración
    Given tengo rol "Secretaria" en el club activo
    And existe una configuración que hace obligatorio el campo "Recibo" para una categoría
    When selecciono una categoría que requiere recibo
    And intento guardar el movimiento sin completar el campo "Recibo"
    Then veo un mensaje indicando que el recibo es obligatorio
    And el movimiento no se registra

  Scenario 04: Registro exitoso con número de recibo
    Given tengo rol "Secretaria" en el club activo
    And seleccioné una categoría que requiere recibo
    And completé correctamente todos los demás campos obligatorios
    When ingreso un número de recibo válido
    And guardo el movimiento
    Then el sistema registra el movimiento
    And guarda el número de recibo asociado al movimiento

  Scenario 05: Edición del número de recibo antes de guardar
    Given tengo rol "Secretaria" en el club activo
    And estoy completando un movimiento con campo "Recibo" visible
    When modifico el valor del número de recibo antes de guardar
    Then el sistema conserva el último valor ingresado

  Scenario 06: Recibo visible en el detalle del movimiento
    Given existe un movimiento registrado con número de recibo asociado
    When consulto el detalle del movimiento
    Then veo el número de recibo vinculado al movimiento

  Scenario 07: Consistencia por club activo
    Given tengo rol "Secretaria" en más de un club
    When registro un movimiento con número de recibo
    Then el recibo queda asociado únicamente al movimiento del club activo

  Scenario 08: Configuración por club del campo Recibo
    Given soy admin del club activo
    When configuro la visibilidad u obligatoriedad del campo "Recibo"
    Then la configuración aplica únicamente al club activo
    And no afecta a otros clubes
```

---

### E03 💰 Tesorería / US-18 — Configuración de formatos válidos para recibos

> *Como Admin del club, quiero configurar los formatos válidos del campo Recibo, para asegurar que Secretaria cargue referencias consistentes con los sistemas de socios utilizados por el club.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-18 — Configuración de formatos válidos para recibos

  Scenario 01: Acceso a la configuración de formatos de recibo
    Given estoy autenticado
    And soy admin del club activo
    And estoy en "Configuración del club"
    When ingreso a la solapa "Tesorería"
    Then veo una sección de configuración de formatos de recibo

  Scenario 02: Usuario no admin no accede a la configuración
    Given estoy autenticado
    And no soy admin del club activo
    When intento acceder a la configuración de formatos de recibo
    Then no tengo acceso a la funcionalidad

  Scenario 03: Visualización de integración predefinida
    Given estoy autenticado
    And soy admin del club activo
    When ingreso a la configuración de formatos de recibo
    Then veo la información de la integración de recibos del sistema de socios
    And se muestran como solo lectura los campos "Nombre del sistema de socios", "Ejemplo", "Patrón" y "Próximo recibo"

  Scenario 04: Visualización del formato fijo por defecto
    Given estoy autenticado
    And soy admin del club activo
    When ingreso a la configuración de formatos de recibo
    Then veo el ejemplo "PAY-SOC-26205"
    And veo el patrón "^PAY-SOC-[0-9]{5}$"
    And veo "Próximo recibo" con valor "PAY-SOC-10556"

  Scenario 05: La integración no se edita desde la UI
    Given estoy autenticado
    And soy admin del club activo
    When ingreso a la configuración de formatos de recibo
    Then no veo acciones para crear o editar formatos
    And la integración se muestra solo como referencia operativa

  Scenario 06: Recibo válido según formato predefinido
    Given existe la integración por defecto de recibos del sistema de socios
    And tengo rol "Secretaria" en el club activo
    When ingreso un recibo "PAY-SOC-10556"
    Then el sistema considera válido el recibo

  Scenario 07: Recibo válido con número superior al mínimo
    Given existe la integración por defecto de recibos del sistema de socios
    And tengo rol "Secretaria" en el club activo
    When ingreso un recibo "PAY-SOC-26205"
    Then el sistema considera válido el recibo

  Scenario 08: Recibo inválido por estar debajo del mínimo
    Given existe la integración por defecto de recibos del sistema de socios
    And tengo rol "Secretaria" en el club activo
    When ingreso un recibo "PAY-SOC-10555"
    Then el sistema muestra un mensaje indicando que el recibo no cumple un formato válido
    And el movimiento no se registra

  Scenario 09: Recibo inválido por no cumplir el patrón
    Given existe la integración por defecto de recibos del sistema de socios
    And tengo rol "Secretaria" en el club activo
    When ingreso un recibo con prefijo o estructura distinta a "PAY-SOC-<número de 5 dígitos>"
    Then el sistema muestra un mensaje indicando que el recibo no cumple un formato válido
    And el movimiento no se registra

  Scenario 10: Helper visible para Secretaria con formato y recibos disponibles
    Given existe la integración por defecto de recibos del sistema de socios
    And tengo rol "Secretaria" en el club activo
    When veo el campo "Recibo" en el formulario de movimientos
    Then veo ayuda contextual con el patrón válido
    And veo el ejemplo "PAY-SOC-26205"
    And veo el texto "Disponibles desde PAY-SOC-10556"
```

---

### E03 💰 Tesorería / US-19 — Vinculación de movimientos con actividad del club

> *Como Secretaria del club, quiero asociar un movimiento a una actividad del club, para identificar a qué disciplina corresponde el ingreso o egreso.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-19 — Vinculación de movimientos con actividad del club

  Scenario 01: Visualización del campo Actividad según configuración
    Given tengo rol "Secretaria" en el club activo
    And existe una configuración que hace visible el campo "Actividad" para una categoría
    When selecciono una categoría que requiere actividad en el formulario de movimientos
    Then veo el campo "Actividad"

  Scenario 02: Campo Actividad no visible cuando no aplica
    Given tengo rol "Secretaria" en el club activo
    And no existe una configuración que haga visible el campo "Actividad" para una categoría
    When selecciono una categoría que no requiere actividad en el formulario de movimientos
    Then no veo el campo "Actividad"

  Scenario 03: Campo Actividad obligatorio según configuración
    Given tengo rol "Secretaria" en el club activo
    And existe una configuración que hace obligatorio el campo "Actividad" para una categoría
    When selecciono una categoría que requiere actividad
    And intento guardar el movimiento sin seleccionar una actividad
    Then veo un mensaje indicando que la actividad es obligatoria
    And el movimiento no se registra

  Scenario 04: Selección de actividad desde catálogo del club
    Given tengo rol "Secretaria" en el club activo
    And existen actividades configuradas en el club
    When veo el campo "Actividad"
    Then puedo seleccionar una actividad desde el listado disponible

  Scenario 05: Registro exitoso con actividad
    Given tengo rol "Secretaria" en el club activo
    And seleccioné una categoría que requiere actividad
    And completé correctamente todos los demás campos obligatorios
    When selecciono una actividad válida
    And guardo el movimiento
    Then el sistema registra el movimiento
    And guarda la actividad asociada al movimiento

  Scenario 06: Actividad visible en el detalle del movimiento
    Given existe un movimiento registrado con actividad asociada
    When consulto el detalle del movimiento
    Then veo la actividad vinculada al movimiento

  Scenario 07: Actividades inactivas no aparecen para Secretaria
    Given existe una actividad inactiva en el club activo
    When veo el campo "Actividad"
    Then esa actividad no aparece entre las opciones disponibles

  Scenario 08: Actividades visibles solo del club activo
    Given tengo rol "Secretaria" en más de un club
    When veo el campo "Actividad"
    Then solo veo actividades del club activo

  Scenario 09: Cambio de categoría actualiza visibilidad del campo
    Given estoy completando el formulario de movimientos
    And el campo "Actividad" está visible
    When cambio la categoría por una que no requiere actividad
    Then el campo "Actividad" deja de mostrarse
    And se limpia el valor previamente seleccionado

  Scenario 10: Consistencia por club activo
    Given tengo rol "Secretaria" en más de un club
    When registro un movimiento con actividad
    Then la actividad queda asociada únicamente al movimiento del club activo
```

---

### E03 💰 Tesorería / US-20 — Configuración de actividades del club

> *Como Admin del club, quiero configurar las actividades del club, para que Secretaria pueda asociar los movimientos a la disciplina correspondiente.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-20 — Configuración de actividades del club

  Scenario 01: Acceso a la configuración de actividades
    Given estoy autenticado
    And soy admin del club activo
    And estoy en "Configuración del club"
    When ingreso a la solapa "Tesorería"
    Then veo una sección de configuración de actividades

  Scenario 02: Usuario no admin no accede a la configuración
    Given estoy autenticado
    And no soy admin del club activo
    When intento acceder a la configuración de actividades
    Then no tengo acceso a la funcionalidad

  Scenario 03: Visualización de actividades configuradas
    Given estoy autenticado
    And soy admin del club activo
    And existen actividades configuradas en el club activo
    When ingreso a la configuración de actividades
    Then veo el listado de actividades del club activo
    And cada actividad muestra nombre, estado y emoji

  Scenario 04: Alta de actividad
    Given estoy autenticado
    And soy admin del club activo
    When selecciono crear una actividad
    Then veo un formulario con los campos "Nombre", "Estado" y "Emoji"
    And el campo "Emoji" ofrece un listado simple de emojis predefinidos

  Scenario 05: Creación exitosa de actividad
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de actividad
    When completo un nombre válido
    And selecciono un emoji del listado
    And defino su estado
    And confirmo la creación
    Then el sistema registra la actividad en el club activo
    And la actividad queda disponible según su configuración

  Scenario 06: Nombre de actividad obligatorio
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de actividad
    When intento guardar sin completar el nombre
    Then veo un mensaje indicando que el nombre es obligatorio
    And la actividad no se registra

  Scenario 07: No se permite duplicar actividades activas con el mismo nombre en el club activo
    Given estoy autenticado
    And soy admin del club activo
    And ya existe una actividad activa con un nombre determinado en el club activo
    When intento crear otra actividad con ese mismo nombre
    Then el sistema bloquea la acción
    And veo un mensaje indicando que la actividad ya existe

  Scenario 08: Edición de actividad
    Given estoy autenticado
    And soy admin del club activo
    And existe una actividad configurada en el club activo
    When edito su nombre, estado o emoji
    Then el sistema actualiza la actividad en el club activo

  Scenario 09: Actividad inactiva no aparece para Secretaria
    Given existe una actividad inactiva en el club activo
    When Secretaria accede al formulario de movimientos
    Then esa actividad no aparece entre las opciones disponibles

  Scenario 10: Actividad activa aparece para Secretaria cuando el campo aplica
    Given existe una actividad activa en el club activo
    And el campo "Actividad" está visible según la configuración del formulario
    When Secretaria accede al formulario de movimientos
    Then esa actividad aparece entre las opciones disponibles

  Scenario 11: Estado vacío sin actividades configuradas
    Given estoy autenticado
    And soy admin del club activo
    And no existen actividades configuradas
    When ingreso a la configuración de actividades
    Then veo un estado vacío indicando que no hay actividades disponibles

  Scenario 12: Consistencia por club activo
    Given estoy autenticado
    And soy admin en más de un club
    When creo, edito o desactivo actividades
    Then la configuración aplica únicamente al club activo
    And no afecta la configuración de otros clubes
```

---

### E03 💰 Tesorería / US-21 — Vinculación de movimientos con eventos de calendario

> *Como Secretaria del club, quiero asociar un movimiento a un evento del calendario, para imputar correctamente ingresos y egresos a una actividad puntual del club.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-21 — Vinculación de movimientos con eventos de calendario

  Scenario 01: Visualización del campo Calendario según configuración
    Given tengo rol "Secretaria" en el club activo
    And existe una configuración que hace visible el campo "Calendario" para una categoría
    When selecciono una categoría que requiere calendario en el formulario de movimientos
    Then veo el campo "Calendario"

  Scenario 02: Campo Calendario no visible cuando no aplica
    Given tengo rol "Secretaria" en el club activo
    And no existe una configuración que haga visible el campo "Calendario" para una categoría
    When selecciono una categoría que no requiere calendario en el formulario de movimientos
    Then no veo el campo "Calendario"

  Scenario 03: Campo Calendario obligatorio según configuración
    Given tengo rol "Secretaria" en el club activo
    And existe una configuración que hace obligatorio el campo "Calendario" para una categoría
    When selecciono una categoría que requiere calendario
    And intento guardar el movimiento sin seleccionar un evento
    Then veo un mensaje indicando que el calendario es obligatorio
    And el movimiento no se registra

  Scenario 04: Selección de evento desde el calendario del club
    Given tengo rol "Secretaria" en el club activo
    And existen eventos de calendario en el club activo
    When veo el campo "Calendario"
    Then puedo seleccionar un evento desde el listado disponible

  Scenario 05: Registro exitoso con evento de calendario
    Given tengo rol "Secretaria" en el club activo
    And seleccioné una categoría que requiere calendario
    And completé correctamente todos los demás campos obligatorios
    When selecciono un evento válido del calendario
    And guardo el movimiento
    Then el sistema registra el movimiento
    And guarda el evento asociado al movimiento

  Scenario 06: Evento visible en el detalle del movimiento
    Given existe un movimiento registrado con un evento asociado
    When consulto el detalle del movimiento
    Then veo el evento de calendario vinculado al movimiento

  Scenario 07: Solo se muestran eventos del club activo
    Given tengo rol "Secretaria" en más de un club
    When veo el campo "Calendario"
    Then solo veo eventos del calendario del club activo

  Scenario 08: Cambio de categoría actualiza visibilidad del campo Calendario
    Given estoy completando el formulario de movimientos
    And el campo "Calendario" está visible
    When cambio la categoría por una que no requiere calendario
    Then el campo "Calendario" deja de mostrarse
    And se limpia el valor previamente seleccionado

  Scenario 09: Estado vacío sin eventos disponibles
    Given tengo rol "Secretaria" en el club activo
    And el campo "Calendario" está visible
    And no existen eventos disponibles en el club activo
    When veo el formulario de movimientos
    Then veo el campo "Calendario" sin opciones seleccionables
    And veo un mensaje indicando que no hay eventos disponibles

  Scenario 10: Consistencia por club activo
    Given tengo rol "Secretaria" en más de un club
    When registro un movimiento con evento de calendario
    Then el evento queda asociado únicamente al movimiento del club activo
```

---

### E03 💰 Tesorería / US-22 — Disponibilización de eventos sincronizados para imputación de movimientos

> *Como Admin del club, quiero utilizar los eventos sincronizados desde Google Calendar para que Secretaria pueda imputar movimientos a eventos reales del club.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-22 — Disponibilización de eventos sincronizados para imputación de movimientos

  Scenario 01: Acceso a la configuración de eventos para tesorería
    Given estoy autenticado
    And soy admin del club activo
    And estoy en "Configuración del club"
    When ingreso a la solapa "Tesorería"
    Then veo una sección de eventos disponibles para imputación

  Scenario 02: Usuario no admin no accede a la configuración
    Given estoy autenticado
    And no soy admin del club activo
    When intento acceder a la configuración de eventos para imputación
    Then no tengo acceso a la funcionalidad

  Scenario 03: Visualización de eventos sincronizados
    Given estoy autenticado
    And soy admin del club activo
    And existen eventos sincronizados desde Google Calendar para el club activo
    When ingreso a la configuración de eventos para imputación
    Then veo el listado de eventos sincronizados
    And cada evento muestra al menos título y fecha

  Scenario 04: Estado vacío sin eventos sincronizados
    Given estoy autenticado
    And soy admin del club activo
    And no existen eventos sincronizados para el club activo
    When ingreso a la configuración de eventos para imputación
    Then veo un estado vacío indicando que no hay eventos disponibles

  Scenario 05: Disponibilización de evento para tesorería
    Given estoy autenticado
    And soy admin del club activo
    And existe un evento sincronizado
    When marco el evento como disponible para imputación
    Then el evento queda habilitado para ser seleccionado por Secretaria en el formulario de movimientos

  Scenario 06: Evento no habilitado no aparece para Secretaria
    Given existe un evento sincronizado en el club activo
    And el evento no está habilitado para imputación
    When Secretaria visualiza el campo "Calendario" en el formulario de movimientos
    Then ese evento no aparece entre las opciones disponibles

  Scenario 07: Evento habilitado aparece para Secretaria
    Given existe un evento sincronizado en el club activo
    And el evento está habilitado para imputación
    When Secretaria visualiza el campo "Calendario" en el formulario de movimientos
    Then ese evento aparece entre las opciones disponibles

  Scenario 08: Actualización de eventos sincronizados
    Given existe un evento previamente sincronizado desde Google Calendar
    When la información del evento se actualiza en la fuente sincronizada
    Then la información visible para imputación refleja la última versión disponible

  Scenario 09: Solo se consideran eventos del club activo
    Given estoy autenticado
    And soy admin en más de un club
    When ingreso a la configuración de eventos para imputación
    Then solo veo eventos sincronizados del club activo

  Scenario 10: Consistencia por club activo
    Given estoy autenticado
    And soy admin en más de un club
    When habilito o deshabilito eventos para imputación
    Then la configuración aplica únicamente al club activo
    And no afecta eventos de otros clubes
```

---

### E03 💰 Tesorería / US-23 — Configuración de monedas disponibles para tesorería

> *Como equipo de producto, queremos que Tesorería opere con un catálogo fijo de monedas `ARS` y `USD`, para evitar una configuración global por club y delegar la selección al alta de cada cuenta.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-23 — Configuración de monedas disponibles para tesorería

  Scenario 01: No existe configuración global de monedas
    Given estoy autenticado
    And soy admin del club activo
    And estoy en "Configuración del club"
    When ingreso a la solapa "Tesorería"
    Then no veo una sección de configuración global de monedas

  Scenario 02: Catálogo fijo del MVP
    Given estoy autenticado
    And soy admin del club activo
    When ingreso a la configuración de cuentas de Tesorería
    Then las monedas operativas disponibles son "ARS" y "USD"
    And "EUR" no aparece como opción operativa

  Scenario 03: La moneda se define por cuenta
    Given estoy autenticado
    And soy admin del club activo
    When creo o edito una cuenta
    Then debo seleccionar "ARS", "USD" o ambas para esa cuenta

  Scenario 04: Secretaría no usa moneda principal por defecto
    And tengo rol "Secretaria" en el club activo
    When accedo al formulario de registro de movimientos
    Then el campo "Moneda" no aparece precargado por configuración global del club
    And las opciones válidas quedan determinadas por la cuenta seleccionada
```

---

### E03 💰 Tesorería / US-24 — Configuración de tipos de movimiento fijos del sistema

> *Como usuario con acceso a la configuración de tesorería, quiero visualizar los tipos de movimiento fijos del sistema, para entender qué opciones usa Secretaria en los movimientos manuales.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-24 — Visualización de tipos de movimiento fijos del sistema

  Scenario 01: Acceso a la configuración de tipos de movimiento
    Given estoy autenticado
    And tengo acceso a la configuración de tesorería del club activo
    And estoy en "Configuración del club"
    When ingreso a la solapa "Tesorería"
    Then veo una sección de configuración de tipos de movimiento

  Scenario 02: Usuario sin acceso a tesorería no accede a la configuración
    Given estoy autenticado
    And no tengo acceso a la configuración de tesorería del club activo
    When intento acceder a la configuración de tipos de movimiento
    Then no tengo acceso a la funcionalidad

  Scenario 03: Visualización del listado fijo del sistema
    Given estoy autenticado
    And tengo acceso a la configuración de tesorería del club activo
    When ingreso a la configuración de tipos de movimiento
    Then veo el listado fijo del sistema con las opciones "Ingreso" y "Egreso"
    And no veo controles de edición para esos tipos

  Scenario 04: La sección es de solo lectura
    Given estoy autenticado
    And tengo acceso a la configuración de tesorería del club activo
    And estoy en la configuración de tipos de movimiento
    Then no veo checkboxes, switches ni botón de guardado

  Scenario 05: Secretaria ve siempre los tipos fijos del sistema
    Given tengo rol "Secretaria" en el club activo
    When accedo al formulario de registro de movimientos
    Then en el campo "Tipo" veo las opciones "Ingreso" y "Egreso"

  Scenario 06: Impacto del tipo en el saldo
    Given tengo rol "Secretaria" en el club activo
    And existe una jornada abierta
    When registro un movimiento de tipo "Ingreso"
    Then el sistema suma el importe al saldo de la cuenta correspondiente
    When registro un movimiento de tipo "Egreso"
    Then el sistema resta el importe al saldo de la cuenta correspondiente

  Scenario 07: El importe siempre se carga como valor positivo
    Given tengo rol "Secretaria" en el club activo
    When registro un movimiento
    Then el campo "Importe" espera un valor mayor a cero
    And el impacto en el saldo se determina por el tipo de movimiento seleccionado

  Scenario 08: Backend rechaza tipos invalidos
    Given tengo rol "Secretaria" en el club activo
    And existe una jornada abierta
    When envio manualmente un tipo distinto de "Ingreso" o "Egreso"
    Then el sistema rechaza la operación
    And no se crea el movimiento
```

---

### E03 💰 Tesorería / US-25 — Registro de transferencias entre cuentas

> *Como Secretaria del club, quiero registrar transferencias entre cuentas de la misma moneda, para reflejar correctamente traspasos internos sin cargar movimientos duplicados manualmente.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-25 — Registro de transferencias entre cuentas

  Scenario 01: Secretaria ve la opción con jornada abierta
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    When ingreso al módulo de tesorería
    Then veo la opción para registrar transferencias entre cuentas

  Scenario 02: Usuario sin rol Secretaria no ve la opción
    Given estoy autenticado
    And no tengo rol "Secretaria" en el club activo
    When ingreso al módulo de tesorería
    Then no veo la opción para registrar transferencias entre cuentas

  Scenario 03: No se muestra la opción sin jornada abierta
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existe una jornada abierta para el día actual
    When ingreso al módulo de tesorería
    Then no veo la opción para registrar transferencias entre cuentas

  Scenario 04: Campos visibles al iniciar la carga
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    When abro el formulario de transferencia entre cuentas
    Then veo el campo "Fecha" completo por defecto y no editable
    And veo el campo "Cuenta origen"
    And veo el campo "Cuenta destino"
    And veo el campo "Moneda"
    And veo el campo "Importe"
    And veo el campo "Concepto"
    And veo la acción "Crear"

  Scenario 05: Cuenta origen obligatoria
    Given estoy viendo el formulario de transferencia
    When intento guardar sin seleccionar una cuenta origen
    Then veo un mensaje indicando que la cuenta origen es obligatoria
    And la transferencia no se registra

  Scenario 06: Cuenta destino obligatoria
    Given estoy viendo el formulario de transferencia
    When intento guardar sin seleccionar una cuenta destino
    Then veo un mensaje indicando que la cuenta destino es obligatoria
    And la transferencia no se registra

  Scenario 07: Cuenta origen y destino deben ser distintas
    Given estoy viendo el formulario de transferencia
    When selecciono la misma cuenta como origen y destino
    And intento guardar
    Then veo un mensaje indicando que las cuentas deben ser distintas
    And la transferencia no se registra

  Scenario 08: Moneda obligatoria
    Given estoy viendo el formulario de transferencia
    When intento guardar sin seleccionar una moneda
    Then veo un mensaje indicando que la moneda es obligatoria
    And la transferencia no se registra

  Scenario 09: Importe obligatorio y mayor a cero
    Given estoy viendo el formulario de transferencia
    When intento guardar sin completar el importe
    Then veo un mensaje indicando que el importe es obligatorio
    And la transferencia no se registra
    When ingreso un importe igual a cero o negativo
    Then veo un mensaje indicando que el importe debe ser mayor a cero
    And la transferencia no se registra

  Scenario 10: Solo se permiten cuentas del club activo
    Given tengo rol "Secretaria" en más de un club
    When abro el formulario de transferencia
    Then solo puedo seleccionar cuentas del club activo

  Scenario 11: La moneda debe ser compatible con ambas cuentas
    Given estoy viendo el formulario de transferencia
    When selecciono una moneda que no es compatible con la cuenta origen o la cuenta destino
    And intento guardar
    Then veo un mensaje indicando que la moneda no es válida para las cuentas seleccionadas
    And la transferencia no se registra

  Scenario 12: Registro exitoso de transferencia
    Given estoy viendo el formulario de transferencia
    And completé correctamente todos los campos obligatorios
    When selecciono "Crear"
    Then el sistema registra una transferencia interna en el club activo
    And genera automáticamente un movimiento de egreso en la cuenta origen
    And genera automáticamente un movimiento de ingreso en la cuenta destino
    And ambos movimientos quedan asociados a la misma transferencia
    And ambos movimientos quedan asociados a la jornada abierta actual
    And veo un mensaje de confirmación

  Scenario 13: Ambos movimientos comparten trazabilidad común
    Given registré exitosamente una transferencia entre cuentas
    When consulto el detalle de los movimientos generados
    Then ambos movimientos comparten la misma referencia de transferencia
    And comparten la misma fecha
    And comparten el mismo usuario responsable
    And comparten el mismo concepto

  Scenario 14: La transferencia impacta correctamente en los saldos
    Given registré exitosamente una transferencia entre cuentas
    When el sistema actualiza los saldos
    Then resta el importe en la cuenta origen
    And suma el mismo importe en la cuenta destino

  Scenario 15: La transferencia no debe contarse como ingreso o egreso externo del club
    Given registré exitosamente una transferencia entre cuentas
    When consulto reportes o agregados contables del día
    Then la operación queda identificada como transferencia interna
    And no se contabiliza como ingreso externo ni egreso externo del club

  Scenario 16: Confirmación y reseteo del formulario
    Given registré exitosamente una transferencia entre cuentas
    When el sistema confirma el registro
    Then veo un mensaje de éxito
    And el formulario vuelve a quedar listo para cargar una nueva transferencia
    And conserva la fecha cargada por defecto

  Scenario 17: Consistencia por club activo
    Given tengo rol "Secretaria" en más de un club
    When registro una transferencia entre cuentas
    Then la transferencia se registra únicamente en el club activo
    And no impacta cuentas ni jornadas de otros clubes
```

---

### E03 💰 Tesorería / US-26 — Registro de compra y venta de moneda extranjera

> *Como Secretaria del club, quiero registrar operaciones de compra y venta de moneda entre cuentas de distinta moneda, para reflejar correctamente conversiones de fondos y su impacto en los saldos del club.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-26 — Registro de compra y venta de moneda extranjera

  Scenario 01: Secretaria ve la opción con jornada abierta
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    When ingreso al módulo de tesorería
    Then veo la opción para registrar compra o venta de moneda

  Scenario 02: Usuario sin rol Secretaria no ve la opción
    Given estoy autenticado
    And no tengo rol "Secretaria" en el club activo
    When ingreso al módulo de tesorería
    Then no veo la opción para registrar compra o venta de moneda

  Scenario 03: No se muestra la opción sin jornada abierta
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And no existe una jornada abierta para el día actual
    When ingreso al módulo de tesorería
    Then no veo la opción para registrar compra o venta de moneda

  Scenario 04: Campos visibles al iniciar la carga
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    When abro el formulario de compra o venta de moneda
    Then veo el campo "Fecha" completo por defecto y no editable
    And veo el campo "Operación"
    And veo el campo "Cuenta origen"
    And veo el campo "Moneda origen"
    And veo el campo "Importe origen"
    And veo el campo "Cuenta destino"
    And veo el campo "Moneda destino"
    And veo el campo "Importe destino"
    And veo el campo "Concepto"
    And veo la acción "Crear"

  Scenario 05: Operación obligatoria
    Given estoy viendo el formulario de compra o venta de moneda
    When intento guardar sin seleccionar la operación
    Then veo un mensaje indicando que la operación es obligatoria
    And la operación no se registra

  Scenario 06: Cuenta origen y destino obligatorias
    Given estoy viendo el formulario de compra o venta de moneda
    When intento guardar sin seleccionar una cuenta origen o una cuenta destino
    Then veo un mensaje indicando que ambas cuentas son obligatorias
    And la operación no se registra

  Scenario 07: Cuenta origen y destino deben ser distintas
    Given estoy viendo el formulario de compra o venta de moneda
    When selecciono la misma cuenta como origen y destino
    And intento guardar
    Then veo un mensaje indicando que las cuentas deben ser distintas
    And la operación no se registra

  Scenario 08: Moneda origen y moneda destino obligatorias
    Given estoy viendo el formulario de compra o venta de moneda
    When intento guardar sin completar la moneda origen o la moneda destino
    Then veo un mensaje indicando que ambas monedas son obligatorias
    And la operación no se registra

  Scenario 09: Las monedas deben ser distintas
    Given estoy viendo el formulario de compra o venta de moneda
    When selecciono la misma moneda como origen y destino
    And intento guardar
    Then veo un mensaje indicando que las monedas deben ser distintas
    And la operación no se registra

  Scenario 10: Importes obligatorios y mayores a cero
    Given estoy viendo el formulario de compra o venta de moneda
    When intento guardar sin completar el importe origen o el importe destino
    Then veo un mensaje indicando que ambos importes son obligatorios
    And la operación no se registra
    When ingreso un importe origen o destino igual a cero o negativo
    Then veo un mensaje indicando que los importes deben ser mayores a cero
    And la operación no se registra

  Scenario 11: Compatibilidad entre cuentas y monedas
    Given estoy viendo el formulario de compra o venta de moneda
    When selecciono una moneda que no es compatible con la cuenta origen o la cuenta destino
    And intento guardar
    Then veo un mensaje indicando que la moneda no es válida para la cuenta seleccionada
    And la operación no se registra

  Scenario 12: Registro exitoso de compra o venta de moneda
    Given estoy viendo el formulario de compra o venta de moneda
    And completé correctamente todos los campos obligatorios
    When selecciono "Crear"
    Then el sistema registra una operación de cambio de moneda en el club activo
    And genera automáticamente un movimiento de egreso en la cuenta origen por el importe origen
    And genera automáticamente un movimiento de ingreso en la cuenta destino por el importe destino
    And ambos movimientos quedan asociados a la misma operación
    And ambos movimientos quedan asociados a la jornada abierta actual
    And veo un mensaje de confirmación

  Scenario 13: La operación registra tipo de cambio implícito
    Given registré exitosamente una compra o venta de moneda
    When consulto el detalle de la operación
    Then veo el importe origen
    And veo el importe destino
    And el sistema puede derivar el tipo de cambio implícito de la operación

  Scenario 14: Ambos movimientos comparten trazabilidad común
    Given registré exitosamente una compra o venta de moneda
    When consulto el detalle de los movimientos generados
    Then ambos movimientos comparten la misma referencia de operación
    And comparten la misma fecha
    And comparten el mismo usuario responsable
    And comparten el mismo concepto

  Scenario 15: La operación impacta correctamente en los saldos
    Given registré exitosamente una compra o venta de moneda
    When el sistema actualiza los saldos
    Then resta el importe origen en la cuenta origen
    And suma el importe destino en la cuenta destino

  Scenario 16: La operación no debe contarse como ingreso o egreso externo del club
    Given registré exitosamente una compra o venta de moneda
    When consulto reportes o agregados contables del día
    Then la operación queda identificada como conversión interna de moneda
    And no se contabiliza como ingreso externo ni egreso externo del club

  Scenario 17: Confirmación y reseteo del formulario
    Given registré exitosamente una compra o venta de moneda
    When el sistema confirma el registro
    Then veo un mensaje de éxito
    And el formulario vuelve a quedar listo para cargar una nueva operación
    And conserva la fecha cargada por defecto

  Scenario 18: Consistencia por club activo
    Given tengo rol "Secretaria" en más de un club
    When registro una compra o venta de moneda
    Then la operación se registra únicamente en el club activo
    And no impacta cuentas ni jornadas de otros clubes
```

---

### E03 💰 Tesorería / US-30 — Dashboard de Tesorería para consulta de saldos de cuentas

> *Como usuario con rol Tesorería, quiero ver en el dashboard los saldos de mis cuentas visibles, para consultar rápidamente el estado de las cuentas del club y registrar movimientos sin usar la operatoria de Secretaría.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-30 — Dashboard de Tesorería para consulta de saldos de cuentas

  Scenario 01: Acceso al dashboard de Tesorería
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    When ingreso a "/dashboard"
    Then veo la card de Tesorería
    And veo las cuentas visibles para Tesorería en el club activo

  Scenario 02: Usuario sin rol Tesorería no ve la card de Tesorería
    Given estoy autenticado
    And no tengo rol "Tesorería" en el club activo
    When ingreso a "/dashboard"
    Then no veo la card de Tesorería

  Scenario 03: Tesorería no ve controles de jornada
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    When ingreso a "/dashboard"
    Then no veo el bloque de estado de jornada
    And no veo acciones de apertura o cierre

  Scenario 04: Visualización de saldos por cuenta y moneda
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    And existen cuentas visibles para Tesorería con saldos registrados
    When ingreso al dashboard
    Then veo cada cuenta visible para Tesorería
    And veo el saldo de cada moneda habilitada por separado

  Scenario 05: Estado vacío sin cuentas visibles para Tesorería
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    And no existen cuentas visibles para Tesorería
    When ingreso al dashboard
    Then veo un estado vacío indicando que no hay cuentas visibles para Tesorería

  Scenario 06: Acceso al detalle desde el dashboard
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    And existen cuentas visibles para Tesorería
    When selecciono "Ver detalle" en una cuenta
    Then accedo al detalle de esa cuenta dentro del club activo

  Scenario 07: Formulario inline de movimientos para Tesorería
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    When ingreso al dashboard
    Then veo un formulario inline para registrar movimientos de Tesorería
    And no necesito abrir jornada para usarlo
```

---

### E03 💰 Tesorería / US-27 — Registro de movimientos de Tesorería en cuentas propias

> *Como usuario con rol Tesorería, quiero registrar movimientos en las cuentas de Tesorería del club, para reflejar la operatoria financiera en cuentas distintas a las utilizadas por Secretaria.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-27 — Registro de movimientos de Tesorería en cuentas propias

  Scenario 01: Tesorería ve la opción de registrar movimientos
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    When ingreso al módulo de tesorería
    Then veo la opción para registrar movimientos de Tesorería

  Scenario 02: Usuario sin rol Tesorería no ve la opción
    Given estoy autenticado
    And no tengo rol "Tesorería" en el club activo
    When ingreso al módulo de tesorería
    Then no veo la opción para registrar movimientos de Tesorería

  Scenario 03: Tesorería solo ve cuentas habilitadas para su rol
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    And existen cuentas con visibilidad para Tesorería
    When abro el formulario de registro de movimientos
    Then veo únicamente las cuentas habilitadas para Tesorería
    And no veo las cuentas sin visibilidad para Tesorería

  Scenario 04: Campos visibles al iniciar la carga
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    When abro el formulario de registro de movimientos de Tesorería
    Then veo el campo "Fecha" completo por defecto y editable
    And veo el campo "Cuenta"
    And veo el campo "Tipo"
    And veo el campo "Categoría"
    And veo el campo "Concepto"
    And veo el campo "Moneda"
    And veo el campo "Importe"
    And veo la acción "Crear"

  Scenario 05: Cuenta obligatoria
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    When intento guardar sin seleccionar una cuenta
    Then veo un mensaje indicando que la cuenta es obligatoria
    And el movimiento no se registra

  Scenario 06: Tipo obligatorio
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    When intento guardar sin completar el tipo
    Then veo un mensaje indicando que el tipo es obligatorio
    And el movimiento no se registra

  Scenario 07: Categoría obligatoria
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    When intento guardar sin completar la categoría
    Then veo un mensaje indicando que la categoría es obligatoria
    And el movimiento no se registra

  Scenario 08: Moneda obligatoria
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    When intento guardar sin seleccionar la moneda
    Then veo un mensaje indicando que la moneda es obligatoria
    And el movimiento no se registra

  Scenario 09: Importe obligatorio y mayor a cero
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    When intento guardar sin completar el importe
    Then veo un mensaje indicando que el importe es obligatorio
    And el movimiento no se registra
    When ingreso un importe igual a cero o negativo
    Then veo un mensaje indicando que el importe debe ser mayor a cero
    And el movimiento no se registra

  Scenario 10: Cuenta bimonetaria permite seleccionar ARS o USD
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    And seleccioné una cuenta bimonetaria
    When visualizo el campo "Moneda"
    Then puedo seleccionar una de las monedas habilitadas para esa cuenta
    And las opciones incluyen "ARS" y "USD" si ambas están configuradas

  Scenario 11: Cuenta no compatible con la moneda seleccionada
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    And seleccioné una cuenta
    When selecciono una moneda no habilitada para esa cuenta
    And intento guardar
    Then veo un mensaje indicando que la moneda no es válida para la cuenta seleccionada
    And el movimiento no se registra

  Scenario 12: Registro exitoso en cuenta bimonetaria
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    And seleccioné una cuenta bimonetaria
    And seleccioné una moneda válida para esa cuenta
    And completé correctamente todos los demás campos obligatorios
    When selecciono "Crear"
    Then el sistema registra el movimiento en el club activo
    And impacta el saldo de la cuenta en la moneda seleccionada
    And no modifica el saldo de la otra moneda de esa misma cuenta
    And veo un mensaje de confirmación

  Scenario 13: Registro exitoso con usuario responsable
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    And completé correctamente todos los campos obligatorios visibles
    When selecciono "Crear"
    Then el sistema registra la fecha y hora de creación
    And registra el usuario responsable de la carga

  Scenario 14: Visualización separada de saldos por moneda en una cuenta bimonetaria
    Given existe una cuenta bimonetaria con saldo en ARS y saldo en USD
    When consulto el saldo de esa cuenta
    Then veo el saldo de ARS por separado
    And veo el saldo de USD por separado

  Scenario 15: Borrar formulario
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    And completé uno o más campos
    When selecciono "Borrar formulario"
    Then el formulario vuelve a su estado inicial
    And conserva la fecha cargada por defecto

  Scenario 16: Confirmación y reseteo del formulario después de un registro exitoso
    Given registré exitosamente un movimiento de Tesorería
    When el sistema confirma el registro
    Then veo un mensaje de éxito
    And el formulario vuelve a quedar listo para cargar un nuevo movimiento
    And conserva la fecha cargada por defecto

  Scenario 17: Consistencia por club activo
    Given tengo rol "Tesorería" en más de un club
    When registro un movimiento
    Then el movimiento se registra únicamente en el club activo
    And no impacta cuentas de otros clubes
```

---

### E03 💰 Tesorería / US-27 — Registro de movimientos de Tesorería en cuentas propias

> *Como usuario con rol Tesorería, quiero registrar movimientos en las cuentas de Tesorería del club, para reflejar la operatoria financiera en cuentas distintas a las utilizadas por Secretaria.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-27 — Registro de movimientos de Tesorería en cuentas propias

  Scenario 01: Tesorería ve la opción de registrar movimientos
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    When ingreso al módulo de tesorería
    Then veo la opción para registrar movimientos de Tesorería

  Scenario 02: Usuario sin rol Tesorería no ve la opción
    Given estoy autenticado
    And no tengo rol "Tesorería" en el club activo
    When ingreso al módulo de tesorería
    Then no veo la opción para registrar movimientos de Tesorería

  Scenario 03: Tesorería solo ve cuentas habilitadas para su rol
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    And existen cuentas con visibilidad para Tesorería
    When abro el formulario de registro de movimientos
    Then veo únicamente las cuentas habilitadas para Tesorería
    And no veo las cuentas sin visibilidad para Tesorería

  Scenario 04: Campos visibles al iniciar la carga
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    When abro el formulario de registro de movimientos de Tesorería
    Then veo el campo "Fecha" completo por defecto y editable
    And veo el campo "Cuenta"
    And veo el campo "Tipo"
    And veo el campo "Categoría"
    And veo el campo "Concepto"
    And veo el campo "Moneda"
    And veo el campo "Importe"
    And veo la acción "Crear"

  Scenario 05: Cuenta obligatoria
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    When intento guardar sin seleccionar una cuenta
    Then veo un mensaje indicando que la cuenta es obligatoria
    And el movimiento no se registra

  Scenario 06: Tipo obligatorio
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    When intento guardar sin completar el tipo
    Then veo un mensaje indicando que el tipo es obligatorio
    And el movimiento no se registra

  Scenario 07: Categoría obligatoria
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    When intento guardar sin completar la categoría
    Then veo un mensaje indicando que la categoría es obligatoria
    And el movimiento no se registra

  Scenario 08: Moneda obligatoria
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    When intento guardar sin seleccionar la moneda
    Then veo un mensaje indicando que la moneda es obligatoria
    And el movimiento no se registra

  Scenario 09: Importe obligatorio y mayor a cero
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    When intento guardar sin completar el importe
    Then veo un mensaje indicando que el importe es obligatorio
    And el movimiento no se registra
    When ingreso un importe igual a cero o negativo
    Then veo un mensaje indicando que el importe debe ser mayor a cero
    And el movimiento no se registra

  Scenario 10: Cuenta bimonetaria permite seleccionar ARS o USD
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    And seleccioné una cuenta bimonetaria
    When visualizo el campo "Moneda"
    Then puedo seleccionar una de las monedas habilitadas para esa cuenta
    And las opciones incluyen "ARS" y "USD" si ambas están configuradas

  Scenario 11: Cuenta no compatible con la moneda seleccionada
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    And seleccioné una cuenta
    When selecciono una moneda no habilitada para esa cuenta
    And intento guardar
    Then veo un mensaje indicando que la moneda no es válida para la cuenta seleccionada
    And el movimiento no se registra

  Scenario 12: Registro exitoso en cuenta bimonetaria
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    And seleccioné una cuenta bimonetaria
    And seleccioné una moneda válida para esa cuenta
    And completé correctamente todos los demás campos obligatorios
    When selecciono "Crear"
    Then el sistema registra el movimiento en el club activo
    And impacta el saldo de la cuenta en la moneda seleccionada
    And no modifica el saldo de la otra moneda de esa misma cuenta
    And veo un mensaje de confirmación

  Scenario 13: Registro exitoso con usuario responsable
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    And completé correctamente todos los campos obligatorios visibles
    When selecciono "Crear"
    Then el sistema registra la fecha y hora de creación
    And registra el usuario responsable de la carga

  Scenario 14: Visualización separada de saldos por moneda en una cuenta bimonetaria
    Given existe una cuenta bimonetaria con saldo en ARS y saldo en USD
    When consulto el saldo de esa cuenta
    Then veo el saldo de ARS por separado
    And veo el saldo de USD por separado

  Scenario 15: Borrar formulario
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    And completé uno o más campos
    When selecciono "Borrar formulario"
    Then el formulario vuelve a su estado inicial
    And conserva la fecha cargada por defecto

  Scenario 16: Confirmación y reseteo del formulario después de un registro exitoso
    Given registré exitosamente un movimiento de Tesorería
    When el sistema confirma el registro
    Then veo un mensaje de éxito
    And el formulario vuelve a quedar listo para cargar un nuevo movimiento
    And conserva la fecha cargada por defecto

  Scenario 17: Consistencia por club activo
    Given tengo rol "Tesorería" en más de un club
    When registro un movimiento
    Then el movimiento se registra únicamente en el club activo
    And no impacta cuentas de otros clubes
```

---

### E03 💰 Tesorería / US-28 — Configuración de cuentas de Tesorería y monedas habilitadas por cuenta

> *Como Admin del club, quiero configurar las cuentas de Tesorería y las monedas habilitadas para cada una, para definir correctamente la operatoria financiera del club.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-28 — Configuración de cuentas de Tesorería y monedas habilitadas por cuenta

  Scenario 01: Acceso a la configuración de cuentas de Tesorería
    Given estoy autenticado
    And soy admin del club activo
    And estoy en "Configuración del club"
    When ingreso a la solapa "Tesorería"
    Then veo una sección de configuración de cuentas de Tesorería

  Scenario 02: Usuario no admin no accede a la configuración
    Given estoy autenticado
    And no soy admin del club activo
    When intento acceder a la configuración de cuentas de Tesorería
    Then no tengo acceso a la funcionalidad

  Scenario 03: Visualización de cuentas de Tesorería configuradas
    Given estoy autenticado
    And soy admin del club activo
    And existen cuentas de Tesorería configuradas
    When ingreso a la configuración de cuentas de Tesorería
    Then veo el listado de cuentas de Tesorería del club activo
    And cada cuenta muestra nombre, estado, emoji y monedas habilitadas

  Scenario 04: Alta de cuenta de Tesorería
    Given estoy autenticado
    And soy admin del club activo
    When selecciono crear una cuenta de Tesorería
    Then veo un formulario con los campos "Nombre", "Estado", "Emoji" y "Monedas habilitadas"
    And el campo "Emoji" ofrece un listado simple de emojis predefinidos

  Scenario 05: Nombre de cuenta obligatorio
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de cuenta de Tesorería
    When intento guardar sin completar el nombre
    Then veo un mensaje indicando que el nombre es obligatorio
    And la cuenta no se registra

  Scenario 06: Al menos una moneda debe estar habilitada
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de cuenta de Tesorería
    When intento guardar sin seleccionar ninguna moneda
    Then veo un mensaje indicando que debo habilitar al menos una moneda
    And la cuenta no se registra
    And el CTA de guardado permanece deshabilitado hasta seleccionar al menos una moneda

  Scenario 07: Creación exitosa de cuenta monomonetaria
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de cuenta de Tesorería
    When completo un nombre válido
    And selecciono un emoji del listado
    And selecciono una sola moneda habilitada
    And defino su estado
    And confirmo la creación
    Then el sistema registra la cuenta en el club activo
    And la cuenta queda disponible para operar en esa moneda

  Scenario 08: Creación exitosa de cuenta bimonetaria
    Given estoy autenticado
    And soy admin del club activo
    And estoy viendo el formulario de cuenta de Tesorería
    When completo un nombre válido
    And selecciono un emoji del listado
    And selecciono más de una moneda habilitada
    And defino su estado
    And confirmo la creación
    Then el sistema registra la cuenta en el club activo
    And la cuenta queda disponible para operar en todas las monedas configuradas

  Scenario 09: No se permite duplicar cuentas activas con el mismo nombre en el club activo
    Given estoy autenticado
    And soy admin del club activo
    And ya existe una cuenta de Tesorería activa con un nombre determinado
    When intento crear otra cuenta con ese mismo nombre
    Then el sistema bloquea la acción
    And veo un mensaje indicando que la cuenta ya existe

  Scenario 10: Edición de cuenta de Tesorería
    Given estoy autenticado
    And soy admin del club activo
    And existe una cuenta de Tesorería configurada
    When edito su nombre, estado, emoji o monedas habilitadas
    Then el sistema actualiza la cuenta en el club activo

  Scenario 10B: No se puede editar una cuenta y dejarla sin monedas
    Given estoy autenticado
    And soy admin del club activo
    And existe una cuenta de Tesorería configurada
    When desmarco todas las monedas habilitadas
    Then veo un mensaje indicando que debo habilitar al menos una moneda
    And la cuenta no se actualiza
    And el CTA de guardado permanece deshabilitado hasta seleccionar al menos una moneda

  Scenario 11: Cuenta inactiva no aparece para Tesorería
    Given existe una cuenta de Tesorería inactiva en el club activo
    When un usuario con rol "Tesorería" accede al formulario de movimientos
    Then esa cuenta no aparece entre las opciones disponibles

  Scenario 12: Cuenta activa aparece para Tesorería
    Given existe una cuenta de Tesorería activa en el club activo
    When un usuario con rol "Tesorería" accede al formulario de movimientos
    Then esa cuenta aparece entre las opciones disponibles

  Scenario 13: Las monedas habilitadas determinan las opciones del formulario
    Given existe una cuenta de Tesorería activa con monedas habilitadas
    When un usuario con rol "Tesorería" selecciona esa cuenta en el formulario de movimientos
    Then en el campo "Moneda" veo únicamente las monedas habilitadas para esa cuenta

  Scenario 14: Cuenta monomonetaria muestra una sola moneda posible
    Given existe una cuenta de Tesorería activa con una única moneda habilitada
    When un usuario con rol "Tesorería" selecciona esa cuenta en el formulario de movimientos
    Then en el campo "Moneda" veo únicamente esa moneda

  Scenario 15: Cuenta bimonetaria muestra múltiples monedas posibles
    Given existe una cuenta de Tesorería activa con más de una moneda habilitada
    When un usuario con rol "Tesorería" selecciona esa cuenta en el formulario de movimientos
    Then en el campo "Moneda" veo todas las monedas habilitadas para esa cuenta

  Scenario 16: Visualización separada de saldos por moneda
    Given existe una cuenta de Tesorería con más de una moneda habilitada
    And la cuenta tiene saldo registrado en más de una moneda
    When consulto el detalle de esa cuenta
    Then veo el saldo de cada moneda por separado

  Scenario 17: Estado vacío sin cuentas de Tesorería configuradas
    Given estoy autenticado
    And soy admin del club activo
    And no existen cuentas de Tesorería configuradas
    When ingreso a la configuración de cuentas de Tesorería
    Then veo un estado vacío indicando que no hay cuentas disponibles

  Scenario 18: Consistencia por club activo
    Given estoy autenticado
    And soy admin en más de un club
    When creo, edito o desactivo cuentas de Tesorería
    Then la configuración aplica únicamente al club activo
    And no afecta la configuración de otros clubes
```

---

### E03 💰 Tesorería / US-29 — Consolidación diaria de movimientos de Secretaría en Tesorería

> *Como usuario con rol Tesorería, quiero revisar y consolidar diariamente los movimientos cargados por Secretaría, para incorporarlos correctamente a Tesorería, corregir imputaciones si es necesario e integrar coincidencias con trazabilidad completa.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-29 — Consolidación diaria de movimientos de Secretaría en Tesorería

  Scenario 01: Acceso a la consolidación diaria
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    When ingreso a la sección de consolidación
    Then puedo seleccionar una fecha para revisar y consolidar

  Scenario 02: Usuario sin rol Tesorería no accede
    Given estoy autenticado
    And no tengo rol "Tesorería" en el club activo
    When intento acceder a la sección de consolidación
    Then no tengo acceso a la funcionalidad

  Scenario 03: Visualización de movimientos pendientes del día seleccionado
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    And seleccioné una fecha
    And existen movimientos cargados por Secretaría en esa fecha pendientes de consolidación
    When ingreso a la vista de consolidación diaria
    Then veo el listado de movimientos pendientes de consolidación del día seleccionado

  Scenario 04: Estado vacío sin movimientos del día
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    And seleccioné una fecha
    And no existen movimientos cargados por Secretaría para esa fecha
    When ingreso a la vista de consolidación diaria
    Then veo un mensaje indicando que no hay movimientos para consolidar

  Scenario 05: Visualización de información clave en el listado
    Given estoy en la vista de consolidación diaria
    Then cada movimiento muestra fecha, cuenta, tipo, categoría, concepto, moneda, importe y usuario que lo cargó

  Scenario 06: Estado inicial pendiente de consolidación
    Given existe un movimiento cargado por Secretaría
    When el movimiento es visible en Tesorería para la fecha seleccionada
    Then su estado es "pendiente de consolidación"

  Scenario 07: Visualización del detalle del movimiento
    Given estoy en la vista de consolidación diaria
    When selecciono un movimiento
    Then puedo ver el detalle completo del movimiento

  Scenario 08: Edición de imputaciones antes de consolidar el día
    Given estoy revisando un movimiento pendiente de consolidación
    When modifico cuenta, tipo, categoría, concepto, moneda o importe
    And guardo los cambios
    Then el sistema actualiza el movimiento
    And registra el cambio en el historial

  Scenario 09: Detección automática de posible coincidencia
    Given existe un movimiento pendiente de consolidación
    And existe un movimiento en Tesorería con misma cuenta, moneda e importe
    When visualizo el movimiento pendiente
    Then el sistema indica que existe un posible movimiento coincidente

  Scenario 10: Visualización comparativa para decisión
    Given existe un posible movimiento coincidente
    When selecciono ver detalle
    Then veo la información del movimiento de Secretaría
    And veo la información del movimiento de Tesorería
    And puedo compararlos

  Scenario 11: Integración de movimientos coincidentes antes de consolidar el día
    Given existe un movimiento pendiente de consolidación
    And existe un movimiento coincidente en Tesorería
    When selecciono "Integrar"
    Then el sistema unifica ambos movimientos en uno solo
    And evita duplicar el impacto en los saldos
    And el estado del movimiento pasa a "integrado"

  Scenario 12: La integración no modifica saldos duplicadamente
    Given existe un movimiento coincidente en Tesorería
    And integro el movimiento pendiente
    When el sistema procesa la integración
    Then el saldo permanece con un único impacto contable

  Scenario 13: No se permite consolidar el día con movimientos inválidos
    Given existen movimientos del día con datos incompletos o inválidos
    When intento consolidar el día
    Then el sistema bloquea la acción
    And muestra cuáles movimientos deben corregirse

  Scenario 14: Consolidación completa del día
    Given todos los movimientos del día son válidos o ya fueron integrados
    When selecciono "Consolidar día"
    Then el sistema incorpora a Tesorería todos los movimientos pendientes del día
    And actualiza los saldos correspondientes
    And los movimientos pendientes pasan a estado "consolidado"
    And los movimientos integrados mantienen estado "integrado"

  Scenario 15: Eliminación de pendientes tras consolidación diaria
    Given un día fue consolidado
    When vuelvo a consultar la vista de consolidación para esa fecha
    Then no veo movimientos pendientes de consolidación para ese día

  Scenario 16: Historial completo del movimiento
    Given un movimiento fue editado, integrado o consolidado
    When consulto su historial
    Then veo la imputación original cargada por Secretaría
    And veo las modificaciones realizadas
    And veo la acción final realizada
    And veo fecha, hora y usuario responsable de cada acción

  Scenario 17: Registro de la consolidación diaria
    Given consolidé una fecha
    When finaliza el proceso
    Then el sistema registra la consolidación diaria
    And guarda la fecha consolidada
    And guarda la fecha y hora de ejecución
    And guarda el usuario responsable

  Scenario 18: Un día no puede consolidarse dos veces
    Given una fecha ya fue consolidada
    When intento consolidarla nuevamente
    Then el sistema bloquea la acción
    And muestra un mensaje indicando que esa fecha ya fue consolidada

  Scenario 19: Fallo al consolidar el día
    Given estoy consolidando una fecha
    When ocurre un error interno en el proceso
    Then ningún movimiento cambia de estado
    And todos permanecen en estado "pendiente de consolidación" o "integrado" según corresponda
    And no se pierde información
    And el sistema registra el error
    And informa al usuario

  Scenario 20: Consistencia por club activo
    Given tengo rol "Tesorería" en más de un club
    When reviso, edito, integro o consolido movimientos de una fecha
    Then las acciones aplican únicamente a movimientos del club activo
    And no afectan movimientos de otros clubes

  Scenario 21: Fecha por defecto en la consolidación diaria
    Given estoy autenticado
    And tengo rol "Tesorería" en el club activo
    When ingreso a la sección de consolidación
    Then el sistema propone por defecto la fecha del día anterior
    And la fecha puede ser modificada manualmente por el usuario
```

---

*Joaquin Fernandez Sinchi — Product Manager · A-CSPO | Buenos Aires, Argentina | Marzo 2026*
