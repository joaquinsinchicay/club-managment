const CUIT_DIGITS_ONLY = /^\d{11}$/;
const CUIT_FORMATTED = /^\d{2}-\d{8}-\d$/;
const CUIT_MULTIPLIERS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export function normalizeCuit(value: string): string {
  return value.replace(/\D+/g, "");
}

export function formatCuit(digits: string): string {
  if (!CUIT_DIGITS_ONLY.test(digits)) {
    return digits;
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function hasValidCuitShape(value: string): boolean {
  return CUIT_FORMATTED.test(value);
}

export function hasValidCuitDv(value: string): boolean {
  const digits = normalizeCuit(value);
  if (!CUIT_DIGITS_ONLY.test(digits)) {
    return false;
  }

  const sum = CUIT_MULTIPLIERS.reduce(
    (acc, multiplier, index) => acc + Number(digits[index]) * multiplier,
    0
  );
  const mod = sum % 11;
  const verifier = (11 - mod) % 11;

  if (verifier === 10) {
    return false;
  }

  return Number(digits[10]) === verifier;
}
