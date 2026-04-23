#!/usr/bin/env node
/**
 * check-primitives.mjs — gate deterministico contra anti-patrones del design system.
 *
 * Corre sobre components/** y app/** (excluye components/ui/**, components/ui-legacy si existe).
 * Busca substrings concretos que indican que un primitivo fue re-implementado a mano.
 * Exit 0 si no hay hits, exit 1 con listado file:line si encontró alguno.
 *
 * Invocacion: `npm run check:primitives` o `node scripts/check-primitives.mjs`.
 * Integrar en CI y en el flujo de cierre de cada US (CLAUDE.md paso 8).
 */

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { relative } from "node:path";

import { findJsxBlocks } from "./lib/jsx-parser.mjs";

const ROOT = process.cwd();

const SCAN_GLOBS = ["components", "app"];
const EXCLUDE_DIRS = new Set([
  "components/ui",
  "node_modules",
  ".next",
]);

/**
 * Reglas line-based. Cada una tiene:
 *   id: slug
 *   pattern: RegExp (se aplica linea por linea)
 *   message: mensaje al reportar
 *   allowFiles?: [string] — paths permitidos (primitivos o casos especiales). Substring match.
 */
const RULES = [
  {
    id: "legacy-datatable-shell",
    pattern: /rounded-\[18px\]/,
    message: "Shell legacy del DataTable. Usá <DataTable> de @/components/ui/data-table.",
  },
  {
    id: "modal-footer-hardcoded",
    pattern: /className="[^"]*border-t[^"]*pt-4[^"]*"[^>]*>\s*(?:<\w+[^>]*>\s*)*<button/,
    message: "Footer de modal a mano. Usá <ModalFooter> de @/components/ui/modal-footer.",
    allowFiles: [],
  },
  {
    // Solo dispara si además del bg tiene border (el banner real tiene border) y padding de banner (p-3|p-4|p-5|px-4|px-5).
    // Descarta chips/indicadores pequeños tipo `rounded-[4px] bg-amber-50 px-1.5 py-0.5` o `⚠`.
    id: "form-banner-hardcoded",
    pattern: /className="[^"]*border[^"]*(bg-amber-50|bg-amber-100|bg-red-50|bg-rose-50|bg-destructive\/)[^"]*(p-[345]|px-[45])/,
    message: "Banner hardcoded. Usá <FormBanner variant='warning|destructive|info'> de @/components/ui/modal-form.",
    allowFiles: ["components/ui/"],
  },
  {
    id: "empty-state-hardcoded",
    pattern: /className="[^"]*border-dashed[^"]*(bg-secondary\/30|bg-muted)[^"]*"/,
    message: "Empty state hardcoded. Usá <EmptyState> o <DataTableEmpty>.",
    // placeholder-tab.tsx renderiza "section coming soon" con eyebrow + badge + title + description;
    // no es un empty state de lista. EmptyState no soporta este layout sin perder el badge.
    allowFiles: ["components/settings/tabs/placeholder-tab.tsx"],
  },
  {
    id: "card-shell-hardcoded",
    pattern: /className="[^"]*rounded-\[26px\][^"]*"/,
    message: "Card shell hardcoded. Usá <Card>/<CardHeader>/<CardBody> de @/components/ui/card.",
  },
  {
    id: "hardcoded-spanish-copy",
    pattern: />(Cancelar|Guardar|Confirmar|Eliminar|Cerrar|Aceptar|Crear)<\/button>/,
    message: "Texto hardcoded en boton. Usar texts.* de lib/texts.json.",
    allowFiles: ["components/ui/"],
  },
  {
    // Gap C — section header reimplementando el estilo canónico de <FormSection>
    // (uppercase + tracking-[0.14em] + text-muted-foreground).
    id: "form-section-hardcoded",
    pattern: /className="[^"]*\buppercase\b[^"]*tracking-\[0\.14em\][^"]*text-muted-foreground/,
    message: "Section header hardcoded. Usá <FormSection> de @/components/ui/modal-form.",
    allowFiles: ["components/ui/"],
  },
  {
    // Gap D — botón "Cerrar" textual en body de modal. CLAUDE.md prohibe esto:
    // "La X del header siempre visible. No agregar botones textuales 'Cerrar' dentro del body".
    // Flag cualquier referencia a texts.*.close_cta — sólo existe para ser usado en el body de un modal.
    id: "modal-close-cta-in-body",
    pattern: /\.close_cta\b/,
    message: "Texto close_cta usado en JSX. La X del header es la vía de salida — eliminar el botón 'Cerrar' del body.",
    // lib/texts.json no se escanea (no es .tsx); la entrada puede quedar pero no referenciarse.
    allowFiles: [],
  },
  {
    // Gap E — BlockingOverlay sólo debe usarse dentro de @/components/ui/modal.
    id: "blocking-overlay-outside-modal",
    pattern: /\bBlockingOverlay\b/,
    message: "BlockingOverlay solo puede usarse dentro de @/components/ui/modal. Migrar el diálogo a <Modal>.",
    allowFiles: ["components/ui/"],
  },
  {
    // Gap F — filter pill con bg-foreground + text-background (active state canónico de <ChipButton>).
    // Captura el patrón usado con cn() donde el string literal vive dentro de un array de clases
    // condicionales — el linter antiguo no matcheaba porque <button> estaba en otra línea.
    id: "filter-pill-cn-hardcoded",
    pattern: /"[^"]*\bbg-foreground\s+text-background\b[^"]*"/,
    message: "Filter pill/active state hardcoded (bg-foreground text-background). Usá <ChipButton active> de @/components/ui/chip.",
    // club-data-tab.tsx usa bg-foreground text-background en un badge decorativo de "editar avatar",
    // no es filter pill. Permitir hasta migrar a primitivo dedicado de icon-badge.
    allowFiles: ["components/ui/", "components/settings/tabs/club-data-tab.tsx"],
  },
  {
    // Gap G — shell de <Card> hardcoded en <section>/<article> con rounded-(card|shell|toast|dialog)
    // + border + bg-card. El patrón canónico es `<Card>` de @/components/ui/card que ya incluye
    // rounded-shell + border + bg-card.
    //
    // Nota: Excluye <div> porque atrapa compound inputs (badge + input con rounded-card wrapper),
    // mini info boxes nested dentro de cards, y color pickers — todos casos legítimos donde
    // <Card> es over-engineering. Si un <div> con chrome de card es realmente un Card top-level,
    // migralo manualmente o envolvelo en <section>/<article>.
    id: "card-shell-hardcoded",
    pattern: /<(section|article)[^>]*className="[^"]*rounded-(card|shell|toast|dialog)\b[^"]*\bborder\b[^"]*\bbg-card\b/,
    message: "Shell de card hardcoded en <section|article>. Usá <Card>/<CardHeader>/<CardBody> de @/components/ui/card.",
    // placeholder-tab renderiza un layout 'coming soon' que no encaja como Card.
    allowFiles: ["components/ui/", "components/settings/tabs/placeholder-tab.tsx"],
  },
];

/**
 * Reglas JSX-aware. Usan `findJsxBlocks` para resolver el opening tag completo
 * (manejan multi-linea). Cada regla apunta a un tag específico.
 *
 * Reemplazan las reglas line-based antiguas `chip-button-hardcoded` y
 * `heavy-button-hardcoded` que sólo matcheaban opening tags en una sola línea.
 */
const JSX_RULES = [
  // Gap A — inputs/selects/textareas crudos con estilo canónico de FormInput/FormSelect/FormTextarea.
  // settings-tab-shell.tsx es un primitivo compartido (search input del shell de /settings),
  // no un form de dominio. Queda fuera del alcance de FormInput.
  {
    tag: "input",
    id: "form-input-hardcoded",
    pattern: /className="[^"]*rounded-(2xl|card)[^"]*bg-card/,
    message: "Input hardcoded. Usá <FormInput> de @/components/ui/modal-form.",
    allowFiles: ["components/ui/", "components/settings/settings-tab-shell.tsx"],
  },
  {
    tag: "select",
    id: "form-select-hardcoded",
    pattern: /className="[^"]*rounded-(2xl|card)[^"]*bg-card/,
    message: "Select hardcoded. Usá <FormSelect> de @/components/ui/modal-form.",
    allowFiles: ["components/ui/"],
  },
  {
    tag: "textarea",
    id: "form-textarea-hardcoded",
    pattern: /className="[^"]*rounded-(2xl|card)[^"]*bg-card/,
    message: "Textarea hardcoded. Usá <FormTextarea> de @/components/ui/modal-form.",
    allowFiles: ["components/ui/"],
  },
  // Gap B — heavy button hardcoded (cubre multi-linea y distintos wrappers).
  {
    tag: "button",
    id: "heavy-button-hardcoded",
    pattern: /className="[^"]*rounded-(xl|2xl|card|full)[^"]*bg-foreground/,
    message: "Button hardcoded. Usá <Button variant=...> de @/components/ui/button o buttonClass().",
    allowFiles: ["components/ui/"],
  },
  {
    tag: "PendingSubmitButton",
    id: "pending-submit-button-hardcoded",
    pattern: /className="[^"]*rounded-(xl|2xl|card|full)[^"]*bg-foreground/,
    message: "PendingSubmitButton con className hardcoded. Usar buttonClass() de @/components/ui/button.",
    allowFiles: ["components/ui/"],
  },
  {
    tag: "Link",
    id: "heavy-link-hardcoded",
    pattern: /className="[^"]*rounded-(xl|2xl|card|full)[^"]*bg-foreground/,
    message: "Link con estilo de botón hardcoded. Usar <LinkButton> de @/components/ui/link-button.",
    allowFiles: ["components/ui/"],
  },
  {
    tag: "a",
    id: "heavy-a-hardcoded",
    pattern: /className="[^"]*rounded-(xl|2xl|card|full)[^"]*bg-foreground/,
    message: "<a> con estilo de botón hardcoded. Usar <LinkButton> de @/components/ui/link-button.",
    allowFiles: ["components/ui/"],
  },
  // Chip-button hardcoded multi-linea (subsume la regla line-based antigua).
  {
    tag: "button",
    id: "chip-button-hardcoded",
    pattern: /className="[^"]*\brounded-full\b[^"]*\bbg-foreground\b/,
    message: "Chip button hardcoded. Usá <ChipButton> de @/components/ui/chip.",
    allowFiles: ["components/ui/"],
  },
  {
    tag: "a",
    id: "chip-a-hardcoded",
    pattern: /className="[^"]*\brounded-full\b[^"]*\bbg-foreground\b/,
    message: "Chip <a> hardcoded. Usá <ChipLink> de @/components/ui/chip.",
    allowFiles: ["components/ui/"],
  },
  {
    tag: "Link",
    id: "chip-link-hardcoded",
    pattern: /className="[^"]*\brounded-full\b[^"]*\bbg-foreground\b/,
    message: "Chip Link hardcoded. Usá <ChipLink> de @/components/ui/chip.",
    allowFiles: ["components/ui/"],
  },
];

function listFiles() {
  const out = execSync(
    `git ls-files -- ${SCAN_GLOBS.map((g) => `'${g}/**/*.tsx'`).join(" ")}`,
    { cwd: ROOT, encoding: "utf8" },
  );
  return out
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => ![...EXCLUDE_DIRS].some((dir) => f.startsWith(dir + "/") || f === dir));
}

// Supresión inline: `{/* check-primitives-ignore-next-line: <reason> */}` en la línea anterior.
// El motivo es obligatorio (no se acepta supresión vacía). Ideal para debt flagueada de migración.
const IGNORE_RE = /check-primitives-ignore-next-line:\s*\S+/;

function checkFile(file, rules, jsxRules) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  const hits = [];

  // Reglas line-based.
  for (const rule of rules) {
    if (rule.allowFiles?.some((allow) => file.includes(allow))) continue;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const prev = i > 0 ? lines[i - 1] : "";
      if (IGNORE_RE.test(prev)) continue;
      if (rule.pattern.test(line)) {
        hits.push({ file, line: i + 1, rule: rule.id, message: rule.message, snippet: line.trim() });
      }
    }
  }

  // Reglas JSX-aware — matchean contra el opening text completo (multi-linea).
  // Agrupamos por tag para no repetir parseo.
  const tagsSeen = new Set();
  const blocksByTag = new Map();
  for (const rule of jsxRules) {
    tagsSeen.add(rule.tag);
  }
  for (const tag of tagsSeen) {
    blocksByTag.set(tag, findJsxBlocks(content, tag));
  }
  for (const rule of jsxRules) {
    if (rule.allowFiles?.some((allow) => file.includes(allow))) continue;
    const blocks = blocksByTag.get(rule.tag) ?? [];
    for (const block of blocks) {
      const { openingText, start } = block;
      const prev = start > 1 ? lines[start - 2] : "";
      if (IGNORE_RE.test(prev)) continue;
      if (rule.pattern.test(openingText)) {
        hits.push({
          file,
          line: start,
          rule: rule.id,
          message: rule.message,
          snippet: openingText.split("\n")[0].trim(),
        });
      }
    }
  }

  // Reglas JSX-aware sobre <Modal> — prop `size` obligatoria, prohibido `hideCloseButton`.
  const modalBlocks = findJsxBlocks(content, "Modal");
  for (const block of modalBlocks) {
    const { openingText, start } = block;
    const prev = start > 1 ? lines[start - 2] : "";
    if (IGNORE_RE.test(prev)) continue;
    if (!/\bsize=/.test(openingText)) {
      hits.push({
        file,
        line: start,
        rule: "modal-missing-size",
        message:
          "Modal sin prop `size` explicita. Agregar `size=\"sm|md|lg\"` (ver taxonomia en CLAUDE.md).",
        snippet: openingText.split("\n")[0].trim(),
      });
    }
    if (/\bhideCloseButton\b/.test(openingText)) {
      hits.push({
        file,
        line: start,
        rule: "modal-hideclose-forbidden",
        message:
          "Modal con `hideCloseButton` — prohibido. La X del header es la via de salida garantizada de todo modal.",
        snippet: openingText.split("\n")[0].trim(),
      });
    }
  }

  return hits;
}

function main() {
  const files = listFiles();
  const allHits = [];
  for (const file of files) {
    allHits.push(...checkFile(file, RULES, JSX_RULES));
  }

  if (allHits.length === 0) {
    console.log(`✓ check-primitives: ${files.length} archivos escaneados, 0 violaciones.`);
    process.exit(0);
  }

  const byRule = new Map();
  for (const hit of allHits) {
    if (!byRule.has(hit.rule)) byRule.set(hit.rule, []);
    byRule.get(hit.rule).push(hit);
  }

  console.error(`✗ check-primitives: ${allHits.length} violaciones en ${new Set(allHits.map((h) => h.file)).size} archivos.\n`);
  for (const [ruleId, hits] of byRule) {
    console.error(`── ${ruleId} (${hits.length})`);
    console.error(`   ${hits[0].message}`);
    for (const hit of hits) {
      console.error(`   ${relative(ROOT, hit.file)}:${hit.line}`);
      console.error(`     ${hit.snippet.slice(0, 140)}${hit.snippet.length > 140 ? "…" : ""}`);
    }
    console.error("");
  }
  console.error(`Arreglá los hits o — si es falso positivo — ajustá scripts/check-primitives.mjs.`);
  process.exit(1);
}

main();
