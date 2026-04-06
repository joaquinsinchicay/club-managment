# PDD — US-04 · Selector de club activo en el dashboard

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E02 · Navegación |
| User Story | Como usuario con acceso a más de un club, quiero ver y cambiar el club activo desde el dashboard, para operar dentro del contexto correcto. |
| Prioridad | Alta |
| Objetivo de negocio | Permitir que un usuario multi-club cambie explícitamente el contexto operativo sin ambigüedad y sin acceso cross-club. |

---

## 2. Problema a resolver

Cuando un usuario pertenece a más de un club, el sistema necesita exponer qué club está activo y permitir cambiarlo de forma segura. Sin este selector, el usuario no puede controlar el contexto sobre el cual se calculan permisos, navegación y datos visibles.

---

## 3. Objetivo funcional

El dashboard debe mostrar un selector de club activo únicamente cuando el usuario tenga más de una membership activa. El club activo vigente se identifica en el upper bar compartido de la aplicación. Al elegir otro club disponible, el backend debe validar acceso, persistir la preferencia y refrescar la interfaz para reflejar el nuevo contexto.

---

## 4. Alcance

### Incluye
- Render del selector de club activo en dashboard para usuarios multi-club.
- Ocultamiento del selector para usuarios con un solo club activo.
- Cambio de club activo con persistencia.
- Rehidratación del dashboard según el nuevo club.
- Restricción de opciones del selector a memberships activas del usuario.

### No incluye
- Selector de club en otras pantallas fuera del dashboard.
- Navegación por URL con slug del club.
- Cambios de permisos fuera de los derivados por el nuevo club activo.

---

## 5. Actor principal

Usuario autenticado con una o más memberships activas.

---

## 6. Precondiciones

- Existe sesión autenticada válida.
- El sistema resuelve memberships activas del usuario.
- El backend persiste `last_active_club_id` y el club activo en request/cookie.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Usuario con un solo club | El dashboard no muestra selector. |
| Usuario con múltiples clubes | El dashboard muestra selector y el club activo actual se identifica en el upper bar. |
| Usuario cambia club | El club activo se actualiza y el dashboard se recarga en el nuevo contexto. |
| Usuario intenta elegir club no disponible | La operación se rechaza sin cambiar el contexto. |

---

## 8. Reglas de negocio

- El selector solo muestra clubes donde la membership del usuario está en `activo`.
- El cambio de club activo debe validarse server-side.
- Un cambio exitoso debe persistir `last_active_club_id`.
- Si el club activo actual ya no es válido, el sistema debe elegir automáticamente otro club activo disponible.
- Nunca debe permitirse seleccionar o persistir un club sin acceso vigente.

---

## 9. Flujo principal

1. El usuario autenticado ingresa al dashboard.
2. El sistema resuelve sus memberships activas.
3. Si tiene más de una, el dashboard muestra el selector.
4. El usuario elige otro club del selector.
5. El backend valida pertenencia activa al club elegido.
6. El sistema actualiza el club activo y refresca el dashboard.

---

## 10. Flujos alternativos

### A. Usuario con un solo club

1. El dashboard carga con una única membership activa.
2. La UI no muestra selector.
3. El usuario opera directamente en ese club.

### B. Club inválido o no disponible

1. El usuario intenta actualizar el club activo a uno no disponible.
2. El backend detecta que no existe membership activa para ese club.
3. El sistema rechaza la operación y conserva el club vigente.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- El selector debe vivir dentro del dashboard.
- La opción actualmente activa debe quedar claramente indicada.
- El contexto activo no debe duplicarse en una card adicional del dashboard si ya está visible en el upper bar.
- El cambio debe sentirse inmediato y no ambiguo.
- Si el usuario tiene un solo club, la UI no debe mostrar controles innecesarios.
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
| label | `dashboard.club_selector.label` | Etiqueta del selector de club activo. |
| body | `dashboard.club_selector.helper` | Ayuda breve del selector. |
| status | `dashboard.club_selector.loading` | Estado visible durante el cambio de club. |
| feedback | `dashboard.feedback.active_club_updated` | Confirmación de cambio exitoso. |
| feedback | `dashboard.feedback.club_not_available` | Error por club no disponible. |

---

## 13. Persistencia

### Entidades afectadas
- `user_club_preferences`: READ para obtener `last_active_club_id`; UPDATE para persistir el nuevo club activo.
- `memberships`: READ para validar pertenencia activa al club destino.
- `clubs`: READ para construir el selector con nombres y slugs visibles.

Do not reference current code files.

---

## 14. Seguridad

- El backend debe validar siempre que el usuario pertenezca al club destino y que la membership esté `activo`.
- El selector no debe exponer clubes donde el usuario no pertenece.
- El cambio de contexto no debe habilitar lecturas ni acciones cross-club.
- No debe confiarse en el valor enviado por frontend sin validación.

---

## 15. Dependencias

- contracts: `Get current session context`, `Set active club`.
- domain entities: `memberships`, `clubs`, `user_club_preferences`.
- other US if relevant: US-05 para política de resolución inicial del club activo; US-06 para render del contexto activo en header.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Persistir un club inválido y romper navegación | Media | Alta | Validar pertenencia activa antes de actualizar preferencia. |
| Mostrar clubes no disponibles en selector | Media | Alta | Construir opciones solo desde memberships activas. |
| Retraso visual al cambiar club sin feedback | Media | Media | Mostrar estado y feedback de cambio. |
