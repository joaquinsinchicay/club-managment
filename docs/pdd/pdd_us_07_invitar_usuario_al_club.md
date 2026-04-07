# PDD — US-07 · Invitar usuario al club

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E01 · Autenticación y gestión de roles |
| User Story | Como administrador, quiero invitar un usuario al club activo asignándole un rol, para incorporarlo al sistema con los permisos correctos. |
| Prioridad | Alta |
| Objetivo de negocio | Permitir que un admin prepare el acceso de nuevos o futuros usuarios al club activo sin duplicar membresías ni afectar otros clubes. |

---

## 2. Problema a resolver

La gestión de miembros ya permite aprobar pendientes y administrar memberships existentes, pero todavía no existe una forma de registrar invitaciones para personas que aún no ingresaron con Google o que todavía no están asociadas al club activo.

---

## 3. Objetivo funcional

Dentro de la configuración del club activo, un `admin` debe poder abrir un formulario de invitación, ingresar email y un rol inicial, validar esos datos y registrar una invitación pendiente para el club activo. Si el usuario ya pertenece al club, la acción debe bloquearse. La invitación pendiente debe quedar visible en la misma pantalla de configuración como estado previo al alta operativa, hasta que el usuario invitado ingrese con Google y la invitación sea consumida.

---

## 4. Alcance

### Incluye
- Acción visible de invitar usuario dentro de settings del club activo.
- Formulario con email, rol inicial, confirmación y cancelación.
- Validaciones de email requerido, formato y rol requerido.
- Persistencia de invitación pendiente en `club_invitations`.
- Visualización de invitaciones pendientes del club activo dentro del bloque de miembros/configuración.
- Bloqueo de invitaciones a usuarios que ya pertenecen al club activo.

### No incluye
- Envío real de email.
- Aceptación manual de invitación fuera del login.
- Alta inmediata de membership operativa antes del login.

---

## 5. Actor principal

Usuario autenticado con rol `admin` y membership `activo` en el club activo.

---

## 6. Precondiciones

- El usuario tiene acceso a la pantalla de configuración del club activo.
- Existe un club activo válido en sesión.
- La tabla `club_invitations` está disponible para persistencia.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Invitación válida | Se crea una invitación pendiente para el email y rol inicial seleccionado en el club activo. |
| Invitación válida visible en settings | La invitación pendiente aparece listada en la configuración del club con rol y estado pendiente. |
| Usuario ya pertenece al club | No se crea invitación ni membership duplicada. |
| Email inválido o faltante | La invitación no se procesa. |
| Rol faltante o inválido | La invitación no se procesa. |

---

## 8. Reglas de negocio

- Solo `admin` puede invitar usuarios desde el club activo.
- La invitación siempre se registra para el club activo y nunca para otros clubes.
- No debe crearse una membership duplicada si ya existe pertenencia al club activo.
- La invitación debe guardar un único rol inicial que será aplicado cuando el usuario ingrese.
- Los roles adicionales, si hicieran falta, se administran luego desde la gestión de miembros del club.
- La invitación se registra con estado pendiente hasta ser consumida o descartada.
- La visibilidad en settings no convierte la invitación en membership activa ni reemplaza el consumo posterior en login.

---

## 9. Flujo principal

1. El admin abre configuración del club activo.
2. La UI muestra una acción para invitar usuario.
3. El admin abre el formulario.
4. Ingresa email y rol.
5. El sistema valida datos y contexto.
6. El backend registra una invitación pendiente para el club activo.
7. La UI muestra confirmación.
8. La invitación pendiente queda visible en settings con su rol y estado pendiente.

---

## 10. Flujos alternativos

### A. Usuario ya pertenece al club

1. El admin ingresa el email de un usuario ya asociado al club activo.
2. El sistema detecta membership existente.
3. La invitación se bloquea y la UI muestra mensaje de conflicto.

### B. Cancelación del formulario

1. El admin abre el formulario de invitación.
2. Selecciona cancelar.
3. El formulario se cierra sin persistir cambios.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La acción de invitar usuario debe ser visible dentro de settings.
- El formulario debe ser breve, mobile-first y con jerarquía clara.
- Debe poder cerrarse sin crear efectos persistentes.
- Las invitaciones pendientes deben poder distinguirse visualmente de las memberships activas.
- Los errores deben mostrarse con feedback directo y breve.
- Al enviar la invitación, el CTA debe entrar en loading de inmediato y el formulario debe quedar bloqueado hasta resolver la acción.
- El resultado final debe informarse mediante toast y no con feedback inline transitorio.
- No debe haber textos hardcodeados.

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
| title | `settings.club.invitations.section_title` | Título del bloque de invitaciones. |
| body | `settings.club.invitations.section_description` | Descripción del flujo de invitación. |
| action | `settings.club.invitations.toggle_cta` | Abrir formulario de invitación. |
| label | `settings.club.invitations.email_label` | Campo email. |
| label | `settings.club.invitations.role_label` | Campo rol. |
| action | `settings.club.invitations.invite_cta` | Confirmar invitación. |
| status | `settings.club.invitations.invite_loading` | Estado visible mientras se registra la invitación. |
| action | `settings.club.invitations.cancel_cta` | Cancelar formulario. |
| feedback | `settings.club.invitations.feedback.invitation_created` | Confirmación de éxito. |
| feedback | `settings.club.invitations.feedback.already_member` | Usuario ya pertenece al club. |
| feedback | `settings.club.invitations.feedback.email_required` | Email faltante. |
| feedback | `settings.club.invitations.feedback.email_invalid` | Email inválido. |
| feedback | `settings.club.invitations.feedback.role_required` | Rol faltante. |

---

## 13. Persistencia

### Entidades afectadas
- `club_invitations`: INSERT para registrar invitación pendiente; READ para detectar invitaciones activas si se decide evitar duplicados posteriores.
- `memberships`: READ para validar que el usuario todavía no pertenece al club activo.
- `users`: READ opcional para cruzar email existente sin asumir pertenencia operativa.

Do not reference current code files.

---

## 14. Seguridad

- Solo `admin` del club activo puede crear invitaciones.
- El backend debe validar que la invitación se crea dentro del club activo.
- No debe permitirse invitar miembros de otros clubes fuera del contexto resuelto.
- La UI no puede ser fuente de verdad para permisos ni validaciones.

---

## 15. Dependencias

- contracts: `Invite club member`.
- domain entities: `club_invitations`, `memberships`, `users`.
- permissions: matriz donde `admin` puede invitar miembros.
- other US if relevant: US-08 para consumo automático de la invitación en login.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Duplicar pertenencias por invitar a alguien ya miembro | Media | Alta | Validar memberships existentes por email y club antes de insertar. |
| Registrar invitación en club incorrecto | Baja | Alta | Tomar siempre el club desde la sesión activa resuelta server-side. |
| Aceptar emails inválidos y dejar basura operativa | Media | Media | Validar formato y obligatoriedad antes de persistir. |
