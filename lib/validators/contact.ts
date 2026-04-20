const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_E164_REGEX = /^\+[1-9]\d{1,14}$/;
const PHONE_STRIP_REGEX = /[\s-]+/g;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export function normalizePhone(value: string): string {
  return value.replace(PHONE_STRIP_REGEX, "");
}

export type PhoneValidation =
  | { ok: true; normalized: string }
  | { ok: false; reason: "missing_prefix" | "invalid_format" };

export function validatePhone(value: string): PhoneValidation {
  const normalized = normalizePhone(value);
  if (!normalized) {
    return { ok: false, reason: "invalid_format" };
  }
  if (!normalized.startsWith("+")) {
    return { ok: false, reason: "missing_prefix" };
  }
  if (!PHONE_E164_REGEX.test(normalized)) {
    return { ok: false, reason: "invalid_format" };
  }
  return { ok: true, normalized };
}
