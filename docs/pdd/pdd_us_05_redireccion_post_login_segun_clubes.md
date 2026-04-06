# PDD — US-05 · Redirección post login según clubes del usuario

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E02 · Navegación |
| User Story | Como usuario autenticado, quiero ser redirigido automáticamente después de iniciar sesión según los clubes a los que pertenezco, para acceder rápidamente al contexto correcto. |
| Prioridad | Alta |
| Objetivo de negocio | Resolver automáticamente el destino post-login en un contexto multi-club, usando únicamente memberships activas y respetando la preferencia previa cuando siga siendo válida. |

---

## 2. Problema a resolver

Después de autenticarse, un usuario puede no tener clubes, tener uno o varios. El sistema necesita una política consistente para decidir si debe ir a espera de aprobación o a dashboard, y en qué club debe entrar.

---

## 3. Objetivo funcional

El proceso de login debe:

- enviar a espera de aprobación si no hay memberships activas
- redirigir al dashboard si existe al menos una membership activa
- priorizar el último club activo válido
- elegir otro club disponible si la preferencia previa ya no aplica

---

## 4. Alcance

### Incluye
- Resolución de destino en login y entrada al sistema.
- Reuso del último club activo válido.
- Fallback al primer club activo disponible si no hay preferencia válida.
- Exclusión de memberships no activas al resolver destino.

### No incluye
- Selector manual de club desde login.
- Procesamiento de invitaciones preexistentes.

---

## 5. Actor principal

Usuario autenticado que ingresa al sistema.

---

## 6. Precondiciones

- La autenticación ya fue resuelta.
- El sistema puede leer memberships del usuario y `last_active_club_id`.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Sin memberships activas | Ve pantalla de espera de aprobación. |
| Un solo club activo | Ingresa al dashboard de ese club. |
| Múltiples clubes con preferencia válida | Ingresa al dashboard del último club activo válido. |
| Múltiples clubes sin preferencia válida | Ingresa al dashboard de otro club activo disponible y se persiste como activo. |

---

## 8. Reglas de negocio

- Solo memberships con `status = activo` participan en la resolución.
- `last_active_club_id` solo debe reutilizarse si sigue perteneciendo al conjunto activo del usuario.
- Si no existe un club activo válido, el usuario no puede ir al dashboard.
- La resolución debe actualizar la preferencia cuando el fallback cambia el club elegido.

---

## 9. Flujo principal

1. El usuario inicia sesión.
2. El sistema recupera sus memberships activas.
3. Si no existen, redirige a espera de aprobación.
4. Si existe `last_active_club_id` válido, redirige a ese club.
5. Si no existe o ya no es válido, elige otro club activo disponible.
6. El sistema persiste ese club como activo y redirige al dashboard.

---

## 10. Flujos alternativos

### A. Preferencia inválida

1. Existe `last_active_club_id`.
2. El usuario ya no tiene membership activa en ese club.
3. El sistema ignora esa preferencia.
4. Selecciona otro club activo disponible.

### B. Memberships no activas

1. El usuario tiene memberships pero ninguna activa.
2. El sistema no considera esos clubes como destino.
3. Redirige a espera de aprobación.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La redirección debe ser automática y sin pasos manuales adicionales.
- La experiencia debe evitar estados ambiguos entre login y dashboard.
- Si no hay acceso operativo, la UI debe comunicarlo desde la pantalla de espera.

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
| status | `auth.login.redirecting_authenticated_user` | Mensaje de redirección automática post-login. |
| title | `auth.pending_approval.title` | Estado sin clubes activos disponibles. |
| body | `auth.pending_approval.description` | Explicación del acceso no operativo. |

---

## 13. Persistencia

### Entidades afectadas
- `memberships`: READ para identificar memberships activas.
- `user_club_preferences`: READ para recuperar el último club activo; UPDATE cuando el sistema debe definir uno nuevo.

Do not reference current code files.

---

## 14. Seguridad

- La redirección nunca debe usar clubes donde el usuario no tiene membership activa.
- El club activo inicial debe resolverse server-side.
- No debe confiarse en parámetros de frontend para el destino inicial.

---

## 15. Dependencias

- contracts: `Get current session context`, `Set active club`.
- domain entities: `memberships`, `user_club_preferences`.
- other US if relevant: US-01 para autenticación base; US-04 para cambio manual posterior del club activo.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Redirigir a un club ya no válido | Media | Alta | Validar `last_active_club_id` contra memberships activas en cada ingreso. |
| Enviar al dashboard a usuarios sin acceso operativo | Baja | Alta | Filtrar solo memberships activas. |
| No persistir fallback y repetir comportamiento errático | Media | Media | Actualizar preferencia cuando el fallback cambia el club activo. |

