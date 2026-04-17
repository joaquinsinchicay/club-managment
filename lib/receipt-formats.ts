import type { ReceiptFormat } from "@/lib/domain/access";

export const DEFAULT_RECEIPT_SYSTEM_NAME = "Sistema de socios";
export const DEFAULT_RECEIPT_EXAMPLE = "PAY-SOC-26205";
export const DEFAULT_RECEIPT_PATTERN = "^PAY-SOC-[0-9]{5}$";
export const DEFAULT_RECEIPT_PREFIX = "PAY-SOC-";
export const DEFAULT_RECEIPT_MIN_VALUE = 10556;
export const DEFAULT_RECEIPT_MIN_LABEL = "PAY-SOC-10556";

export function getDefaultReceiptFormatSeed() {
  return {
    name: DEFAULT_RECEIPT_SYSTEM_NAME,
    validationType: "pattern" as const,
    pattern: DEFAULT_RECEIPT_PATTERN,
    minNumericValue: DEFAULT_RECEIPT_MIN_VALUE,
    example: DEFAULT_RECEIPT_EXAMPLE,
    status: "active" as const,
    visibleForSecretaria: false,
    visibleForTesoreria: false
  };
}

export function buildDefaultReceiptFormat(clubId: string): ReceiptFormat {
  const defaultReceiptFormat = getDefaultReceiptFormatSeed();

  return {
    id: `receipt-format-default-${clubId}`,
    clubId,
    ...defaultReceiptFormat
  };
}

export function getDefaultReceiptFormats(clubId: string): ReceiptFormat[] {
  return [buildDefaultReceiptFormat(clubId)];
}

export function extractDefaultReceiptSequence(receiptNumber: string) {
  if (!receiptNumber.startsWith(DEFAULT_RECEIPT_PREFIX)) {
    return null;
  }

  const suffix = receiptNumber.slice(DEFAULT_RECEIPT_PREFIX.length);

  if (!/^\d{5}$/.test(suffix)) {
    return null;
  }

  const parsed = Number(suffix);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isDefaultReceiptNumberValid(receiptNumber: string) {
  const trimmed = receiptNumber.trim();

  if (!new RegExp(DEFAULT_RECEIPT_PATTERN).test(trimmed)) {
    return false;
  }

  const sequence = extractDefaultReceiptSequence(trimmed);
  return sequence !== null && sequence >= DEFAULT_RECEIPT_MIN_VALUE;
}
