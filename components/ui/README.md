# `components/ui` — Primitivos del design system

Punto de entrada al design system. Cada archivo de esta carpeta es un primitivo tokenizado con API estable. Todo el código de la app **debe** consumirlos en lugar de reimplementar layout, colores, radios o tipografía a mano.

Las reglas vinculantes (qué está prohibido, dónde) viven en [`/CLAUDE.md`](../../CLAUDE.md). Este archivo es el índice operativo.

---

## Cómo leer este índice

| Columna | Significado |
|---|---|
| **Primitivo** | Componente exportado y entry-point recomendado. |
| **API mínima** | Props clave para empezar. La firma completa está en el archivo. |
| **Cuándo** | El caso de uso por default. Si tu caso no encaja, abrir discusión antes de inventar variantes. |
| **No hacer** | Anti-patrones que ya causaron drift. |

---

## Layout y contenedores

### `<Card>`, `<CardHeader>`, `<CardBody>`, `<CardFooter>` — `card.tsx`
| | |
|---|---|
| **API mínima** | `<Card as="article" padding="comfortable" tone="default">` + `<CardHeader title eyebrow description action divider />` |
| **Cuándo** | Cualquier contenedor con radio + borde + fondo propio fuera de tablas y modales. Dashboard overview, settings sections, treasury cards. |
| **No hacer** | `<article className="rounded-dialog border border-border bg-card p-5">…`, headers hand-rolled con `flex items-center justify-between … border-b`, gradientes inline. |
| **Referencia** | `app/(dashboard)/dashboard/page.tsx`, `components/dashboard/treasury-card.tsx` (`MovementsCard` / `BalancesCard`). |

### `<Modal>` — `modal.tsx`
| | |
|---|---|
| **API mínima** | `<Modal open onClose title description size="md" hideCloseButton closeDisabled>` |
| **Cuándo** | Todo overlay modal. Tres tamaños: `sm` (max-w-md, confirmaciones), `md` (max-w-xl, default), `lg` (max-w-3xl, multi-columna o tablas embebidas). |
| **No hacer** | `BlockingOverlay` directo, portales manuales, `<div fixed>`, `panelClassName` (no existe), botones textuales "Cerrar" duplicando la X del header. |
| **Referencia** | `components/dashboard/treasury-card.tsx`, `components/settings/tabs/members-tab.tsx`. |

### `<ModalFooter>` — `modal-footer.tsx`
| | |
|---|---|
| **API mínima** | `<ModalFooter onCancel cancelLabel submitLabel pendingLabel submitVariant="primary" size="md" />` |
| **Cuándo** | Botonera de todo modal con form. `size="md"` siempre (canon). Si no hay `onCancel`, el layout pasa a `grid-cols-1` (caso "Invitar"). |
| **No hacer** | Footers a mano (`<div className="flex gap-2 border-t pt-4">`), `className` passthrough (no existe), `align="end"` (eliminado), constantes `MODAL_FOOTER_CLASSNAME`. |
| **Referencia** | Cualquier modal de `components/dashboard/treasury-card.tsx`. |

### `<DataTable>` + subcomponentes — `data-table.tsx`
| | |
|---|---|
| **API mínima** | `<DataTable density="comfortable" gridColumns="…">` + `<DataTableHeader>` + `<DataTableBody>` + `<DataTableRow useGrid hoverReveal>` + `<DataTableCell align>` + `<DataTableChip tone>` + `<DataTableAmount type currencyCode amount />` + `<DataTableActions reveal>` + `<DataTableEmpty title description />` |
| **Cuándo** | Toda lista tabular: movimientos, miembros, cuentas, conciliación, cost centers, categorías. `density="compact"` para listas densas; `comfortable` por default. |
| **No hacer** | Shells hand-rolled (`rounded-[18px] border bg-card`, `divide-y divide-border/60`), headers desktop `hidden md:grid md:grid-cols-[…]`, chips inline (`style={{ background: "var(--slate-100)" }}`), cálculo manual de signo/color de monto, `opacity-0 group-hover:opacity-100` ad-hoc. |
| **Referencia** | `components/dashboard/movement-list.tsx`, `components/dashboard/secretaria-movement-list.tsx` (layout flex con `useGrid={false}`). |

---

## Forms (dentro o fuera de modal)

### Primitivos de `modal-form.tsx`
| Export | Cuándo |
|---|---|
| `<FormField>` | Wrapper `<label>` con gap canónico. Agrupa label + control. |
| `<FormFieldLabel required>` | Label de campo individual. **Sentence case**, NO uppercase. |
| `<FormSection required>` | Section header uppercase con `tracking-[0.14em]` (único estilo en toda la app). |
| `<FormInput>` / `<FormSelect>` / `<FormTextarea>` | Reemplazan `<input/select/textarea className={CONTROL_CLASSNAME}>`. |
| `<FormReadonly>` | Campo no editable. `<div>` con `bg-secondary-readonly` + `inline-flex items-center`. |
| `<FormCheckboxCard>` | Checkbox estilo pill. |
| `<FormBanner variant="warning"\|"destructive"\|"info">` | Callout. |
| `<FormHelpText>` / `<FormError>` | Hints y errores inline. |
| Constantes `CONTROL_CLASSNAME`, `FIELD_LABEL_CLASSNAME`, `FORM_GRID_CLASSNAME`, etc. | **Importar desde acá**. Nunca redeclarar localmente. |

**No hacer**: `<input className="rounded-2xl …">`, `<input className="bg-secondary-readonly …">` en inputs editables, labels uppercase con `tracking-[0.06em]`, section headers con tracking distinto de `0.14em`, `focus:ring-foreground/20`.

**Referencia**: `components/dashboard/open-session-modal-form.tsx`, `components/settings/tabs/category-form.tsx`.

---

## Botones y links

### `<Button>` + `buttonClass()` — `button.tsx`
| | |
|---|---|
| **API mínima** | `<Button variant="primary" size="md" radius="xl" fullWidth />` o `buttonClass({…})` para componentes que no son `<button>` (ej. `PendingSubmitButton`). |
| **Variants** | `primary` (CTA), `secondary` (Cancel/Back), `destructive` (acciones destructivas), `dark` (énfasis). |

### `<LinkButton>` — `link-button.tsx`
| | |
|---|---|
| **API mínima** | `<LinkButton href="…" variant="secondary" size="md" external />` |
| **Cuándo** | Cualquier `<Link>` de `next/link` que se renderice como botón. `external` agrega `target="_blank"` + `rel="noopener noreferrer"`. |

**No hacer**: `<Link className="inline-flex … rounded-xl bg-foreground px-4 py-3">` a mano, `<button className="rounded-2xl bg-foreground px-4 py-3">` a mano.

**Referencia**: `PageContentHeader` (back button), `app/(dashboard)/dashboard/page.tsx` (CTA full-width).

---

## Identidad y estado

### `<Avatar>` + `getInitials()` — `avatar.tsx`
| | |
|---|---|
| **API mínima** | `<Avatar name email size="md" tone="neutral" shape="circle" />` |
| **Tone** | `neutral` (usuarios), `bancaria` / `virtual` / `efectivo` (cuentas tesorería según `accountType`), `accent` (estado activo). |
| **`getInitials(name, fallback?)`** | Utilidad única de iniciales. **Nunca** replicar `name.split(/\s+/).slice(0,2).map(…).join("")`. |
| **Referencia** | `components/settings/tabs/members-tab.tsx`, `AccountAvatar` en `treasury-role-card.tsx`. |

### `<Chip>` / `<ChipButton>` / `<ChipLink>` — `chip.tsx`
| | |
|---|---|
| **Cuándo** | Estático → `<Chip tone size>`. Filtro toggle → `<ChipButton active>` (incluye `aria-pressed`). Filtro link → `<ChipLink href active>` (incluye `aria-current`). |
| **Tone** | `neutral`, `income`, `expense`, `warning`, `info`, `accent`. |
| **No hacer** | `<span className="rounded-full border px-3 py-1 …">`, `<button className={ \`rounded-full \${active ? "bg-foreground …" : "…"}\`}>`. |

### `<StatusBadge>` — `status-badge.tsx`
| | |
|---|---|
| **Cuándo** | Estado semántico uppercase: Aprobado, Pendiente, Vencido, Current user. Tones `accent`, `warning`, etc. |

### `<MetaPill>` — `meta-pill.tsx`
| | |
|---|---|
| **API** | `<MetaPill label value />` |
| **Cuándo** | Pares label-value (visibilidad, rol, moneda). |
| **No hacer** | Variantes locales tipo `MemberMetaPill`. |
| **Referencia** | `components/settings/tabs/members-tab.tsx`, `membership-systems-tab.tsx`. |

---

## Empty states

### `<EmptyState>` — `empty-state.tsx`
| | |
|---|---|
| **API mínima** | `<EmptyState title description icon action variant="dashed"\|"card"\|"inline" />` |
| **Cuándo** | Empty state **standalone**. Si el empty está **dentro de un `DataTable`**, usar `<DataTableEmpty>`. |
| **No hacer** | `<div className="rounded-xl border border-dashed border-border bg-secondary-subtle …">` a mano. |

---

## Otros

| Primitivo | Para qué |
|---|---|
| `card-shell.tsx` (`<CardShell>`) | Reservado para auth pages. No usar en app interna — preferir `<Card>`. |
| `club-mark.tsx` | Branding del club. Usa `getInitials` internamente. |
| `edit-icon-button.tsx` | Botón icon-only de "editar" (lápiz). |
| `google-logo.tsx` | SVG del logo de Google para login. |
| `navigation-link-with-loader.tsx` | `<Link>` que muestra spinner mientras navega. Recibe className vía `buttonClass({…})`. |
| `overlay.tsx` (`BlockingOverlay`, `BlockingStatusOverlay`) | Layer de fondo. Lo usa internamente `<Modal>`. **No** instanciar a mano para hacer modales. |
| `page-content-header.tsx` | Header de página con back button + título. |
| `pending-form.tsx` (`PendingFieldset`, `PendingSubmitButton`, `Spinner`, `PendingStatusText`) | Estado pending de forms con server actions. `PendingSubmitButton` espera className desde `buttonClass({…})`. |
| `status-message.tsx` | Mensaje informativo standalone (auth, forbidden). |
| `status-badge.tsx` | Ver arriba. |
| `toast/` (`<ToastProvider>`, `<ToastViewport>`) | Renderizadas en `app/layout.tsx`. La API imperativa vive en `lib/toast.ts`. |

---

## Cómo agregar un Modal nuevo (paso a paso)

1. Estado local: `const [open, setOpen] = useState(false)`.
2. Trigger: `<Button onClick={() => setOpen(true)}>`.
3. Modal:
   ```tsx
   <Modal open={open} onClose={() => setOpen(false)} title={texts.…} size="md">
     <form action={handleSubmit} className="grid gap-4">
       <PendingFieldset className="grid gap-4">
         <FormField>
           <FormFieldLabel required>{texts.…}</FormFieldLabel>
           <FormInput name="…" />
         </FormField>
         <ModalFooter
           onCancel={() => setOpen(false)}
           cancelLabel={texts.…}
           submitLabel={texts.…}
           pendingLabel={texts.…}
         />
       </PendingFieldset>
     </form>
   </Modal>
   ```
4. Handler: si la action redirige (`flashToast + redirect`), envolverla en un thin handler que cierra el modal antes del `await` (Patrón B en CLAUDE.md). Si la action devuelve `{ok, code}`, seguir Patrón A (`triggerClientFeedback` + `router.refresh`).
5. **Cero clases hardcoded**. Si necesitás un estilo que no existe, abrir conversación antes de inventar.

---

## Cómo agregar una tabla nueva (paso a paso)

1. Decidir densidad: `compact` (movimientos, conciliación) vs `comfortable` (miembros, cost centers).
2. Decidir layout de fila:
   - **Grid alineado con header** → `<DataTable gridColumns="…">` + `<DataTableHeader>` + filas con `<DataTableCell>`.
   - **Flex libre** → `<DataTable>` (sin `gridColumns`) + filas con `useGrid={false}` y composición flex propia.
3. Chips/montos/acciones → siempre los subcomponentes. Cero estilos inline.
4. Empty → `<DataTableEmpty>`, nunca `border-dashed bg-secondary-subtle p-6`.

Ver `MovementList` (grid) y `SecretariaMovementList` (flex) como referencia.
