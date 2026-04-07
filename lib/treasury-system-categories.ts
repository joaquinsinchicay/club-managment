import type { TreasuryCategory } from "@/lib/domain/access";

type SystemTreasuryCategoryDefinition = {
  name: string;
  emoji: string;
  visibleForSecretaria: boolean;
  visibleForTesoreria: boolean;
};

export const SYSTEM_TREASURY_CATEGORY_DEFINITIONS: SystemTreasuryCategoryDefinition[] = [
  { name: "Alquileres", emoji: "🏠", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Cuotas", emoji: "🧾", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Eventos", emoji: "🎉", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Fichajes", emoji: "📝", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Impuestos", emoji: "🏛️", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Indumentaria", emoji: "👕", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Inversiones", emoji: "📈", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Ligas/Jornadas", emoji: "🏆", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Mantenimiento", emoji: "🛠️", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Obra", emoji: "🏗️", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Otros", emoji: "📁", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Préstamo", emoji: "🤝", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Servicios", emoji: "🔌", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Sponsor", emoji: "💼", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Subsidios", emoji: "🎯", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Sueldos", emoji: "💸", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Utilería", emoji: "🎽", visibleForSecretaria: true, visibleForTesoreria: true },
  { name: "Ajuste", emoji: "⚖️", visibleForSecretaria: true, visibleForTesoreria: false }
];

function normalizeSystemCategoryName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

const SYSTEM_TREASURY_CATEGORY_MAP = new Map(
  SYSTEM_TREASURY_CATEGORY_DEFINITIONS.map((definition) => [
    normalizeSystemCategoryName(definition.name),
    definition
  ])
);

export function getSystemTreasuryCategoryDefinition(name: string) {
  return SYSTEM_TREASURY_CATEGORY_MAP.get(normalizeSystemCategoryName(name)) ?? null;
}

export function isSystemTreasuryCategoryName(name: string) {
  return SYSTEM_TREASURY_CATEGORY_MAP.has(normalizeSystemCategoryName(name));
}

export function sortTreasuryCategories(categories: TreasuryCategory[]) {
  return [...categories].sort((left, right) => {
    const leftDefinition = getSystemTreasuryCategoryDefinition(left.name);
    const rightDefinition = getSystemTreasuryCategoryDefinition(right.name);

    if (leftDefinition && rightDefinition) {
      return (
        SYSTEM_TREASURY_CATEGORY_DEFINITIONS.indexOf(leftDefinition) -
        SYSTEM_TREASURY_CATEGORY_DEFINITIONS.indexOf(rightDefinition)
      );
    }

    if (leftDefinition) {
      return -1;
    }

    if (rightDefinition) {
      return 1;
    }

    return left.name.localeCompare(right.name, "es");
  });
}
