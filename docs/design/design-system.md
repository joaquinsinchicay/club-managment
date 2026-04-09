# Design System

## 1. Objective

Define a consistent, operational-first UI system for a multi-club treasury application.

The design must:

* maximize speed of execution
* minimize cognitive load
* ensure clarity of financial data
* support role-based workflows (`admin`, `secretaria`, `tesoreria`)

This is not a marketing UI. It is a financial operations tool.

---

## 2. Core Principle

Operational clarity over aesthetics.

Rules:

* every visual element must justify its presence through function
* context must be visible before actions
* amounts must dominate over labels
* repeated workflows must feel fast and predictable
* decorative patterns are not allowed

Not allowed:

* hero gradients
* glassmorphism
* oversized introductory cards
* secondary navigation patterns that compete with the upper bar

---

## 3. Authenticated Shell

### 3.1 Global structure

All authenticated screens share the same shell:

* persistent upper bar
* main content column
* mobile-first spacing
* desktop as a wider version of the same hierarchy

The upper bar is the primary source of context and navigation. Context must not be duplicated in large introductory cards.

### 3.2 Upper bar

The upper bar must always show:

* left brand block with club mark + active club name
* inline club selector integrated into the club name area when the user has multiple active clubs
* right identity block with compact operational context and active role label(s)
* avatar menu aligned to the far right
* lower row of compact module tabs

Rules:

* compact and sticky
* neutral background
* two-row composition: context above, tabs below
* tabs are text-first, not pills
* active tab uses green underline and green text
* inactive tabs use muted neutral text
* minimum touch target 44px
* club selector lives here, not inside dashboard content
* avoid long welcome sentences in the header
* `Configuracion` is not a primary tab; it lives in the avatar menu

### 3.3 Avatar menu

The avatar menu remains the single entrypoint for:

* club settings navigation when allowed
* sign out

Do not move club switching into the avatar menu.

---

## 4. Navigation Model

### 4.1 Main modules

Upper bar navigation is module-based.

Current top-level modules:

* `Dashboard` → `/dashboard`
* `Secretaria` → `/dashboard/secretaria`
* `Tesoreria` → `/dashboard/treasury`

### 4.2 Visibility by role

Tabs must be hidden when the user cannot operate that module.

Rules:

* `Dashboard` is visible only when the active membership is not `secretaria` only
* `Secretaria` visible only when `canOperateSecretaria(...)`
* `Tesoreria` visible only when `canOperateTesoreria(...)`

Do not render disabled tabs.
Do not rely on redirection as the primary navigation pattern.
Expose `Configuracion` only through the avatar menu when the user has permission.

### 4.3 Secondary views

Detail screens are not tabs.

Examples:

* account detail
* session open / close
* consolidation

These screens must:

* keep the global upper bar
* show a local content header
* expose a stable back action to their parent module

Back actions must not depend on browser history.

---

## 5. Page Types

### 5.1 Dashboard

`/dashboard` is a summary screen, not an operational replacement for role modules.

It should:

* summarize available modules
* expose key counts and statuses
* give one explicit CTA into each module

It should not:

* duplicate all operational forms
* re-render the full Secretaria workflow
* re-render the full Tesoreria workflow

### 5.2 Secretaria

`/dashboard/secretaria` is the daily operations module.

Must prioritize:

* session status
* visible balances
* open / close session actions
* create movement
* create transfer
* recent movement list

The `Gestion de jornada` card must derive its badge and CTAs from the same resolved daily session state.

State matrix:

* no session for today: show `Jornada pendiente` and only the CTA `Apertura de jornada`
* open session for today: show `Jornada abierta` and the CTAs `Cierre de jornada`, `Cargar movimiento`, and `Cargar transferencia`
* closed session for today: show `Jornada cerrada`, no CTAs, and the message `La jornada ya fue cerrada. No se encuentra disponible para carga de movimientos.`

If the daily session state cannot be resolved, the module must not infer `Jornada pendiente` or expose CTAs as if the state were valid.

If treasury movement data cannot be resolved, the module must keep the session badge and CTAs derived from `daily_cash_sessions`, but render degraded states for balances and recent movements instead of showing `0,00` or a factual empty state. In that degraded state, the account detail CTA must be hidden or disabled.

### 5.3 Tesoreria

`/dashboard/treasury` is the finance operations module.

Must prioritize:

* visible balances
* treasury-owned movements
* FX operations
* clear access to consolidation

### 5.4 Consolidation

`/dashboard/treasury/consolidation` is a secondary view under Tesoreria.

Must show:

* date filter
* pending list
* integrated list
* movement detail
* possible match area
* auditable history
* consolidation readiness CTA

### 5.5 Settings

`/settings/club` remains a module-level page.

Rules:

* back action must be visible in the content header
* active club context card must be compact
* settings content must remain split by permissioned responsibilities

---

## 6. Visual Tokens

### 6.1 Colors

Purpose-driven colors only:

* green `#10B981` → income / open / healthy final state
* red `#EF4444` → expense / closed / destructive state
* amber `#F59E0B` → pending / warning / attention
* slate neutrals → structure, borders, labels, surfaces

Rules:

* color communicates meaning, not decoration
* backgrounds stay white or light neutral
* do not use colorful ambient gradients

### 6.2 Typography

Font:

* `Inter`

Rules:

* amounts are the most dominant text on a card or row
* labels are uppercase, smaller, and muted
* section titles are semibold
* descriptions are short and scannable
* render monetary amounts with localized `XX.XXX,XX`

### 6.3 Spacing and density

Rules:

* minimum touch target 44px
* dense but readable
* prefer vertical stacking to complex grids
* lists must be readable in seconds

---

## 7. Shared Components

These patterns must be reused instead of reinvented per screen.

### 7.1 `AppHeader`

Use for the authenticated upper bar only.

Responsibilities:

* context
* club switching
* module nav
* user identity
* avatar menu

### 7.2 `PageContentHeader`

Use for secondary content headers inside a module.

Responsibilities:

* eyebrow
* title
* description
* stable back CTA when needed

### 7.3 `StatusBadge`

Use for consistent operational states.

Supported semantic tones:

* `success`
* `danger`
* `warning`
* `neutral`

Map common states as:

* `OPEN` → success
* `CLOSED` → danger
* `PENDING` → warning
* `MATCHED` → neutral
* `CONSOLIDATED` → success or neutral depending on context

### 7.4 Cards

Rules:

* neutral background
* subtle border
* compact radius
* no heavy shadow by default
* use cards to group balances, actions, state, lists and settings sections

### 7.5 Lists

Critical usage:

* movements
* accounts
* members

Each row must surface:

* primary value first
* secondary metadata second
* status badge if operationally relevant

Do not hide essential financial data behind interaction.

### 7.6 Buttons

Types:

* primary
* secondary
* destructive

Rules:

* one clear primary CTA per section
* labels must be explicit
* use verbs tied to the real operation

### 7.7 Inputs

Rules:

* label always visible
* validation inline
* errors below field
* required fields clearly marked

Do not use hidden validation.

---

## 8. State and Feedback Patterns

### 8.1 Loading

Rules:

* prefer local pending states over fullscreen blockers
* loading must happen in the affected CTA, card or form
* avoid long spinner-only states without label
* the affected area becomes non-interactive while pending

### 8.2 Success and error feedback

Rules:

* post-action feedback must use toast
* no new inline transient success/error messages inside the page
* inline validation is valid only for form fields

### 8.3 Empty states

Rules:

* clear message
* one next step when relevant
* no decorative illustrations

---

## 9. Role-based UX Rules

### 9.1 Secretaria

* sees only Secretaria accounts and categories
* operates the daily session
* cannot access consolidation

### 9.2 Tesoreria

* sees only Tesoreria accounts and categories
* can register treasury-owned movements
* can access consolidation
* cannot operate the daily session

### 9.3 Admin

* manages configuration
* has no implicit access to operational modules

Never mix role behavior in UI just because multiple modules are technically reachable.

---

## 10. Session and Movement Rules

### 10.1 Session-driven behavior

* session open → allow daily movement creation/edit where applicable
* session closed → block those actions
* session state must always be visible near the top of Secretaria flows

### 10.2 Movements

* amount is always positive
* movement type defines impact
* edits must remain auditable

### 10.3 Consolidation edits

* Tesoreria may correct imputations only inside consolidation flow
* the UI must expose readiness and invalid blockers clearly

---

## 11. Documentation Rules for Future Development

Any future screen or redesign must follow this document before inventing new patterns.

Mandatory rules:

* reuse the authenticated upper bar instead of creating alternate navigation
* place club context in the upper bar, not in duplicate hero cards
* use `PageContentHeader` for detail and secondary screens
* use `StatusBadge` for operational states
* keep post-action feedback in toast
* keep role visibility derived from authorization utilities
* keep all UI text in `lib/texts.json`

If a new user story requires a different visual pattern, this file must be updated in the same task so it remains the source of truth for future work.
