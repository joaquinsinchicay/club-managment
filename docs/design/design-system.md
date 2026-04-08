# Design System

## 1. Objective

Define a consistent, operational-first UI system for a multi-club treasury application.

The design must:

* maximize speed of execution
* minimize cognitive load
* ensure clarity of financial data
* support role-based workflows (admin, secretaria, tesoreria)

This is not a marketing UI. It is a **financial operations tool**.

---

## 2. Design Philosophy

### Core principle: Operational clarity over aesthetics

* Every UI element must serve a functional purpose
* Visual hierarchy must reflect financial importance (amounts > labels)
* Reduce friction in repetitive tasks (movement entry, session control)
* Avoid decorative patterns (no glassmorphism, no visual noise)

---

## 3. Layout System

### Structure

* Persistent header (all screens)
* Main content column
* Mobile-first layout
* Desktop = expanded version of mobile
* In `settings/club`, the back action must stay visible in the content header and must not depend on a secondary side card

---

### Header (global)

Always visible.

Contains:

* Club name
* Club selector (if multiple)
* User name + role
* Avatar menu:

  * Club settings (admin only)
  * Sign out

Rules:

* Compact height
* No scrolling behavior
* Must clearly show current context (club + role)

---

## 4. Color System

### Purpose-driven colors only

* Green → income / open
* Red → expense / closed
* Amber → pending / attention
* Neutral grays → structure

Rules:

* Color communicates meaning only
* Do not use color for decoration
* Backgrounds remain neutral (white/light gray)

---

## 5. Typography

### Font

* Sans-serif system font (e.g. Inter)

### Hierarchy

* Large amounts → bold, high emphasis
* Section titles → medium weight
* Labels → small, uppercase
* Secondary info → muted color

### Rules

* Amounts must be the most visually dominant element
* Labels must never compete with values
* Monetary amounts must render with localized format `XX.XXX,XX`
* Avoid long paragraphs — prioritize scanability

---

## 6. Spacing & Density

* Minimum touch target: 44px
* Dense but readable
* Prefer vertical stacking over complex layouts
* Lists must be scannable in seconds

---

## 7. Components

---

### 7.1 Buttons

Types:

* Primary → main action
* Secondary → alternative
* Destructive → cancel / delete

Rules:

* One primary action per section
* Labels must be explicit ("Close session", not "Continue")

---

### 7.2 Inputs

* Label always visible (above field)
* Inline validation
* Error message below field
* Required fields clearly marked

No hidden validation.

---

### 7.3 Cards

Used to group:

* balances
* session state
* actions

Rules:

* Light background
* Subtle separation (spacing or divider)
* No heavy shadows
* Context cards in settings must stay compact; active club context should summarize state, not dominate the layout

---

### 7.4 Lists (CRITICAL)

Used for:

* movements
* accounts
* members

Each row must show:

* primary info (amount or name)
* secondary info (category, account, date)

Rules:

* Must be readable without interaction
* Use spacing or subtle dividers
* No visual clutter

---

### 7.5 Status badges

* OPEN → green
* CLOSED → red
* PENDING → amber
* MATCHED → neutral
* CONSOLIDATED → final state (green or muted)

Rules:

* Always visible
* Always consistent

---

## 8. Core UX Rules

---

### 8.1 Role-based UI

* Secretaria:

  * sees only Secretaria accounts
  * can operate daily session
  * cannot access consolidation

* Tesoreria:

  * sees only Tesoreria accounts
  * can access consolidation
  * cannot operate session

* Admin:

  * manages configuration
  * no implicit access to operational flows

---

### 8.2 Session-driven behavior

* Session OPEN → allow movements
* Session CLOSED → block movement creation/edit
* UI must clearly reflect state

---

### 8.3 Movement rules

* Amount always positive
* Type defines impact (income/expense)
* Editable only during allowed flows (consolidation)

---

### 8.4 Movement edit rules

* Secretaria:

  * cannot edit after session close

* Tesoreria:

  * can edit only during consolidation

* All edits must be auditable

---

## 9. Forms

### Principles

* Fast input
* Minimal fields
* Dynamic fields based on category

---

### Behavior

* Inline validation
* Blocking errors prevent submission
* Required fields clearly marked

---

### After submission

* Reset:

  * amount
  * concept

* Keep:

  * account
  * category (optional optimization)

---

### Error states

* Clear message
* No silent failures
* Prevent invalid operations (e.g. closed session)

---

## 10. Key Screens Behavior

---

### Dashboard

Must show:

* active club context in upper bar
* session status
* balances
* primary actions

Optional:

* last session timestamp

---

### Create movement

* Fast form
* Minimal friction
* Dynamic fields
* No unnecessary steps

---

### Account detail

* balance first
* movement list second
* action button visible

---

### Consolidation

* list of pending movements
* clear status per row
* actions:

  * edit
  * match

Rules:

* cannot consolidate with invalid data
* CTA must reflect readiness

---

### Match view

* side-by-side comparison
* all fields visible
* clear decision actions

---

## 11. Interaction States

---

### Loading

* skeletons preferred
* avoid long spinners
* every async mutation must show immediate feedback in the affected CTA
* the affected form or card must become non-interactive while the mutation is pending
* use local loading states, not fullscreen overlays, unless the flow truly blocks the whole screen
* keep the post-action result in toast; loading only covers the in-flight state

---

### Empty state

* clear message
* CTA

---

### Error state

* explicit message
* actionable next step

---

## 12. Accessibility (minimum)

* readable contrast
* large touch targets
* simple language

---

## 13. Non-negotiable rules

1. Do not introduce decorative UI patterns
2. Do not hide critical financial information
3. Do not add steps to core flows
4. Do not mix role behaviors
5. Do not break consistency between screens
6. Do not overload UI with unnecessary elements

---

## 14. Priority for MVP

Design first:

1. Dashboard
2. Create movement
3. Open / Close session
4. Movement list
5. Consolidation

---

## 15. Guidance for AI implementation

* Follow layout and behavior strictly
* Do not invent new screens
* Do not change flows
* Respect role-based visibility
* Respect session logic
* Prioritize speed and clarity over visual complexity
