/**
 * Re-exporta los textos del producto desde `lib/texts/<domain>.ts`. Cada
 * dominio es un object `as const` autogenerado por `scripts/split-texts.mjs`
 * desde `lib/texts.json` (que sigue siendo la fuente única de verdad
 * editable).
 *
 * Convención de uso:
 * - **Client components** → import granular tree-shakeable:
 *     `import { dashboard, common } from "@/lib/texts";`
 *     `<h1>{dashboard.treasury.title}</h1>`
 *   Webpack solo arrastra el dominio importado al bundle del cliente.
 *
 * - **Server components / repos / services** → seguir usando el aggregate:
 *     `import { texts } from "@/lib/texts";`
 *     `texts.dashboard.treasury.title`
 *   Sin penalty de bundle (server side).
 *
 * Refs: audit perf top-7 · C5.
 */

export { app } from "./texts/app";
export { auth } from "./texts/auth";
export { common } from "./texts/common";
export { dashboard } from "./texts/dashboard";
export { header } from "./texts/header";
export { modules } from "./texts/modules";
export { rrhh } from "./texts/rrhh";
export { settings } from "./texts/settings";

import { app } from "./texts/app";
import { auth } from "./texts/auth";
import { common } from "./texts/common";
import { dashboard } from "./texts/dashboard";
import { header } from "./texts/header";
import { modules } from "./texts/modules";
import { rrhh } from "./texts/rrhh";
import { settings } from "./texts/settings";

export const texts = {
  app,
  auth,
  common,
  dashboard,
  header,
  modules,
  rrhh,
  settings,
} as const;
