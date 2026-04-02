# PDD · US-02 — Avatar con menú de sesión en el header

## 1. Objetivo

Definir el diseño funcional y técnico de la user story `US-02 — Avatar con menú de sesión en el header`, alineado con el backlog del MVP, las decisiones de arquitectura, la matriz de permisos, el modelo de dominio y el design system del repositorio.

Esta funcionalidad debe permitir que un usuario autenticado:

* vea su avatar en el header global
* abra un menú de sesión simple y consistente
* acceda a `Configuración del club` solo si es `admin` del club activo
* cierre sesión desde cualquier pantalla autenticada

---

## 2. Referencias del repositorio

Fuentes usadas para este PDD:

* `docs/product/backlog_us_mvp.md`
* `docs/architecture/decisions.md`
* `docs/architecture/tech-stack.md`
* `docs/contracts/api-contracts.md`
* `docs/contracts/permission-matrix.md`
* `docs/domain/domain-model.md`
* `docs/database/README.md`
* `docs/design/design-system.md`
* `docs/pdd/pdd_us_01_google_sign_in.md`

---

## 3. User Story

> Como usuario autenticado, quiero ver mi avatar en el header y poder acceder a la configuración del club (si soy admin) y cerrar sesión desde ahí.

---

## 4. Acceptance Criteria Base

La implementación debe cubrir los escenarios ya definidos en backlog:

1. Avatar visible en el header.
2. Menú del avatar para usuario no admin.
3. Menú del avatar para usuario admin.
4. Acceso a configuración del club.
5. Intento de acceso a configuración sin permisos.
6. Cierre de sesión desde el avatar.
7. Cierre del menú sin acción.

---

## 5. Alcance

### Incluido

* header global persistente en pantallas autenticadas
* visualización de avatar del usuario
* fallback a iniciales si no hay foto
* menú desplegable del avatar
* item `Configuración del club` solo para `admin`
* item `Cerrar sesión`
* confirmación antes de cerrar sesión
* redirección a login después del sign out
* protección de acceso a la página de configuración del club

### No incluido

* edición de perfil
* cambio de avatar
* administración de notificaciones
* selector de club
* contenido interno de configuración del club

Esos puntos pertenecen a otras historias o futuras extensiones.

---

## 6. Resultado esperado de negocio

La funcionalidad debe hacer visible el contexto de sesión y ofrecer una salida segura y clara:

* el usuario siempre puede ubicarse dentro de una sesión autenticada
* el acceso a configuración se expone solo cuando realmente corresponde por rol
* el cierre de sesión está disponible y no genera estados ambiguos

---

## 7. Actores

### Usuario autenticado no admin

Ve su avatar y solo puede cerrar sesión desde el menú.

### Usuario autenticado admin

Ve su avatar y puede:

* ir a configuración del club
* cerrar sesión

### Usuario no autenticado

No debe ver información de sesión ni usar este menú.

---

## 8. Reglas funcionales

1. El header es persistente en todas las pantallas autenticadas.
2. El avatar debe mostrarse siempre que exista sesión autenticada.
3. Si el usuario tiene `avatar_url`, se muestra la imagen.
4. Si no tiene `avatar_url`, se muestran sus iniciales.
5. La opción `Configuración del club` solo se renderiza si la membership activa del usuario en el club activo tiene rol `admin` y estado `activo`.
6. La opción `Cerrar sesión` siempre está disponible para cualquier usuario autenticado.
7. El control visual del menú no reemplaza la validación backend de permisos.
8. Intentar acceder manualmente a configuración sin permisos debe bloquearse.
9. El menú debe poder cerrarse sin ejecutar acciones.

---

## 9. Flujo UX

## 9.1 Visualización del header

En cualquier pantalla autenticada el usuario ve:

* contexto del club
* nombre y rol si corresponde por historias relacionadas
* avatar del usuario en esquina superior derecha

Esta historia se enfoca en el bloque de avatar y menú.

## 9.2 Apertura del menú

Cuando el usuario toca o hace click en el avatar:

* se abre un menú contextual anclado al avatar
* el menú muestra acciones según rol

## 9.3 Variantes del menú

### Usuario no admin

Acciones visibles:

* `Cerrar sesión`

### Usuario admin

Acciones visibles:

* `Configuración del club`
* `Cerrar sesión`

## 9.4 Acceso a configuración

Cuando un admin selecciona `Configuración del club`:

* el menú se cierra
* el sistema navega a la página de configuración del club activo

## 9.5 Cierre de sesión

Cuando el usuario selecciona `Cerrar sesión`:

* se abre un diálogo de confirmación
* si confirma, se ejecuta sign out
* se invalida la sesión
* se redirige a login

## 9.6 Cierre sin acción

El menú debe cerrarse cuando:

* se hace click fuera
* se vuelve a tocar el avatar
* se presiona `Esc`

---

## 10. Pantallas y estados

## 10.1 Header autenticado

### Elementos mínimos del bloque de usuario

* avatar
* área clickeable de al menos 44px
* menú contextual asociado

### Estados

* closed
* open
* disabled solo si hubiera carga de sesión, no como estado normal de operación

## 10.2 Menú del avatar

### Estado cerrado

Solo se ve el avatar.

### Estado abierto

Se ve lista corta de acciones.

Reglas:

* menú compacto
* labels explícitos
* una acción por línea
* sin ruido visual

## 10.3 Diálogo de confirmación de cierre de sesión

### Objetivo

Evitar cierres accidentales de sesión.

### Contenido mínimo

* título de confirmación
* texto breve
* acción primaria destructiva o explícita
* acción secundaria para cancelar

---

## 11. Diseño visual y comportamiento

Basado en `docs/design/design-system.md`:

1. El header debe ser compacto y persistente.
2. El avatar menu es parte del header global.
3. Debe haber claridad operativa por encima de ornamentación.
4. Los labels deben ser explícitos.
5. El componente debe funcionar bien en mobile y desktop.
6. El menú debe ser liviano, escaneable y sin sobrecarga visual.

### Reglas específicas propuestas

* avatar circular
* imagen centrada y recortada
* fallback de iniciales en fondo neutro
* menú alineado al borde derecho del header
* cierre del menú al navegar

---

## 12. Modelo de datos impactado

## 12.1 Entidades involucradas

### User

Campos relevantes:

* `id`
* `full_name`
* `avatar_url`
* `email`

### Membership

Campos relevantes:

* `user_id`
* `club_id`
* `role`
* `status`

### UserClubPreference

Campo relevante:

* `last_active_club_id`

## 12.2 Reglas de uso de datos

1. El header debe tomar datos del usuario autenticado.
2. La visibilidad de `Configuración del club` depende de la membership del club activo.
3. Nunca se debe inferir rol desde frontend sin contexto backend confiable.

---

## 13. Contratos funcionales requeridos

Esta historia no necesita un contrato nuevo complejo, pero sí depende de contexto de sesión consistente.

## 13.1 Get current session context

Debe proveer al menos:

* usuario autenticado
* `active_club_id`
* memberships
* rol y estado para el club activo

## 13.2 Sign out

Debe existir una operación de cierre de sesión con estas garantías:

* invalidar sesión de Supabase
* limpiar estado de cliente si aplica
* redirigir a login

Si la implementación formaliza un contrato interno, debe mantener respuestas explícitas y consistentes con `docs/contracts/api-contracts.md`.

---

## 14. Lógica de negocio detallada

## 14.1 Render del avatar

Condición:

* existe sesión autenticada válida

Resultado:

* se muestra avatar con foto o fallback de iniciales

## 14.2 Menú para no admin

Condición:

* membership activa en club activo con rol distinto de `admin`

Resultado:

* no se muestra `Configuración del club`
* sí se muestra `Cerrar sesión`

## 14.3 Menú para admin

Condición:

* membership activa en club activo con rol `admin`

Resultado:

* se muestra `Configuración del club`
* se muestra `Cerrar sesión`

## 14.4 Acceso manual sin permisos

Condición:

* usuario autenticado intenta abrir ruta de configuración sin rol `admin`

Resultado:

* backend o guard de ruta bloquea acceso
* se devuelve mensaje de permisos insuficientes o redirección al dashboard

## 14.5 Cierre de sesión confirmado

Condición:

* usuario confirma diálogo de cierre

Resultado:

* sesión cerrada
* menú cerrado
* diálogo cerrado
* redirección a login

---

## 15. Permisos

Basado en `docs/contracts/permission-matrix.md`:

1. `admin` puede ver y usar configuración del club.
2. `secretaria` no puede acceder a configuración.
3. `tesoreria` no puede acceder a configuración.
4. Todos los permisos aplican dentro del `club activo`.
5. La membership debe estar en estado `activo`.

---

## 16. Requisitos técnicos

## 16.1 Frontend

* Next.js App Router
* header global reutilizable en layout autenticado
* Client Component para interacción del menú y diálogo
* navegación vía router del App Router

## 16.2 Backend

* resolución de sesión con Supabase Auth
* validación de permisos en rutas de configuración
* sign out integrado con Supabase

## 16.3 Seguridad

* no confiar solo en ocultar la opción en UI
* validar rol y estado en backend
* respetar aislamiento por club activo

---

## 17. Estados de error

## 17.1 Error cargando datos del usuario

Resultado:

* mostrar fallback seguro en header si la sesión existe pero faltan datos opcionales
* no romper layout

## 17.2 Error en cierre de sesión

Resultado:

* mantener usuario en pantalla actual
* mostrar mensaje de error recuperable
* permitir reintentar

## 17.3 Error de acceso a configuración

Resultado:

* no renderizar página protegida
* mostrar mensaje de permisos o redirigir

---

## 18. Copys sugeridos

## 18.1 Menú

* `Configuración del club`
* `Cerrar sesión`

## 18.2 Diálogo de cierre de sesión

### Título

`¿Querés cerrar sesión?`

### Texto

`Vas a salir de tu sesión actual y volver a la pantalla de ingreso.`

### Acciones

* primaria: `Cerrar sesión`
* secundaria: `Cancelar`

## 18.3 Error de permisos

`No tenés permisos para acceder a la configuración del club activo.`

---

## 19. Accesibilidad y usabilidad

1. El avatar debe tener nombre accesible.
2. El menú debe ser navegable por teclado.
3. `Esc` debe cerrar menú y diálogo.
4. El foco debe moverse correctamente al abrir y cerrar overlays.
5. El contraste del menú y sus opciones debe ser legible.
6. El target táctil del avatar y opciones debe ser de al menos 44px.

---

## 20. Casos límite

1. Usuario autenticado sin `avatar_url`.
2. Usuario con `full_name` vacío o parcial.
3. Usuario con sesión válida pero membership no activa en el club actual.
4. Usuario que cambia de club en historias posteriores y modifica su rol visible.
5. Usuario que intenta entrar por URL directa a configuración.
6. Doble click rápido sobre avatar.
7. Confirmación de cierre mientras el menú todavía está abierto.

---

## 21. Testing sugerido

## 21.1 Manual

1. Usuario autenticado con avatar visible.
2. Usuario sin foto ve iniciales.
3. Usuario no admin abre menú y ve solo `Cerrar sesión`.
4. Usuario admin abre menú y ve ambas opciones.
5. Admin navega correctamente a configuración.
6. No admin intenta entrar por URL directa y es bloqueado.
7. Cierre del menú con click afuera.
8. Cierre del menú con segundo click en avatar.
9. Cierre del menú con `Esc`.
10. Sign out confirmado redirige a login.
11. Sign out cancelado mantiene sesión.

## 21.2 Integración

Validar:

* render del header con contexto de sesión
* visibilidad condicional por rol
* guard de ruta para configuración
* invalidación de sesión en sign out

## 21.3 Seguridad

Validar:

* un no admin no puede acceder a configuración aunque fuerce la URL
* la validación usa membership del club activo
* la UI no es la única barrera de permisos

---

## 22. Dependencias

Para implementar US-02 se necesita:

* US-01 resuelta o equivalente de autenticación operativa
* contexto de sesión disponible en layouts autenticados
* resolución de club activo
* ruta base de configuración del club

---

## 23. Riesgos

1. Exponer `Configuración del club` a usuarios no admin por depender solo del frontend.
2. Inconsistencia visual si el header no consume una única fuente de verdad de sesión.
3. Mala UX si el diálogo de cierre agrega fricción innecesaria o si el menú se comporta distinto en mobile y desktop.
4. Errores de navegación si el guard de configuración no está centralizado.

---

## 24. Criterio de Done

US-02 está completa cuando:

1. el avatar aparece en todas las pantallas autenticadas
2. el menú muestra opciones correctas según rol
3. la configuración del club solo es accesible para `admin`
4. el cierre de sesión funciona con confirmación
5. el usuario vuelve a login después de cerrar sesión
6. el menú puede cerrarse sin acción por todos los mecanismos definidos
7. los siete acceptance criteria del backlog pasan validación manual

---

## 25. Supuestos explícitos

1. La página de configuración del club existe o será implementada por historias siguientes.
2. El header global ya cuenta o contará con contexto de usuario y club activo.
3. El rol visible para decidir acciones se obtiene desde la membership activa, no desde claims arbitrarios de cliente.
