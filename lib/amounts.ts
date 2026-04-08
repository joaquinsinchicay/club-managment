const AMOUNT_FORMATTER = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatLocalizedAmount(value: number) {
  if (!Number.isFinite(value)) {
    return AMOUNT_FORMATTER.format(0);
  }

  return AMOUNT_FORMATTER.format(value);
}

export function parseLocalizedAmount(rawValue: string) {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return null;
  }

  const normalizedWhitespace = trimmedValue.replace(/\s+/g, "");
  const localizedPattern = /^-?\d{1,3}(?:\.\d{3})*(?:,\d+)?$/;
  const plainLocalizedPattern = /^-?\d+(?:,\d+)?$/;
  const plainNumberPattern = /^-?\d+(?:\.\d+)?$/;

  if (localizedPattern.test(normalizedWhitespace) || plainLocalizedPattern.test(normalizedWhitespace)) {
    const normalizedNumber = normalizedWhitespace.replace(/\./g, "").replace(",", ".");
    const parsedValue = Number(normalizedNumber);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  if (plainNumberPattern.test(normalizedWhitespace)) {
    const parsedValue = Number(normalizedWhitespace);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}
