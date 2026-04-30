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

export function sanitizeLocalizedAmountInput(value: string): string {
  const normalizedValue = value.replace(/[^\d,]/g, "");
  const [integerPart = "", ...decimalParts] = normalizedValue.split(",");

  if (decimalParts.length === 0) {
    return integerPart;
  }

  return `${integerPart},${decimalParts.join("")}`;
}

function trimTrailingZeros(decimalPart: string) {
  return decimalPart.replace(/0+$/, "");
}

function toEditableLocalizedAmount(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }

  const fixedValue = value.toFixed(2);
  const [integerPart = "", decimalPart = ""] = fixedValue.split(".");
  const trimmedDecimalPart = trimTrailingZeros(decimalPart);

  if (!trimmedDecimalPart) {
    return integerPart;
  }

  return `${integerPart},${trimmedDecimalPart}`;
}

export function formatLocalizedAmountInputOnBlur(rawValue: string) {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return "";
  }

  const parsedValue = parseLocalizedAmount(trimmedValue);

  if (parsedValue === null) {
    return sanitizeLocalizedAmountInput(trimmedValue);
  }

  return formatLocalizedAmount(parsedValue);
}

export function formatLocalizedAmountInputOnFocus(rawValue: string) {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return "";
  }

  const parsedValue = parseLocalizedAmount(trimmedValue);

  if (parsedValue === null) {
    return sanitizeLocalizedAmountInput(trimmedValue);
  }

  return toEditableLocalizedAmount(parsedValue);
}
