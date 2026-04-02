import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "README.md",
  "WORKFLOW.md",
  "DEFINITION_OF_DONE.md",
  "docs/architecture/decisions.md",
  "docs/architecture/tech-stack.md",
  "docs/contracts/api-contracts.md",
  "docs/contracts/permission-matrix.md",
  "docs/database/README.md",
  "docs/database/rls-policies.sql",
  "docs/design/design-system.md",
  "docs/domain/domain-model.md",
  "docs/domain/schema.sql",
  "lib/texts.json"
];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

JSON.parse(readFileSync("lib/texts.json", "utf8"));

const pddPath = "docs/pdd/pdd_us_01_google_sign_in.md";

if (existsSync(pddPath)) {
  const pddContent = readFileSync(pddPath, "utf8");
  const requiredSections = [
    "## 11. UI / UX",
    "## 12. Mensajes y textos",
    "## 13. Persistencia",
    "## 14. Seguridad",
    "## 15. Dependencias",
    "## 16. Riesgos",
    "lib/texts.json"
  ];

  for (const section of requiredSections) {
    if (!pddContent.includes(section)) {
      throw new Error(`Missing PDD section or reference "${section}" in ${pddPath}`);
    }
  }
}

console.log("Documentation validation passed.");
