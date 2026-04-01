# PRODUCT BACKLOG · MVP
## Monthly dinner

User Stories con Acceptance Criteria en formato Gherkin — ordenadas por prioridad de desarrollo.

---

### E00 🔐 Acceso & Autenticación / US-01 — Registro con Google

> *Como usuario nuevo, quiero registrarme con mi cuenta de Google, para acceder sin crear una contraseña nueva.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-01 — Registro con Google

  Scenario 01: Registro exitoso
    Given soy un usuario nuevo sin cuenta
    When selecciono "Ingresar con Google" y autorizo el acceso
    Then se crea mi perfil automáticamente y soy redirigido a la pantalla de onboarding (/onboarding)

  Scenario 02: Email ya registrado
    Given ya existe una cuenta con ese email
    When intento registrarme con el mismo Google account
    Then inicio sesión en la cuenta existente sin crear un duplicado

  Scenario 03: Cancelación del flujo OAuth
    Given estoy en el flujo de autorización de Google
    When cancelo el permiso
    Then regreso a la pantalla de inicio sin crear cuenta ni mostrar error (/)

  Scenario 04: Usuario ya autenticado
    Given ya tengo una sesión activa
    When intento registrarme con Google nuevamente
    Then accedo directamente sin autenticarme de nuevo al dashboard de mi grupo activo en la última sesión sin pasos adicionales sin crear una nueva cuenta (/dashboard/[groupId]) 
```

---

### E00 🔐 Acceso & Autenticación / US-02 — Login con Google

> *Como usuario registrado, quiero iniciar sesión con mi cuenta de Google, para acceder a mi grupo sin fricciones.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-02 — Login con Google

  Scenario 01: Login exitoso
    Given tengo una cuenta registrada
    When selecciono "Ingresar con Google" y ya pertenezco a al menos un grupo
    Then accedo directamente al dashboard de mi grupo activo en la última sesión sin pasos adicionales (/dashboard/[groupId])

  Scenario 02: Usuario sin grupo
    Given tengo una cuenta registrada
    When selecciono "Ingresar con Google" y no pertenezco a ningún grupo
    Then soy redirigido a la página de Creación de grupo (/onboarding)

  Scenario 03: Sesión persistente
    Given ya inicié sesión anteriormente en este dispositivo
    When abro la app nuevamente
    Then accedo directamente sin autenticarme de nuevo al dashboard de mi grupo activo en la última sesión sin pasos adicionales (/dashboard/[groupId])

  Scenario 04: Token expirado
    Given mi sesión expiró por inactividad prolongada
    When intento acceder a cualquier pantalla protegida
    Then soy redirigido al login sin perder el contexto de navegación (/login)
```

---


### E01 🏠 Creación de grupo / US-03 — Crear grupo

> *Como usuario registrado, quiero crear un grupo con un nombre, definir la frecuencia y el día de reunión al crear el grupo, para que el sistema pueda generar los eventos automáticamente y todos los miembros sepan cuándo se reúne el grupo.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-03 — Crear grupo

  Scenario 01: Formulario
    Given soy un usuario autenticado 
    When visualizo la página de Creación de grupo (grupo/new)
    Then veo el formulario de creación de grupo

  Scenario 02: Creación exitosa
    Given soy un usuario autenticado 
    When completo el formulario de creación de grupo y confirmo
    Then el grupo queda creado, soy asignado como admin 
    AND soy redirigido al dashboard del grupo recién creado (/dashboard/[groupId])

  Scenario 03: Nombre duplicado del mismo usuario
    Given ya tengo un grupo
    When intento crear otro grupo con el mismo nombre
    Then el sistema muestra un mensaje de error indicando que el nombre ya está en uso
    And no permite crear el grupo

  Scenario 04: Acceso restringido al grupo
    Given creé el grupo exitosamente
    When otro usuario ingresa a la app sin invitación
    Then ese usuario no puede ver ni acceder al grupo sin un link de invitación válido

  Scenario 05: Frecuencia semanal muestra solo día de la semana
    Given estoy completando el formulario de creación de grupo
    When selecciono la frecuencia "Semanal"
    Then veo únicamente el selector de día de la semana
    And no se muestra el campo de semana del mes
    And la vista previa muestra "Todos los [día seleccionado]"

  Scenario 06: Frecuencia dos veces por mes muestra semanas en par y día
    Given estoy completando el formulario de creación de grupo
    When selecciono la frecuencia "Dos veces por mes"
    Then veo el selector de semanas del mes con dos opciones: "1° y 3°" y "2° y 4°"
    And veo el selector de día de la semana
    And la vista previa muestra "El 1° y 3° [día] de cada mes" o
        "El 2° y 4° [día] de cada mes" según la selección

  Scenario 07: Frecuencia mensual muestra semana del mes y día
    Given estoy completando el formulario de creación de grupo
    When selecciono la frecuencia "Mensual"
    Then veo el selector de semana del mes con opciones: 1°, 2°, 3°, 4° y Última
    And veo el selector de día de la semana
    And la vista previa muestra "El [ordinal] [día] de cada mes"

  Scenario 08: Cambio de frecuencia resetea campos dependientes
    Given seleccioné frecuencia, semana y día
    When cambio la frecuencia a otro valor
    Then solo los campos no aplicables a la nueva frecuencia se resetean
    And la vista previa se actualiza o desaparece si la configuración queda incompleta

  Scenario 09: Campos obligatorios
    Given estoy en el formulario de creación de grupo
    When intento confirmar sin completar todos los campos visibles
    Then el sistema indica qué campos son obligatorios y no crea el grupo

  Scenario 10: Datos guardados correctamente con el grupo
    Given completé nombre, frecuencia, semana (si aplica) y día
    When confirmo la creación del grupo
    Then el grupo queda creado con frequency, meeting_week
        y meeting_day_of_week guardados según la frecuencia seleccionada

  Scenario 11: Generación automática de eventos
    Given creé un grupo con frecuencia, semana y día definidos
    When el grupo es creado
    Then el sistema genera los próximos eventos según la configuración del grupo para los próximos 3 eventoes
```

---

### E02 Navegación / US-04 — Avatar con menú de sesión en el header

> *Como usuario autenticado, quiero ver mi avatar en el header y poder acceder a la configuración del grupo (si soy admin) y cerrar sesión desde ahí.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-04 — Avatar con menú de sesión en el header

  Scenario 01: Avatar visible en el header
    Given estoy autenticado AND estoy en cualquier pantalla de la aplicación
    Then veo mi avatar en la esquina superior derecha del header
    And el avatar muestra mi foto de perfil de Google o mis iniciales si no hay foto

  Scenario 02: Menú del avatar muestra una opción para usuarios no admin
    Given estoy autenticado
    When toco mi avatar
    Then se despliega un menú con la opción "Cerrar sesión"

  Scenario 03: Menú del avatar muestra dos opciones para Admins
    Given estoy autenticado AND soy admin del grupo activo
    When toco mi avatar
    Then se despliega un menú con dos opciones: "Configuración de grupo" y "Cerrar sesión"  

  Scenario 04: Acceso a configuración del grupo
    Given el menú del avatar está abierto
    When selecciono "Configuración del grupo"
    Then soy redirigido a la página de Configuración del grupo (/dashboard/[groupId]/settings)
    And el menú se cierra

  Scenario 05: Cierre de sesión desde el avatar
    Given el menú del avatar está abierto
    When selecciono "Cerrar sesión"
    Then se muestra un diálogo de confirmación
    And al confirmar mi sesión se cierra y soy redirigido al login (/login)

  Scenario 06: Cierre del menú sin acción
    Given el menú del avatar está abierto
    When toco fuera del menú OR vuelvo a tocar el avatar OR presiono ESC    
    Then el menú se cierra sin ejecutar ninguna acción
```

---

### E02 Navegación / US-05 — Selector de grupo en el header

> *Como miembro de uno o más grupos, quiero ver un selector en el menú superior que muestre el grupo actual y me permita cambiar entre mis grupos, para navegar sin fricciones entre espacios distintos.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-05 — Selector de grupo en el header

  Scenario 01: Header muestra el grupo activo
    Given estoy autenticado And pertenezco a al menos un grupo And tengo un grupo activo seleccionado en mi sesión AND estoy en cualquier pantalla de la aplicación
    Then veo en el header el label "GRUPO ACTUAL" y el nombre del grupo activo con un chevron indicando que es clickeable

  Scenario 02: Dropdown lista los grupos del usuario
    Given estoy autenticado AND pertenezco a más de un grupo AND estoy en cualquier pantalla de la aplicación
    When toco el selector de grupo
    Then se despliega un dropdown con la lista de todos mis grupos
    And el grupo activo aparece destacado visualmente

  Scenario 03: Cambio de grupo activo
    Given estoy autenticado AND pertenezco a más de un grupo AND tengo el dropdown de grupos abierto
    When selecciono un grupo diferente al activo en mi sesión
    Then el dashboard se actualiza mostrando el contexto del grupo seleccionado
    AND el header refleja el nuevo grupo activo

  Scenario 04: Usuario con un solo grupo
    Given estoy autenticado AND pertenezco a un único grupo AND tengo un grupo activo seleccionado en mi sesión
    When veo el header
    Then el nombre del grupo se muestra sin chevron 
    AND no existe comportamiento de dropdown
```

---

### E03 Settings / US-06 — Configuración de miembros del grupo

> *Como admin del grupo, quiero acceder a una pantalla de configuración para gestionar miembros del grupo.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-06 — Configuración de miembros del grupo

  Scenario 01: Acceso desde el menú del avatar
    Given estoy autenticado AND soy admin del grupo activo
    When toco mi avatar y selecciono "Configuración del grupo"
    Then soy redirigido a la página de Configuración del grupo activo (/dashboard/[groupId]/settings)

  Scenario 02: Ver lista de miembros
    Given estoy en la pantalla de configuración del grupo activo
    When la pantalla carga
    Then veo la lista de miembros con su nombre, avatar y rol (ADMIN / MIEMBRO)

  Scenario 03: Modal para agregar miembros
    Given estoy en la sección de miembros
    When toco "Agregar"
    Then se abre un modal con dos solapas: "Invitar por link" y "Agregar sin Cuenta"

  Scenario 04: Agregar miembro via link de invitación
    Given tengo el modal de agregar miembros abierto
    When visualizo la solapa "Invitar por link"
    Then veo el enlace de invitación activo con opción de copiar al portapapeles
    And veo confirmación visual al copiar

  Scenario 05: Agregar miembro sin Cuenta
    Given tengo el modal de agregar miembros abierto
    And estoy en la solapa "Invitar por link"
    When toco "Agregar sin cuenta"
    Then veo la segunda solapa con el campo de texto obligatorio "Nombre" AND la opción "Cerrar" AND la opción "Agregar"

  Scenario 06: Miembro agregado
    Given tengo el modal de agregar miembros abierto And estoy en la solapa "Agregar sin Cuenta"
    When ingresé un Nombre AND seleccioné "Agregar"
    Then el modal se cierra 
    And veo al miembro agregado en la lista

  Scenario 07: Cambiar rol de un miembro
    Given estoy en la lista de miembros
    When toco el menú de opciones de un miembro (⋮)
    Then veo la opción de cambiar su rol a admin o miembro según su rol actual
    And al seleccionar el nuevo rol el cambio se aplica inmediatamente

  Scenario 08: No se puede cambiar el rol del propio admin
    Given soy el único admin del grupo
    When intento cambiar mi propio rol
    Then el sistema no permite la acción
    And veo un mensaje que indica que debe haber al menos un admin

  Scenario 09: Volver al dashboard desde configuración
    Given estoy en la pantalla de configuración /dashboard/[groupId]/settings
    When toco el botón "Dashboard" con flecha hacia atrás
    Then soy redirigido a /dashboard/[groupId]

  Scenario 10: Usuario no admin no puede acceder a configuración
    Given estoy autenticado AND NO soy admin del grupo activo
    When intento acceder a /dashboard/[groupId]/settings
    Then soy redirigido al dashboard del grupo
    And veo un mensaje de acceso denegado
```

---

### E03 Settings / US-07 — Configuración de rotación del grupo

> *Como admin del grupo, quiero acceder a una pantalla de configuración para la rotación del grupo.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-07 — Configuración de rotación del grupo

  Scenario 01: No hay rotación configurada
    Given accedo a la pantalla de configuración
    When NO existe rotación configurada AND el grupo posee más de un miembro
    Then veo la opción "Generar aleatoriamente" y "Configurar manualmente"

  Scenario 02: Configuración aleatoria
    Given accedo a la pantalla de configuración AND el grupo posee más de un miembro
    When selecciono "Generar aleatoriamente"
    Then se genera una rotación automática con un miembro asignado por evento
    And veo la lista de eventos con sus responsables asignados
    And la rotación NO se guarda hasta confirmar
    And puedo guardar la rotación

  Scenario 03: Configuración manual - visualización
    Given accedo a la pantalla de configuración AND selecciono "Configurar manualmente"
    When la pantalla carga
    Then veo el listado de próximos eventos del grupo
    And cada evento tiene un selector de miembro organizador
    And veo las opciones "Cancelar" y "Guardar rotación"

  Scenario 04: Guardar configuración manual
    Given estoy configurando la rotación manualmente
    When asigno al menos un responsable y selecciono "Guardar rotación"
    Then la rotación queda guardada correctamente
    And los eventos sin asignar permanecen sin responsable

  Scenario 05: Ver rotación existente
    Given accedo a la pantalla de configuración
    When existe una rotación previamente guardada
    Then veo la lista de eventos con sus responsables asignados
    And puedo modificar la asignación

  Scenario 06: Grupo con un solo miembro
    Given accedo a la pantalla de configuración
    When el grupo posee un único miembro
    Then no puedo configurar la rotación
    And veo un mensaje indicando que se requieren al menos dos miembros  
```

---

### E03 Settings / US-08 — Configuración de nombre del grupo

> *Como admin del grupo, quiero acceder a una pantalla de configuración para modificar el nombre del grupo.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-08 — Configuración de nombre del grupo

  Scenario 01: Visualización del nombre actual
    Given soy admin del grupo activo
    When accedo a la sección "Configuración del grupo"
    Then veo el nombre actual del grupo

  Scenario 02: Editar nombre del grupo
    Given estoy en la sección "Configuración del grupo"
    When toco "Nombre del grupo"
    Then puedo editar el nombre inline
    And veo el valor actual precargado
    When guardo un nuevo nombre válido (no vacío y dentro de los límites permitidos)
    Then veo un mensaje de confirmación
    And el nombre se actualiza correctamente
    And se refleja en el header y en toda la app
    And el cambio queda persistido

  Scenario 03: Nombre vacío no permitido
    Given estoy editando el nombre del grupo
    When intento guardar con el campo vacío
    Then veo un mensaje indicando que el nombre es obligatorio
    And el cambio no se guarda

  Scenario 04: Validación de longitud
    Given estoy editando el nombre del grupo
    When ingreso un nombre con menos de 3 caracteres o más de 50 caracteres
    Then veo un mensaje de error correspondiente
    And el cambio no se guarda

  Scenario 05: Cancelar edición
    Given estoy editando el nombre del grupo
    When cancelo la edición
    Then el nombre permanece sin cambios

  Scenario 06: Acceso restringido a no admins
    Given soy miembro no admin del grupo activo
    When accedo a la sección de ajustes
    Then no veo la opción de editar el nombre del grupo

  Scenario 07: Error al guardar el nombre
    Given estoy editando el nombre del grupo
    When guardo un nuevo nombre válido pero ocurre un error en el sistema
    Then veo un mensaje de error
    And el nombre no se actualiza  

  Scenario 08: Eliminación de espacios innecesarios
    Given estoy editando el nombre del grupo
    When ingreso un nombre con espacios al inicio o final
    Then el sistema guarda el nombre sin espacios innecesarios  
```

---

### E04 Dashboard / US-09 — Estado vacío del dashboard con configuraciones pendientes

> *Como miembro del grupo, quiero ver un mensaje cuando el grupo no tiene todas las configuraciones completas, para entender que al admin le faltan configuraciones.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-09 — Estado vacío del dashboard con configuraciones pendientes

  Scenario 01: Admin ve el estado vacío con CTA
    Given soy el admin del grupo activo
    And el grupo no está completamente configurado
    When ingreso al dashboard del grupo
    Then veo el mensaje "Configurá el grupo"
    And veo el mensaje "Tu grupo aún no está listo. Completá la configuración para comenzar a organizar las cenas."
    And veo el botón "Completar configuración"

  Scenario 02: Botón redirige a configuración del grupo
    Given soy el admin del grupo activo
    And el grupo no está completamente configurado
    And el dashboard muestra el estado vacío por configuraciones pendientes
    When toco "Completar configuración"
    Then soy redirigido a /dashboard/[groupId]/settings

  Scenario 03: Miembro ve mensaje de espera sin CTA
    Given soy un miembro del grupo no admin
    And el grupo no está completamente configurado
    When ingreso al dashboard del grupo
    Then veo el mensaje "Faltan configuraciones. El administrador está finalizando el grupo."
    And no veo el botón "Completar configuración"
```

---

### E04 Dashboard / US-10 — Estados del card de evento según status ✅

> *Como miembro, quiero que el cuadrante del evento muestre solo información relevante según el status del evento, para no ver datos contradictorios ni acciones que no aplican.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-10 — Estados del card de evento según status

  Scenario 01: Sin evento "Published" ni "Closed"
    Given el grupo está configurado
    And soy miembro no organizador
    And no existe un evento "Published" ni "closed" para el evento actual
    When accedo al dashboard del grupo
    Then veo el cuadrante de evento con el mensaje "La cena de este evento aún no fue convocada"
    And veo el mensaje "Es el turno de <organizador>"
    
 Scenario 02: Evento con status "Published"
    Given el grupo está configurado
    And soy miembro no organizador
    And existe un evento "Published" para el evento actual
    When accedo al dashboard del grupo
    Then veo el cuadrante de evento con los datos de fecha, lugar, confirmaciones en tiempo real y los botones VOY / NO VOY / CAPAZ activos

  Scenario 03: Evento con status "closed"
    Given el grupo está configurado
    And soy miembro no organizador
    And existe un evento "closed" para el evento actual
    When accedo al dashboard del grupo
    Then veo el cuadrante de evento con el estado "CERRADO", el resumen final de asistentes y sin botones de confirmación activos
```

---

### E04 Dashboard / US-11 — Crear evento

> *Como organizador, quiero crear el evento del periodo con fecha y lugar tentativo, para que toda la información quede centralizada.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-11 — Crear evento

  Scenario 01: Cuadrante evento
    Given soy el organizador del período actual del grupo
    And no existe un evento "Published" para el período actual
    When veo el dashboard del grupo activo
    Then veo el mensaje "Sos el organizador"
    And veo el botón "Organizar"

  Scenario 02: Crear evento
    Given soy el organizador del período actual del grupo
    And no existe un evento "Published" para el período actual
    And veo el dashboard del grupo activo
    When selecciono "Organizar"
    Then veo un modal con el formulario de Creación de Evento  

  Scenario 03: Creación exitosa
    Given veo el formulario de Creación de Evento
    When completo fecha, lugar tentativo opcional y descripción opcional y confirmo
    Then el evento queda creado con estado "Published" y visible para todos los miembros
    And el cuadrante de evento se actualiza mostrando el evento creado

  Scenario 04: Campos obligatorios vacíos
    Given estoy creando el evento
    When intento guardar sin completar la fecha 
    Then se muestra un error indicando que la fecha es obligatoria y no se guarda el evento

  Scenario 05: Evento ya existente en el período actual
    Given ya existe un evento "Published" para el período actual
    When intento crear otro
    Then el sistema me avisa que ya hay un evento Published y me ofrece editarlo

  Scenario 06: Edición posterior
    Given existe un evento "Published" para el período actual
    When modifico el lugar del evento y guardo
    Then los cambios se guardan y todos los miembros ven la información actualizada

  Scenario 07: Usuario no organizador no puede crear evento
    Given no soy el organizador del período actual
    When accedo al dashboard
    Then no veo el botón "Organizar"
```

---

### E04 Dashboard / US-12 — Notificar al grupo

> *Como organizador, quiero notificar al grupo cuando el evento está creado, para que todos sepan que la cena está convocada.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-12 — Notificar al grupo

  Scenario 01: Notificación enviada al crear
    Given soy el organizador del período actual
    When creo el evento del período actual
    Then se envía una notificación a todos los miembros con fecha, lugar y link directo al evento

  Scenario 02: Miembro sin notificaciones activas
    Given un miembro tiene las notificaciones desactivadas
    When se crea el evento
    Then el evento aparece igual en su panel cuando vuelve a ingresar a la app

  Scenario 03: Ofrecer re-notificación por cambios relevantes
    Given el evento ya fue creado
    When modifico la fecha o el lugar y guardo el cambio
    Then el sistema me ofrece notificar al grupo sobre la actualización
```

---


### E04 Dashboard / US-13 — Confirmar asistencia

> *Como miembro, quiero confirmar mi asistencia con un estado (va / no va / tal vez), para que el organizador lo sepa sin preguntarme.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-13 — Confirmar asistencia

  Scenario 01: Confirmación exitosa
    Given hay un evento Published y no confirmé aún
    When selecciono "Voy"
    Then mi estado queda registrado como "Va" y aparezco en el resumen del organizador

  Scenario 02: Cambio de estado
    Given confirmé que voy pero surgió algo
    When cambio mi estado a "No voy"
    Then el estado se actualiza y el resumen del organizador refleja el cambio en tiempo real

  Scenario 03: Estado "Tal vez"
    Given no tengo certeza de si puedo ir
    When selecciono "Tal vez"
    Then quedo registrado como pendiente y el organizador me ve en categoría separada

  Scenario 04: Confirmación después del evento
    Given el evento Closed
    When intento cambiar mi estado
    Then el sistema no permite modificaciones y muestra el estado final como solo lectura
```

---


### E04 Dashboard / US-14 — Ver resumen de confirmaciones

> *Como organizador, quiero ver el resumen de confirmaciones en tiempo real, para tomar decisiones sobre la reserva.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-14 — Resumen de confirmaciones

  Scenario 01: Resumen completo visible
    Given soy el organizador del período actual
    And existe un evento Published del período actual
    And hay confirmaciones registradas
    When accedo al Dashboard del grupo activo
    Then en el cuadrante de evento veo el total separado en Va, No va, Tal vez y Sin responder con sus nombres

  Scenario 02: Todos confirmaron
    Given soy el organizador del período actual
    And existe un evento Published del período actual
    And todos los miembros respondieron
    When accedo al Dashboard del grupo activo
    Then veo el resumen completo sin "Sin responder"

  Scenario 03: Compartir resumen
    Given soy el organizador del período actual
    And existe un evento Published del período actual
    When selecciono "Compartir resumen"
    Then se genera un texto listo para copiar con los nombres de quienes respondieron "Va"

  Scenario 04: Actualización en tiempo real
    Given soy el organizador viendo el Dashboard del grupo activo
    And existe un evento Published del período actual
    And estoy viendo el resumen de confirmaciones
    When un miembro cambia su estado de asistencia
    Then el resumen se actualiza reflejando el cambio sin necesidad de recargar la página
```

---


### E04 Dashboard / US-15 — Cerrar Evento

> *Como organizador, quiero cargar el restaurante visitado al cerrar el evento, para que quede en el historial del grupo.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-15 — Cerrar Evento

  Scenario 01: Dashboard muestra opción de cierre
    Given soy el organizador del período actual
    And existe un evento Published del período actual
    And la fecha del evento ya ocurrió
    When ingreso al Dashboard del grupo activo
    Then veo el cuadrante de evento con el botón "Cerrar evento"

  Scenario 02: Abrir modal de cierre
    Given soy el organizador del período actual
    And existe un evento Published cuya fecha ya ocurrió
    When selecciono "Cerrar evento"
    Then veo un modal con el formulario de cierre de evento

  Scenario 03: Cierre exitoso del evento
    Given veo el formulario de cierre de evento
    When ingreso el nombre del restaurante
    And selecciono los miembros que concurrieron realmente
    And confirmo el cierre
    Then el evento cambia a estado "Closed"
    And el restaurante queda asociado al evento
    And aparece en el historial con fecha y asistentes

  Scenario 04: Restaurante ya visitado anteriormente
    Given el restaurante que ingreso ya fue visitado antes
    When lo cargo al cerrar el evento
    Then el sistema me avisa que ya fue visitado
    And muestra la última fecha en la que se visitó
    And permite confirmarlo igualmente

  Scenario 05: Cierre sin restaurante
    Given veo el formulario de cierre de evento
    When cierro el evento sin completar el nombre del restaurante
    Then el evento cambia a estado "Closed"
    And queda registrado como "Sin restaurante"
    And aparece en el historial con fecha y asistentes
```

---

### E04 Dashboard / US-16 — Consultar historial de restaurantes

> *Como miembro, quiero consultar el historial de restaurantes del grupo, para no proponer lugares ya visitados.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-16 — Historial de restaurantes

  Scenario 01: Historial con registros
    Given el grupo activo tiene eventos cerrados con restaurantes registrados
    When accedo al dashboard
    Then veo el cuadrante de historial de restaurantes
    And veo la lista ordenada por fecha de visita, mostrando nombre del restaurante, fecha, asistentes y puntuación

  Scenario 02: Historial vacío
    Given el grupo activo no tiene eventos cerrados con restaurantes registrados
    When accedo al dashboard
    Then veo un estado vacío con el mensaje "Todavía no hay cenas registradas"

  Scenario 03: Búsqueda en el historial
    Given hay múltiples restaurantes en el historial
    When busco por nombre de restaurante
    Then veo solo los restaurantes cuyo nombre coincide con la búsqueda
```

---

### E04 Dashboard / US-17 — Consultar historial de asistentes

> *Como miembro, quiero consultar el historial de asistentes del grupo, para saber quiénes son los que más asistieron.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-17 — Consultar historial de asistentes

  Scenario 01: Historial con registros
    Given el grupo activo tiene eventos cerrados con asistentes registrados
    When accedo al dashboard
    Then veo el cuadrante de historial de asistentes
    And veo la lista ordenada por mayor cantidad de asistencias, mostrando nombre del miembro y cantidad de asistencias

  Scenario 02: Historial vacío
    Given el grupo activo no tiene eventos cerrados con asistentes registrados
    When accedo al dashboard
    Then veo un estado vacío con el mensaje "Todavía no hay cenas registradas"
```

---

### E00 🔐 Acceso & Autenticación / US-18 — Join por invitación

> *Como usuario invitado, quiero unirme a un grupo mediante un link de invitación, para no depender de que el administrador me agregue manualmente.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-18 — Join por invitación

  Scenario 01: Join exitoso con cuenta nueva
    Given recibí un link de invitación válido y no tengo cuenta
    When accedo al link e inicio sesión con Google
    Then se crea mi cuenta
    And quedo asociado al grupo automáticamente
    And soy redirigido al Dashboard del grupo

  Scenario 02: Join con cuenta existente sin sesión iniciada
    Given ya tengo cuenta y recibí un link de invitación válido
    And no tengo sesión iniciada
    When accedo al link e inicio sesión con Google
    Then quedo asociado al grupo sin crear una cuenta nueva
    And soy redirigido al Dashboard del grupo

  Scenario 03: Join con cuenta existente y sesión iniciada
    Given ya tengo cuenta
    And ya tengo sesión iniciada
    And recibí un link de invitación válido
    When accedo al link
    Then quedo asociado al grupo sin crear una cuenta nueva
    And soy redirigido al Dashboard del grupo

  Scenario 04: Link expirado o inválido
    Given recibí un link de invitación expirado, inválido o revocado
    When intento acceder al link
    Then veo un mensaje claro indicando que el link no es válido
    And veo cómo solicitar uno nuevo

  Scenario 05: Usuario ya miembro del grupo
    Given ya soy miembro del grupo
    And accedo a un link de invitación válido de ese mismo grupo
    When ingreso al link
    Then soy redirigido al Dashboard del grupo
    And mi membresía no se duplica
```

### E03 Settings / US-19 — Vincular miembros sin cuenta a miembros con cuenta

> *Como admin del grupo, quiero poder vincular miembros sin cuenta a miembros con cuenta, para que el historial del miembro sin cuenta se transfiera al miembro con cuenta.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-19 — Vincular miembros sin cuenta a miembros con cuenta

  Scenario 01: Opción disponible para miembro sin cuenta
    Given soy admin del grupo activo
    And existe un miembro sin cuenta en el grupo
    When accedo a settings
    And abro las opciones de ese miembro
    Then veo la opción "Vincular cuenta"

  Scenario 02: Apertura del modal de vinculación
    Given soy admin del grupo activo
    And existe un miembro sin cuenta en el grupo
    When accedo a settings
    And abro las opciones de ese miembro
    And selecciono "Vincular cuenta"
    Then veo un modal de vinculación
    And veo una lista de miembros del grupo con cuenta que no están vinculados a otro miembro sin cuenta
    And veo el botón "Confirmar"
    And veo el botón "Cancelar"

  Scenario 03: Cierre del modal sin confirmar
    Given el modal de vinculación está abierto
    When toco fuera del modal OR presiono ESC OR selecciono "Cancelar"
    Then el modal se cierra sin ejecutar ninguna acción

  Scenario 04: Confirmación de vinculación
    Given el modal de vinculación está abierto
    And seleccioné un miembro del grupo con cuenta que no está vinculado a otro miembro sin cuenta
    When selecciono el botón "Confirmar"
    Then la vinculación queda guardada
    And el historial del miembro sin cuenta se transfiere al miembro con cuenta seleccionado
    And la rotación del grupo se actualiza reemplazándolo por el miembro con cuenta

  Scenario 05: Eliminación del miembro sin cuenta luego de la vinculación
    Given existe un miembro sin cuenta que fue vinculado exitosamente a un miembro con cuenta
    When la vinculación queda confirmada
    Then el miembro sin cuenta se elimina de la lista de miembros del grupo
    And deja de aparecer en la configuración del grupo
    And no aparece en historiales ni en eventos pasados
    And toda su participación queda representada únicamente por el miembro con cuenta vinculado  
```

---

### E04 Dashboard / US-20 — Votación de restaurants

> *Como miembro, quiero que el cuadrante del evento muestre la votación cuando se encuentra en Closed, para elegir los restaurantes favoritos.*

**Acceptance Criteria — Gherkin**

```gherkin
Feature: US-20 — Votación de restaurants

  Scenario 01: Evento con status "closed"
    Given el grupo está configurado
    And soy miembro no organizador
    And existe un evento "closed" para el evento actual
    When accedo al dashboard del grupo
    Then veo el cuadrante de evento con el estado "CERRADO", el resumen final de asistentes y sin botones de confirmación activos
    And veo el botón "Votar"

  Scenario 02: Completar votación
    Given existe un evento "closed" para el evento actual
    And estoy viendo el cuadrante de evento
    When toco "Votar"
    Then veo un modal con la votación 1 a 5 estrellas y el campo Comentarios
    And el botón "Enviar"

  Scenario 03: Enviar votación
    Given seleccione las estrellas y complete los Comentarios
    When toco "Enviar"
    Then se guarda la puntuación enviada
    And vuelvo al dashboard del grupo activo

  Scenario 04: Usuario ya votó
    Given ya envié una votación para el evento
    When accedo al dashboard
    Then no veo el botón "Votar"
```

---
*Joaquin Fernandez Sinchi — Product Manager · A-CSPO | Buenos Aires, Argentina | Marzo 2026*