# Club Management · Design System V1.0

Referencia única de tokens, componentes y patterns para todos los módulos. Lo que no está acá, no existe todavía — si lo necesitás, agregalo acá primero.

**Mobile-first · 420px** | **Desktop · 1180px** | **Tema claro** | **es-AR · ARS/USD**

---

## 01 · Principios

Lo que define el look & feel del producto.

| # | Principio | Descripción |
|---|-----------|-------------|
| 01 | **Operacional antes que bonito** | La información que el usuario necesita para decidir ahora va primero. Decorar es opcional; priorizar es obligatorio. |
| 02 | **Un color, un significado** | Verde = ingreso/OK. Rojo = egreso/crítico. Ámbar = pendiente. Azul = informativo/Tesorería. Violeta = Config/Pro. Nunca mezclar semánticas. |
| 03 | **Números con sangre fría** | Montos con `font-feature-settings: "tnum"` y signo explícito (+ / −). Separador es-AR: `$ 1.284.000,00`. |
| 04 | **Mobile-first, desktop-responsive** | Diseñar en 420px. Expandir a 1180px con grid-areas. El mismo HTML, dos layouts. |
| 05 | **Touch-first** | Todo lo clickable mide 44px mínimo. Botones secundarios también. La excepción confirma la regla. |
| 06 | **Sin ornamentos** | Sin gradientes innecesarios, sin iconografía decorativa, sin sombras gratis. Si no aporta información, fuera. |

---

## 02 · Tokens base

Todos los tokens viven en `:root`. Copiar este bloque al inicio de cada página nueva.

```css
:root {
  /* Colors */
  --green: #10B981;   --green-050: #ECFDF5;   --green-700: #047857;
  --red:   #EF4444;   --red-050:   #FEF2F2;   --red-700:   #B91C1C;
  --amber: #F59E0B;   --amber-050: #FFFBEB;   --amber-700: #B45309;
  --blue:  #3B82F6;   --blue-050:  #EFF6FF;   --blue-700:  #1D4ED8;
  --indigo:#6366F1;   --indigo-050:#EEF2FF;   --indigo-700:#4338CA;
  --teal:  #14B8A6;   --teal-050:  #F0FDFA;   --teal-700:  #0F766E;
  --purple:#8B5CF6;   --purple-050:#F5F3FF;   --purple-700:#6D28D9;
  --pink:  #EC4899;   --pink-050:  #FDF2F8;   --pink-700:  #BE185D;
  /* escala slate completa: --slate-050 a --slate-900 */

  /* Neutrals */
  --bg:         #F6F7F9;
  --surface:    #FFFFFF;
  --ink:        var(--slate-900);
  --ink-muted:  var(--slate-500);
  --border:     var(--slate-200);

  /* Radii + shadows + touch */
  --radius-sm: 6px;   --radius: 8px;   --radius-md: 10px;   --radius-lg: 18px;
  --shadow-xs:  0 1px 0 rgba(15,23,42,0.04);
  --shadow-sm:  0 2px 8px -2px rgba(15,23,42,0.08);
  --shadow-md:  0 8px 40px -12px rgba(15,23,42,0.12);
  --shadow-pop: 0 16px 48px -8px rgba(15,23,42,0.18);
  --touch: 44px;
}
```

---

## 03 · Color

### Paleta semántica

Cada color tiene un uso fijo. No intercambiar ni inventar nuevos.

| Token | Hex | Uso |
|-------|-----|-----|
| `--green` | `#10B981` | Ingreso/OK · Botón Aprobar · Acento Secretaría · Deltas positivos |
| `--red` | `#EF4444` | Egreso/Crítico · Botón Danger · Errores |
| `--amber` | `#F59E0B` | Pendiente · Warning · Gestión de socios |
| `--blue` | `#3B82F6` | Informativo · Acento Tesorería |
| `--indigo` | `#6366F1` | Pro/Config · Acento Configuración |
| `--teal` | `#14B8A6` | Add-on · Ticketing |
| `--purple` | `#8B5CF6` | Usuarios |
| `--pink` | `#EC4899` | RRHH |

### Tonos semánticos (3 por color)

| Tono | Uso |
|------|-----|
| `-050` | Fondos suaves (badges, icon bg) |
| base | Elementos activos, acentos, botones |
| `-700` | Texto sobre `-050`, hover en primary |

Ejemplo green:
- `--green-050` `#ECFDF5` → Fondo de badges success, íconos de actividad +
- `--green` `#10B981` → Botón Aprobar, acento Secretaría, deltas positivos
- `--green-700` `#047857` → Texto sobre green-050, montos de ingreso, hover en primary-success

### Escala slate (neutrals)

La columna vertebral del texto y superficies. Usar siempre a través de tokens, nunca hex directo.

| Token | Hex | Uso |
|-------|-----|-----|
| `--slate-050` | `#F8FAFC` | Hover sutil, recon-row zebra, filter-chip bg |
| `--slate-100` | `#F1F5F9` | Badge neutral, chip backgrounds, sub-tab container |
| `--slate-200` | `#E2E8F0` | `--border`, divisores |
| `--slate-300` | `#CBD5E1` | Toggle OFF, borde de input idle |
| `--slate-400` | `#94A3B8` | Iconografía secundaria, arrow-right |
| `--slate-500` | `#64748B` | `--ink-muted`, subtitles, metas |
| `--slate-600` | `#475569` | Texto body secundario, ghost-link idle |
| `--slate-700` | `#334155` | Labels de forms, role value |
| `--slate-800` | `#1E293B` | Botón secondary texto, dark surfaces |
| `--slate-900` | `#0F172A` | `--ink`, primary button, brand mark, plan widget bg |

---

## 04 · Tipografía

Inter para UI, JetBrains Mono para código y IDs. Escala compacta y funcional.

| Nivel | Spec | Ejemplo de uso |
|-------|------|----------------|
| Display | 32px · 700 · -0.025em | Panel del día |
| H1 / Page title | 22px · 700 · -0.015em | Gestión de socios |
| H2 / Module title | 20px · 600 · -0.02em | Tesorería |
| H3 / Subsection | 16px · 700 · -0.01em | Conciliación pendiente |
| Card title | 14px · 600 · -0.005em | Saldos por cuenta |
| Body | 14px · 400 · 1.5lh | La jornada del día fue cerrada. Arqueo OK · 22 movimientos. |
| Small / label | 13px · 500 | Banco Galicia · Cta. corriente ARS |
| Meta / caption | 11px · 500 · slate-500 | 16/04 · 17:32 · M. Villarreal |
| Eyebrow | 10px · 600 · 0.1em · UPPER | PANEL DEL DÍA |
| Mono | JetBrains Mono · 13px | TX-2026-04-17-0042 |

---

## 05 · Radios y sombras

Cuatro radios, cuatro sombras. No inventar más.

### Radios

| Valor | Uso |
|-------|-----|
| `6px` (`--radius-sm`) | Chips, tags |
| `8px` (`--radius`) | Botones, inputs |
| `10px` (`--radius-md`) | Cards |
| `18px` (`--radius-lg`) | Phone shell |

### Sombras

| Token | Uso |
|-------|-----|
| `--shadow-xs` | Cards base |
| `--shadow-sm` | Sub-tab activo |
| `--shadow-md` | Phone shell |
| `--shadow-pop` | Menús, dropdowns |

---

## 06 · Botones

Un primary por bloque. Success sólo para acciones de confirmación (aprobar, conciliar).

### Variantes

| Clase | Uso |
|-------|-----|
| `.btn.btn--primary` | Acción dominante del bloque. Fondo slate-900. |
| `.btn.btn--secondary` | Acción alternativa. Borde, fondo transparente. |
| `.btn.btn--success` | Aprobar, conciliar, confirmar. Fondo green. |
| `.btn.btn--danger` | Anular, eliminar, cerrar jornada. Fondo red. |
| `.btn.btn--upgrade` | Upgrade de plan. Fondo indigo. |
| `.btn.btn--ghost` | Link-like. Sin borde, sin fondo. |

### Tamaños

| Clase | Alto | Uso |
|-------|------|-----|
| `.btn--sm` | 36px | Acciones inline en listas y cards densas |
| (default) | 44px | Estándar, touch-safe |
| `.btn--full` | 44px · ancho 100% | CTA principal en card footer y modales |

---

## 07 · Badges y pills

Badges tienen punto semántico + texto. Pills son tags categóricos tipográficos.

### Badges (estado)

`.badge.badge--<semantic>` · siempre con `.badge__dot` interno.

| Variante | Color dot | Uso |
|----------|-----------|-----|
| `badge--success` | green | Conciliado, aprobado |
| `badge--warning` | amber | Pendiente |
| `badge--danger` | red | Rechazado |
| `badge--info` | blue | FX |
| `badge--neutral` | slate | Archivado |
| `badge--admin` | indigo | Admin |

### Pills (categoría de plan/tier)

`.pill.pill--<tier>` · sin dot · más tipográfico.

| Variante | Uso |
|----------|-----|
| `pill--base` | Módulo base |
| `pill--pro` | Plan Pro |
| `pill--enterprise` | Plan Enterprise (fondo oscuro) |
| `pill--addon` | Add-on |

### Filter chips (filtros toggleables)

`.filter-chip` · `--active` fondo slate-900.

Ejemplo: Todos · Ingresos · Egresos · Transferencias · Pendientes

### Date chip / Status chip

Chips "respiran" más que badges — padding mayor, bordes redondos, para headers y contexto macro.

Ejemplo: `Vie · 17/04/2026` · `Jornada abierta · 14 movs` · `Jornada pendiente` · `Jornada cerrada`

---

## 08 · Forms

Inputs de 44px mínimo. Focus-ring azul con 3px soft. Labels arriba, nunca placeholder-as-label.

- Clase base: `.f-lbl` (label) + `.f-in` (input)
- Focus: `--blue` con ring 3px
- Selects con SVG custom (sin flecha nativa del browser)
- Textareas: `resize-y` permitido, min-height 72px para campos de notas
- Toggles: fondo `--green` cuando ON, `--slate-300` cuando OFF

---

## 09 · Navegación

App tabs en header, sub-tabs dentro de cada módulo.

### App tabs (nav top-level)

`.app-tabs > .app-tab`

- Activo usa el accent del módulo actual + underline
- Tabs: Dashboard · Secretaría · Tesorería · Configuración · Módulos

### Sub-tabs (nav secundario)

`.sub-tabs > .sub-tab[aria-pressed]`

- Fondo contenedor: slate-100
- Tab activo: sobre surface (fondo blanco), sin underline
- Ejemplo: Resumen · Cuentas · Movimientos · Conciliación

---

## 10 · Cards y KPIs

Card con head/body/foot + KPI con label/value/meta. Composición sobre decoración.

### Card base

```
.card
  .card__head   → título + meta + acción secundaria (link "Ver todas →")
  .card__body   → contenido, padding 14px
  .card__foot   → CTA principal (btn--full)
```

### KPIs

`.kpi` con `__label` + `__value` + `__meta`

- Value usa `tabular-nums` y `letter-spacing` negativo
- Ejemplo: `CAJA TOTAL HOY · $ 8.545.530 · +2,4% vs ayer`

---

## 11 · Alerts accionables

Uso en dashboards y tops de módulo. Cada alert linkea al lugar exacto donde resolverla.

`.alert` → grid 3 columnas: icon box · main · arrow (→)

| Tipo | Icon box | Ejemplo |
|------|----------|---------|
| Count | Número en color semántico | `3 movimientos por conciliar` |
| Warning | `!` en rojo | `Jornada de hoy sin abrir` |
| Info count | Número en amber | `4 vencimientos esta semana` |

---

## 12 · Toasts

Confirmación o error tras una acción. Aparecen fuera del flujo, desaparecen solos. Nunca bloquean.

### Anatomía

```
[Icon] [Title]              [Action] [×]
       [Desc]
       [Meta · mono]
       [══════════] ← progress bar (tiempo restante)
```

### Variantes

| Variante | Color | Auto-dismiss | Uso |
|----------|-------|-------------|-----|
| Success | Verde | 3s | Acción completada |
| Error | Rojo | No (requiere X o acción) | Fallo |
| Warning | Ámbar | 5s | Completó con observación |
| Info | Azul | 4s (o hasta que termine) | Progreso neutral |

### Spec de implementación

```
Posición:   bottom 24px / right 24px desktop · bottom 20px / center mobile
Ancho:      min(420px, 100vw − 32px)
Surface:    slate-900 (siempre dark)
Duraciones: success 3000ms · warning 5000ms · info 4000ms · error 0 (manual)
Stack:      máx 3 visibles, column-reverse (nuevo abajo), más viejos se van
Motion:     in 220ms cubic-bezier(0.2, 0.8, 0.2, 1) · out 180ms ease-out
Pause:      hover en cualquier toast pausa el timer de TODOS
API:        showToast({ kind, title, desc?, meta?, action?, duration? })
```

### Reglas de contenido

**HACER**
- Verbo en pasado: *Movimiento registrado*, *Transferencia enviada*.
- Decir qué, cuánto y dónde: *Ingreso de $ 185.000 en Caja Pesos.*
- Incluir ID + timestamp en errores (soporte lo va a pedir).
- Ofrecer "Deshacer" cuando aplica (baja de socio, anular recibo).
- En errores: dejar el formulario abierto con los datos cargados.

**NO HACER**
- "Operación exitosa" (vacío). Qué operación, qué pasó.
- Toast para cosas que el usuario ya ve (ej: contador cambió).
- Errores técnicos crudos: `500 Internal Server Error`.
- Auto-cerrar errores. El usuario tiene que registrar que falló.
- Más de 3 toasts a la vez.

### Cuándo usar Toast vs Alert vs Modal

| Componente | Cuándo |
|------------|--------|
| **Toast** | Confirmar una acción puntual. Reversible o con ID de seguimiento. El usuario puede seguir trabajando. |
| **Alert (en página)** | Estado persistente que requiere acción: jornada sin cerrar, movimientos sin conciliar. Vive dentro del layout. |
| **Modal** | Decisión destructiva o irreversible: anular recibo, dar de baja socio, confirmar cierre con diferencia. |

> Regla rápida: si el usuario puede seguir trabajando → **toast**. Si tiene que parar y resolver → **alert**. Si puede romper algo → **modal**.

---

## 13 · Avatars e identidad

### Brand mark

`.brandmark` → para el club activo. Fondo slate-900, texto blanco, iniciales del club, `--radius-md`.

### Avatar de usuario

`.avatar` → iniciales de nombre+apellido. Modo dark para el menú desplegable.

---

## 14 · Módulos y acentos

Cada módulo tiene un color de acento propio. Se aplica a tabs activos, íconos de módulo y `border-left` de cards específicas del módulo.

| Módulo | Acento | Token |
|--------|--------|-------|
| Dashboard | Verde · Hub operativo general | `--accent-dashboard → --green` |
| Secretaría | Verde · Hermano del dashboard | `--accent-secretaria → --green` |
| Tesorería | Azul · Finanzas, más serio | `--accent-tesoreria → --blue` |
| Gestión de socios | Ámbar · Relacional, cálido | `--amber` |
| RRHH | Rosa · Distintivo, no agresivo | `--pink` |
| Ticketing | Teal · Add-on, eventos | `--teal` |
| Configuración · Módulos | Índigo · Administrativo | `--accent-config → --indigo` |

---

## 15 · Patterns reutilizables

Combinaciones probadas. Si una UI se repite en 3+ lugares, vive acá.

### Page header (eyebrow + title + date chip)

```
FINANZAS DEL CLUB                          ● Vie · 17/04/2026
Tesorería
Cuentas bancarias, movimientos y conciliación.
```

Presente en cada módulo. Eyebrow da contexto, title es el nombre del módulo, date-chip la fecha operativa.

### Monto con signo

```
+ $ 185.000,00    − $ 62.400,00    ⟲ $ 420.000,00    − US$ 320,00
```

- Verde `+` → ingreso
- Rojo `−` → egreso
- Slate `⟲` → transferencia

Siempre `tabular-nums` + `letter-spacing: -0.015em`.

### Plan widget (dashboard upsell)

```
PLAN ACTUAL
Starter          [ACTIVO]
Incluye Dashboard, Secretaría y Tesorería.
[Ver planes →]
```

Único componente con fondo dark (`slate-900`) en el app — deliberado.

### Session card (jornada)

```
| !  GESTIÓN DE JORNADA              ● Pendiente
|    Jornada pendiente
|    Todavía no se abrió la jornada de hoy. Secretaría no puede cargar movimientos.
|    [Apertura de jornada]
```

Card con `border-left` de color semántico. Icon box + label/value + badge a la derecha.

### Layout mobile-first con grid-areas (desktop)

```css
/* Mobile = stack natural. Desktop = grid-areas explícito */
body[data-view="desktop"] main {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  grid-template-areas:
    "greet    greet"
    "alerts   alerts"
    "kpis     kpis"
    "session  plan"
    "balances activity"
    "concilia activity";
  gap: 16px;
}

.session-card { grid-area: session; }
.plan-widget  { grid-area: plan; }
```

---

## 16 · Do's & Don'ts

Reglas duras. Romperlas requiere justificación por escrito.

| HACER | EVITAR |
|-------|--------|
| **Usar tokens siempre** — `var(--slate-900)` en lugar de `#0F172A`. Hace que el tema sea cambiable y el sistema consistente. | **Inventar colores nuevos** — Si pensás que necesitás uno, casi seguro podés resolverlo con los existentes + opacidad o un slate. |
| **Un primary por bloque** — La acción dominante de una card o modal va en `btn--primary`. El resto, secondary o ghost. | **Escalera de 3 botones primary en fila** — Si todo es primario, nada lo es. Jerarquía clara: uno primary, el resto secondary. |
| **Tabular-nums en montos** — `font-feature-settings: "tnum"` + `letter-spacing: -0.015em`. Las columnas de números alinean visualmente. | **Iconografía decorativa** — Iconos sólo si aportan scanning. "Home" + casa + palabra "Home" es redundante. |
| **Validar datos en es-AR** — Separador de miles `.`, decimal `,`. Fechas `DD/MM/YYYY`. Timezone Argentina. | **Emojis en UI** — No. Nunca. Ni uno. A menos que el usuario los introduzca en un campo. |
| **Consistencia entre páginas** — Si el header tiene brand + role-stack + avatar + menu, todas las páginas lo tienen igual. | **Scrolls horizontales ocultos** — Excepto en `.app-tabs`, `.sub-tabs` y `.filter-row` (con scrollbar oculta intencional), evitar `overflow-x`. |
| **44px touch** — Botones, inputs, tabs, filas clickeables: todo 44px de altura mínima. No hacer UI de escritorio en móvil. | **Sombras por decoración** — Sombra sólo para elevar elementos flotantes o separar cards del fondo. |

---

## 17 · Acciones por fila (hover-only)

En tablas o listados donde cada fila expone acciones secundarias (editar, eliminar), los íconos de acción deben permanecer **ocultos por defecto** y aparecer al hacer hover sobre la fila o al recibir foco por teclado. Esto mantiene el listado limpio en reposo y reserva la jerarquía visual para el contenido principal.

**Patrón**:

```tsx
<article className="group ...">
  <div className="...">{/* contenido principal */}</div>
  <div className="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
    {/* botones de editar / eliminar */}
  </div>
</article>
```

- `group` en el contenedor de la fila.
- `opacity-0` estado de reposo.
- `group-hover:opacity-100` reveal al pasar el mouse sobre cualquier punto de la fila.
- `focus-within:opacity-100` reveal al navegar con teclado (clave para accesibilidad).
- `transition-opacity` para que el reveal sea suave (no flash).

**Tablas que aplican** (referencia):
- `components/dashboard/treasury-role-card.tsx` — Cuentas (Tesorería).
- `components/dashboard/secretaria-movement-list.tsx` — Movimientos (Secretaría, Tesorería, Consolidación).
- `components/settings/tabs/categories-tab.tsx` — Categorías.
- `components/settings/tabs/activities-tab.tsx` — Actividades.
- `components/settings/tabs/members-tab.tsx` — Miembros.

**No aplica** para:
- Acciones primarias siempre presentes (por ejemplo, un CTA único por fila que es la acción principal).
- Badges informativos o chips de estado — son contenido, no acciones.
