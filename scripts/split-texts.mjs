#!/usr/bin/env node
/**
 * Regenera `lib/texts/<domain>.ts` desde `lib/texts.json` para que los
 * top-level keys sean tree-shakeables por webpack.
 *
 * Por qué: `import rawTexts from "@/lib/texts.json"` arrastra el JSON
 * completo (~119 KB) a CADA client bundle que importa `texts`, porque
 * webpack no tree-shakea JSON imports. Splittear el JSON en archivos TS
 * con `as const` permite que `import { dashboard } from "@/lib/texts"`
 * solo arrastre el dominio dashboard.
 *
 * Uso: `node scripts/split-texts.mjs` después de editar texts.json.
 *
 * Refs: audit perf top-7 · C5.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const sourceJson = join(repoRoot, "lib/texts.json");
const outDir = join(repoRoot, "lib/texts");

const texts = JSON.parse(readFileSync(sourceJson, "utf8"));

for (const key of Object.keys(texts)) {
  const filePath = join(outDir, `${key}.ts`);
  const banner =
    "// AUTOGENERADO desde texts.json (split-texts). NO editar a mano —\n" +
    "// editar lib/texts.json y regenerar con scripts/split-texts.mjs.\n\n";
  // Sin `as const`: TS inferiría tuples readonly a partir de los arrays
  // del JSON, lo que rompe call sites que esperan `string[]` mutable
  // (treasury-settings-service, settings forms). El JSON original
  // tampoco usaba `as const`.
  const body = `export const ${key} = ${JSON.stringify(texts[key], null, 2)};\n`;
  writeFileSync(filePath, banner + body);
  console.log(`✓ ${filePath} (${Math.round((body.length / 1024) * 10) / 10} KB)`);
}

console.log(`\nGenerated ${Object.keys(texts).length} domain files in lib/texts/.`);
