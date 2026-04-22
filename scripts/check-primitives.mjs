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

const ROOT = process.cwd();

const SCAN_GLOBS = ["components", "app"];
const EXCLUDE_DIRS = new Set([
  "components/ui",
  "node_modules",
  ".next",
]);

/**
 * Reglas de anti-patron. Cada una tiene:
 *   id: slug
 *   pattern: RegExp (se aplica linea por linea)
 *   message: mensaje al reportar
 *   allowFiles?: [string] — paths permitidos (primitivos o casos especiales). Substring match.
 */
const RULES = [
  {
    // Solo dispara en <button> / <a> / <Link> para no atrapar badges decorativos (<span>/<div>).
    id: "chip-button-hardcoded",
    pattern: /<(button|a|Link)[^>]*className="[^"]*rounded-full[^"]*bg-foreground[^"]*"/,
    message: "Filter pill hardcoded. Usá <ChipButton> o <ChipLink> de @/components/ui/chip.",
  },
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
    id: "heavy-button-hardcoded",
    pattern: /<button[^>]*className="[^"]*rounded-(xl|2xl|card|full)[^"]*bg-foreground[^"]*"/,
    message: "Button hardcoded. Usá <Button variant=...> de @/components/ui/button o buttonClass().",
    allowFiles: ["components/ui/"],
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

function checkFile(file, rules) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  const hits = [];
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
  return hits;
}

function main() {
  const files = listFiles();
  const allHits = [];
  for (const file of files) {
    allHits.push(...checkFile(file, RULES));
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
