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

  Scenario 03: Menú del avatar para usuario con permisos de configuración
    Given estoy autenticado
    And tengo permisos para acceder a la configuración del club activo
    When toco mi avatar
    Then se despliega un menú con la opción "Cerrar sesión"

  Scenario 04: Acceso a configuración del club
    Given estoy autenticado
    And tengo permisos para acceder a la configuración del club activo
    When selecciono la tab "Configuración" del upper bar
    Then soy redirigido a la página de configuración del club

  Scenario 05: Intento de acceso a configuración sin permisos
    Given estoy autenticado
    And no tengo permisos para acceder a la configuración del club activo
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
    When accedo a la configuración del club desde la tab "Configuración" del upper bar
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

  Scenario 08: Cierre automático de jornada vencida por cambio de día
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta del día anterior para el club activo
    When el sistema resuelve la operatoria luego del cambio de día
    Then la jornada anterior se cierra automáticamente con los saldos actuales
    And queda registrada la fecha y hora de cierre
    And la nueva fecha no hereda una jornada abierta

  Scenario 09: No se pueden registrar movimientos fuera de una jornada abierta
    Given no existe una jornada abierta para el día actual
    When intento registrar un movimiento
    Then el sistema bloquea la acción
    And veo un mensaje indicando que debo abrir la jornada

  Scenario 10: Registro de horario laboral implícito
    Given realizo la apertura y cierre de jornada
    When la jornada queda cerrada
    Then el sistema registra el rango horario trabajado
    And ese registro queda asociado a mi usuario y al club activo

  Scenario 11: Consistencia por club activo
    Given estoy autenticado
    And tengo rol "Secretaria" en distintos clubes
    When realizo apertura o cierre de jornada
    Then la operación aplica únicamente al club activo
    And no afecta la información de otros clubes

  Scenario 12: Navegación con feedback hacia una pantalla operativa
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And veo una CTA que redirige a una pantalla de apertura o cierre diario
    When selecciono la CTA
    Then visualizo un loader bloqueante hasta que cargue la nueva página
    And no puedo interactuar con la pantalla actual durante la redirección
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

  Scenario 12A: Egreso con saldo insuficiente
    Given estoy viendo el formulario de registro de movimientos
    And seleccioné un movimiento de tipo "Egreso"
    And la cuenta no tiene saldo suficiente en la moneda seleccionada
    When intento guardar un importe mayor al saldo disponible
    Then veo un mensaje indicando que la cuenta no tiene saldo suficiente
    And el movimiento no se registra

  Scenario 13: Registro exitoso del movimiento
    Given estoy viendo el formulario de registro de movimientos
    And completé correctamente todos los campos obligatorios visibles
    When selecciono "Crear"
    Then el sistema registra el movimiento en el club activo
    And asocia el movimiento a la jornada abierta actual
    And impacta el saldo de la cuenta correspondiente
    And veo un toast de confirmacion

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

  Scenario 16: Estado transitorio luego de crear un movimiento
    Given tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    And estoy viendo el formulario de registro de movimientos
    And completé correctamente todos los campos obligatorios visibles
    When selecciono "Crear"
    Then el modal se cierra inmediatamente
    And la pantalla queda bloqueada con un loader visible
    And no puedo interactuar con el dashboard mientras la creación sigue pendiente

  Scenario 17: Resolución exitosa luego del loader
    Given tengo rol "Secretaria" en el club activo
    And seleccioné "Crear" en un formulario válido de registro de movimientos
    And la pantalla está bloqueada con un loader
    When finaliza la creación del movimiento
    Then deja de mostrarse el loader
    And veo un toast de confirmacion

  Scenario 18: Edición de movimientos durante jornada abierta
    Given tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    And existen movimientos visibles cargados en esa jornada
    When visualizo el dashboard
    Then todos los movimientos de la jornada abierta son editables

  Scenario 19: Campos editables de un movimiento en jornada abierta
    Given tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    And selecciono editar un movimiento visible de la jornada
    When visualizo el formulario de edición
    Then puedo editar todos los campos operativos del movimiento
    And no puedo editar el ID visible del movimiento
    And no puedo editar la fecha del movimiento

  Scenario 20: Edición rechazada si deja saldo negativo
    Given tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    And selecciono editar un movimiento visible de la jornada
    And la edición propuesta deja saldo negativo en la cuenta y moneda afectadas
    When intento guardar los cambios
    Then veo un mensaje indicando que la cuenta no tiene saldo suficiente
    And la edición no se registra

  Scenario 21: Edición sin acción de borrar formulario
    Given tengo rol "Secretaria" en el club activo
    And existe una jornada abierta para el día actual
    And selecciono editar un movimiento visible de la jornada
    When visualizo el formulario de edición
    Then no veo la acción "Borrar formulario"
    And solo dispongo de la acción "Guardar cambios" para confirmar la edición
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
    And veo el listado de cuentas con su saldo acumulado historico actual

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
    And veo el saldo acumulado historico actualizado para cada cuenta

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

  Scenario 09A: Confirmación de cierre con un único loader visible
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta
    And estoy confirmando el cierre de jornada
    When selecciono "Confirmar cierre"
    Then visualizo un único loader visible durante el submit
    And no se muestran indicadores duplicados del mismo estado pending

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

  Scenario 14: Navegación con feedback desde la card operativa
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And veo una CTA de navegación en la card operativa
    When selecciono la CTA
    Then visualizo un loader bloqueante hasta que cargue la nueva página
    And no puedo interactuar con la pantalla actual durante la redirección

  Scenario 15: CTA de edición sobre movimientos visibles
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existe una jornada abierta
    And veo movimientos en la card operativa
    When visualizo la card de movimientos
    Then cada movimiento expone una acción para editarlo

  Scenario 16: Mensaje específico en card de acciones con jornada cerrada
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And la jornada del día ya fue abierta y luego cerrada
    When ingreso al dashboard
    Then la card de acciones muestra el mensaje "La jornada ya fue cerrada. No se encuentra disponible para carga de movimientos."
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
    Then veo el historial completo de movimientos visibles para esa cuenta
    And cada movimiento muestra fecha y hora
    And cada movimiento muestra concepto
    And cada movimiento muestra categoría
    And cada movimiento muestra tipo
    And cada movimiento muestra importe
    And cada movimiento muestra usuario responsable

  Scenario 05: Agrupación y orden cronológico de movimientos
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existen múltiples movimientos en la cuenta en distintas fechas
    When visualizo el detalle de la cuenta
    Then veo los movimientos agrupados por fecha
    And veo primero las fechas más recientes
    And dentro de cada fecha los movimientos aparecen de más recientes a más antiguos

  Scenario 06: Visualización sin movimientos
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And accedí al detalle de una cuenta sin movimientos visibles en su historial
    When la vista carga
    Then veo el saldo actual de la cuenta
    And veo un estado vacío indicando que no hay movimientos registrados para esa cuenta

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

  Scenario 10: No se muestra acción de registrar movimiento en el detalle de cuenta
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    When accedo al detalle de una cuenta
    Then no veo la acción "Registrar movimiento"

  Scenario 11: Cambio entre cuentas
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And existen múltiples cuentas configuradas
    When selecciono otra cuenta para consultar
    Then veo el saldo y los movimientos correspondientes a la nueva cuenta seleccionada

  Scenario 12: CTA para volver al dashboard visible en el encabezado
    Given estoy autenticado
    And tengo rol "Secretaria" en el club activo
    And accedí al detalle de una cuenta
    When visualizo la vista
    Then veo una acción para volver al dashboard
    And la acción se encuentra antes del historial de movimientos

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

  Scenario 03: Visualización de configuración bootstrap del sistema de socios
    Given estoy autenticado
    And soy admin del club activo
    When ingreso a la configuración de formatos de recibo
    Then veo la configuración del sistema de socios del club activo
    And la configuración existe aunque antes no hubiera un registro persistido

  Scenario 04: Configuración inicial por defecto
    Given estoy autenticado
    And soy admin del club activo
    When ingreso a la configuración de formatos de recibo
    Then veo el ejemplo "PAY-SOC-26205"
    And veo el patrón "^PAY-SOC-[0-9]{5}$"
    And la visibilidad inicial del sistema queda en estado "Oculta"

  Scenario 05: La integración se edita desde la UI
    Given estoy autenticado
    And soy admin del club activo
    When ingreso a la configuración de formatos de recibo
    Then veo acciones para editar el sistema de socios
    And puedo cambiar nombre, tipo y visibilidad

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
    And veo el campo obligatorio "Cuenta origen"
    And veo el campo obligatorio "Cuenta destino"
    And en "Cuenta origen" solo se listan cuentas visibles para mi rol
    And en "Cuenta destino" solo se listan cuentas visibles para otros roles y no visibles para mi rol
    And veo el campo obligatorio "Moneda"
    And veo el campo obligatorio "Importe"
    And veo el campo obligatorio "Concepto"
    And veo la acción "Crear"

  Scenario 04A: Botón crear deshabilitado hasta completar obligatorios
    Given estoy viendo el formulario de transferencia
    When todavía no completé todos los campos obligatorios
    Then la acción "Crear" permanece deshabilitada

  Scenario 04B: Moneda por defecto según la cuenta origen
    Given estoy viendo el formulario de transferencia
    When selecciono una cuenta origen con moneda configurada
    Then el campo "Moneda" se completa automáticamente con la moneda por defecto de esa cuenta

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

  Scenario 10A: Cuenta destino excluye cuentas visibles para mi rol
    Given estoy viendo el formulario de transferencia
    And existe una cuenta visible para "Secretaria"
    When abro el selector de cuenta destino
    Then esa cuenta no se lista como opción disponible

  Scenario 10B: Cuenta destino incluye cuentas visibles para otros roles
    Given estoy viendo el formulario de transferencia
    And existe una cuenta visible para "Tesoreria" y no visible para "Secretaria"
    When abro el selector de cuenta destino
    Then esa cuenta se lista como opción disponible

  Scenario 11: La moneda debe ser compatible con ambas cuentas
    Given estoy viendo el formulario de transferencia
    When selecciono una moneda que no es compatible con la cuenta origen o la cuenta destino
    Then veo un mensaje inline en "Cuenta destino" indicando que la moneda no es válida para la cuenta destino
    And la acción "Crear" permanece deshabilitada
    And la transferencia no se registra

  Scenario 11A: El importe replica el comportamiento del formulario de movimientos
    Given estoy viendo el formulario de transferencia
    When completo el campo "Importe"
    Then el campo aplica el mismo saneamiento y restricciones de ingreso que el formulario "Registrar movimiento"

  Scenario 11B: La cuenta origen debe tener saldo suficiente
    Given estoy viendo el formulario de transferencia
    And la cuenta origen no tiene saldo suficiente en la moneda seleccionada
    When intento registrar una transferencia por un importe mayor al saldo disponible
    Then veo un mensaje indicando que la cuenta origen no tiene saldo suficiente
    And la transferencia no se registra

  Scenario 12: Registro exitoso de transferencia
    Given estoy viendo el formulario de transferencia
    And completé correctamente todos los campos obligatorios
    When selecciono "Crear"
    Then el modal se cierra
    And visualizo la pantalla bloqueada con un loader
    And el sistema registra una transferencia interna en el club activo
    And genera automáticamente un movimiento de egreso en la cuenta origen
    And genera automáticamente un movimiento de ingreso en la cuenta destino
    And ambos movimientos quedan asociados a la misma transferencia
    And ambos movimientos quedan asociados a la jornada abierta actual

  Scenario 12A: Resolución visual al finalizar la creación
    Given visualizo la pantalla bloqueada con un loader durante la creación de una transferencia
    When finaliza la creación y el dashboard refresca los datos
    Then desaparece el loader
    And veo un toast de confirmación

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

  Scenario 07: La misma cuenta puede usarse si las monedas son distintas
    Given estoy viendo el formulario de compra o venta de moneda
    When selecciono la misma cuenta como origen y destino
    And selecciono monedas distintas y válidas para esa cuenta
    And intento guardar
    Then la operación puede registrarse si el resto de los datos son válidos

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

  Scenario 11A: La cuenta origen debe tener saldo suficiente
    Given estoy viendo el formulario de compra o venta de moneda
    And la cuenta origen no tiene saldo suficiente en la moneda origen seleccionada
    When intento registrar una operación por un importe origen mayor al saldo disponible
    Then veo un mensaje indicando que la cuenta no tiene saldo suficiente
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

  Scenario 12b: Registro exitoso dentro de una misma cuenta bimonetaria
    Given estoy viendo el formulario de compra o venta de moneda
    And seleccioné la misma cuenta bimonetaria como origen y destino
    And seleccioné monedas distintas y válidas para esa cuenta
    And completé correctamente todos los campos obligatorios
    When selecciono "Crear"
    Then el sistema registra una operación de cambio de moneda en el club activo
    And genera automáticamente un movimiento de egreso y un movimiento de ingreso sobre la misma cuenta
    And cada movimiento impacta únicamente la moneda correspondiente
    And ambos movimientos quedan asociados a la misma operación
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

  Scenario 11A: Egreso con saldo insuficiente a la fecha elegida
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    And seleccioné una cuenta
    And seleccioné una fecha
    And seleccioné un movimiento de tipo "Egreso"
    And la cuenta no tiene saldo suficiente en la moneda seleccionada para esa fecha
    When intento guardar un importe mayor al saldo disponible
    Then veo un mensaje indicando que la cuenta no tiene saldo suficiente
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

  Scenario 11A: Egreso con saldo insuficiente a la fecha elegida
    Given estoy viendo el formulario de registro de movimientos de Tesorería
    And seleccioné una cuenta
    And seleccioné una fecha
    And seleccioné un movimiento de tipo "Egreso"
    And la cuenta no tiene saldo suficiente en la moneda seleccionada para esa fecha
    When intento guardar un importe mayor al saldo disponible
    Then veo un mensaje indicando que la cuenta no tiene saldo suficiente
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

### E05 🏛️ Identidad del Club / US-46 — Edición de datos de identidad del club

> *Como Admin del club, quiero editar los datos de identidad de mi club, para que figuren correctamente en reportes y comunicaciones oficiales.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-46 — Edición de datos de identidad del club

  Scenario 01: Acceso como Admin al formulario de identidad
    Given soy Admin del club activo
    When accedo a "Configuración del club"
    Then veo la solapa "Identidad" con el formulario precargado con los datos actuales del club

  Scenario 02: Acceso denegado a usuarios sin rol Admin
    Given no tengo rol Admin en el club activo
    When intento acceder a la pantalla de Identidad
    Then la solapa no se renderiza
    And no puedo acceder a la pantalla vía URL

  Scenario 03: Visualización completa del formulario
    Given estoy en la solapa "Identidad"
    Then veo los campos Nombre del club, CUIT, Tipo, Domicilio, Email de contacto y Teléfono
    And veo la sección del logo con el estado actual o placeholder
    And veo la sección de colores identificatorios primario y secundario (HEX opcional)
    And veo el selector de moneda del club

  Scenario 04: Edición exitosa de los datos
    Given modifiqué uno o más campos con valores válidos
    When presiono "Guardar cambios"
    Then los datos se persisten en el registro del club activo
    And veo un toast de éxito

  Scenario 05: Cancelar descarta los cambios
    Given modifiqué uno o más campos
    When presiono "Cancelar"
    Then los cambios se descartan sin pedir confirmación
    And el formulario vuelve a mostrar los datos originales

  Scenario 06: Nombre del club es obligatorio
    Given el campo Nombre del club está vacío
    When presiono "Guardar cambios"
    Then el sistema bloquea el submit
    And veo un error inline en el campo Nombre
    And los datos no se persisten

  Scenario 07: CUIT es obligatorio
    Given el campo CUIT está vacío
    When presiono "Guardar cambios"
    Then el sistema bloquea el submit
    And veo un error inline en el campo CUIT

  Scenario 08: Tipo es obligatorio
    Given el campo Tipo está vacío
    When presiono "Guardar cambios"
    Then el sistema bloquea el submit
    And veo un error inline en el campo Tipo

  Scenario 09: Domicilio es obligatorio
    Given el campo Domicilio está vacío
    When presiono "Guardar cambios"
    Then el sistema bloquea el submit
    And veo un error inline en el campo Domicilio

  Scenario 10: Email y Teléfono son obligatorios
    Given los campos Email o Teléfono están vacíos
    When presiono "Guardar cambios"
    Then el sistema bloquea el submit
    And veo errores inline en el o los campos vacíos

  Scenario 11: Error al guardar
    Given hay un fallo de red o de servidor al persistir los cambios
    When presiono "Guardar cambios"
    Then los datos no se modifican
    And veo un toast de error

  Scenario 12: Consistencia por club activo
    Given soy Admin de múltiples clubes
    When cambio el club activo en el selector del header
    And vuelvo a la pantalla de Identidad
    Then el formulario recarga los datos del nuevo club activo
```

---

### E05 🏛️ Identidad del Club / US-47 — Subir y reemplazar el logo del club

> *Como Admin del club, quiero subir y reemplazar el logo del club, para personalizar su identidad visual en la plataforma.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-47 — Subir y reemplazar el logo del club

  Scenario 01: Acceso a la carga de logo
    Given soy Admin del club activo
    When accedo a la sección Identidad
    Then veo la sección "Logo del club" con el estado actual

  Scenario 02: Visualización del estado actual
    Given el club tiene un logo cargado
    Then veo el logo vigente en la sección
    Given el club no tiene logo cargado
    Then veo un placeholder con las iniciales del club

  Scenario 03: Carga exitosa de logo nuevo
    Given selecciono un archivo PNG o SVG válido de mínimo 256x256 píxeles
    When el sistema procesa el archivo
    Then veo el preview del logo antes de confirmar

  Scenario 04: Confirmación del logo
    Given estoy viendo el preview del logo
    When confirmo la carga
    Then el archivo se sube a Supabase Storage optimizado
    And reemplaza el logo actual del club
    And veo un toast de éxito

  Scenario 05: Formato inválido bloqueado
    Given intento subir un archivo JPG, WebP u otro formato no permitido
    When el sistema valida el archivo
    Then se bloquea la carga
    And veo un toast de error indicando los formatos permitidos
    And el logo actual no se modifica

  Scenario 06: Tamaño inválido bloqueado
    Given intento subir un archivo menor a 256x256 píxeles
    When el sistema valida las dimensiones
    Then se bloquea la carga
    And veo un toast de error indicando el tamaño mínimo
    And el logo actual no se modifica

  Scenario 07: Fallo en la subida
    Given Supabase Storage no responde o falla la subida
    When el sistema intenta persistir el archivo
    Then la operación se revierte
    And el logo actual no se modifica
    And veo un toast de error

  Scenario 08: Reemplazo de logo existente
    Given el club ya tiene un logo cargado
    When subo un logo nuevo exitosamente
    Then el archivo anterior se elimina del bucket
    And la referencia se actualiza al nuevo archivo

  Scenario 09: Quitar logo
    Given el club tiene un logo cargado
    When presiono "Quitar logo" y guardo los cambios
    Then el campo logo_url queda en null
    And el archivo se elimina del bucket
    And el header de la app vuelve a mostrar las iniciales del club

  Scenario 10: Visualización del logo en contexto
    Given el club tiene un logo cargado
    Then el logo aparece renderizado en el header de la app
    And aparece en reportes exportables del club

  Scenario 11: Consistencia por club activo
    Given administro el logo desde el Club A activo
    Then las operaciones aplican únicamente al Club A
```

---

### E05 🏛️ Identidad del Club / US-48 — Validación del formato del CUIT

> *Como sistema, quiero validar el formato del CUIT al guardar los datos del club, para prevenir datos inválidos en reportes oficiales.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-48 — Validación del formato del CUIT

  Scenario 01: CUIT válido aceptado
    Given el Admin ingresa un CUIT con estructura XX-XXXXXXXX-X
    And el dígito verificador es válido según el algoritmo AFIP
    When el sistema valida el campo al submit
    Then el CUIT se acepta
    And el formulario procede a guardar

  Scenario 02: Estructura incorrecta del CUIT
    Given el Admin ingresa un CUIT con menos de 11 dígitos o mal formateado
    When el sistema valida el campo
    Then veo un error inline "Formato de CUIT inválido"
    And el submit se bloquea

  Scenario 03: Dígito verificador incorrecto
    Given el Admin ingresa 11 dígitos pero el dígito verificador no coincide
    When el sistema valida el campo con el algoritmo AFIP
    Then veo un error inline "CUIT no válido"
    And el submit se bloquea

  Scenario 04: Formateo automático al salir del campo
    Given el Admin ingresa 11 dígitos sin guiones
    When el foco sale del campo
    Then el sistema formatea el valor visual a XX-XXXXXXXX-X

  Scenario 05: Consistencia por club activo
    Given valido el CUIT para el club activo
    Then la validación aplica únicamente a los datos del club activo
```

---

### E05 🏛️ Identidad del Club / US-49 — Validación del formato del email y del teléfono

> *Como sistema, quiero validar el formato del email y del teléfono al guardar los datos del club, para garantizar comunicaciones efectivas.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-49 — Validación del formato del email y del teléfono

  Scenario 01: Email válido aceptado
    Given el Admin ingresa un email con estructura RFC válida
    When el sistema valida el campo
    Then el email se acepta
    And el formulario procede a guardar

  Scenario 02: Email con formato inválido
    Given el Admin ingresa un email sin "@", sin dominio o con caracteres no permitidos
    When el sistema valida el campo
    Then veo un error inline "Email inválido"
    And el submit se bloquea

  Scenario 03: Teléfono con código de país válido
    Given el Admin ingresa un teléfono con código de país en formato E.164 (ej. +54 221 425-8100)
    When el sistema valida el campo
    Then el teléfono se acepta
    And el formulario procede a guardar

  Scenario 04: Teléfono sin prefijo internacional
    Given el Admin ingresa un teléfono sin código de país
    When el sistema valida el campo
    Then veo un error inline "Teléfono debe incluir código de país (ej. +54)"
    And el submit se bloquea

  Scenario 05: Teléfono con caracteres inválidos
    Given el Admin ingresa letras o símbolos no permitidos en el teléfono
    When el sistema valida el campo
    Then veo un error inline "Formato de teléfono inválido"
    And el submit se bloquea

  Scenario 06: Consistencia por club activo
    Given valido el email y el teléfono para el club activo
    Then la validación aplica únicamente a los datos del club activo
```

---

### E05 🏛️ Identidad del Club / US-50 — Optimización del logo al subirlo

> *Como sistema, quiero optimizar el logo del club al subirlo a Supabase Storage, para minimizar tiempos de carga y consumo de ancho de banda.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-50 — Optimización del logo al subirlo

  Scenario 01: Optimización exitosa de PNG
    Given el Admin sube un logo PNG válido de peso original considerable
    When el sistema procesa el archivo
    Then se comprime a un peso reducido sin pérdida visible
    And se guarda en Supabase Storage bajo logos/{club_id}/
    And se actualiza la referencia en la tabla del club

  Scenario 02: Optimización exitosa de SVG
    Given el Admin sube un logo SVG válido
    When el sistema procesa el archivo
    Then se minifica eliminando metadata innecesaria
    And se guarda en Supabase Storage bajo logos/{club_id}/
    And se actualiza la referencia en la tabla del club

  Scenario 03: Fallo en la optimización
    Given el archivo no puede procesarse por error en el pipeline
    When el sistema intenta optimizarlo
    Then la operación se revierte
    And el logo actual no se modifica
    And se registra el error

  Scenario 04: Limpieza del logo anterior
    Given el club ya tenía un logo cargado
    When el nuevo logo se persiste exitosamente
    Then el archivo anterior se elimina del bucket

  Scenario 05: Referencia consistente en DB
    Given el logo se persiste exitosamente
    Then la URL del logo almacenada en la tabla del club apunta al archivo optimizado en Storage

  Scenario 06: Consistencia por club activo
    Given el Admin sube un logo para el Club A
    Then el archivo se guarda únicamente bajo logos/{club_A_id}/
    And no afecta logos de otros clubes
```

---

### E05 🏛️ Identidad del Club / US-51 — Aislamiento multitenant de la identidad del club

> *Como sistema, quiero garantizar que el Admin solo pueda editar los datos del club activo en su contexto, para preservar el aislamiento entre clubes en el entorno multitenant.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-51 — Aislamiento multitenant de la identidad del club

  Scenario 01: Scope correcto en lectura
    Given soy Admin con el Club A activo en mi contexto
    And app.current_club_id = Club A
    When accedo a la pantalla de Identidad del Club
    Then el formulario carga únicamente los datos del Club A

  Scenario 02: Scope correcto en escritura
    Given soy Admin con el Club A activo
    When guardo cambios en la identidad
    Then la operación UPDATE afecta solo al registro del Club A validado por app.current_club_id

  Scenario 03: Scope correcto en carga de logo
    Given soy Admin con el Club A activo
    When subo un logo nuevo
    Then el archivo se guarda en Storage bajo logos/{club_A_id}/
    And no afecta logos de otros clubes

  Scenario 04: Acceso denegado a usuarios sin rol Admin
    Given soy un usuario con rol distinto a Admin (Tesorero, Secretaría, Prensa, Comisión, Contador)
    When intento acceder a la pantalla de Identidad del Club
    Then la pantalla no se renderiza
    And soy redirigido al dashboard

  Scenario 05: Cambio de club activo recarga datos
    Given soy Admin de múltiples clubes
    When cambio el club activo en el selector del header
    And vuelvo a la pantalla de Identidad
    Then el formulario recarga los datos del nuevo club activo

  Scenario 06: Consistencia por club activo
    Given administro la identidad en el Club A activo
    Then todas las acciones y vistas aplican únicamente al Club A
```

---

### E03 💰 Tesorería / US-52 — Administración de Centros de Costo

> *Como usuario con rol Tesorería, quiero administrar los Centros de Costo del club (alta, edición y cierre), para imputar movimientos a conceptos específicos como deudas, eventos, jornadas, presupuestos, publicidades y sponsors.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-52 — Administración de Centros de Costo

  Scenario 01: Acceso como Tesorería
    Given tengo rol "Tesorería" en el club activo
    When ingreso al módulo de Tesorería
    Then veo la pestaña "Centros de Costo" junto a Resumen, Cuentas, Movimientos y Conciliación

  Scenario 02: Acceso denegado sin rol Tesorería
    Given no tengo rol "Tesorería" en el club activo
    When ingreso al módulo de Tesorería
    Then la pestaña "Centros de Costo" no se renderiza

  Scenario 03: Visualización del listado
    Given estoy en la pestaña "Centros de Costo"
    Then veo una tabla con los CC del club activo con columnas Nombre, Tipo, Estado, Moneda, Monto, Avance, Fecha Inicio, Fecha Fin y Responsable
    And puedo filtrar por Tipo, Estado y Responsable
    And puedo buscar por Nombre

  Scenario 04: Estado vacío sin CC configurados
    Given no existen CC en el club activo
    When accedo a la pestaña
    Then veo un estado vacío con la acción "+ Nuevo Centro de Costo"

  Scenario 05: Formulario de alta
    When selecciono "+ Nuevo Centro de Costo"
    Then veo un formulario con los campos Nombre, Descripción, Tipo, Estado, Fecha Inicio, Fecha Fin, Moneda, Monto, Periodicidad y Responsable

  Scenario 06: Campos obligatorios base
    Given estoy en el formulario de alta
    Then los campos Nombre, Tipo, Estado, Fecha Inicio, Moneda y Responsable son obligatorios

  Scenario 07: Monto obligatorio según Tipo
    Given selecciono Tipo "Deuda", "Presupuesto", "Publicidad" o "Sponsor"
    Then el campo Monto es obligatorio
    Given selecciono Tipo "Evento" o "Jornada"
    Then el campo Monto es opcional

  Scenario 08: Periodicidad visible según Tipo
    Given selecciono Tipo "Presupuesto", "Sponsor" o "Publicidad"
    Then se muestra el campo Periodicidad con los valores Único, Mensual, Trimestral, Semestral y Anual
    Given selecciono cualquier otro Tipo
    Then el campo Periodicidad no se muestra

  Scenario 09: Validación de fechas
    Given completo Fecha Fin con un valor anterior a Fecha Inicio
    When presiono "Guardar"
    Then el sistema bloquea el guardado
    And muestra un mensaje de error de fechas

  Scenario 10: Nombre único por club
    Given intento guardar un CC con un Nombre que ya existe en el club activo
    When presiono "Guardar"
    Then el sistema bloquea el guardado
    And muestra el mensaje "Ya existe un Centro de Costo con ese nombre"

  Scenario 11: Alta exitosa
    Given completé todos los campos obligatorios con valores válidos
    When presiono "Guardar"
    Then el CC queda creado en el club activo con estado "Activo" por defecto
    And veo un toast de confirmación

  Scenario 12: Edición de CC sin movimientos enlazados
    Given selecciono un CC sin movimientos enlazados
    When abro el formulario de edición
    Then todos los campos son editables

  Scenario 13: Edición de CC con movimientos enlazados
    Given selecciono un CC con al menos un movimiento enlazado
    When abro el formulario de edición
    Then los campos Tipo, Moneda y Fecha Inicio se muestran deshabilitados
    And los campos Nombre, Descripción, Responsable, Estado, Fecha Fin, Monto y Periodicidad son editables

  Scenario 14: Historial de auditoría
    Given edito un CC existente
    When guardo los cambios
    Then el sistema registra en el historial el usuario, fecha y hora, campo modificado, valor anterior y valor nuevo

  Scenario 15: Cierre de CC con fecha fin automática
    Given edito un CC y cambio Estado de "Activo" a "Inactivo"
    And la Fecha Fin está vacía o es posterior a hoy
    When presiono "Guardar"
    Then la Fecha Fin se completa automáticamente con la fecha actual

  Scenario 16: Cierre de CC respeta fecha fin existente
    Given edito un CC y cambio Estado a "Inactivo"
    And la Fecha Fin ya tiene un valor anterior o igual a hoy
    When presiono "Guardar"
    Then se respeta el valor existente de Fecha Fin

  Scenario 17: Badge "Deuda saldada"
    Given existe un CC de Tipo "Deuda"
    And la suma de egresos enlazados es mayor o igual al Monto
    Then en el listado se muestra el badge "Deuda saldada — listo para cerrar"

  Scenario 18: Badge "Presupuesto cerca del límite"
    Given existe un CC de Tipo "Presupuesto"
    And la suma de egresos enlazados es mayor o igual al 80% del Monto y menor al 100%
    Then en el listado se muestra el badge "Presupuesto cerca del límite"

  Scenario 19: Badge "Presupuesto superado"
    Given existe un CC de Tipo "Presupuesto"
    And la suma de egresos enlazados es mayor o igual al 100% del Monto
    Then en el listado se muestra el badge "Presupuesto superado"

  Scenario 20: Badge "Meta cumplida"
    Given existe un CC de Tipo "Sponsor" o "Publicidad"
    And la suma de ingresos enlazados es mayor o igual al Monto
    Then en el listado se muestra el badge "Meta cumplida"

  Scenario 21: Badge "CC vencido"
    Given existe un CC con Estado "Activo" y Fecha Fin anterior a hoy
    Then en el listado se muestra el badge "CC vencido — revisar cierre"

  Scenario 22: Consistencia por club activo
    Given administro CC en el club activo
    Then todas las acciones y vistas aplican únicamente al club activo
```

---

### E03 💰 Tesorería / US-53 — Asociación de movimientos a Centros de Costo

> *Como usuario con rol Tesorería, quiero asociar un movimiento a uno o más Centros de Costo al cargarlo o editarlo, para que el movimiento impacte en los reportes de cada CC relacionado.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-53 — Asociación de movimientos a Centros de Costo

  Scenario 01: Campo visible para Tesorería
    Given tengo rol "Tesorería"
    When cargo o edito un movimiento desde Tesorería
    Then veo el campo "Centros de Costo" de selección múltiple

  Scenario 02: Campo no visible para Secretaría
    Given tengo rol "Secretaría"
    When cargo un movimiento
    Then el campo "Centros de Costo" no se renderiza

  Scenario 03: Campo opcional
    Given estoy cargando un movimiento como Tesorería
    When guardo el movimiento sin seleccionar ningún CC
    Then el movimiento se registra correctamente sin enlaces a CC

  Scenario 04: Listado filtrado por club y estado
    Given abro el selector de CC en el formulario de movimiento
    Then solo veo CC del club activo con Estado "Activo"
    And puedo filtrar los CC por Tipo dentro del selector

  Scenario 05: Asociación a múltiples CC
    Given selecciono uno o más CC en el formulario de movimiento
    When guardo el movimiento
    Then el movimiento queda enlazado a cada CC seleccionado
    And el monto completo del movimiento se imputa íntegramente a cada CC

  Scenario 06: Actualización de indicadores de avance
    Given un movimiento se enlaza a un CC
    Then el CC actualiza sus indicadores de avance según la suma de movimientos enlazados

  Scenario 07: Edición de enlaces en movimiento existente
    Given edito un movimiento ya cargado
    When agrego o quito CC de la selección y guardo
    Then los CC agregados reflejan el nuevo enlace en sus reportes
    And los CC removidos dejan de contar ese movimiento
    And la modificación queda registrada en el historial de auditoría

  Scenario 08: Visualización de movimientos desde el CC
    Given abro el detalle de un Centro de Costo
    Then veo el listado de movimientos enlazados con Fecha, Tipo, Descripción, Cuenta, Monto y Moneda
    And puedo acceder al detalle completo de cada movimiento

  Scenario 09: Desvinculación desde el CC
    Given desvinculo un movimiento desde el detalle del CC
    When confirmo la desvinculación
    Then el movimiento no se elimina
    And solo se quita el enlace
    And el CC actualiza sus indicadores de avance

  Scenario 10: CC inactivo no aparece en el selector
    Given existe un CC con Estado "Inactivo"
    When cargo o edito un movimiento
    Then el CC inactivo no aparece en el selector
    And los movimientos previamente enlazados a ese CC se conservan

  Scenario 11: Advertencia por moneda distinta
    Given un movimiento en moneda X
    When selecciono un CC en moneda distinta a X
    Then veo una advertencia "La moneda del movimiento no coincide con la del CC"
    And se permite el enlace

  Scenario 12: Imputación completa a cada CC sin división
    Given un movimiento de importe M se enlaza a N CC
    Then cada CC recibe la imputación completa del importe M
    And los reportes agregados entre CC pueden contener doble conteo (comportamiento esperado documentado)

  Scenario 13: Consistencia por club activo
    Given asocio CC a movimientos en el club activo
    Then solo se listan y enlazan CC del club activo
```

### E04 👥 RRHH / US-54 — Catálogo de Estructuras Salariales

> *Como Admin del club, quiero configurar el catálogo de Estructuras Salariales, para definir las posiciones rentadas del club con su remuneración estándar.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-54 — Catálogo de Estructuras Salariales

  Scenario 01: Acceso como Admin o RRHH
    Given tengo rol Admin o RRHH en el club activo
    When accedo a "Configuración del club"
    Then veo la solapa "RRHH"
    And dentro veo la sección "Estructuras Salariales"

  Scenario 02: Acceso denegado sin rol apropiado
    Given no tengo rol Admin ni RRHH
    When intento acceder a la solapa "RRHH"
    Then la solapa no se renderiza

  Scenario 03: Visualización del listado
    Given estoy en la sección "Estructuras Salariales"
    Then veo una tabla con columnas Nombre, Rol funcional, Actividad, Tipo de remuneración, Monto vigente, Estado y Contrato vigente asociado

  Scenario 04: Alta de Estructura Salarial
    When selecciono "+ Nueva Estructura Salarial"
    Then veo un formulario con los campos Nombre, Rol funcional, Actividad, Tipo de remuneración (mensual fijo / por hora / por clase), Monto, Carga horaria esperada (opcional) y Estado

  Scenario 05: Nombre, Rol funcional y Actividad son obligatorios
    Given los campos Nombre, Rol funcional o Actividad están vacíos
    When presiono "Guardar"
    Then el sistema bloquea el submit
    And veo errores inline en los campos vacíos

  Scenario 06: Tipo de remuneración y Monto son obligatorios
    Given el campo Tipo de remuneración o Monto están vacíos
    When presiono "Guardar"
    Then el sistema bloquea el submit
    And veo errores inline en los campos vacíos

  Scenario 07: Monto debe ser mayor a cero
    Given ingreso un Monto menor o igual a cero
    When presiono "Guardar"
    Then el sistema bloquea el submit
    And veo un error inline "El monto debe ser mayor a cero"

  Scenario 08: Estado por defecto
    Given no modifico el campo Estado al crear
    When el sistema persiste la estructura
    Then el Estado queda en "activa" por defecto

  Scenario 09: Unicidad por Rol funcional y Actividad
    Given ya existe una Estructura Salarial activa con el mismo Rol funcional y Actividad
    When intento crear otra con los mismos valores
    Then el sistema bloquea la acción
    And veo un mensaje de duplicado

  Scenario 10: Edición permitida
    Given edito una Estructura Salarial existente
    Then puedo editar Nombre, Tipo de remuneración, Estado y Carga horaria esperada

  Scenario 11: Moneda heredada de la configuración del club
    Given creo una Estructura Salarial
    Then la Moneda se hereda de la configuración del club activo
    And no es editable desde el formulario

  Scenario 12: Estructura inactiva no disponible para contratos nuevos
    Given existe una Estructura Salarial con Estado "inactiva"
    When creo un contrato nuevo
    Then la estructura inactiva no aparece en el selector

  Scenario 13: Estado vacío sin Estructuras configuradas
    Given no existen Estructuras Salariales en el club activo
    When accedo a la sección
    Then veo un estado vacío con la acción "+ Nueva Estructura Salarial"

  Scenario 14: Consistencia por club activo
    Given administro Estructuras Salariales en el club activo
    Then todas las acciones y vistas aplican únicamente al club activo
```

---

### E04 👥 RRHH / US-55 — Actualización de monto con historial

> *Como Admin del club, quiero actualizar el monto de una Estructura Salarial manteniendo su historial, para reflejar cambios salariales y permitir consultar la evolución del monto en el tiempo.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-55 — Actualización de monto con historial

  Scenario 01: Acceso a la edición de monto
    Given estoy viendo la ficha de una Estructura Salarial
    When selecciono "Actualizar monto"
    Then veo el formulario de actualización

  Scenario 02: Formulario de actualización
    Given estoy en el formulario de actualización de monto
    Then veo los campos Monto nuevo y Fecha de vigencia
    And la Fecha de vigencia tiene por defecto la fecha de hoy y es editable

  Scenario 03: Monto nuevo es obligatorio y mayor a cero
    Given el campo Monto está vacío o es menor o igual a cero
    When presiono "Guardar"
    Then el sistema bloquea el submit
    And veo un error inline en el campo Monto

  Scenario 04: Fecha de vigencia es obligatoria
    Given el campo Fecha de vigencia está vacío
    When presiono "Guardar"
    Then el sistema bloquea el submit
    And veo un error inline en el campo Fecha de vigencia

  Scenario 05: Confirmación exitosa
    Given ingreso un monto válido y una fecha de vigencia válida
    When presiono "Guardar"
    Then el sistema cierra la versión anterior con Fecha Fin igual a la nueva Fecha de vigencia menos un día
    And crea una nueva versión vigente con el monto nuevo

  Scenario 06: Visualización del historial
    Given accedo al historial de la Estructura Salarial
    Then veo todas las versiones con Monto, Fecha Inicio, Fecha Fin y Usuario que la creó

  Scenario 07: Versión vigente única
    Given existe una Estructura Salarial con historial de versiones
    Then en cada momento solo una versión tiene Fecha Fin nula

  Scenario 08: Propagación a contratos con flag usa_monto_estructura activo
    Given existe un contrato vigente con flag usa_monto_estructura en verdadero
    When se crea una nueva versión de monto
    Then las liquidaciones futuras del contrato toman el monto vigente al momento de generarlas

  Scenario 09: No afecta contratos con flag desactivado
    Given existe un contrato vigente con flag usa_monto_estructura en falso
    When se crea una nueva versión de monto
    Then el contrato conserva su monto acordado congelado

  Scenario 10: No afecta liquidaciones ya generadas
    Given ya se generaron liquidaciones para un período
    When se crea una nueva versión de monto
    Then las liquidaciones preexistentes conservan el snapshot del monto original

  Scenario 11: Consistencia por club activo
    Given actualizo el monto en el club activo
    Then la operación aplica únicamente al club activo
```

---

### E04 👥 RRHH / US-56 — CRUD de Colaboradores

> *Como Admin del club, quiero dar de alta, editar y dar de baja colaboradores, para mantener el maestro de personas rentadas del club.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-56 — CRUD de Colaboradores

  Scenario 01: Acceso como Admin o RRHH
    Given tengo rol Admin o RRHH en el club activo
    When accedo a la solapa "RRHH"
    Then veo la sección "Colaboradores"

  Scenario 02: Acceso denegado sin rol apropiado
    Given no tengo rol Admin ni RRHH
    When intento acceder a la sección
    Then la sección no se renderiza

  Scenario 03: Visualización del listado
    Given estoy en la sección "Colaboradores"
    Then veo una tabla con Nombre, DNI, Tipo de vínculo, Estado y Cantidad de contratos vigentes

  Scenario 04: Alta de colaborador
    When selecciono "+ Nuevo Colaborador"
    Then veo un formulario con Nombre, DNI, CUIT/CUIL, Contacto, Tipo de vínculo (relación de dependencia / monotributista / honorarios), CBU o alias, Fecha de alta y Estado

  Scenario 05: Nombre y DNI son obligatorios
    Given los campos Nombre o DNI están vacíos
    When presiono "Guardar"
    Then el sistema bloquea el submit
    And veo errores inline en los campos vacíos

  Scenario 06: CUIT/CUIL es obligatorio
    Given el campo CUIT/CUIL está vacío
    When presiono "Guardar"
    Then el sistema bloquea el submit
    And veo un error inline

  Scenario 07: Tipo de vínculo es obligatorio
    Given el campo Tipo de vínculo está vacío
    When presiono "Guardar"
    Then el sistema bloquea el submit
    And veo un error inline

  Scenario 08: Validación de formato de CUIT/CUIL
    Given ingreso un CUIT/CUIL con formato inválido
    When presiono "Guardar"
    Then el sistema bloquea el submit
    And veo un error inline "Formato de CUIT/CUIL inválido"

  Scenario 09: No se permiten duplicados de DNI o CUIT/CUIL activos
    Given ya existe un colaborador activo con el mismo DNI o CUIT/CUIL
    When intento crear otro
    Then el sistema bloquea la acción
    And veo un mensaje de duplicado

  Scenario 10: Edición de datos del colaborador
    Given selecciono un colaborador existente
    When abro el formulario de edición
    Then puedo modificar sus datos y guardarlos

  Scenario 11: Baja manual de colaborador sin contratos vigentes
    Given un colaborador no tiene contratos vigentes
    When cambio su Estado a "inactivo"
    Then el sistema registra la baja
    And oculta al colaborador de los selectores de contratos nuevos

  Scenario 12: No se puede dar de baja con contratos vigentes
    Given un colaborador tiene contratos vigentes
    When intento cambiar su Estado a "inactivo"
    Then el sistema bloquea la acción
    And muestra un mensaje indicando que primero debe finalizar los contratos

  Scenario 13: Colaborador inactivo conserva historial
    Given un colaborador está en estado "inactivo"
    Then conserva todo su histórico de contratos, liquidaciones y pagos

  Scenario 14: Reactivación de colaborador
    Given un colaborador está en estado "inactivo"
    When cambio su Estado a "activo"
    Then se reactiva manteniendo toda la información previa

  Scenario 15: Consistencia por club activo
    Given administro colaboradores en el club activo
    Then todas las acciones y vistas aplican únicamente al club activo
```

---

### E04 👥 RRHH / US-57 — Alta de contrato colaborador + Estructura Salarial

> *Como Admin del club, quiero crear un contrato asociando un colaborador con una Estructura Salarial, para formalizar su vínculo rentado con el club.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-57 — Alta de contrato colaborador + Estructura Salarial

  Scenario 01: Acceso al alta de contrato
    Given estoy en la ficha de un colaborador o de una Estructura Salarial
    When selecciono "+ Nuevo Contrato"
    Then veo el formulario de alta

  Scenario 02: Formulario de alta
    Given estoy en el formulario de alta de contrato
    Then veo los campos Colaborador, Estructura Salarial, Fecha inicio, Fecha fin (opcional), Usa monto estándar (por defecto verdadero) y Monto acordado (visible solo si el flag está desactivado)

  Scenario 03: Colaborador, Estructura Salarial y Fecha inicio son obligatorios
    Given los campos Colaborador, Estructura Salarial o Fecha inicio están vacíos
    When presiono "Guardar"
    Then el sistema bloquea el submit
    And veo errores inline en los campos vacíos

  Scenario 04: Monto acordado obligatorio si flag desactivado
    Given el flag "Usa monto estándar" está en falso
    And el Monto acordado está vacío
    When presiono "Guardar"
    Then el sistema bloquea el submit
    And veo un error inline en el campo Monto acordado

  Scenario 05: Monto acordado debe ser mayor a cero
    Given el flag "Usa monto estándar" está en falso
    And el Monto acordado es menor o igual a cero
    When presiono "Guardar"
    Then el sistema bloquea el submit
    And veo un error inline

  Scenario 06: Unicidad de Estructura Salarial ocupada
    Given ya existe un contrato vigente para una Estructura Salarial
    When intento crear un segundo contrato vigente sobre la misma estructura
    Then el sistema bloquea la acción
    And muestra el mensaje "La posición ya está ocupada"

  Scenario 07: Creación exitosa con flag activo
    Given completé los campos obligatorios con el flag "Usa monto estándar" activo
    When presiono "Guardar"
    Then el contrato queda vigente
    And toma el monto de la versión vigente de la Estructura Salarial

  Scenario 08: Creación exitosa con flag desactivado
    Given completé los campos obligatorios con el flag "Usa monto estándar" desactivado
    And ingresé un Monto acordado válido
    When presiono "Guardar"
    Then el contrato queda vigente con el monto acordado ingresado
    And no se actualiza automáticamente ante cambios futuros en la Estructura

  Scenario 09: La Estructura pasa de vacante a ocupada
    Given una Estructura Salarial está vacante
    When creo un contrato vigente sobre ella
    Then la Estructura pasa a estado "ocupada"

  Scenario 10: Solo Estructuras activas sin contrato vigente son seleccionables
    Given abro el selector de Estructura Salarial
    Then solo veo estructuras en estado "activa" sin contrato vigente

  Scenario 11: Solo colaboradores activos son seleccionables
    Given abro el selector de Colaborador
    Then solo veo colaboradores en estado "activo"

  Scenario 12: Consistencia por club activo
    Given creo un contrato en el club activo
    Then la operación aplica únicamente al club activo
```

---

### E04 👥 RRHH / US-58 — Edición y finalización de contratos

> *Como Admin del club, quiero editar o finalizar un contrato, para reflejar cambios en el acuerdo con el colaborador o el fin del vínculo.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-58 — Edición y finalización de contratos

  Scenario 01: Acceso a la edición del contrato
    Given estoy en la ficha de un colaborador o de una Estructura Salarial
    When selecciono un contrato vigente y "Editar"
    Then veo el formulario de edición

  Scenario 02: Campos editables en contrato vigente
    Given estoy editando un contrato vigente
    Then puedo editar Fecha fin, flag "Usa monto estándar", Monto acordado (solo si flag desactivado) y adjuntos

  Scenario 03: Campos no editables
    Given estoy editando un contrato vigente
    Then no puedo editar Colaborador ni Estructura Salarial
    And veo un mensaje indicando que esos cambios requieren finalizar y crear uno nuevo

  Scenario 04: Desactivación del flag congela el monto
    Given el flag "Usa monto estándar" estaba activo
    When desactivo el flag
    Then el sistema congela el monto actual en el contrato
    And el campo Monto acordado queda editable manualmente

  Scenario 05: Reactivación del flag vuelve a leer el monto de la estructura
    Given el flag "Usa monto estándar" estaba desactivado
    When activo el flag
    Then el contrato vuelve a leer el monto de la versión vigente de la Estructura Salarial

  Scenario 06: Finalización manual del contrato
    Given estoy en la ficha de un contrato vigente
    When selecciono "Finalizar contrato" y confirmo
    Then el estado pasa a "finalizado"
    And la Fecha fin se completa con la fecha actual o con la indicada

  Scenario 07: Al finalizar la Estructura queda vacante
    Given finalizo un contrato vigente
    Then la Estructura Salarial asociada pasa a estado "vacante"

  Scenario 08: Contrato finalizado conserva historial de liquidaciones
    Given un contrato fue finalizado
    Then conserva todas las liquidaciones generadas hasta la fecha de fin

  Scenario 09: No se generan liquidaciones posteriores a la fecha fin
    Given un contrato tiene Fecha fin definida
    When se ejecuta la generación masiva de liquidaciones para un período posterior
    Then el sistema no genera liquidación para ese contrato

  Scenario 10: Contrato finalizado no puede reactivarse
    Given un contrato está en estado "finalizado"
    When intento reactivarlo
    Then el sistema bloquea la acción
    And indica que debe crearse un contrato nuevo para renovar el vínculo

  Scenario 11: Consistencia por club activo
    Given edito o finalizo contratos en el club activo
    Then la operación aplica únicamente al club activo
```

---

### E04 👥 RRHH / US-59 — Finalización automática de contratos por fecha fin

> *Como sistema, quiero finalizar automáticamente los contratos cuya fecha fin se cumple, para mantener consistente el estado de los contratos sin intervención manual.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-59 — Finalización automática de contratos por fecha fin

  Scenario 01: Ejecución diaria
    Given existen contratos vigentes con Fecha fin igual al día actual
    When el sistema corre el proceso diario
    Then esos contratos pasan a estado "finalizado"
    And sus Estructuras Salariales asociadas pasan a "vacante"

  Scenario 02: Contratos sin fecha fin no son afectados
    Given existe un contrato vigente sin Fecha fin definida
    When el sistema corre el proceso diario
    Then el contrato no es afectado

  Scenario 03: Contratos con fecha fin futura no son afectados
    Given existe un contrato vigente con Fecha fin futura
    When el sistema corre el proceso diario
    Then el contrato no es afectado

  Scenario 04: Fallo en la ejecución
    Given el proceso diario falla durante la ejecución
    Then ningún contrato cambia de estado
    And se registra el error en el log del sistema

  Scenario 05: Registro de la acción automática
    Given el proceso finaliza un contrato automáticamente
    Then el historial del contrato registra la acción automática con fecha y hora

  Scenario 06: Consistencia por club
    Given el proceso recorre todos los clubes
    Then las acciones aplican correctamente al club propietario de cada contrato
```

---

### E04 👥 RRHH / US-60 — Alerta de colaboradores activos sin contratos vigentes

> *Como sistema, quiero detectar colaboradores activos sin contratos vigentes y mostrar una alerta al Admin, para que evalúe darlos de baja manualmente.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-60 — Alerta de colaboradores activos sin contratos vigentes

  Scenario 01: Detección de colaboradores sin contratos
    Given existe un colaborador en estado "activo"
    And no tiene ningún contrato vigente
    Then el sistema lo marca con una alerta visual

  Scenario 02: Alerta visible en listado y ficha
    Given un colaborador está en la condición de alerta
    When accedo al listado de colaboradores o a su ficha
    Then veo la alerta visual correspondiente

  Scenario 03: Colaborador con contrato vigente no tiene alerta
    Given un colaborador activo tiene al menos un contrato vigente
    Then no muestra alerta

  Scenario 04: Acción "Dar de baja" desde la alerta
    Given estoy viendo la alerta en la ficha del colaborador
    When selecciono "Dar de baja"
    Then el sistema cambia el Estado del colaborador a "inactivo"
    And completa la fecha de baja automática

  Scenario 05: Acción "Ignorar alerta"
    Given estoy viendo la alerta en la ficha del colaborador
    When selecciono "Ignorar"
    Then el colaborador permanece en estado "activo"
    And la alerta continúa visible

  Scenario 06: La alerta desaparece al crear un contrato
    Given un colaborador tenía alerta activa
    When se le crea un contrato nuevo vigente
    Then la alerta desaparece automáticamente

  Scenario 07: Consistencia por club activo
    Given reviso alertas en el club activo
    Then solo veo alertas de colaboradores del club activo
```

---

### E04 👥 RRHH / US-61 — Generación masiva de liquidaciones del mes

> *Como Tesorero del club, quiero generar las liquidaciones del mes para todos los contratos vigentes, para preparar los pagos de la nómina en un solo paso.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-61 — Generación masiva de liquidaciones del mes

  Scenario 01: Acceso con rol Tesorería, RRHH o Admin
    Given tengo rol Tesorería, RRHH o Admin en el club activo
    When accedo al módulo de Liquidaciones
    Then veo la acción "Generar liquidaciones del mes"

  Scenario 02: Acceso denegado sin rol apropiado
    Given no tengo rol Tesorería, RRHH ni Admin
    When intento acceder al módulo
    Then la acción no se renderiza

  Scenario 03: Selección de período
    Given voy a generar las liquidaciones del mes
    Then veo un selector de mes y año
    And por defecto se propone el mes en curso

  Scenario 04: Generación masiva exitosa
    Given seleccioné un período válido
    When confirmo la generación
    Then el sistema crea una liquidación en estado "generada" por cada contrato vigente en el período

  Scenario 05: Monto precargado según flag
    Given se generan liquidaciones
    Then las liquidaciones de contratos con flag usa_monto_estructura activo toman el monto vigente de la Estructura Salarial al momento de la generación
    And las liquidaciones de contratos con flag desactivado toman el monto acordado del contrato

  Scenario 06: Contratos por hora o por clase
    Given un contrato es por hora o por clase
    When se genera su liquidación
    Then la liquidación se crea con monto en cero
    And queda marcada como "requiere input de horas/clases"

  Scenario 07: Omisión de duplicados
    Given ya existe una liquidación no anulada para un contrato en el período
    When corro la generación
    Then el sistema omite ese contrato
    And lo reporta en el resumen

  Scenario 08: Generación parcial del mes
    Given algunos contratos ya tienen liquidación
    And otros no
    When corro la generación
    Then solo se crean las que faltan

  Scenario 09: Sin contratos vigentes en el período
    Given no hay contratos vigentes en el período seleccionado
    When corro la generación
    Then no se crea ninguna liquidación
    And se informa al usuario

  Scenario 10: Registro de la acción
    Given finaliza la generación masiva
    Then el sistema registra la acción con usuario, fecha y cantidad de liquidaciones generadas

  Scenario 11: Resultado visible
    Given finaliza la generación masiva
    Then veo el listado de liquidaciones generadas
    And puedo agruparlo por colaborador o por Estructura Salarial

  Scenario 12: Consistencia por club activo
    Given genero liquidaciones en el club activo
    Then la operación aplica únicamente al club activo
```

### E04 👥 RRHH / US-62 — Ajustes sobre liquidación generada

> *Como Tesorero del club, quiero ajustar una liquidación generada agregando adicionales, descuentos o cargando horas/clases, para reflejar correctamente lo que corresponde pagar en el mes.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-62 — Ajustes sobre liquidación generada

  Scenario 01: Acceso al detalle de liquidación generada
    Given selecciono una liquidación en estado "generada"
    When abro su detalle
    Then veo el monto base, los ajustes cargados, el monto final calculado y las notas

  Scenario 02: Agregar ajuste
    Given estoy en el detalle de una liquidación "generada"
    When agrego un ajuste con tipo (adicional / descuento / reintegro), descripción y monto
    Then el monto final se recalcula en vivo

  Scenario 03: Edición de ajuste existente
    Given existe un ajuste en la liquidación
    When edito su monto o descripción
    Then el monto final se recalcula en vivo

  Scenario 04: Eliminación de ajuste
    Given existe un ajuste en la liquidación
    When lo elimino
    Then el monto final se recalcula en vivo

  Scenario 05: Carga de horas o clases
    Given el contrato asociado es por hora o por clase
    When cargo la cantidad de horas o clases trabajadas
    Then el monto base se calcula multiplicando la cantidad por el valor unitario de la Estructura Salarial o del contrato

  Scenario 06: Edición del monto base en contrato con flag desactivado
    Given el contrato tiene flag usa_monto_estructura en falso
    When edito el monto base de la liquidación
    Then el monto final se recalcula en vivo

  Scenario 07: Bloqueo de edición en estado confirmada o pagada
    Given la liquidación está en estado "confirmada" o "pagada"
    When intento editar ajustes
    Then el sistema bloquea la edición

  Scenario 08: Notas libres del tesorero
    Given estoy en el detalle de una liquidación "generada"
    When escribo notas libres
    Then se persisten al guardar

  Scenario 09: Monto final debe ser mayor o igual a cero
    Given el monto final calculado es negativo
    When intento guardar
    Then el sistema bloquea el guardado
    And solicita corregir los ajustes
    Given el monto final calculado es cero
    When guardo
    Then el sistema solicita confirmación explícita

  Scenario 10: Registro del historial de cambios
    Given edito una liquidación
    Then el historial registra quién, cuándo y qué cambió

  Scenario 11: Consistencia por club activo
    Given ajusto liquidaciones del club activo
    Then la operación aplica únicamente al club activo
```

---

### E04 👥 RRHH / US-63 — Confirmación individual y masiva de liquidaciones

> *Como Tesorero del club, quiero confirmar una o múltiples liquidaciones generadas, para marcarlas como listas para pagar y prevenir edición accidental.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-63 — Confirmación individual y masiva de liquidaciones

  Scenario 01: Acceso al listado de liquidaciones generadas
    Given tengo rol Tesorería, RRHH o Admin
    When accedo al módulo de Liquidaciones
    Then veo el listado filtrado por estado "generada"

  Scenario 02: Selección individual o masiva
    Given estoy en el listado de liquidaciones generadas
    Then puedo seleccionar una o múltiples liquidaciones

  Scenario 03: Confirmación individual exitosa
    Given selecciono una liquidación válida
    When presiono "Confirmar"
    Then el estado pasa a "confirmada"
    And el monto final queda bloqueado

  Scenario 04: Confirmación masiva
    Given selecciono múltiples liquidaciones válidas
    When presiono "Confirmar"
    Then todas las válidas pasan a "confirmada"
    And las inválidas se reportan al usuario

  Scenario 05: Bloqueo de confirmación con horas no cargadas
    Given una liquidación es por hora o por clase con cero horas cargadas
    When intento confirmarla
    Then el sistema bloquea la acción
    And pide cargar horas o clases primero

  Scenario 06: Advertencia por monto cero o negativo
    Given intento confirmar una liquidación con monto final cero o negativo
    When presiono "Confirmar"
    Then el sistema pide confirmación explícita antes de proceder

  Scenario 07: Registro del historial de confirmación
    Given confirmo una liquidación
    Then el historial registra el usuario y la fecha de confirmación

  Scenario 08: Liquidación confirmada no es editable salvo anulación
    Given una liquidación está en estado "confirmada"
    When intento editarla
    Then el sistema bloquea la edición

  Scenario 09: Consistencia por club activo
    Given confirmo liquidaciones del club activo
    Then la operación aplica únicamente al club activo
```

---

### E04 👥 RRHH / US-64 — Pago individual de liquidación confirmada

> *Como Tesorero del club, quiero ejecutar el pago de una liquidación confirmada generando el movimiento correspondiente en Tesorería, para cerrar el ciclo de liquidación con trazabilidad completa.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-64 — Pago individual de liquidación confirmada

  Scenario 01: Acceso a la acción "Pagar"
    Given selecciono una liquidación en estado "confirmada"
    When abro su detalle
    Then veo la acción "Pagar"

  Scenario 02: Formulario de pago
    Given presiono "Pagar" en una liquidación confirmada
    Then veo un formulario con Cuenta de origen, Fecha de pago, Comprobante (opcional) y Notas
    And la Fecha de pago tiene por defecto la fecha de hoy y es editable

  Scenario 03: Cuenta de origen es obligatoria
    Given el campo Cuenta de origen está vacío
    When presiono "Confirmar pago"
    Then el sistema bloquea el submit
    And veo un error inline

  Scenario 04: Fecha de pago es obligatoria
    Given el campo Fecha de pago está vacío
    When presiono "Confirmar pago"
    Then el sistema bloquea el submit
    And veo un error inline

  Scenario 05: Validación de saldo de la cuenta
    Given la cuenta de origen no tiene saldo suficiente en la moneda del club
    When presiono "Confirmar pago"
    Then el sistema bloquea el submit según la configuración de la cuenta
    And muestra un mensaje informativo

  Scenario 06: Ejecución exitosa del pago
    Given completé los campos obligatorios con valores válidos
    When confirmo el pago
    Then el sistema crea un movimiento de egreso en Tesorería con categoría "Sueldos"
    And el movimiento tiene monto igual al monto final de la liquidación
    And el movimiento referencia al colaborador y a la liquidación
    And el movimiento tiene descripción autogenerada

  Scenario 07: La liquidación pasa a pagada
    Given se ejecutó el pago exitosamente
    Then la liquidación pasa a estado "pagada"
    And guarda el ID del movimiento generado

  Scenario 08: Asociación a jornada del tesorero
    Given el tesorero tiene una jornada abierta al momento del pago
    Then el movimiento generado queda asociado a esa jornada
    Given el tesorero no tiene jornada abierta
    Then el movimiento se registra directo en Tesorería

  Scenario 09: Solo liquidaciones confirmadas pueden pagarse
    Given una liquidación está en estado distinto de "confirmada"
    When intento pagarla
    Then el sistema bloquea la acción

  Scenario 10: No se puede pagar dos veces la misma liquidación
    Given una liquidación ya está en estado "pagada"
    When intento pagarla nuevamente
    Then el sistema bloquea la acción

  Scenario 11: Registro del historial de pago
    Given ejecuté el pago exitosamente
    Then el historial registra usuario, fecha y hora, cuenta y movimiento generado

  Scenario 12: Navegación desde el movimiento
    Given existe un movimiento generado por un pago de liquidación
    When abro el detalle del movimiento
    Then puedo navegar a la liquidación de origen

  Scenario 13: Consistencia por club activo
    Given ejecuto pagos en el club activo
    Then la operación aplica únicamente al club activo
```

---

### E04 👥 RRHH / US-65 — Pago en lote de múltiples liquidaciones

> *Como Tesorero del club, quiero ejecutar el pago de múltiples liquidaciones confirmadas en una sola operación, para pagar la nómina del mes de forma eficiente.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-65 — Pago en lote de múltiples liquidaciones

  Scenario 01: Acceso al listado de liquidaciones confirmadas
    Given tengo rol Tesorería, RRHH o Admin
    When accedo al listado filtrado por estado "confirmada"
    Then veo todas las liquidaciones pendientes de pago

  Scenario 02: Selección múltiple
    Given estoy en el listado de confirmadas
    Then puedo seleccionar múltiples liquidaciones

  Scenario 03: Formulario de pago en lote
    Given selecciono múltiples liquidaciones y presiono "Pagar seleccionadas"
    Then veo un formulario con Cuenta de origen, Fecha de pago y Notas comunes

  Scenario 04: Cuenta y Fecha son obligatorias
    Given los campos Cuenta de origen o Fecha de pago están vacíos
    When presiono "Confirmar pago en lote"
    Then el sistema bloquea el submit
    And veo errores inline

  Scenario 05: Debe haber al menos una liquidación seleccionada
    Given no seleccioné ninguna liquidación
    When presiono "Pagar seleccionadas"
    Then el sistema bloquea la acción

  Scenario 06: Resumen previo a confirmar
    Given presiono "Confirmar pago en lote"
    Then veo un resumen con cantidad de liquidaciones, monto total y cuenta de origen
    And debo confirmar explícitamente antes de ejecutar

  Scenario 07: Ejecución exitosa en lote
    Given confirmo el pago en lote
    When el sistema procesa la operación
    Then crea un movimiento de egreso por cada liquidación seleccionada
    And todas las liquidaciones pasan a "pagada"
    And cada liquidación queda vinculada a su movimiento generado

  Scenario 08: Fallo parcial revierte todo
    Given una de las liquidaciones no puede procesarse durante la ejecución
    When el sistema detecta el fallo
    Then revierte toda la operación
    And ninguna liquidación cambia de estado
    And no se persiste ningún movimiento
    And el intento fallido queda registrado en el log de auditoría

  Scenario 09: Registro del historial por liquidación
    Given el pago en lote se ejecutó exitosamente
    Then cada liquidación procesada tiene su registro de historial individual

  Scenario 10: Consistencia por club activo
    Given ejecuto pagos en lote en el club activo
    Then la operación aplica únicamente al club activo
```

---

### E04 👥 RRHH / US-66 — Anulación de liquidación

> *Como Tesorero del club, quiero anular una liquidación para corregir errores, para que los montos no se contabilicen y pueda regenerarla si corresponde.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-66 — Anulación de liquidación

  Scenario 01: Anulación de liquidación generada o confirmada
    Given una liquidación está en estado "generada" o "confirmada"
    When selecciono "Anular" y confirmo
    Then el estado pasa a "anulada"
    And deja de considerarse para reportes

  Scenario 02: Bloqueo de anulación directa si está pagada
    Given una liquidación está en estado "pagada"
    When intento anularla
    Then el sistema bloquea la acción
    And indica que primero debe revertirse el movimiento de Tesorería asociado

  Scenario 03: Anulación tras reversión del movimiento
    Given el movimiento de Tesorería asociado fue revertido
    When anulo la liquidación
    Then el estado pasa a "anulada"
    And puede regenerarse para ese contrato y período

  Scenario 04: Liquidación anulada queda visible en el histórico
    Given una liquidación fue anulada
    Then permanece visible en el histórico marcada como anulada

  Scenario 05: Registro del historial de anulación
    Given anulo una liquidación
    Then el historial registra usuario, fecha y motivo (texto opcional)

  Scenario 06: Consistencia por club activo
    Given anulo liquidaciones del club activo
    Then la operación aplica únicamente al club activo
```

---

### E04 👥 RRHH / US-67 — Ficha consolidada del colaborador

> *Como Tesorero del club, quiero consultar la ficha de un colaborador con todos sus contratos y pagos históricos, para tener visibilidad completa de su vínculo rentado con el club.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-67 — Ficha consolidada del colaborador

  Scenario 01: Acceso a la ficha desde el listado
    Given estoy en el listado de colaboradores
    When selecciono un colaborador
    Then accedo a su ficha consolidada

  Scenario 02: Visualización de datos personales
    Given estoy en la ficha de un colaborador
    Then veo Nombre, DNI, CUIT/CUIL, Contacto, Tipo de vínculo, Estado, Datos de pago y Fecha de alta

  Scenario 03: Listado de contratos
    Given estoy en la ficha de un colaborador
    Then veo todos sus contratos (vigentes y finalizados) con Estructura Salarial, Rol, Actividad, Fechas y Monto

  Scenario 04: Listado de liquidaciones
    Given estoy en la ficha de un colaborador
    Then veo todas sus liquidaciones con Período, Contrato, Monto final y Estado

  Scenario 05: Listado de pagos efectivos
    Given estoy en la ficha de un colaborador
    Then veo todos los pagos efectivos con Fecha, Monto, Cuenta y acceso al movimiento de Tesorería asociado

  Scenario 06: Totales consolidados
    Given estoy en la ficha de un colaborador
    Then veo el total pagado en el año y en el mes en curso

  Scenario 07: Ficha de colaborador sin movimientos
    Given un colaborador no tiene contratos, liquidaciones ni pagos
    When accedo a su ficha
    Then veo los datos personales
    And veo estado vacío en las secciones sin datos

  Scenario 08: Alerta visual si no tiene contratos vigentes
    Given un colaborador activo no tiene contratos vigentes
    When abro su ficha
    Then veo la alerta visual correspondiente

  Scenario 09: Acceso rápido a crear contrato nuevo
    Given estoy en la ficha de un colaborador
    When presiono "+ Nuevo Contrato"
    Then accedo al formulario de alta con el colaborador preseleccionado

  Scenario 10: Consistencia por club activo
    Given consulto la ficha de un colaborador en el club activo
    Then solo veo información del colaborador en el club activo
```

---

### E04 👥 RRHH / US-68 — Dashboard del módulo RRHH

> *Como Tesorero del club, quiero ver un dashboard del módulo RRHH con el estado de liquidaciones y el costo proyectado del mes, para saber qué está pendiente de procesar.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-68 — Dashboard del módulo RRHH

  Scenario 01: Acceso con rol Tesorería, RRHH o Admin
    Given tengo rol Tesorería, RRHH o Admin en el club activo
    When accedo al módulo de RRHH
    Then veo el dashboard con las cards de indicadores

  Scenario 02: Acceso denegado sin rol apropiado
    Given no tengo rol Tesorería, RRHH ni Admin
    When intento acceder al dashboard
    Then la pantalla no se renderiza

  Scenario 03: Card "Liquidaciones pendientes de confirmar"
    Given existen liquidaciones en estado "generada"
    Then veo la card con la cantidad y el monto total

  Scenario 04: Card "Liquidaciones confirmadas pendientes de pago"
    Given existen liquidaciones en estado "confirmada"
    Then veo la card con la cantidad y el monto total

  Scenario 05: Card "Costo proyectado del mes"
    Given existen Estructuras Salariales ocupadas en el mes en curso
    Then veo la card con la suma de los montos vigentes

  Scenario 06: Card "Ejecutado del mes"
    Given existen liquidaciones pagadas en el mes en curso
    Then veo la card con la suma de los montos pagados

  Scenario 07: Card "Estructuras vacantes"
    Given existen Estructuras Salariales activas sin contrato vigente
    Then veo la card con la cantidad

  Scenario 08: Card "Alertas"
    Given existen colaboradores activos sin contratos vigentes
    Then veo la card con la cantidad

  Scenario 09: Sin datos en alguna card
    Given no existen datos para una card
    Then la card muestra el estado vacío correspondiente

  Scenario 10: Acceso al listado filtrado desde la card
    Given estoy en el dashboard
    When selecciono una card
    Then accedo al listado filtrado por la condición de la card

  Scenario 11: Consistencia por club activo
    Given consulto el dashboard del club activo
    Then todas las cards aplican únicamente al club activo
```

---

### E04 👥 RRHH / US-69 — Reportes de gasto en personal

> *Como Tesorero del club, quiero ver reportes de gasto en personal por período, colaborador y actividad, para analizar la inversión en recursos humanos del club.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-69 — Reportes de gasto en personal

  Scenario 01: Acceso con rol Tesorería, RRHH o Admin
    Given tengo rol Tesorería, RRHH o Admin en el club activo
    When accedo al módulo de Reportes de RRHH
    Then veo el panel de reportes

  Scenario 02: Acceso denegado sin rol apropiado
    Given no tengo rol Tesorería, RRHH ni Admin
    When intento acceder al panel
    Then la pantalla no se renderiza

  Scenario 03: Filtros disponibles
    Given estoy en el panel de reportes
    Then veo filtros de Rango de fechas, Colaborador, Estructura Salarial y Actividad

  Scenario 04: Reporte por período
    Given apliqué los filtros
    When selecciono agrupación "Por período"
    Then veo el total pagado agrupado por mes dentro del rango seleccionado

  Scenario 05: Reporte por colaborador
    Given apliqué los filtros
    When selecciono agrupación "Por colaborador"
    Then veo el total pagado agrupado por colaborador en el período

  Scenario 06: Reporte por actividad
    Given apliqué los filtros
    When selecciono agrupación "Por actividad"
    Then veo el total pagado agrupado por actividad

  Scenario 07: Desvío proyectado vs ejecutado
    Given selecciono la vista comparativa
    Then veo mes a mes la comparación entre el costo proyectado y el ejecutado

  Scenario 08: Los reportes consideran solo liquidaciones pagadas
    Given existen liquidaciones en distintos estados
    When consulto un reporte
    Then solo se contabilizan las liquidaciones en estado "pagada"
    And no se incluyen anuladas ni pendientes

  Scenario 09: Sin datos en el rango
    Given no hay liquidaciones pagadas en el rango seleccionado
    When consulto un reporte
    Then veo un estado vacío con mensaje informativo

  Scenario 10: Exportación a CSV
    Given estoy viendo un reporte con datos
    When presiono "Exportar CSV"
    Then el sistema descarga un archivo CSV con los datos visibles

  Scenario 11: Consistencia por club activo
    Given consulto reportes del club activo
    Then solo se contabilizan liquidaciones del club activo
```

---

*Joaquin Fernandez Sinchi — Product Manager · A-CSPO | Buenos Aires, Argentina | Marzo 2026*
