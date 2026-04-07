import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import type {
  ClubActivity,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryCurrencyCode,
  TreasuryCategory,
  TreasurySettings
} from "@/lib/domain/access";
import { hasMembershipRole } from "@/lib/domain/membership-roles";
import { accessRepository } from "@/lib/repositories/access-repository";

type TreasurySettingsActionCode =
  | "forbidden"
  | "account_created"
  | "account_updated"
  | "category_created"
  | "category_updated"
  | "account_name_required"
  | "account_type_required"
  | "category_name_required"
  | "activity_created"
  | "activity_updated"
  | "activity_name_required"
  | "receipt_format_created"
  | "receipt_format_updated"
  | "treasury_currencies_updated"
  | "receipt_format_name_required"
  | "receipt_format_min_required"
  | "receipt_format_pattern_required"
  | "treasury_currencies_required"
  | "duplicate_account_name"
  | "duplicate_category_name"
  | "duplicate_activity_name"
  | "duplicate_receipt_format_name"
  | "invalid_account_type"
  | "invalid_config_status"
  | "invalid_receipt_validation_type"
  | "primary_currency_invalid"
  | "account_not_found"
  | "category_not_found"
  | "activity_not_found"
  | "receipt_format_not_found"
  | "unknown_error";

export type TreasurySettingsActionResult = {
  ok: boolean;
  code: TreasurySettingsActionCode;
};

const TREASURY_ACCOUNT_TYPES: Array<TreasuryAccount["accountType"]> = [
  "efectivo",
  "bancaria",
  "billetera_virtual"
];

const TREASURY_STATUSES: Array<TreasuryAccount["status"]> = ["active", "inactive"];
const TREASURY_CURRENCY_CODES: TreasuryCurrencyCode[] = ["ARS", "USD", "EUR"];

async function getAdminTreasurySettingsContext() {
  const context = await getAuthenticatedSessionContext();

  if (!context?.activeClub || !context.activeMembership) {
    return null;
  }

  if (!hasMembershipRole(context.activeMembership, "admin")) {
    return null;
  }

  return context;
}

function normalizeEmoji(rawEmoji: string) {
  const normalized = rawEmoji.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeConfigName(rawName: string) {
  return rawName.trim();
}

function hasDuplicateActiveAccountName(
  accounts: TreasuryAccount[],
  name: string,
  accountId?: string
) {
  const normalizedName = name.toLowerCase();

  return accounts.some(
    (account) =>
      account.id !== accountId &&
      account.status === "active" &&
      account.name.trim().toLowerCase() === normalizedName
  );
}

function hasDuplicateActiveCategoryName(
  categories: TreasuryCategory[],
  name: string,
  categoryId?: string
) {
  const normalizedName = name.toLowerCase();

  return categories.some(
    (category) =>
      category.id !== categoryId &&
      category.status === "active" &&
      category.name.trim().toLowerCase() === normalizedName
  );
}

function hasDuplicateActiveActivityName(
  activities: ClubActivity[],
  name: string,
  activityId?: string
) {
  const normalizedName = name.toLowerCase();

  return activities.some(
    (activity) =>
      activity.id !== activityId &&
      activity.status === "active" &&
      activity.name.trim().toLowerCase() === normalizedName
  );
}

function hasDuplicateActiveReceiptFormatName(
  receiptFormats: ReceiptFormat[],
  name: string,
  receiptFormatId?: string
) {
  const normalizedName = name.toLowerCase();

  return receiptFormats.some(
    (receiptFormat) =>
      receiptFormat.id !== receiptFormatId &&
      receiptFormat.status === "active" &&
      receiptFormat.name.trim().toLowerCase() === normalizedName
  );
}

export async function getTreasurySettingsForActiveClub(): Promise<TreasurySettings | null> {
  const context = await getAdminTreasurySettingsContext();

  if (!context?.activeClub) {
    return null;
  }

  const [accounts, categories, activities, receiptFormats, currencies] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id),
    accessRepository.listClubActivitiesForClub(context.activeClub.id),
    accessRepository.listReceiptFormatsForClub(context.activeClub.id),
    accessRepository.listTreasuryCurrenciesForClub(context.activeClub.id)
  ]);

  return {
    accounts,
    categories,
    activities,
    receiptFormats,
    currencies
  };
}

export async function setTreasuryCurrenciesForActiveClub(input: {
  currencies: string[];
  primaryCurrencyCode: string;
}): Promise<TreasurySettingsActionResult> {
  const context = await getAdminTreasurySettingsContext();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const selectedCurrencies = Array.from(
    new Set(
      input.currencies
        .map((currency) => currency.trim().toUpperCase())
        .filter((currency): currency is TreasuryCurrencyCode =>
          TREASURY_CURRENCY_CODES.includes(currency as TreasuryCurrencyCode)
        )
    )
  );

  if (selectedCurrencies.length === 0) {
    return { ok: false, code: "treasury_currencies_required" };
  }

  const primaryCurrencyCode = input.primaryCurrencyCode.trim().toUpperCase();

  if (!selectedCurrencies.includes(primaryCurrencyCode as TreasuryCurrencyCode)) {
    return { ok: false, code: "primary_currency_invalid" };
  }

  const savedCurrencies = await accessRepository.setTreasuryCurrenciesForClub({
    clubId: context.activeClub.id,
    currencies: selectedCurrencies.map((currencyCode) => ({
      currencyCode,
      isPrimary: currencyCode === primaryCurrencyCode
    }))
  });

  if (savedCurrencies.length === 0) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "treasury_currencies_updated" };
}

export async function createTreasuryAccountForActiveClub(input: {
  name: string;
  accountType: string;
  visibleForSecretaria: boolean;
  status: string;
  emoji: string;
}): Promise<TreasurySettingsActionResult> {
  const context = await getAdminTreasurySettingsContext();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const name = normalizeConfigName(input.name);

  if (!name) {
    return { ok: false, code: "account_name_required" };
  }

  if (!input.accountType) {
    return { ok: false, code: "account_type_required" };
  }

  if (!TREASURY_ACCOUNT_TYPES.includes(input.accountType as TreasuryAccount["accountType"])) {
    return { ok: false, code: "invalid_account_type" };
  }

  if (!TREASURY_STATUSES.includes(input.status as TreasuryAccount["status"])) {
    return { ok: false, code: "invalid_config_status" };
  }

  const accounts = await accessRepository.listTreasuryAccountsForClub(context.activeClub.id);
  const configuredCurrencies = await accessRepository.listTreasuryCurrenciesForClub(context.activeClub.id);

  if (hasDuplicateActiveAccountName(accounts, name)) {
    return { ok: false, code: "duplicate_account_name" };
  }

  const created = await accessRepository.createTreasuryAccount({
    clubId: context.activeClub.id,
    name,
    accountType: input.accountType as TreasuryAccount["accountType"],
    accountScope: "secretaria",
    status: input.status as TreasuryAccount["status"],
    visibleForSecretaria: input.visibleForSecretaria,
    visibleForTesoreria: false,
    emoji: normalizeEmoji(input.emoji),
    currencies:
      configuredCurrencies.length > 0
        ? configuredCurrencies.map((currency) => currency.currencyCode)
        : ["ARS"]
  });

  if (!created) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "account_created" };
}

export async function updateTreasuryAccountForActiveClub(input: {
  accountId: string;
  name: string;
  accountType: string;
  visibleForSecretaria: boolean;
  status: string;
  emoji: string;
}): Promise<TreasurySettingsActionResult> {
  const context = await getAdminTreasurySettingsContext();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const name = normalizeConfigName(input.name);

  if (!name) {
    return { ok: false, code: "account_name_required" };
  }

  if (!input.accountType) {
    return { ok: false, code: "account_type_required" };
  }

  if (!TREASURY_ACCOUNT_TYPES.includes(input.accountType as TreasuryAccount["accountType"])) {
    return { ok: false, code: "invalid_account_type" };
  }

  if (!TREASURY_STATUSES.includes(input.status as TreasuryAccount["status"])) {
    return { ok: false, code: "invalid_config_status" };
  }

  const accounts = await accessRepository.listTreasuryAccountsForClub(context.activeClub.id);
  const configuredCurrencies = await accessRepository.listTreasuryCurrenciesForClub(context.activeClub.id);
  const existingAccount = accounts.find((account) => account.id === input.accountId);

  if (!existingAccount) {
    return { ok: false, code: "account_not_found" };
  }

  if (hasDuplicateActiveAccountName(accounts, name, input.accountId)) {
    return { ok: false, code: "duplicate_account_name" };
  }

  const updated = await accessRepository.updateTreasuryAccount({
    accountId: input.accountId,
    clubId: context.activeClub.id,
    name,
    accountType: input.accountType as TreasuryAccount["accountType"],
    accountScope: "secretaria",
    status: input.status as TreasuryAccount["status"],
    visibleForSecretaria: input.visibleForSecretaria,
    visibleForTesoreria: false,
    emoji: normalizeEmoji(input.emoji),
    currencies:
      existingAccount.currencies.length > 0
        ? existingAccount.currencies
        : configuredCurrencies.length > 0
          ? configuredCurrencies.map((currency) => currency.currencyCode)
          : ["ARS"]
  });

  if (!updated) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "account_updated" };
}

export async function createTreasuryCategoryForActiveClub(input: {
  name: string;
  visibleForSecretaria: boolean;
  status: string;
  emoji: string;
}): Promise<TreasurySettingsActionResult> {
  const context = await getAdminTreasurySettingsContext();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const name = normalizeConfigName(input.name);

  if (!name) {
    return { ok: false, code: "category_name_required" };
  }

  if (!TREASURY_STATUSES.includes(input.status as TreasuryCategory["status"])) {
    return { ok: false, code: "invalid_config_status" };
  }

  const categories = await accessRepository.listTreasuryCategoriesForClub(context.activeClub.id);

  if (hasDuplicateActiveCategoryName(categories, name)) {
    return { ok: false, code: "duplicate_category_name" };
  }

  const created = await accessRepository.createTreasuryCategory({
    clubId: context.activeClub.id,
    name,
    status: input.status as TreasuryCategory["status"],
    visibleForSecretaria: input.visibleForSecretaria,
    visibleForTesoreria: false,
    emoji: normalizeEmoji(input.emoji)
  });

  if (!created) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "category_created" };
}

export async function updateTreasuryCategoryForActiveClub(input: {
  categoryId: string;
  name: string;
  visibleForSecretaria: boolean;
  status: string;
  emoji: string;
}): Promise<TreasurySettingsActionResult> {
  const context = await getAdminTreasurySettingsContext();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const name = normalizeConfigName(input.name);

  if (!name) {
    return { ok: false, code: "category_name_required" };
  }

  if (!TREASURY_STATUSES.includes(input.status as TreasuryCategory["status"])) {
    return { ok: false, code: "invalid_config_status" };
  }

  const categories = await accessRepository.listTreasuryCategoriesForClub(context.activeClub.id);
  const existingCategory = categories.find((category) => category.id === input.categoryId);

  if (!existingCategory) {
    return { ok: false, code: "category_not_found" };
  }

  if (hasDuplicateActiveCategoryName(categories, name, input.categoryId)) {
    return { ok: false, code: "duplicate_category_name" };
  }

  const updated = await accessRepository.updateTreasuryCategory({
    categoryId: input.categoryId,
    clubId: context.activeClub.id,
    name,
    status: input.status as TreasuryCategory["status"],
    visibleForSecretaria: input.visibleForSecretaria,
    visibleForTesoreria: false,
    emoji: normalizeEmoji(input.emoji)
  });

  if (!updated) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "category_updated" };
}

export async function createClubActivityForActiveClub(input: {
  name: string;
  status: string;
  emoji: string;
}): Promise<TreasurySettingsActionResult> {
  const context = await getAdminTreasurySettingsContext();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const name = normalizeConfigName(input.name);

  if (!name) {
    return { ok: false, code: "activity_name_required" };
  }

  if (!TREASURY_STATUSES.includes(input.status as ClubActivity["status"])) {
    return { ok: false, code: "invalid_config_status" };
  }

  const activities = await accessRepository.listClubActivitiesForClub(context.activeClub.id);

  if (hasDuplicateActiveActivityName(activities, name)) {
    return { ok: false, code: "duplicate_activity_name" };
  }

  const created = await accessRepository.createClubActivity({
    clubId: context.activeClub.id,
    name,
    status: input.status as ClubActivity["status"],
    emoji: normalizeEmoji(input.emoji)
  });

  if (!created) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "activity_created" };
}

export async function updateClubActivityForActiveClub(input: {
  activityId: string;
  name: string;
  status: string;
  emoji: string;
}): Promise<TreasurySettingsActionResult> {
  const context = await getAdminTreasurySettingsContext();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const name = normalizeConfigName(input.name);

  if (!name) {
    return { ok: false, code: "activity_name_required" };
  }

  if (!TREASURY_STATUSES.includes(input.status as ClubActivity["status"])) {
    return { ok: false, code: "invalid_config_status" };
  }

  const activities = await accessRepository.listClubActivitiesForClub(context.activeClub.id);
  const existingActivity = activities.find((activity) => activity.id === input.activityId);

  if (!existingActivity) {
    return { ok: false, code: "activity_not_found" };
  }

  if (hasDuplicateActiveActivityName(activities, name, input.activityId)) {
    return { ok: false, code: "duplicate_activity_name" };
  }

  const updated = await accessRepository.updateClubActivity({
    activityId: input.activityId,
    clubId: context.activeClub.id,
    name,
    status: input.status as ClubActivity["status"],
    emoji: normalizeEmoji(input.emoji)
  });

  if (!updated) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "activity_updated" };
}

export async function createReceiptFormatForActiveClub(input: {
  name: string;
  validationType: string;
  minNumericValue: string;
  pattern: string;
  example: string;
  status: string;
}): Promise<TreasurySettingsActionResult> {
  const context = await getAdminTreasurySettingsContext();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const name = normalizeConfigName(input.name);

  if (!name) {
    return { ok: false, code: "receipt_format_name_required" };
  }

  if (!TREASURY_STATUSES.includes(input.status as ReceiptFormat["status"])) {
    return { ok: false, code: "invalid_config_status" };
  }

  if (input.validationType !== "numeric" && input.validationType !== "pattern") {
    return { ok: false, code: "invalid_receipt_validation_type" };
  }

  const receiptFormats = await accessRepository.listReceiptFormatsForClub(context.activeClub.id);

  if (hasDuplicateActiveReceiptFormatName(receiptFormats, name)) {
    return { ok: false, code: "duplicate_receipt_format_name" };
  }

  const pattern = normalizeConfigName(input.pattern);
  const example = normalizeConfigName(input.example);
  const minNumericValue = input.minNumericValue.trim();

  if (input.validationType === "numeric" && !minNumericValue) {
    return { ok: false, code: "receipt_format_min_required" };
  }

  if (input.validationType === "pattern" && !pattern) {
    return { ok: false, code: "receipt_format_pattern_required" };
  }

  const parsedMin =
    input.validationType === "numeric" ? Number(minNumericValue) : null;

  if (input.validationType === "numeric" && (!Number.isFinite(parsedMin) || parsedMin === null)) {
    return { ok: false, code: "receipt_format_min_required" };
  }

  const created = await accessRepository.createReceiptFormat({
    clubId: context.activeClub.id,
    name,
    validationType: input.validationType as ReceiptFormat["validationType"],
    pattern: input.validationType === "pattern" ? pattern : null,
    minNumericValue: input.validationType === "numeric" ? parsedMin : null,
    example: example || null,
    status: input.status as ReceiptFormat["status"]
  });

  if (!created) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "receipt_format_created" };
}

export async function updateReceiptFormatForActiveClub(input: {
  receiptFormatId: string;
  name: string;
  validationType: string;
  minNumericValue: string;
  pattern: string;
  example: string;
  status: string;
}): Promise<TreasurySettingsActionResult> {
  const context = await getAdminTreasurySettingsContext();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const name = normalizeConfigName(input.name);

  if (!name) {
    return { ok: false, code: "receipt_format_name_required" };
  }

  if (!TREASURY_STATUSES.includes(input.status as ReceiptFormat["status"])) {
    return { ok: false, code: "invalid_config_status" };
  }

  if (input.validationType !== "numeric" && input.validationType !== "pattern") {
    return { ok: false, code: "invalid_receipt_validation_type" };
  }

  const receiptFormats = await accessRepository.listReceiptFormatsForClub(context.activeClub.id);
  const existingReceiptFormat = receiptFormats.find((receiptFormat) => receiptFormat.id === input.receiptFormatId);

  if (!existingReceiptFormat) {
    return { ok: false, code: "receipt_format_not_found" };
  }

  if (hasDuplicateActiveReceiptFormatName(receiptFormats, name, input.receiptFormatId)) {
    return { ok: false, code: "duplicate_receipt_format_name" };
  }

  const pattern = normalizeConfigName(input.pattern);
  const example = normalizeConfigName(input.example);
  const minNumericValue = input.minNumericValue.trim();

  if (input.validationType === "numeric" && !minNumericValue) {
    return { ok: false, code: "receipt_format_min_required" };
  }

  if (input.validationType === "pattern" && !pattern) {
    return { ok: false, code: "receipt_format_pattern_required" };
  }

  const parsedMin =
    input.validationType === "numeric" ? Number(minNumericValue) : null;

  if (input.validationType === "numeric" && (!Number.isFinite(parsedMin) || parsedMin === null)) {
    return { ok: false, code: "receipt_format_min_required" };
  }

  const updated = await accessRepository.updateReceiptFormat({
    receiptFormatId: input.receiptFormatId,
    clubId: context.activeClub.id,
    name,
    validationType: input.validationType as ReceiptFormat["validationType"],
    pattern: input.validationType === "pattern" ? pattern : null,
    minNumericValue: input.validationType === "numeric" ? parsedMin : null,
    example: example || null,
    status: input.status as ReceiptFormat["status"]
  });

  if (!updated) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "receipt_format_updated" };
}
