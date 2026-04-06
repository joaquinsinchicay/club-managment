# PDD — US-06 · Visualización del rol en el club activo en el header

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E02 · Navegación |
| User Story | Como usuario autenticado, quiero ver mi nombre y mi rol dentro del club activo en el header, para entender rápidamente qué permisos tengo en ese contexto. |
| Prioridad | Alta |
| Objetivo de negocio | Hacer explícito el contexto operativo del usuario dentro del club activo y reflejar visualmente que los permisos dependen del rol por membership. |

---

## 2. Problema a resolver

En un sistema multi-club, el usuario necesita confirmar rápidamente quién es dentro del contexto actual y qué rol operativo tiene en ese club. Sin esa señal, puede haber confusión respecto de permisos y acciones disponibles.

---

## 3. Objetivo funcional

El header de pantallas autenticadas debe mostrar el nombre del club activo y un mensaje de bienvenida con el nombre del usuario y el rol correspondiente a ese contexto. Si cambia el club activo, el texto debe actualizarse para reflejar el nuevo club y el nuevo rol.

---

## 4. Alcance

### Incluye
- Render del nombre del club activo en header.
- Render del nombre del usuario en header.
- Render del rol del usuario en el club activo.
- Actualización automática del mensaje cuando cambia el club activo.
- Omisión del mensaje de rol cuando no existe membership activa en el club resuelto.

### No incluye
- Render del header en pantallas públicas.
- Cambios de permisos por fuera del contexto ya resuelto.

---

## 5. Actor principal

Usuario autenticado con club activo resuelto.

---

## 6. Precondiciones

- Existe sesión autenticada válida.
- El sistema conoce el club activo y la membership activa asociada.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Usuario con club y rol activo | Ve nombre de club y mensaje con nombre y rol en header. |
| Usuario cambia de club | El header actualiza el club y el rol mostrados. |
| Usuario sin rol activo en el club | No se muestra mensaje de rol operativo. |
| Usuario no autenticado | No se renderiza header privado. |

---

## 8. Reglas de negocio

- El rol visible debe provenir de la membership activa del club activo.
- El rol mostrado es contextual al club, no global.
- El nombre del club visible debe provenir del club activo resuelto server-side.
- El texto del header debe cambiar cuando cambia el club activo.
- Si no existe membership activa válida, no debe mostrarse un mensaje que induzca permisos inexistentes.

---

## 9. Flujo principal

1. El usuario autenticado abre una pantalla privada.
2. El sistema resuelve club activo y membership activa.
3. El header renderiza el nombre del club.
4. El header renderiza el mensaje con nombre del usuario y rol en ese club.

---

## 10. Flujos alternativos

### A. Cambio de club

1. El usuario cambia el club activo desde el dashboard.
2. La sesión se rehidrata con el nuevo club activo.
3. El header actualiza el mensaje usando el nuevo rol.

### B. Sin membership activa

1. El sistema no encuentra membership activa para el club resuelto.
2. El header no muestra mensaje de rol operativo.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- El mensaje debe ser compacto y persistente dentro del header.
- El nombre del club activo es la referencia principal del contexto y no debe duplicarse en una card introductoria del dashboard.
- Debe ser legible en mobile.
- No debe mostrar información contradictoria con los permisos efectivos.
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
| fallback | `header.pending_club_label` | Label cuando todavía no hay club activo. |
| body | `header.welcome_message_single` | Mensaje del header cuando la membership tiene un solo rol. |
| body | `header.welcome_message_multiple` | Mensaje del header cuando la membership combina múltiples roles. |
| label | `settings.club.members.roles.admin` | Label legible para rol admin. |
| label | `settings.club.members.roles.secretaria` | Label legible para rol secretaria. |
| label | `settings.club.members.roles.tesoreria` | Label legible para rol tesoreria. |

---

## 13. Persistencia

### Entidades afectadas
- `memberships`: READ para obtener el rol contextual.
- `clubs`: READ para mostrar el nombre del club activo.
- `users`: READ para mostrar el nombre del usuario autenticado.

Do not reference current code files.

---

## 14. Seguridad

- El rol visible debe derivarse de la misma resolución server-side que gobierna permisos.
- No debe inferirse el rol desde estado local no validado.
- La UI no puede ser fuente de verdad de permisos.

---

## 15. Dependencias

- contracts: `Get current session context`.
- domain entities: `users`, `memberships`, `clubs`.
- other US if relevant: US-04 para cambio de club activo; US-02 para presencia del header y avatar.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Mostrar rol incorrecto tras un cambio de club | Media | Alta | Rehidratar contexto desde backend después de cambiar el club activo. |
| Usar etiquetas de rol inconsistentes | Media | Media | Reutilizar labels centralizados de roles desde `lib/texts.json`. |
| Mostrar mensaje de rol sin membership válida | Baja | Media | Omitir el mensaje cuando no exista membership activa resuelta. |
