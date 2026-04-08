import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import type {
  ClubActivity,
  ClubCalendarEvent,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryAdditionalFieldName,
  TreasuryCurrencyCode,
  TreasuryFieldRule,
  TreasuryMovementType,
  TreasuryCategory,
  TreasurySettings
} from "@/lib/domain/access";
import { canAccessTreasurySettings, canManageClubMembers } from "@/lib/domain/authorization";
import { getDefaultReceiptFormats } from "@/lib/receipt-formats";
import { accessRepository, isAccessRepositoryInfraError } from "@/lib/repositories/access-repository";
import { texts } from "@/lib/texts";
import { getSystemTreasuryCategoryDefinition } from "@/lib/treasury-system-categories";

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
  | "receipt_format_name_required"
  | "receipt_format_min_required"
  | "receipt_format_pattern_required"
  | "account_currencies_required"
  | "duplicate_account_name"
  | "duplicate_category_name"
  | "duplicate_activity_name"
  | "duplicate_receipt_format_name"
  | "invalid_account_type"
  | "account_visibility_required"
  | "invalid_emoji_option"
  | "invalid_account_currency"
  | "invalid_config_status"
  | "invalid_receipt_validation_type"
  | "account_not_found"
  | "category_not_found"
  | "activity_not_found"
  | "receipt_format_not_found"
  | "field_rules_updated"
  | "field_rule_category_not_found"
  | "field_rule_invalid"
  | "calendar_event_updated"
  | "calendar_event_not_found"
  | "treasury_admin_config_missing"
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
const TREASURY_VISIBILITY_OPTIONS = ["secretaria", "tesoreria"] as const;
const TREASURY_ACCOUNT_EMOJI_OPTIONS = texts.settings.club.treasury.emoji_options.accounts;
const TREASURY_CATEGORY_EMOJI_OPTIONS = texts.settings.club.treasury.emoji_options.categories;
const TREASURY_ACTIVITY_EMOJI_OPTIONS = texts.settings.club.treasury.emoji_options.activities;
const TREASURY_ADDITIONAL_FIELD_NAMES: TreasuryAdditionalFieldName[] = [
  "activity",
  "receipt",
  "calendar"
];

const TREASURY_STATUSES: Array<TreasuryAccount["status"]> = ["active", "inactive"];
const TREASURY_CURRENCY_CODES: TreasuryCurrencyCode[] = ["ARS", "USD"];
const TREASURY_MOVEMENT_TYPES: TreasuryMovementType[] = ["ingreso", "egreso"];
const FIXED_TREASURY_CURRENCIES = TREASURY_CURRENCY_CODES.map((currencyCode, index) => ({
  currencyCode,
  isPrimary: index === 0
}));

async function getTreasurySettingsContext() {
  const context = await getAuthenticatedSessionContext();

  if (!context?.activeClub || !context.activeMembership) {
    return null;
  }

  if (!canAccessTreasurySettings(context.activeMembership)) {
    return null;
  }

  return context;
}

async function getTreasuryFieldRulesContext() {
  const context = await getAuthenticatedSessionContext();

  if (!context?.activeClub || !context.activeMembership) {
    return null;
  }

  if (!canManageClubMembers(context.activeMembership)) {
    return null;
  }

  return context;
}

function normalizeEmoji(rawEmoji: string) {
  const normalized = rawEmoji.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveConfiguredEmoji(
  rawEmoji: string,
  allowedOptions: string[],
  currentEmoji?: string | null
): { valid: true; emoji: string | null } | { valid: false } {
  const normalized = normalizeEmoji(rawEmoji);

  if (!normalized) {
    return { valid: true, emoji: null };
  }

  const acceptedOptions = currentEmoji && !allowedOptions.includes(currentEmoji)
    ? [...allowedOptions, currentEmoji]
    : allowedOptions;

  if (!acceptedOptions.includes(normalized)) {
    return { valid: false };
  }

  return { valid: true, emoji: normalized };
}

function normalizeConfigName(rawName: string) {
  return rawName.trim();
}

function normalizeAccountVisibility(input: string[]) {
  return Array.from(
    new Set(
      input
        .map((visibility) => visibility.trim().toLowerCase())
        .filter(
          (
            visibility
          ): visibility is (typeof TREASURY_VISIBILITY_OPTIONS)[number] =>
            TREASURY_VISIBILITY_OPTIONS.includes(
              visibility as (typeof TREASURY_VISIBILITY_OPTIONS)[number]
            )
        )
    )
  );
}

function normalizeCategoryVisibility(input: string[]) {
  return normalizeAccountVisibility(input);
}

function resolveTreasurySettingsMutationError(
  error: unknown,
  operation: string,
  clubId: string
): TreasurySettingsActionResult {
  if (isAccessRepositoryInfraError(error)) {
    console.error("[treasury-settings-service-error]", {
      operation,
      clubId,
      repositoryOperation: error.operation,
      code: error.code,
      cause: error.cause
    });

    if (error.code === "treasury_admin_config_missing") {
      return { ok: false, code: "treasury_admin_config_missing" };
    }

    return { ok: false, code: "unknown_error" };
  }

  console.error("[treasury-settings-service-error]", {
    operation,
    clubId,
    error
  });

  return { ok: false, code: "unknown_error" };
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

function normalizeTreasuryFieldRule(
  fieldName: string,
  input: { isVisible: boolean; isRequired: boolean }
):
  | { valid: true; rule: { fieldName: TreasuryAdditionalFieldName; isVisible: boolean; isRequired: boolean } }
  | { valid: false } {
  if (
    !TREASURY_ADDITIONAL_FIELD_NAMES.includes(fieldName as TreasuryAdditionalFieldName)
  ) {
    return { valid: false };
  }

  if (input.isRequired && !input.isVisible) {
    return { valid: false };
  }

  return {
    valid: true,
    rule: {
      fieldName: fieldName as TreasuryAdditionalFieldName,
      isVisible: input.isVisible,
      isRequired: input.isRequired
    }
  };
}

export async function getTreasurySettingsForActiveClub(): Promise<TreasurySettings | null> {
  const context = await getTreasurySettingsContext();

  if (!context?.activeClub) {
    return null;
  }

  const activeClubId = context.activeClub.id;

  const [accounts, categories, activities, calendarEvents, fieldRules] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(activeClubId),
    accessRepository.listTreasuryCategoriesForClub(activeClubId),
    accessRepository.listClubActivitiesForClub(activeClubId),
    accessRepository.listClubCalendarEventsForClub(activeClubId),
    accessRepository.listTreasuryFieldRulesForClub(activeClubId)
  ]);

  return {
    accounts,
    categories,
    activities,
    calendarEvents,
    receiptFormats: getDefaultReceiptFormats(activeClubId),
    currencies: FIXED_TREASURY_CURRENCIES.map((currency) => ({
      clubId: activeClubId,
      currencyCode: currency.currencyCode,
      isPrimary: currency.isPrimary
    })),
    movementTypes: TREASURY_MOVEMENT_TYPES.map((movementType) => ({
      clubId: activeClubId,
      movementType,
      isEnabled: true
    })),
    fieldRules
  };
}

export async function setTreasuryFieldRulesForCategoryForActiveClub(input: {
  categoryId: string;
  rules: Array<{
    fieldName: string;
    isVisible: boolean;
    isRequired: boolean;
  }>;
}): Promise<TreasurySettingsActionResult> {
  const context = await getTreasuryFieldRulesContext();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const categories = await accessRepository.listTreasuryCategoriesForClub(context.activeClub.id);
  const category = categories.find((entry) => entry.id === input.categoryId);

  if (!category) {
    return { ok: false, code: "field_rule_category_not_found" };
  }

  const normalizedRules: TreasuryFieldRule["fieldName"][] = [];
  const nextRules: Array<{
    fieldName: TreasuryAdditionalFieldName;
    isVisible: boolean;
    isRequired: boolean;
  }> = [];

  for (const ruleInput of input.rules) {
    const normalizedRule = normalizeTreasuryFieldRule(ruleInput.fieldName, ruleInput);

    if (!normalizedRule.valid || normalizedRules.includes(normalizedRule.rule.fieldName)) {
      return { ok: false, code: "field_rule_invalid" };
    }

    normalizedRules.push(normalizedRule.rule.fieldName);
    nextRules.push(normalizedRule.rule);
  }

  if (nextRules.length !== TREASURY_ADDITIONAL_FIELD_NAMES.length) {
    return { ok: false, code: "field_rule_invalid" };
  }

  try {
    await accessRepository.setTreasuryFieldRulesForCategory({
      clubId: context.activeClub.id,
      categoryId: category.id,
      rules: nextRules
    });
  } catch (error) {
    return resolveTreasurySettingsMutationError(
      error,
      "setTreasuryFieldRulesForCategoryForActiveClub",
      context.activeClub.id
    );
  }

  return { ok: true, code: "field_rules_updated" };
}

export async function updateCalendarEventTreasuryAvailabilityForActiveClub(input: {
  eventId: string;
  isEnabledForTreasury: boolean;
}): Promise<TreasurySettingsActionResult> {
  const context = await getTreasuryFieldRulesContext();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const events = await accessRepository.listClubCalendarEventsForClub(context.activeClub.id);
  const event = events.find((entry) => entry.id === input.eventId);

  if (!event) {
    return { ok: false, code: "calendar_event_not_found" };
  }

  try {
    await accessRepository.updateClubCalendarEventTreasuryAvailability({
      clubId: context.activeClub.id,
      eventId: event.id,
      isEnabledForTreasury: input.isEnabledForTreasury
    });
  } catch (error) {
    return resolveTreasurySettingsMutationError(
      error,
      "updateCalendarEventTreasuryAvailabilityForActiveClub",
      context.activeClub.id
    );
  }

  return { ok: true, code: "calendar_event_updated" };
}

export async function createTreasuryAccountForActiveClub(input: {
  name: string;
  accountType: string;
  visibility: string[];
  currencies: string[];
  status: string;
  emoji: string;
}): Promise<TreasurySettingsActionResult> {
  const context = await getTreasurySettingsContext();

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

  const selectedVisibility = normalizeAccountVisibility(input.visibility);

  const accounts = await accessRepository.listTreasuryAccountsForClub(context.activeClub.id);
  const selectedCurrencies = Array.from(
    new Set(
      input.currencies
        .map((currency) => currency.trim().toUpperCase())
        .filter((currency): currency is TreasuryCurrencyCode =>
          TREASURY_CURRENCY_CODES.includes(currency as TreasuryCurrencyCode)
        )
    )
  );

  if (hasDuplicateActiveAccountName(accounts, name)) {
    return { ok: false, code: "duplicate_account_name" };
  }

  if (selectedCurrencies.length === 0) {
    return { ok: false, code: "account_currencies_required" };
  }

  if (selectedVisibility.length === 0) {
    return { ok: false, code: "account_visibility_required" };
  }

  if (!selectedCurrencies.every((currency) => TREASURY_CURRENCY_CODES.includes(currency))) {
    return { ok: false, code: "invalid_account_currency" };
  }

  const resolvedEmoji = resolveConfiguredEmoji(input.emoji, TREASURY_ACCOUNT_EMOJI_OPTIONS);

  if (!resolvedEmoji.valid) {
    return { ok: false, code: "invalid_emoji_option" };
  }

  let created: TreasuryAccount | null = null;

  try {
    created = await accessRepository.createTreasuryAccount({
      clubId: context.activeClub.id,
      name,
      accountType: input.accountType as TreasuryAccount["accountType"],
      status: input.status as TreasuryAccount["status"],
      visibleForSecretaria: selectedVisibility.includes("secretaria"),
      visibleForTesoreria: selectedVisibility.includes("tesoreria"),
      emoji: resolvedEmoji.emoji,
      currencies: selectedCurrencies
    });
  } catch (error) {
    return resolveTreasurySettingsMutationError(error, "create_treasury_account_for_active_club", context.activeClub.id);
  }

  if (!created) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "account_created" };
}

export async function updateTreasuryAccountForActiveClub(input: {
  accountId: string;
  name: string;
  accountType: string;
  visibility: string[];
  currencies: string[];
  status: string;
  emoji: string;
}): Promise<TreasurySettingsActionResult> {
  const context = await getTreasurySettingsContext();

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

  const selectedVisibility = normalizeAccountVisibility(input.visibility);

  const accounts = await accessRepository.listTreasuryAccountsForClub(context.activeClub.id);
  const selectedCurrencies = Array.from(
    new Set(
      input.currencies
        .map((currency) => currency.trim().toUpperCase())
        .filter((currency): currency is TreasuryCurrencyCode =>
          TREASURY_CURRENCY_CODES.includes(currency as TreasuryCurrencyCode)
        )
    )
  );
  const existingAccount = accounts.find((account) => account.id === input.accountId);

  if (!existingAccount) {
    return { ok: false, code: "account_not_found" };
  }

  if (hasDuplicateActiveAccountName(accounts, name, input.accountId)) {
    return { ok: false, code: "duplicate_account_name" };
  }

  if (selectedCurrencies.length === 0) {
    return { ok: false, code: "account_currencies_required" };
  }

  if (selectedVisibility.length === 0) {
    return { ok: false, code: "account_visibility_required" };
  }

  if (!selectedCurrencies.every((currency) => TREASURY_CURRENCY_CODES.includes(currency))) {
    return { ok: false, code: "invalid_account_currency" };
  }

  const resolvedEmoji = resolveConfiguredEmoji(
    input.emoji,
    TREASURY_ACCOUNT_EMOJI_OPTIONS,
    existingAccount.emoji
  );

  if (!resolvedEmoji.valid) {
    return { ok: false, code: "invalid_emoji_option" };
  }

  let updated: TreasuryAccount | null = null;

  try {
    updated = await accessRepository.updateTreasuryAccount({
      accountId: input.accountId,
      clubId: context.activeClub.id,
      name,
      accountType: input.accountType as TreasuryAccount["accountType"],
      status: input.status as TreasuryAccount["status"],
      visibleForSecretaria: selectedVisibility.includes("secretaria"),
      visibleForTesoreria: selectedVisibility.includes("tesoreria"),
      emoji: resolvedEmoji.emoji,
      currencies: selectedCurrencies
    });
  } catch (error) {
    return resolveTreasurySettingsMutationError(error, "update_treasury_account_for_active_club", context.activeClub.id);
  }

  if (!updated) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "account_updated" };
}

export async function createTreasuryCategoryForActiveClub(input: {
  name: string;
  visibility: string[];
  status: string;
  emoji: string;
}): Promise<TreasurySettingsActionResult> {
  const context = await getTreasurySettingsContext();

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
  const selectedVisibility = normalizeCategoryVisibility(input.visibility);

  if (hasDuplicateActiveCategoryName(categories, name)) {
    return { ok: false, code: "duplicate_category_name" };
  }

  const resolvedEmoji = resolveConfiguredEmoji(input.emoji, TREASURY_CATEGORY_EMOJI_OPTIONS);

  if (!resolvedEmoji.valid) {
    return { ok: false, code: "invalid_emoji_option" };
  }

  let created: TreasuryCategory | null = null;

  try {
    created = await accessRepository.createTreasuryCategory({
      clubId: context.activeClub.id,
      name,
      status: input.status as TreasuryCategory["status"],
      visibleForSecretaria: selectedVisibility.includes("secretaria"),
      visibleForTesoreria: selectedVisibility.includes("tesoreria"),
      emoji: resolvedEmoji.emoji
    });
  } catch (error) {
    return resolveTreasurySettingsMutationError(error, "create_treasury_category_for_active_club", context.activeClub.id);
  }

  if (!created) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "category_created" };
}

export async function updateTreasuryCategoryForActiveClub(input: {
  categoryId: string;
  name: string;
  visibility: string[];
  status: string;
  emoji: string;
}): Promise<TreasurySettingsActionResult> {
  const context = await getTreasurySettingsContext();

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

  const systemCategoryDefinition = getSystemTreasuryCategoryDefinition(existingCategory.name);
  const nextName = systemCategoryDefinition?.name ?? name;
  const nextStatus = systemCategoryDefinition ? "active" : input.status;
  const nextEmojiInput = systemCategoryDefinition?.emoji ?? input.emoji;
  const selectedVisibility = normalizeCategoryVisibility(input.visibility);

  if (hasDuplicateActiveCategoryName(categories, nextName, input.categoryId)) {
    return { ok: false, code: "duplicate_category_name" };
  }

  const resolvedEmoji = resolveConfiguredEmoji(
    nextEmojiInput,
    TREASURY_CATEGORY_EMOJI_OPTIONS,
    systemCategoryDefinition?.emoji ?? existingCategory.emoji
  );

  if (!resolvedEmoji.valid) {
    return { ok: false, code: "invalid_emoji_option" };
  }

  let updated: TreasuryCategory | null = null;

  try {
    updated = await accessRepository.updateTreasuryCategory({
      categoryId: input.categoryId,
      clubId: context.activeClub.id,
      name: nextName,
      status: nextStatus as TreasuryCategory["status"],
      visibleForSecretaria: selectedVisibility.includes("secretaria"),
      visibleForTesoreria: selectedVisibility.includes("tesoreria"),
      emoji: resolvedEmoji.emoji
    });
  } catch (error) {
    return resolveTreasurySettingsMutationError(error, "update_treasury_category_for_active_club", context.activeClub.id);
  }

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
  const context = await getTreasurySettingsContext();

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

  const resolvedEmoji = resolveConfiguredEmoji(input.emoji, TREASURY_ACTIVITY_EMOJI_OPTIONS);

  if (!resolvedEmoji.valid) {
    return { ok: false, code: "invalid_emoji_option" };
  }

  let created: ClubActivity | null = null;

  try {
    created = await accessRepository.createClubActivity({
      clubId: context.activeClub.id,
      name,
      status: input.status as ClubActivity["status"],
      emoji: resolvedEmoji.emoji
    });
  } catch (error) {
    return resolveTreasurySettingsMutationError(error, "create_club_activity_for_active_club", context.activeClub.id);
  }

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
  const context = await getTreasurySettingsContext();

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

  const resolvedEmoji = resolveConfiguredEmoji(
    input.emoji,
    TREASURY_ACTIVITY_EMOJI_OPTIONS,
    existingActivity.emoji
  );

  if (!resolvedEmoji.valid) {
    return { ok: false, code: "invalid_emoji_option" };
  }

  let updated: ClubActivity | null = null;

  try {
    updated = await accessRepository.updateClubActivity({
      activityId: input.activityId,
      clubId: context.activeClub.id,
      name,
      status: input.status as ClubActivity["status"],
      emoji: resolvedEmoji.emoji
    });
  } catch (error) {
    return resolveTreasurySettingsMutationError(error, "update_club_activity_for_active_club", context.activeClub.id);
  }

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
  const context = await getTreasurySettingsContext();

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

  let created: ReceiptFormat | null = null;

  try {
    created = await accessRepository.createReceiptFormat({
      clubId: context.activeClub.id,
      name,
      validationType: input.validationType as ReceiptFormat["validationType"],
      pattern: input.validationType === "pattern" ? pattern : null,
      minNumericValue: input.validationType === "numeric" ? parsedMin : null,
      example: example || null,
      status: input.status as ReceiptFormat["status"]
    });
  } catch (error) {
    return resolveTreasurySettingsMutationError(error, "create_receipt_format_for_active_club", context.activeClub.id);
  }

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
  const context = await getTreasurySettingsContext();

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

  let updated: ReceiptFormat | null = null;

  try {
    updated = await accessRepository.updateReceiptFormat({
      receiptFormatId: input.receiptFormatId,
      clubId: context.activeClub.id,
      name,
      validationType: input.validationType as ReceiptFormat["validationType"],
      pattern: input.validationType === "pattern" ? pattern : null,
      minNumericValue: input.validationType === "numeric" ? parsedMin : null,
      example: example || null,
      status: input.status as ReceiptFormat["status"]
    });
  } catch (error) {
    return resolveTreasurySettingsMutationError(error, "update_receipt_format_for_active_club", context.activeClub.id);
  }

  if (!updated) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "receipt_format_updated" };
}
