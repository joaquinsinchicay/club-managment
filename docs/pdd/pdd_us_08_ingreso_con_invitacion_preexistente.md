# PDD — US-08 · Ingreso al club con invitación preexistente al iniciar sesión con Google

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E01 · Autenticación y gestión de roles |
| User Story | Como usuario invitado a un club, quiero que al iniciar sesión con Google el sistema reconozca mi invitación y me otorgue acceso al club con el rol asignado, para comenzar a usar el sistema sin pasos manuales adicionales. |
| Prioridad | Alta |
| Objetivo de negocio | Convertir invitaciones pendientes en memberships activas durante el login, minimizando pasos manuales y manteniendo independencia entre clubes. |

---

## 2. Problema a resolver

Las invitaciones registradas por un admin todavía no tienen un mecanismo automático de activación. El login con Google debe poder reconciliar email autenticado con invitaciones pendientes y convertirlas en acceso operativo válido.

---

## 3. Objetivo funcional

Durante el proceso de login exitoso, el sistema debe buscar invitaciones pendientes por email autenticado, crear memberships activas para los clubes correspondientes cuando todavía no existan, marcar esas invitaciones como usadas y luego resolver el destino post-login considerando esas nuevas memberships.

---

## 4. Alcance

### Incluye
- Búsqueda de invitaciones pendientes por email autenticado.
- Conversión de invitaciones válidas en memberships activas.
- Marcado de invitaciones como usadas.
- Soporte para una o múltiples invitaciones.
- Compatibilidad con usuarios nuevos y usuarios ya existentes.

### No incluye
- Reconciliación por emails distintos al autenticado.
- Flujos de aceptación manual fuera del login.
- Reenvío o expiración administrativa de invitaciones.

---

## 5. Actor principal

Usuario que inicia sesión con Google.

---

## 6. Precondiciones

- La autenticación con Google ya fue validada.
- El sistema conoce el email autenticado.
- Existen invitaciones pendientes opcionales en `club_invitations`.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Usuario nuevo con invitación | Se crea su usuario y también su membership activa en el club invitante. |
| Usuario existente con invitación | Se agrega la membership faltante al club invitante. |
| Múltiples invitaciones válidas | Se crean memberships activas para cada club faltante y se define un club activo inicial válido. |
| Invitación usada o sin coincidencia | No se vuelve a procesar ni se crean duplicados. |

---

## 8. Reglas de negocio

- Solo se procesan invitaciones cuyo email coincide exactamente con el email autenticado.
- Solo se procesan invitaciones pendientes y no usadas.
- Si ya existe una membership para ese club, no se crea una segunda; la invitación debe quedar consumida o no re-procesable.
- Cada invitación crea una membership independiente del resto de clubes del usuario.
- El destino post-login debe recalcularse después de convertir invitaciones en memberships.

---

## 9. Flujo principal

1. El usuario completa login con Google.
2. El sistema sincroniza o crea el usuario global.
3. El backend busca invitaciones pendientes por email autenticado.
4. Por cada invitación válida, crea una membership activa si aún no existe.
5. Marca la invitación como usada.
6. Recalcula el club activo y el destino post-login.
7. Redirige al usuario según el flujo general.

---

## 10. Flujos alternativos

### A. Invitación ya usada

1. Existe una invitación histórica para el email.
2. La invitación ya tiene estado usado o `used_at`.
3. El sistema no la reprocesa.

### B. Usuario ya pertenece al club invitado

1. La invitación coincide con el email autenticado.
2. El usuario ya tiene membership para ese club.
3. No se crea una membership duplicada.
4. La invitación no debe volver a causar efectos posteriores.

### C. Múltiples invitaciones

1. El email autenticado tiene varias invitaciones pendientes.
2. El sistema procesa cada una de forma independiente.
3. Crea memberships activas en los clubes faltantes.
4. Elige un club activo inicial válido para la sesión.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- El procesamiento debe ser transparente para el usuario.
- No debe agregar pantallas intermedias innecesarias.
- El usuario debe llegar a dashboard si ya tiene acceso operativo luego del login.
- Si ninguna invitación válida produce acceso operativo, se aplica el flujo general de espera.

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
| status | `auth.login.redirecting_authenticated_user` | Estado durante resolución de acceso. |
| body | `auth.login.helper` | Explicación general del acceso. |
| title | `auth.pending_approval.title` | Fallback cuando no quedan memberships activas. |
| body | `auth.pending_approval.description` | Explicación del estado sin acceso operativo. |

---

## 13. Persistencia

### Entidades afectadas
- `club_invitations`: READ para buscar invitaciones pendientes por email; UPDATE para marcar invitaciones usadas.
- `memberships`: INSERT para crear memberships activas a partir de invitaciones; READ para evitar duplicados.
- `users`: INSERT/UPDATE según el flujo general de login.
- `user_club_preferences`: UPDATE indirecto cuando la resolución post-login define un club activo.

Do not reference current code files.

---

## 14. Seguridad

- El match de invitaciones debe hacerse exclusivamente con el email autenticado confiable.
- No deben procesarse invitaciones de otros emails.
- El alta de memberships debe respetar el aislamiento por club y evitar duplicados.
- El backend debe resolver el destino final; nunca el frontend.

---

## 15. Dependencias

- auth: login Google del sistema.
- contracts: `Invite club member`, `Get current session context`, `Set active club`.
- domain entities: `users`, `memberships`, `club_invitations`, `user_club_preferences`.
- other US if relevant: US-01 para autenticación base; US-05 para redirección post-login; US-07 para creación de invitaciones.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Crear memberships duplicadas al reprocesar invitaciones | Media | Alta | Verificar memberships existentes por club antes de insertar. |
| Aplicar invitaciones a un email distinto | Baja | Alta | Usar solo el email autenticado por proveedor. |
| Procesar parcialmente múltiples invitaciones | Media | Media | Iterar y marcar cada invitación usada luego de su tratamiento. |

