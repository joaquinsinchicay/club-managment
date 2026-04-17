import type { TreasuryCategory, TreasuryCategoryMovementType } from "@/lib/domain/access";

type SystemTreasuryCategoryDefinition = {
  subCategoryName: string;
  emoji: string;
  description: string;
  parentCategory: string;
  movementType: TreasuryCategoryMovementType;
  visibleForSecretaria: boolean;
  visibleForTesoreria: boolean;
};

export const LEGACY_SYSTEM_TREASURY_CATEGORY_NAMES = [
  "Alquileres",
  "Cuotas",
  "Eventos",
  "Fichajes",
  "Impuestos",
  "Indumentaria",
  "Inversiones",
  "Ligas/Jornadas",
  "Mantenimiento",
  "Obra",
  "Otros",
  "Préstamo",
  "Servicios",
  "Sponsor",
  "Subsidios",
  "Sueldos",
  "Utilería",
  "Ajuste"
] as const;

export const SYSTEM_TREASURY_CATEGORY_DEFINITIONS: SystemTreasuryCategoryDefinition[] = [
  {
    subCategoryName: "Comisiones",
    emoji: "💳",
    description: "Plataformas / medios de pago",
    parentCategory: "Administración",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Insumos de oficina",
    emoji: "🖇️",
    description: "Gastos de librería",
    parentCategory: "Administración",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Reuniones de comisión",
    emoji: "🪑",
    description: "Reuniones de comisión",
    parentCategory: "Administración",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Software",
    emoji: "💻",
    description: "Sistemas, suscripciones",
    parentCategory: "Administración",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Ajustes contables",
    emoji: "📋",
    description: "Correcciones",
    parentCategory: "Ajustes y devoluciones",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Devolución",
    emoji: "↩️",
    description: "Reintegro a socios",
    parentCategory: "Ajustes y devoluciones",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Errores operativos",
    emoji: "⚠️",
    description: "Rectificaciones manuales por error de carga",
    parentCategory: "Ajustes y devoluciones",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Reversiones",
    emoji: "🔄",
    description: "Anulación de movimientos erróneos ya confirmados",
    parentCategory: "Ajustes y devoluciones",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Árbitros",
    emoji: "🟨",
    description: "Pago de jueces",
    parentCategory: "Deporte",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Compra de indumentaria",
    emoji: "👕",
    description: "Compra de ropa deportiva",
    parentCategory: "Deporte",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Ligas",
    emoji: "🏆",
    description: "Inscripciones y costos de competencia",
    parentCategory: "Deporte",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Material deportivo",
    emoji: "⚽",
    description: "Pelotas, redes, conos, botiquín",
    parentCategory: "Deporte",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Multas",
    emoji: "🟥",
    description: "Multas de liga por expulsiones o inasistencias",
    parentCategory: "Deporte",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Alquiler de espacios",
    emoji: "🏟️",
    description: "SUM, cancha, etc.",
    parentCategory: "Eventos y actividades",
    movementType: "ingreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Buffet",
    emoji: "🍔",
    description: "Ventas en eventos",
    parentCategory: "Eventos y actividades",
    movementType: "ingreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Entradas",
    emoji: "🎟️",
    description: "Venta de tickets",
    parentCategory: "Eventos y actividades",
    movementType: "ingreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Gastos de evento",
    emoji: "🎪",
    description: "Eventos y actividades",
    parentCategory: "Eventos y actividades",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Rifas",
    emoji: "🎲",
    description: "Venta de rifas",
    parentCategory: "Eventos y actividades",
    movementType: "ingreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Comisiones bancarias",
    emoji: "🏦",
    description: "Costos de cuentas",
    parentCategory: "Financiero",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Devolución de préstamos",
    emoji: "💸",
    description: "Pago de capital",
    parentCategory: "Financiero",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Intereses ganados",
    emoji: "📈",
    description: "Rendimientos financieros",
    parentCategory: "Financiero",
    movementType: "ingreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Préstamos recibidos",
    emoji: "🤝",
    description: "Dinero recibido a devolver",
    parentCategory: "Financiero",
    movementType: "ingreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Certificaciones",
    emoji: "📜",
    description: "Certificación de balances, firmas, etc.",
    parentCategory: "Impuestos y legales",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Honorarios profesionales",
    emoji: "👔",
    description: "Contador, abogado, escribano",
    parentCategory: "Impuestos y legales",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Impuestos",
    emoji: "🏛️",
    description: "Impuestos nacionales y provinciales, AFIP, etc.",
    parentCategory: "Impuestos y legales",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Alquiler",
    emoji: "🔑",
    description: "Alquiler de cancha para entrenamiento/partido",
    parentCategory: "Infraestructura",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Mantenimiento",
    emoji: "🔧",
    description: "Reparaciones simples",
    parentCategory: "Infraestructura",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Obras",
    emoji: "🏗️",
    description: "Construcción",
    parentCategory: "Infraestructura",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Publicidad",
    emoji: "📢",
    description: "Cartelería, menciones",
    parentCategory: "Ingresos comerciales",
    movementType: "ingreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Sponsoreo",
    emoji: "🤜",
    description: "Aportes de marcas",
    parentCategory: "Ingresos comerciales",
    movementType: "ingreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Venta de indumentaria",
    emoji: "🛒",
    description: "Venta de ropa deportiva",
    parentCategory: "Ingresos comerciales",
    movementType: "ingreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Donaciones",
    emoji: "🎁",
    description: "Aportes voluntarios",
    parentCategory: "Ingresos no operativos",
    movementType: "ingreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Otros ingresos",
    emoji: "➕",
    description: "Ingresos extraordinarios",
    parentCategory: "Ingresos no operativos",
    movementType: "ingreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Subsidios",
    emoji: "🏢",
    description: "Aportes estatales",
    parentCategory: "Ingresos no operativos",
    movementType: "ingreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Cuotas/Fichajes",
    emoji: "👥",
    description: "Cuota social, cuota deportiva, inscripción, etc.",
    parentCategory: "Ingresos por socios",
    movementType: "ingreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Tecnología",
    emoji: "📡",
    description: "Cámaras, equipamiento wifi, etc.",
    parentCategory: "Inversiones",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Cargas sociales",
    emoji: "📑",
    description: "Aportes y contribuciones",
    parentCategory: "Recursos humanos",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Sueldos",
    emoji: "💰",
    description: "Profesores / contratados",
    parentCategory: "Recursos humanos",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Viáticos",
    emoji: "🚗",
    description: "Gastos del personal",
    parentCategory: "Recursos humanos",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Saldo",
    emoji: "🏁",
    description: "Saldo inicial de apertura",
    parentCategory: "Saldo",
    movementType: "saldo",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Desratización y fumigación",
    emoji: "🐀",
    description: "Control de plagas",
    parentCategory: "Servicios",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Limpieza",
    emoji: "🧹",
    description: "Productos de limpieza",
    parentCategory: "Servicios",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Medicina",
    emoji: "🩺",
    description: "Médico para eventos deportivos",
    parentCategory: "Servicios",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Seguridad",
    emoji: "🔒",
    description: "Policía en eventos, alarmas, monitoreo",
    parentCategory: "Servicios",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Seguros",
    emoji: "🛡️",
    description: "Seguros generales y deportivos",
    parentCategory: "Servicios",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Agua",
    emoji: "💧",
    description: "Servicio de agua",
    parentCategory: "Servicios públicos",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Gas",
    emoji: "🔥",
    description: "Servicio de gas",
    parentCategory: "Servicios públicos",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Internet",
    emoji: "📶",
    description: "Conectividad",
    parentCategory: "Servicios públicos",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Luz",
    emoji: "💡",
    description: "Energía eléctrica",
    parentCategory: "Servicios públicos",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Telefonía",
    emoji: "📱",
    description: "Líneas telefónicas",
    parentCategory: "Servicios públicos",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Egreso e/cuentas",
    emoji: "➡️",
    description: "Transferencias e/cuentas",
    parentCategory: "Transferencias e/cuentas",
    movementType: "egreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  },
  {
    subCategoryName: "Ingreso e/cuentas",
    emoji: "⬅️",
    description: "Transferencias e/cuentas",
    parentCategory: "Transferencias e/cuentas",
    movementType: "ingreso",
    visibleForSecretaria: true,
    visibleForTesoreria: true
  }
];

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

export const SYSTEM_TREASURY_PARENT_CATEGORY_OPTIONS = Array.from(
  new Set(SYSTEM_TREASURY_CATEGORY_DEFINITIONS.map((definition) => definition.parentCategory))
);

export function getSystemTreasuryCategoryDefinition(subCategoryName: string) {
  return (
    SYSTEM_TREASURY_CATEGORY_DEFINITIONS.find(
      (definition) => normalizeKey(definition.subCategoryName) === normalizeKey(subCategoryName)
    ) ?? null
  );
}

export function isSystemTreasuryCategoryName(subCategoryName: string) {
  return getSystemTreasuryCategoryDefinition(subCategoryName) !== null;
}

export function getMovementTypeForParentCategory(parentCategory: string) {
  return (
    SYSTEM_TREASURY_CATEGORY_DEFINITIONS.find(
      (definition) => normalizeKey(definition.parentCategory) === normalizeKey(parentCategory)
    )?.movementType ?? null
  );
}

export function getParentCategoryOptionsWithCurrentValue(currentValue?: string | null) {
  if (!currentValue) {
    return SYSTEM_TREASURY_PARENT_CATEGORY_OPTIONS;
  }

  return SYSTEM_TREASURY_PARENT_CATEGORY_OPTIONS.includes(currentValue)
    ? SYSTEM_TREASURY_PARENT_CATEGORY_OPTIONS
    : [currentValue, ...SYSTEM_TREASURY_PARENT_CATEGORY_OPTIONS];
}

export function sortTreasuryCategories(categories: TreasuryCategory[]) {
  const systemOrder = new Map(
    SYSTEM_TREASURY_CATEGORY_DEFINITIONS.map((definition, index) => [
      normalizeKey(definition.subCategoryName),
      index
    ])
  );

  return [...categories].sort((left, right) => {
    if (left.isLegacy !== right.isLegacy) {
      return left.isLegacy ? 1 : -1;
    }

    const leftSystemOrder = systemOrder.get(normalizeKey(left.subCategoryName));
    const rightSystemOrder = systemOrder.get(normalizeKey(right.subCategoryName));

    if (leftSystemOrder !== undefined && rightSystemOrder !== undefined) {
      return leftSystemOrder - rightSystemOrder;
    }

    if (leftSystemOrder !== undefined) {
      return -1;
    }

    if (rightSystemOrder !== undefined) {
      return 1;
    }

    return left.subCategoryName.localeCompare(right.subCategoryName, "es");
  });
}
