#!/usr/bin/env node
/**
 * audit-design-system.mjs — auditoria read-only del design system.
 *
 * Inspector, NO gate. Corre sobre components/** y app/** y genera un reporte
 * markdown con inventario + gaps por categoria (A-F) y file:line.
 *
 * Invocacion:
 *   npm run audit:design               # imprime a stdout
 *   npm run audit:design -- --out <f>  # escribe a archivo
 *
 * No forma parte de `npm run ci`. Reglas de gate viven en check-primitives.mjs.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_GLOBS = ["components", "app"];
const EXCLUDE_PREFIX = ["components/ui/", "node_modules/", ".next/"];

function listFiles() {
  const out = execSync(
    `git ls-files -- ${SCAN_GLOBS.map((g) => `'${g}/**/*.tsx'`).join(" ")}`,
    { cwd: ROOT, encoding: "utf8" },
  );
  return out
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => !EXCLUDE_PREFIX.some((p) => f.startsWith(p)));
}

// Encuentra el opening-tag completo de un componente JSX dado (ej. "Modal").
// Retorna { start, end, openingText, blockText } donde openingText es todo
// entre "<Tag" y el ">" que cierra la apertura — resolviendo arrow functions
// como `=>` dentro de props via tracking del contador de llaves.
function findJsxBlocks(content, openingTag) {
  const lines = content.split("\n");
  const blocks = [];
  const openRe = new RegExp(`^\\s*<${openingTag}(\\s|>|$)`);
  const closeTagRe = new RegExp(`</${openingTag}>`);

  for (let i = 0; i < lines.length; i++) {
    if (!openRe.test(lines[i])) continue;

    // Reconstruir el source desde lines[i] hasta encontrar el cierre del
    // opening-tag (">" al nivel 0 de braces). Luego seguir hasta </Tag>.
    let chars = "";
    for (let k = i; k < lines.length; k++) chars += lines[k] + "\n";

    let braces = 0;
    let openingEndIdx = -1;
    // Empezar DESPUES de "<Tag" (encontrar el primer char tras el prefix).
    const prefix = `<${openingTag}`;
    const startPrefix = chars.indexOf(prefix);
    for (let p = startPrefix + prefix.length; p < chars.length; p++) {
      const c = chars[p];
      if (c === "{") braces++;
      else if (c === "}") braces--;
      else if (c === ">" && braces === 0) {
        // Self-closing "/>" o cierre de opening ">".
        openingEndIdx = p;
        break;
      }
    }
    if (openingEndIdx === -1) continue;

    const openingText = chars.slice(startPrefix, openingEndIdx + 1);
    const selfClosing = chars[openingEndIdx - 1] === "/";

    // Cantidad de saltos de línea dentro del opening para calcular endLine.
    const openingLines = openingText.split("\n").length;
    const openingStartLine = i + 1;
    const openingEndLine = i + openingLines;

    // Encontrar </Tag> si no es self-closing.
    let closeLine = openingEndLine;
    if (!selfClosing) {
      for (let k = openingEndLine; k < lines.length; k++) {
        if (closeTagRe.test(lines[k])) {
          closeLine = k + 1;
          break;
        }
      }
    }
    const blockText = lines.slice(i, closeLine).join("\n");
    blocks.push({ start: openingStartLine, end: closeLine, openingText, blockText });
  }
  return blocks;
}

const categories = {
  A1: { title: "Modal sin `size` explicito", items: [] },
  A2: { title: "Modal con `hideCloseButton` (violacion de la nueva convencion)", items: [] },
  A3: { title: "Modal destructivo sin `submitVariant=\"destructive\"`", items: [] },
  A4: { title: "ModalFooter con className/size override", items: [] },
  B1: { title: "Section-header uppercase con tracking distinto de 0.14em (fuera de primitivos)", items: [] },
  B2: { title: "Focus rings fuera de ring-foreground/10", items: [] },
  B3: { title: "Radios fuera del token (rounded-xl/[4px]/[24px]/[7px] fuera de primitivos)", items: [] },
  B4: { title: "Colores slate/amber/rose hardcoded fuera de primitivos", items: [] },
  C1: { title: "DataTable sin `density` explicito", items: [] },
  C2: { title: "DataTable con Header pero sin `gridColumns`", items: [] },
  D1: { title: "Label como <span> en lugar de <FormFieldLabel>", items: [] },
  E2: { title: "Strings de feedback inline post-accion sospechosos", items: [] },
  F1: { title: "Sub-nav segmented reimplementado a mano (sin SegmentedNav)", items: [] },
};

// Matchea tanto el string literal en español como las "title keys" de texts.*
// que apuntan a acciones destructivas (closing_title, remove_dialog_title, etc).
const DESTRUCTIVE_TITLE_RE =
  /(eliminar|remover|cerrar jornada|anular|dar de baja|borrar|finalizar|desactivar|closing_title|close_session|remove_|delete_|annul_|deactivate_|finalize_|destroy_)/i;

function auditFile(file) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");

  // A. Modales
  const modalBlocks = findJsxBlocks(content, "Modal");
  for (const block of modalBlocks) {
    const opening = block.openingText;
    // A1: size explicito
    if (!/\bsize=/.test(opening)) {
      categories.A1.items.push({ file, line: block.start, snippet: opening.split("\n")[0].trim() });
    }
    // A2: hideCloseButton
    if (/\bhideCloseButton\b/.test(opening)) {
      categories.A2.items.push({ file, line: block.start, snippet: opening.split("\n")[0].trim() });
    }
    // A3: destructive title sin submitVariant="destructive" (literal o en expresion)
    // Busca `submitVariant` en todo el archivo (no solo dentro del <Modal>) para
    // manejar el caso donde el ModalFooter vive en un form-component hijo.
    const titleMatch = opening.match(/title=\{([^}]+)\}/) || opening.match(/title="([^"]+)"/);
    if (titleMatch) {
      const titleKey = titleMatch[1];
      const isDestructive = DESTRUCTIVE_TITLE_RE.test(titleKey);
      if (isDestructive) {
        // Heuristica: buscar "destructive" como palabra en el archivo — literal
        // o dentro de una expresion. Si no existe en el archivo, es drift.
        const fileHasDestructive = /submitVariant[^<>]*destructive/.test(content);
        if (!fileHasDestructive) {
          categories.A3.items.push({
            file,
            line: block.start,
            snippet: `title destructive sin submitVariant="destructive" en archivo`,
          });
        }
      }
    }
  }

  // A4: ModalFooter con className o size="sm"
  for (let i = 0; i < lines.length; i++) {
    if (/<ModalFooter[\s\S]*?(className=|size="sm")/.test(lines[i])) {
      categories.A4.items.push({ file, line: i + 1, snippet: lines[i].trim() });
    }
  }

  // B1: tracking uppercase distinto de 0.14em
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/uppercase[\s\S]*tracking-\[0\.0[^1]/.test(line) || /uppercase[\s\S]*tracking-\[0\.(1[^4]|2)/.test(line)) {
      categories.B1.items.push({ file, line: i + 1, snippet: line.trim().slice(0, 160) });
    }
  }

  // B2: focus ring /20 o /30
  for (let i = 0; i < lines.length; i++) {
    if (/focus[^"]*ring-foreground\/(20|30)/.test(lines[i])) {
      categories.B2.items.push({ file, line: i + 1, snippet: lines[i].trim().slice(0, 160) });
    }
  }

  // B3: radios fuera de token (rounded-xl / rounded-[4px] / rounded-[24px] / rounded-[7px] fuera de SegmentedNav)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/rounded-xl|rounded-\[4px\]|rounded-\[24px\]/.test(line)) {
      categories.B3.items.push({ file, line: i + 1, snippet: line.trim().slice(0, 160) });
    }
  }

  // B4: slate/amber/rose hardcoded (salvo SegmentedNav fuera de components/ui)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(text-slate-[4-7]00|bg-slate-100|text-amber-[4-9]00|bg-amber-[0-9]00|text-rose-[4-9]00|bg-rose-[0-9]00|text-red-[4-9]00|bg-red-[0-9]00)/.test(line)) {
      categories.B4.items.push({ file, line: i + 1, snippet: line.trim().slice(0, 160) });
    }
  }

  // C. DataTable
  const tables = findJsxBlocks(content, "DataTable");
  for (const block of tables) {
    const opening = block.openingText;
    if (!/\bdensity=/.test(opening)) {
      categories.C1.items.push({ file, line: block.start, snippet: opening.split("\n")[0].trim() });
    }
    const hasHeader = /<DataTableHeader/.test(block.blockText);
    if (hasHeader && !/\bgridColumns=/.test(opening)) {
      categories.C2.items.push({ file, line: block.start, snippet: opening.split("\n")[0].trim() });
    }
  }

  // D1: <span className="text-xs font-semibold"> que simule FormFieldLabel
  for (let i = 0; i < lines.length; i++) {
    if (/<span\s+className="[^"]*text-xs\s+font-semibold[^"]*(text-foreground|uppercase)/.test(lines[i])) {
      categories.D1.items.push({ file, line: i + 1, snippet: lines[i].trim().slice(0, 160) });
    }
  }

  // E2: strings de feedback inline tipicos post-accion (conservador; ruidoso si hay muchos)
  for (let i = 0; i < lines.length; i++) {
    if (/(registrado|guardado exito|guardado correctamente|se confirm|se actualiz|se elimin|se cre[óo]|correctamente)/i.test(lines[i]) && !/toast|flashToast|triggerClientFeedback/i.test(lines[i])) {
      categories.E2.items.push({ file, line: i + 1, snippet: lines[i].trim().slice(0, 160) });
    }
  }

  // F1: sub-nav segmented reimplementado a mano
  if (file.indexOf("components/ui/") !== 0) {
    for (let i = 0; i < lines.length; i++) {
      if (/rounded-card\s+bg-slate-100\s+p-0\.75/.test(lines[i])) {
        categories.F1.items.push({ file, line: i + 1, snippet: lines[i].trim().slice(0, 160) });
      }
    }
  }
}

function render(categories) {
  const today = new Date().toISOString().slice(0, 10);
  const out = [];
  out.push(`# Design System Audit · ${today}`);
  out.push("");
  out.push("Reporte generado por `scripts/audit-design-system.mjs`. No es gate — es inspector.");
  out.push("");
  const totalHits = Object.values(categories).reduce((acc, c) => acc + c.items.length, 0);
  out.push(`**Total hits**: ${totalHits}.`);
  out.push("");
  out.push("## Resumen por categoría");
  out.push("");
  out.push("| ID | Categoría | Hits |");
  out.push("|---|---|---|");
  for (const [id, cat] of Object.entries(categories)) {
    out.push(`| ${id} | ${cat.title} | ${cat.items.length} |`);
  }
  out.push("");
  for (const [id, cat] of Object.entries(categories)) {
    out.push(`## ${id} · ${cat.title}`);
    out.push("");
    if (cat.items.length === 0) {
      out.push("✓ Sin hallazgos.");
      out.push("");
      continue;
    }
    const byFile = new Map();
    for (const item of cat.items) {
      if (!byFile.has(item.file)) byFile.set(item.file, []);
      byFile.get(item.file).push(item);
    }
    for (const [file, items] of byFile) {
      out.push(`### [${relative(ROOT, file)}](${relative(ROOT, file)})`);
      out.push("");
      for (const item of items) {
        out.push(`- **L${item.line}** · \`${item.snippet.replace(/`/g, "\\`")}\``);
      }
      out.push("");
    }
  }
  return out.join("\n");
}

function main() {
  const files = listFiles();
  for (const file of files) {
    auditFile(file);
  }

  const args = process.argv.slice(2);
  const outIdx = args.indexOf("--out");
  const report = render(categories);

  if (outIdx !== -1 && args[outIdx + 1]) {
    const target = args[outIdx + 1];
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, report);
    console.log(`Reporte escrito en ${target}`);
  } else {
    console.log(report);
  }

  const total = Object.values(categories).reduce((acc, c) => acc + c.items.length, 0);
  console.error(`\n${files.length} archivos escaneados, ${total} hits en ${Object.keys(categories).length} categorías.`);
}

main();
