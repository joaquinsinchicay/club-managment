import { appConfig } from "@/lib/config";
import { MissingSupabaseAdminConfigError, createAdminSupabaseClient, createRequiredAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/env";
import type {
  AccountTransfer,
  AuthIdentity,
  BalanceAdjustment,
  ClubActivity,
  Club,
  ClubCalendarEvent,
  ClubInvitation,
  ClubMember,
  ClubType,
  DailyCashSessionBalance,
  DailyConsolidationBatch,
  GoogleProfile,
  GoogleProfileKey,
  DailyCashSession,
  FxOperation,
  Membership,
  MembershipRole,
  MovementTypeConfig,
  MovementAuditLog,
  MovementIntegration,
  PendingClubInvitation,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryCategoryMovementType,
  TreasuryCurrencyCode,
  TreasuryCurrencyConfig,
  TreasuryMovementOriginRole,
  TreasuryMovementOriginSource,
  TreasuryMovementStatus,
  TreasuryMovementType,
  TreasuryCategory,
  TreasuryMovement,
  User
} from "@/lib/domain/access";
import { MEMBERSHIP_ROLES, sortMembershipRoles } from "@/lib/domain/membership-roles";
import { buildDefaultReceiptFormat, getDefaultReceiptFormatSeed } from "@/lib/receipt-formats";
import {
  LEGACY_SYSTEM_TREASURY_CATEGORY_NAMES,
  SYSTEM_TREASURY_CATEGORY_DEFINITIONS,
  getSystemTreasuryCategoryDefinition,
  sortTreasuryCategories
} from "@/lib/treasury-system-categories";

type AccessRepositoryClient = ReturnType<typeof createServerSupabaseClient>;

type AccountTransferMutationResult = {
  transfer: AccountTransfer;
  sourceMovementDisplayId: string;
  targetMovementDisplayId: string;
};

type FxOperationInsertRow = {
  id: string;
  club_id: string;
  source_account_id: string;
  target_account_id: string;
  source_amount: number | string;
  target_amount: number | string;
  created_at: string | null;
};

export class AccessRepositoryInfraError extends Error {
  code: "treasury_admin_config_missing" | "treasury_settings_write_failed" | "club_scoped_rpc_failed";
  operation: string;

  constructor(
    code: "treasury_admin_config_missing" | "treasury_settings_write_failed" | "club_scoped_rpc_failed",
    operation: string,
    options?: { cause?: unknown }
  ) {
    super(
      code === "treasury_admin_config_missing"
        ? "Missing Supabase admin configuration for treasury settings."
        : code === "treasury_settings_write_failed"
          ? "Treasury settings write failed."
          : "Club-scoped RPC failed."
    );
    this.name = "AccessRepositoryInfraError";
    this.code = code;
    this.operation = operation;
    this.cause = options?.cause;
  }
}

export function isAccessRepositoryInfraError(error: unknown): error is AccessRepositoryInfraError {
  return error instanceof AccessRepositoryInfraError;
}

function getSupabaseErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function getSupabaseErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}

const KNOWN_CLUB_SCOPED_RPC_NAMES = [
  "update_treasury_movement_for_current_club",
  "get_last_open_daily_cash_session_before_date_for_current_club",
  "auto_close_stale_daily_cash_session_with_balances_for_current_club",
  "get_daily_consolidation_batch_by_date_for_current_club",
  "create_daily_consolidation_batch_for_current_club",
  "update_daily_consolidation_batch_for_current_club",
  "get_movement_audit_logs_by_movement_id_for_current_club",
  "create_movement_audit_log_for_current_club"
] as const;

function getMissingClubScopedRpcName(error: unknown, rpcName?: string) {
  const code = getSupabaseErrorCode(error);
  const message = getSupabaseErrorMessage(error).toLowerCase();

  if (
    code !== "42883" &&
    code !== "PGRST202" &&
    !message.includes("does not exist") &&
    !message.includes("could not find the function")
  ) {
    return null;
  }

  if (rpcName && message.includes(rpcName.toLowerCase())) {
    return rpcName;
  }

  return (
    KNOWN_CLUB_SCOPED_RPC_NAMES.find((knownRpcName) => message.includes(knownRpcName.toLowerCase())) ?? null
  );
}

function isLegacyUpdateTreasuryMovementRpcCause(error: unknown) {
  const code = getSupabaseErrorCode(error);
  const message = getSupabaseErrorMessage(error).toLowerCase();

  if ((code === "42883" || code === "PGRST202") && message.includes("update_treasury_movement_for_current_club")) {
    return true;
  }

  return (
    message.includes("update_treasury_movement_for_current_club") &&
    (message.includes("p_movement_date") ||
      message.includes("function") && message.includes("does not exist") ||
      message.includes("could not find the function"))
  );
}

function isMissingStaleSessionAutoCloseRpcCause(error: unknown) {
  const code = getSupabaseErrorCode(error);

  if (code === "42883" || code === "PGRST202") {
    return true;
  }

  const message = getSupabaseErrorMessage(error).toLowerCase();

  return (
    message.includes("get_last_open_daily_cash_session_before_date_for_current_club") ||
    message.includes("auto_close_stale_daily_cash_session_with_balances_for_current_club") ||
    (message.includes("function") && message.includes("does not exist"))
  );
}

function logClubScopedRpcFailure(
  operation: string,
  details: Record<string, unknown>,
  error: unknown,
  options?: { suppressKnownMissingStaleSessionRpc?: boolean }
) {
  if (options?.suppressKnownMissingStaleSessionRpc && isMissingStaleSessionAutoCloseRpcCause(error)) {
    return;
  }

  console.error("[club-scoped-rpc-failure]", {
    operation,
    ...details,
    errorCode: getSupabaseErrorCode(error),
    missingRpcName: getMissingClubScopedRpcName(error),
    error
  });
}

type AccessRepository = {
  getGoogleProfile(profileKey: GoogleProfileKey): GoogleProfile;
  findUserByEmail(email: string, client?: AccessRepositoryClient): Promise<User | null>;
  createUserFromGoogleProfile(profile: GoogleProfile): Promise<User>;
  updateUserFromGoogleProfile(userId: string, profile: GoogleProfile): Promise<User>;
  findUserById(userId: string, client?: AccessRepositoryClient): Promise<User | null>;
  findUsersByIds(userIds: string[], client?: AccessRepositoryClient): Promise<User[]>;
  listMembershipsForUser(userId: string, client?: AccessRepositoryClient): Promise<Membership[]>;
  listActiveMembershipsForUser(userId: string, client?: AccessRepositoryClient): Promise<Membership[]>;
  findClubById(clubId: string, client?: AccessRepositoryClient): Promise<Club | null>;
  updateClubIdentity(
    clubId: string,
    fields: {
      name?: string;
      cuit?: string | null;
      tipo?: ClubType | null;
      logoUrl?: string | null;
      colorPrimary?: string | null;
      colorSecondary?: string | null;
    },
    client?: AccessRepositoryClient
  ): Promise<Club | null>;
  listClubMembers(clubId: string, client?: AccessRepositoryClient): Promise<ClubMember[]>;
  listPendingInvitationsForClub(clubId: string, client?: AccessRepositoryClient): Promise<PendingClubInvitation[]>;
  listPendingInvitationsByEmail(email: string, client?: AccessRepositoryClient): Promise<ClubInvitation[]>;
  listTreasuryAccountsForClub(clubId: string): Promise<TreasuryAccount[]>;
  listTreasuryCategoriesForClub(clubId: string): Promise<TreasuryCategory[]>;
  listClubActivitiesForClub(clubId: string): Promise<ClubActivity[]>;
  listClubCalendarEventsForClub(clubId: string): Promise<ClubCalendarEvent[]>;
  updateClubCalendarEventTreasuryAvailability(input: {
    clubId: string;
    eventId: string;
    isEnabledForTreasury: boolean;
  }): Promise<ClubCalendarEvent | null>;
  listReceiptFormatsForClub(clubId: string): Promise<ReceiptFormat[]>;
  listTreasuryCurrenciesForClub(clubId: string): Promise<TreasuryCurrencyConfig[]>;
  listMovementTypeConfigForClub(clubId: string): Promise<MovementTypeConfig[]>;
  setTreasuryCurrenciesForClub(input: {
    clubId: string;
    currencies: Array<{
      currencyCode: TreasuryCurrencyCode;
      isPrimary: boolean;
    }>;
  }): Promise<TreasuryCurrencyConfig[]>;
  setMovementTypeConfigForClub(input: {
    clubId: string;
    movementTypes: Array<{
      movementType: TreasuryMovementType;
      isEnabled: boolean;
    }>;
  }): Promise<MovementTypeConfig[]>;
  createTreasuryAccount(input: {
    clubId: string;
    name: string;
    accountType: TreasuryAccount["accountType"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
    currencies: Array<{ currencyCode: TreasuryCurrencyCode; initialBalance: number }>;
    bankEntity: string | null;
    bankAccountSubtype: TreasuryAccount["bankAccountSubtype"];
    accountNumber: string | null;
    cbuCvu: string | null;
  }): Promise<TreasuryAccount | null>;
  updateTreasuryAccount(input: {
    accountId: string;
    clubId: string;
    name: string;
    accountType: TreasuryAccount["accountType"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
    currencies: Array<{ currencyCode: TreasuryCurrencyCode; initialBalance: number }>;
    bankEntity: string | null;
    bankAccountSubtype: TreasuryAccount["bankAccountSubtype"];
    accountNumber: string | null;
    cbuCvu: string | null;
  }): Promise<TreasuryAccount | null>;
  createTreasuryCategory(input: {
    clubId: string;
    subCategoryName: string;
    description: string;
    parentCategory: string;
    movementType: TreasuryCategoryMovementType;
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
    isSystem?: boolean;
    isLegacy?: boolean;
  }): Promise<TreasuryCategory | null>;
  updateTreasuryCategory(input: {
    categoryId: string;
    clubId: string;
    subCategoryName: string;
    description: string;
    parentCategory: string;
    movementType: TreasuryCategoryMovementType;
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
    isSystem?: boolean;
    isLegacy?: boolean;
  }): Promise<TreasuryCategory | null>;
  createClubActivity(input: {
    clubId: string;
    name: string;
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
  }): Promise<ClubActivity | null>;
  updateClubActivity(input: {
    activityId: string;
    clubId: string;
    name: string;
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
  }): Promise<ClubActivity | null>;
  createReceiptFormat(input: {
    clubId: string;
    name: string;
    validationType: ReceiptFormat["validationType"];
    pattern: string | null;
    minNumericValue: number | null;
    example: string | null;
    status: ReceiptFormat["status"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
  }): Promise<ReceiptFormat | null>;
  updateReceiptFormat(input: {
    receiptFormatId: string;
    clubId: string;
    name: string;
    validationType: ReceiptFormat["validationType"];
    pattern: string | null;
    minNumericValue: number | null;
    example: string | null;
    status: ReceiptFormat["status"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
  }): Promise<ReceiptFormat | null>;
  findTreasuryAdjustmentCategory(clubId: string): Promise<TreasuryCategory | null>;
  getDailyCashSessionByDate(clubId: string, sessionDate: string): Promise<DailyCashSession | null>;
  getLastOpenDailyCashSessionBeforeDate(clubId: string, beforeDate: string): Promise<DailyCashSession | null>;
  createDailyCashSession(
    clubId: string,
    sessionDate: string,
    openedByUserId: string
  ): Promise<DailyCashSession | null>;
  openDailyCashSessionWithBalances(input: {
    clubId: string;
    sessionDate: string;
    openedByUserId: string;
    balances: Array<{
      accountId: string;
      currencyCode: string;
      balanceMoment: "opening" | "closing";
      expectedBalance: number;
      declaredBalance: number;
      differenceAmount: number;
    }>;
    adjustments: Array<{
      accountId: string;
      movementType: TreasuryMovementType;
      categoryId: string;
      concept: string;
      currencyCode: string;
      amount: number;
      movementDate: string;
      createdByUserId: string;
      displayId: string;
      status: TreasuryMovementStatus;
      differenceAmount: number;
      adjustmentMoment: "opening" | "closing";
    }>;
  }): Promise<DailyCashSession | null>;
  closeDailyCashSession(clubId: string, sessionId: string, closedByUserId: string): Promise<DailyCashSession | null>;
  getSessionOpeningBalances(
    clubId: string,
    sessionId: string
  ): Promise<Array<{ accountId: string; currencyCode: string; declaredBalance: number }>>;
  closeDailyCashSessionWithBalances(input: {
    clubId: string;
    sessionId: string;
    closedByUserId: string;
    notes?: string;
    balances: Array<{
      accountId: string;
      currencyCode: string;
      balanceMoment: "opening" | "closing";
      expectedBalance: number;
      declaredBalance: number;
      differenceAmount: number;
    }>;
    adjustments: Array<{
      accountId: string;
      movementType: TreasuryMovementType;
      categoryId: string;
      concept: string;
      currencyCode: string;
      amount: number;
      movementDate: string;
      createdByUserId: string;
      displayId: string;
      status: TreasuryMovementStatus;
      differenceAmount: number;
      adjustmentMoment: "opening" | "closing";
    }>;
  }): Promise<DailyCashSession | null>;
  autoCloseStaleDailyCashSessionWithBalances(input: {
    clubId: string;
    beforeDate: string;
    expectedSessionId: string | null;
    closedByUserId: string;
    balances: Array<{
      accountId: string;
      currencyCode: string;
      balanceMoment: "opening" | "closing";
      expectedBalance: number;
      declaredBalance: number;
      differenceAmount: number;
    }>;
  }): Promise<DailyCashSession | null>;
  listTreasuryMovementsBySession(sessionId: string): Promise<TreasuryMovement[]>;
  listTreasuryMovementsByAccount(clubId: string, accountId: string, movementDate: string): Promise<TreasuryMovement[]>;
  listTreasuryMovementsByAccountStrict(
    clubId: string,
    accountId: string,
    movementDate: string
  ): Promise<TreasuryMovement[]>;
  listTreasuryMovementsHistoryByAccount(clubId: string, accountId: string): Promise<TreasuryMovement[]>;
  listTreasuryMovementsHistoryByAccounts(clubId: string, accountIds: string[]): Promise<TreasuryMovement[]>;
  listTreasuryMovementsByDate(clubId: string, movementDate: string): Promise<TreasuryMovement[]>;
  listTreasuryMovementsByDateStrict(clubId: string, movementDate: string): Promise<TreasuryMovement[]>;
  findTreasuryMovementById(clubId: string, movementId: string): Promise<TreasuryMovement | null>;
  updateTreasuryMovement(input: {
    movementId: string;
    clubId: string;
    movementDate?: string;
    accountId: string;
    movementType: TreasuryMovementType;
    categoryId?: string | null;
    concept: string;
    currencyCode: string;
    amount: number;
    activityId?: string | null;
    receiptNumber?: string | null;
    calendarEventId?: string | null;
    status?: TreasuryMovementStatus;
    consolidationBatchId?: string | null;
  }): Promise<TreasuryMovement | null>;
  getDailyConsolidationBatchByDate(clubId: string, consolidationDate: string): Promise<DailyConsolidationBatch | null>;
  createDailyConsolidationBatch(input: {
    clubId: string;
    consolidationDate: string;
    status: DailyConsolidationBatch["status"];
    executedByUserId: string;
  }): Promise<DailyConsolidationBatch | null>;
  updateDailyConsolidationBatch(input: {
    clubId?: string;
    batchId: string;
    status: DailyConsolidationBatch["status"];
    errorMessage?: string | null;
  }): Promise<DailyConsolidationBatch | null>;
  listMovementIntegrations(): Promise<MovementIntegration[]>;
  createMovementIntegration(input: {
    secretariaMovementId: string;
    tesoreriaMovementId: string;
  }): Promise<MovementIntegration | null>;
  listMovementAuditLogsByMovementId(input: { clubId: string; movementId: string }): Promise<MovementAuditLog[]>;
  createMovementAuditLog(input: {
    clubId: string;
    movementId: string;
    actionType: MovementAuditLog["actionType"];
    payloadBefore: Record<string, unknown> | null;
    payloadAfter: Record<string, unknown> | null;
    performedByUserId: string;
  }): Promise<MovementAuditLog | null>;
  createAccountTransfer(input: {
    clubId: string;
    dailyCashSessionId: string | null;
    sourceAccountId: string;
    targetAccountId: string;
    currencyCode: string;
    amount: number;
    concept: string;
    sourceMovementDisplayId: string;
    targetMovementDisplayId: string;
    movementDate: string;
    createdByUserId: string;
    originRole: TreasuryMovementOriginRole;
  }): Promise<AccountTransferMutationResult | null>;
  createFxOperation(input: {
    clubId: string;
    sourceAccountId: string;
    targetAccountId: string;
    sourceCurrencyCode: string;
    targetCurrencyCode: string;
    sourceAmount: number;
    targetAmount: number;
    concept: string;
  }): Promise<FxOperation | null>;
  createTreasuryMovement(input: {
    clubId: string;
    dailyCashSessionId: string | null;
    displayId: string;
    originRole: TreasuryMovementOriginRole;
    originSource: TreasuryMovementOriginSource;
    accountId: string;
    movementType: TreasuryMovementType;
    categoryId: string | null;
    concept: string;
    currencyCode: string;
    amount: number;
    activityId?: string | null;
    receiptNumber?: string | null;
    calendarEventId?: string | null;
    transferGroupId?: string | null;
    fxOperationGroupId?: string | null;
    consolidationBatchId?: string | null;
    movementDate: string;
    createdByUserId: string;
    status?: TreasuryMovementStatus;
  }): Promise<TreasuryMovement | null>;
  countTreasuryMovementsByClubAndYear(clubId: string, year: string): Promise<number>;
  recordDailyCashSessionBalances(
    clubId: string,
    input: Array<{
      sessionId: string;
      accountId: string;
      currencyCode: string;
      balanceMoment: "opening" | "closing";
      expectedBalance: number;
      declaredBalance: number;
      differenceAmount: number;
    }>
  ): Promise<void>;
  recordBalanceAdjustment(input: {
    clubId: string;
    sessionId: string;
    movementId: string;
    accountId: string;
    differenceAmount: number;
    adjustmentMoment: "opening" | "closing";
  }): Promise<void>;
  getLastActiveClubId(userId: string, client?: AccessRepositoryClient): Promise<string | null>;
  setLastActiveClubId(userId: string, clubId: string, client?: AccessRepositoryClient): Promise<void>;
  createClubInvitation(
    clubId: string,
    email: string,
    role: MembershipRole,
    client?: AccessRepositoryClient
  ): Promise<ClubInvitation | null>;
  createMembership(
    userId: string,
    clubId: string,
    role: MembershipRole,
    status: Membership["status"],
    approvedByUserId?: string | null,
    client?: AccessRepositoryClient
  ): Promise<Membership | null>;
  markInvitationAsUsed(invitationId: string, client?: AccessRepositoryClient): Promise<boolean>;
  approveMembership(
    membershipId: string,
    role: MembershipRole,
    approvedByUserId: string,
    client?: AccessRepositoryClient
  ): Promise<Membership | null>;
  updateMembershipRoles(
    membershipId: string,
    roles: MembershipRole[],
    client?: AccessRepositoryClient
  ): Promise<Membership | null>;
  removeMembership(membershipId: string, client?: AccessRepositoryClient): Promise<boolean>;
  syncUserProfileFromAuthIdentity(identity: AuthIdentity, client?: AccessRepositoryClient): Promise<User>;
};

const now = () => new Date().toISOString();

const CLUB_ID = "club-atletico-ejemplo";
const CLUB_SUR_ID = "club-social-del-sur";
const ACTIVE_USER_ID = "user-active-001";
const SECOND_ADMIN_USER_ID = "user-admin-002";
const PENDING_USER_ID = "user-pending-001";
const SECRETARIA_USER_ID = "user-secretaria-001";
const TESORERIA_USER_ID = "user-tesoreria-001";

type MockStore = {
  users: Map<string, User>;
  memberships: Membership[];
  clubs: Club[];
  invitations: ClubInvitation[];
  treasuryAccounts: TreasuryAccount[];
  treasuryCategories: TreasuryCategory[];
  clubActivities: ClubActivity[];
  clubCalendarEvents: ClubCalendarEvent[];
  receiptFormats: ReceiptFormat[];
  clubTreasuryCurrencies: TreasuryCurrencyConfig[];
  movementTypeConfig: MovementTypeConfig[];
  dailyCashSessions: DailyCashSession[];
  dailyCashSessionBalances: DailyCashSessionBalance[];
  balanceAdjustments: BalanceAdjustment[];
  accountTransfers: AccountTransfer[];
  fxOperations: FxOperation[];
  treasuryMovements: TreasuryMovement[];
  dailyConsolidationBatches: DailyConsolidationBatch[];
  movementIntegrations: MovementIntegration[];
  movementAuditLogs: MovementAuditLog[];
  preferences: Map<string, string>;
};

declare global {
  var __clubManagementMockStore: MockStore | undefined;
}

function createStore(): MockStore {
  const createdAt = now();

  const users = new Map<string, User>([
    [
      ACTIVE_USER_ID,
      {
        id: ACTIVE_USER_ID,
        email: "active.user@example.com",
        fullName: "Agustin Activo",
        avatarUrl: null,
        createdAt,
        updatedAt: createdAt
      }
    ],
    [
      SECOND_ADMIN_USER_ID,
      {
        id: SECOND_ADMIN_USER_ID,
        email: "second.admin@example.com",
        fullName: "Alma Admin",
        avatarUrl: null,
        createdAt,
        updatedAt: createdAt
      }
    ],
    [
      PENDING_USER_ID,
      {
        id: PENDING_USER_ID,
        email: "pending.user@example.com",
        fullName: "Paula Pendiente",
        avatarUrl: null,
        createdAt,
        updatedAt: createdAt
      }
    ],
    [
      SECRETARIA_USER_ID,
      {
        id: SECRETARIA_USER_ID,
        email: "secretaria.user@example.com",
        fullName: "Sofia Secretaria",
        avatarUrl: null,
        createdAt,
        updatedAt: createdAt
      }
    ],
    [
      TESORERIA_USER_ID,
      {
        id: TESORERIA_USER_ID,
        email: "tesoreria.user@example.com",
        fullName: "Tomas Tesoreria",
        avatarUrl: null,
        createdAt,
        updatedAt: createdAt
      }
    ]
  ]);

  const clubs: Club[] = [
    {
      id: CLUB_ID,
      name: "Club Atletico Ejemplo",
      slug: "club-atletico-ejemplo",
      status: "active",
      cuit: null,
      tipo: null,
      logoUrl: null,
      colorPrimary: null,
      colorSecondary: null
    },
    {
      id: CLUB_SUR_ID,
      name: "Club Social del Sur",
      slug: "club-social-del-sur",
      status: "active",
      cuit: null,
      tipo: null,
      logoUrl: null,
      colorPrimary: null,
      colorSecondary: null
    }
  ];

  const memberships: Membership[] = [
    {
      id: "membership-active-001",
      userId: ACTIVE_USER_ID,
      clubId: CLUB_ID,
    roles: ["admin"],
      status: "activo",
      joinedAt: createdAt
    },
    {
      id: "membership-admin-002",
      userId: SECOND_ADMIN_USER_ID,
      clubId: CLUB_ID,
      roles: ["admin"],
      status: "activo",
      joinedAt: createdAt
    },
    {
      id: "membership-active-002",
      userId: ACTIVE_USER_ID,
      clubId: CLUB_SUR_ID,
      roles: ["tesoreria"],
      status: "activo",
      joinedAt: createdAt
    },
    {
      id: "membership-secretaria-001",
      userId: SECRETARIA_USER_ID,
      clubId: CLUB_ID,
      roles: ["secretaria"],
      status: "activo",
      joinedAt: createdAt
    },
    {
      id: "membership-secretaria-002",
      userId: SECRETARIA_USER_ID,
      clubId: CLUB_SUR_ID,
      roles: ["tesoreria"],
      status: "activo",
      joinedAt: createdAt
    },
    {
      id: "membership-tesoreria-001",
      userId: TESORERIA_USER_ID,
      clubId: CLUB_ID,
      roles: ["tesoreria"],
      status: "activo",
      joinedAt: createdAt
    },
    {
      id: "membership-pending-001",
      userId: PENDING_USER_ID,
      clubId: CLUB_ID,
      roles: ["secretaria"],
      status: "pendiente_aprobacion",
      joinedAt: createdAt
    }
  ];

  const preferences = new Map<string, string>([
    [ACTIVE_USER_ID, CLUB_ID],
    [SECRETARIA_USER_ID, CLUB_ID]
  ]);

  const invitations: ClubInvitation[] = [];

  const buildMockAccount = (seed: {
    id: string;
    clubId: string;
    name: string;
    accountType: TreasuryAccount["accountType"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
    currencies: TreasuryCurrencyCode[];
    bankEntity?: string | null;
    bankAccountSubtype?: TreasuryAccount["bankAccountSubtype"];
    accountNumber?: string | null;
    cbuCvu?: string | null;
  }): TreasuryAccount => ({
    id: seed.id,
    clubId: seed.clubId,
    name: seed.name,
    accountType: seed.accountType,
    visibleForSecretaria: seed.visibleForSecretaria,
    visibleForTesoreria: seed.visibleForTesoreria,
    emoji: seed.emoji,
    currencies: seed.currencies,
    currencyDetails: seed.currencies.map((currencyCode) => ({
      currencyCode,
      initialBalance: 0
    })),
    bankEntity: seed.bankEntity ?? null,
    bankAccountSubtype: seed.bankAccountSubtype ?? null,
    accountNumber: seed.accountNumber ?? null,
    cbuCvu: seed.cbuCvu ?? null
  });

  const treasuryAccounts: TreasuryAccount[] = [
    buildMockAccount({
      id: "account-secretaria-caja-001",
      clubId: CLUB_ID,
      name: "Caja principal",
      accountType: "efectivo",
      visibleForSecretaria: true,
      visibleForTesoreria: false,
      emoji: "💵",
      currencies: ["ARS"]
    }),
    buildMockAccount({
      id: "account-secretaria-banco-001",
      clubId: CLUB_ID,
      name: "Banco operativo",
      accountType: "bancaria",
      visibleForSecretaria: true,
      visibleForTesoreria: false,
      emoji: "🏦",
      currencies: ["ARS"]
    }),
    buildMockAccount({
      id: "account-secretaria-sur-001",
      clubId: CLUB_SUR_ID,
      name: "Caja Sur",
      accountType: "efectivo",
      visibleForSecretaria: true,
      visibleForTesoreria: false,
      emoji: "💼",
      currencies: ["ARS"]
    }),
    buildMockAccount({
      id: "account-tesoreria-inversion-001",
      clubId: CLUB_ID,
      name: "Caja de inversion",
      accountType: "bancaria",
      visibleForSecretaria: false,
      visibleForTesoreria: true,
      emoji: "📈",
      currencies: ["USD"]
    }),
    buildMockAccount({
      id: "account-tesoreria-reserva-001",
      clubId: CLUB_ID,
      name: "Reserva institucional",
      accountType: "bancaria",
      visibleForSecretaria: false,
      visibleForTesoreria: true,
      emoji: "🏛️",
      currencies: ["USD"]
    })
  ];

  const treasuryCategories: TreasuryCategory[] = [
    ...SYSTEM_TREASURY_CATEGORY_DEFINITIONS.map((definition, index) => ({
      id: `category-system-${index + 1}`,
      clubId: CLUB_ID,
      name: definition.subCategoryName,
      subCategoryName: definition.subCategoryName,
      description: definition.description,
      parentCategory: definition.parentCategory,
      movementType: definition.movementType,
      visibleForSecretaria: definition.visibleForSecretaria,
      visibleForTesoreria: definition.visibleForTesoreria,
      emoji: definition.emoji,
      isSystem: true,
      isLegacy: false
    })),
    {
      id: "category-manual-gastos-001",
      clubId: CLUB_ID,
      name: "Gastos operativos",
      subCategoryName: "Gastos operativos",
      description: "Categoría manual migrada",
      parentCategory: "Migradas",
      movementType: "egreso",
      visibleForSecretaria: true,
      visibleForTesoreria: true,
      emoji: "🧾",
      isSystem: false,
      isLegacy: false
    },
    {
      id: "category-sur-manual-001",
      clubId: CLUB_SUR_ID,
      name: "Cuotas Sur",
      subCategoryName: "Cuotas Sur",
      description: "Categoría manual migrada",
      parentCategory: "Migradas",
      movementType: "ingreso",
      visibleForSecretaria: true,
      visibleForTesoreria: true,
      emoji: "🧾",
      isSystem: false,
      isLegacy: false
    }
  ];

  const clubActivities: ClubActivity[] = [
    {
      id: "activity-boxeo-001",
      clubId: CLUB_ID,
      name: "Boxeo",
      visibleForSecretaria: true,
      visibleForTesoreria: true,
      emoji: "🥊"
    },
    {
      id: "activity-futsal-001",
      clubId: CLUB_ID,
      name: "Futsal",
      visibleForSecretaria: true,
      visibleForTesoreria: false,
      emoji: "⚽"
    },
    {
      id: "activity-sur-001",
      clubId: CLUB_SUR_ID,
      name: "Hockey",
      visibleForSecretaria: true,
      visibleForTesoreria: true,
      emoji: "🏑"
    }
  ];

  const clubCalendarEvents: ClubCalendarEvent[] = [
    {
      id: "calendar-event-boxeo-001",
      clubId: CLUB_ID,
      title: "Festival de Boxeo",
      startsAt: "2026-04-08T20:00:00.000Z",
      endsAt: "2026-04-08T23:00:00.000Z",
      isEnabledForTreasury: true
    },
    {
      id: "calendar-event-futsal-001",
      clubId: CLUB_ID,
      title: "Entrenamiento Futsal",
      startsAt: "2026-04-09T18:00:00.000Z",
      endsAt: "2026-04-09T20:00:00.000Z",
      isEnabledForTreasury: false
    },
    {
      id: "calendar-event-sur-001",
      clubId: CLUB_SUR_ID,
      title: "Jornada Hockey Sur",
      startsAt: "2026-04-08T16:00:00.000Z",
      endsAt: "2026-04-08T19:00:00.000Z",
      isEnabledForTreasury: true
    }
  ];

  const receiptFormats: ReceiptFormat[] = [
    {
      id: "receipt-format-legacy-001",
      clubId: CLUB_ID,
      name: "Recibo legacy",
      validationType: "numeric",
      pattern: null,
      minNumericValue: 1,
      example: "12345",
      status: "active",
      visibleForSecretaria: true,
      visibleForTesoreria: false
    },
    {
      id: "receipt-format-modern-001",
      clubId: CLUB_ID,
      name: "Recibo moderno",
      validationType: "pattern",
      pattern: "^[a-zA-Z0-9]+$",
      minNumericValue: null,
      example: null,
      status: "active",
      visibleForSecretaria: true,
      visibleForTesoreria: false
    },
    {
      id: "receipt-format-sur-001",
      clubId: CLUB_SUR_ID,
      name: "Recibo Sur",
      validationType: "pattern",
      pattern: "^[a-zA-Z0-9]+$",
      minNumericValue: null,
      example: null,
      status: "active",
      visibleForSecretaria: true,
      visibleForTesoreria: false
    }
  ];

  const clubTreasuryCurrencies: TreasuryCurrencyConfig[] = [
    {
      clubId: CLUB_ID,
      currencyCode: "ARS",
      isPrimary: true
    },
    {
      clubId: CLUB_SUR_ID,
      currencyCode: "ARS",
      isPrimary: true
    }
  ];

  const movementTypeConfig: MovementTypeConfig[] = [
    {
      clubId: CLUB_ID,
      movementType: "ingreso",
      isEnabled: true
    },
    {
      clubId: CLUB_ID,
      movementType: "egreso",
      isEnabled: true
    },
    {
      clubId: CLUB_SUR_ID,
      movementType: "ingreso",
      isEnabled: true
    },
    {
      clubId: CLUB_SUR_ID,
      movementType: "egreso",
      isEnabled: true
    }
  ];

  const dailyCashSessions: DailyCashSession[] = [
    {
      id: "session-2026-04-09",
      clubId: CLUB_ID,
      sessionDate: "2026-04-09",
      status: "closed",
      openedAt: "2026-04-09T13:00:00.000Z",
      closedAt: "2026-04-09T21:30:00.000Z",
      openedByUserId: SECRETARIA_USER_ID,
      closedByUserId: SECRETARIA_USER_ID
    }
  ];
  const dailyCashSessionBalances: DailyCashSessionBalance[] = [];
  const balanceAdjustments: BalanceAdjustment[] = [];
  const accountTransfers: AccountTransfer[] = [];
  const fxOperations: FxOperation[] = [];
  const treasuryMovements: TreasuryMovement[] = [
    {
      id: "movement-secretaria-pending-001",
      displayId: "PJ-MOV-2026-9463",
      clubId: CLUB_ID,
      dailyCashSessionId: "session-2026-04-09",
      accountId: "account-tesoreria-inversion-001",
      movementType: "ingreso",
      categoryId: "category-system-1",
      concept: "Cobranza extraordinaria boxeo",
      currencyCode: "USD",
      amount: 1200,
      activityId: "activity-boxeo-001",
      receiptNumber: null,
      calendarEventId: "calendar-event-boxeo-001",
      transferGroupId: null,
      fxOperationGroupId: null,
      consolidationBatchId: null,
      movementDate: "2026-04-09",
      createdByUserId: SECRETARIA_USER_ID,
      status: "pending_consolidation",
      createdAt: "2026-04-09T18:10:00.000Z"
    },
    {
      id: "movement-secretaria-pending-002",
      displayId: "PJ-MOV-2026-9464",
      clubId: CLUB_ID,
      dailyCashSessionId: "session-2026-04-09",
      accountId: "account-secretaria-caja-001",
      movementType: "egreso",
      categoryId: "category-manual-gastos-001",
      concept: "Compra de insumos",
      currencyCode: "ARS",
      amount: 35000,
      activityId: null,
      receiptNumber: "RC-000123",
      calendarEventId: null,
      transferGroupId: null,
      fxOperationGroupId: null,
      consolidationBatchId: null,
      movementDate: "2026-04-09",
      createdByUserId: SECRETARIA_USER_ID,
      status: "pending_consolidation",
      createdAt: "2026-04-09T19:20:00.000Z"
    },
    {
      id: "movement-tesoreria-posted-001",
      displayId: "PJ-MOV-2026-9465",
      clubId: CLUB_ID,
      dailyCashSessionId: null,
      accountId: "account-tesoreria-inversion-001",
      movementType: "ingreso",
      categoryId: "category-system-1",
      concept: "Cobranza extraordinaria boxeo",
      currencyCode: "USD",
      amount: 1200,
      activityId: "activity-boxeo-001",
      receiptNumber: null,
      calendarEventId: "calendar-event-boxeo-001",
      transferGroupId: null,
      fxOperationGroupId: null,
      consolidationBatchId: null,
      movementDate: "2026-04-05",
      createdByUserId: TESORERIA_USER_ID,
      status: "posted",
      createdAt: "2026-04-05T20:15:00.000Z"
    }
  ];
  const dailyConsolidationBatches: DailyConsolidationBatch[] = [];
  const movementIntegrations: MovementIntegration[] = [];
  const movementAuditLogs: MovementAuditLog[] = [];

  return {
    users,
    memberships,
    clubs,
    invitations,
    treasuryAccounts,
    treasuryCategories,
    clubActivities,
    clubCalendarEvents,
    receiptFormats,
    clubTreasuryCurrencies,
    movementTypeConfig,
    dailyCashSessions,
    dailyCashSessionBalances,
    balanceAdjustments,
    accountTransfers,
    fxOperations,
    treasuryMovements,
    dailyConsolidationBatches,
    movementIntegrations,
    movementAuditLogs,
    preferences
  };
}

function getStore(): MockStore {
  if (!globalThis.__clubManagementMockStore) {
    globalThis.__clubManagementMockStore = createStore();
  }

  return globalThis.__clubManagementMockStore;
}

const GOOGLE_PROFILES: Record<GoogleProfileKey, GoogleProfile> = {
  new_pending: {
    profileKey: "new_pending",
    email: "new.user@example.com",
    fullName: "Nora Nueva",
    avatarUrl: null
  },
  existing_pending: {
    profileKey: "existing_pending",
    email: "pending.user@example.com",
    fullName: "Paula Pendiente",
    avatarUrl: null
  },
  existing_active: {
    profileKey: "existing_active",
    email: "active.user@example.com",
    fullName: "Agustin Activo",
    avatarUrl: null
  },
  existing_secretaria: {
    profileKey: "existing_secretaria",
    email: "secretaria.user@example.com",
    fullName: "Sofia Secretaria",
    avatarUrl: null
  }
};

function buildUser(profile: GoogleProfile): User {
  const timestamp = now();

  return {
    id: `user-${profile.profileKey}-${Date.now()}`,
    email: profile.email,
    fullName: profile.fullName,
    avatarUrl: profile.avatarUrl,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function mapUserRow(row: {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name ?? row.email,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at ?? now(),
    updatedAt: row.updated_at ?? row.created_at ?? now()
  };
}

type MembershipBaseRow = {
  id: string;
  user_id: string;
  club_id: string;
  status: "pendiente_aprobacion" | "activo" | "inactivo";
  joined_at: string | null;
};

function mapMembershipRow(
  row: MembershipBaseRow,
  roles: MembershipRole[]
): Membership {
  return {
    id: row.id,
    userId: row.user_id,
    clubId: row.club_id,
    roles: sortMembershipRoles(roles),
    status: row.status,
    joinedAt: row.joined_at ?? now()
  };
}

function mapClubRow(row: {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  cuit?: string | null;
  tipo?: string | null;
  logo_url?: string | null;
  color_primary?: string | null;
  color_secondary?: string | null;
}): Club {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: "active",
    cuit: row.cuit ?? null,
    tipo: isClubType(row.tipo) ? row.tipo : null,
    logoUrl: row.logo_url ?? null,
    colorPrimary: row.color_primary ?? null,
    colorSecondary: row.color_secondary ?? null
  };
}

function isClubType(value: unknown): value is ClubType {
  return value === "asociacion_civil" || value === "fundacion" || value === "sociedad_civil";
}

function mapClubMemberFromMembership(membership: Membership, user: User): ClubMember {
  return {
    membershipId: membership.id,
    userId: membership.userId,
    clubId: membership.clubId,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    roles: membership.roles,
    status: membership.status,
    joinedAt: membership.joinedAt
  };
}

async function listRealMembershipRolesByMembershipIds(
  membershipIds: string[],
  client?: AccessRepositoryClient
) {
  if (membershipIds.length === 0) {
    return new Map<string, MembershipRole[]>();
  }

  const supabase = createAdminSupabaseClient() ?? createAccessSupabaseClient(client);

  if (!supabase) {
    return new Map<string, MembershipRole[]>();
  }

  const { data, error } = await supabase
    .from("membership_roles")
    .select("membership_id,role")
    .in("membership_id", membershipIds);

  if (error || !data) {
    return new Map<string, MembershipRole[]>();
  }

  const rolesByMembershipId = new Map<string, MembershipRole[]>();

  data.forEach((row: { membership_id: string; role: MembershipRole }) => {
    const currentRoles = rolesByMembershipId.get(row.membership_id) ?? [];
    currentRoles.push(row.role);
    rolesByMembershipId.set(row.membership_id, sortMembershipRoles(currentRoles));
  });

  membershipIds.forEach((membershipId) => {
    if (!rolesByMembershipId.has(membershipId)) {
      rolesByMembershipId.set(membershipId, []);
    }
  });

  return rolesByMembershipId;
}

function mapInvitationRow(row: {
  id: string;
  club_id: string;
  email: string;
  role: "admin" | "secretaria" | "tesoreria";
  status: string;
  expires_at: string | null;
  used_at: string | null;
  created_at: string | null;
}): ClubInvitation {
  return {
    id: row.id,
    clubId: row.club_id,
    email: row.email,
    role: row.role,
    status: row.status === "used" ? "used" : "pending",
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdAt: row.created_at ?? now()
  };
}

function mapTreasuryAccountRow(
  row: {
    id: string;
    club_id: string;
    name: string;
    account_type: TreasuryAccount["accountType"];
    account_scope: string;
    visible_for_secretaria: boolean | null;
    visible_for_tesoreria: boolean | null;
    emoji: string | null;
    bank_entity?: string | null;
    bank_account_subtype?: string | null;
    account_number?: string | null;
    cbu_cvu?: string | null;
  },
  currencyDetails: Array<{ currencyCode: TreasuryCurrencyCode; initialBalance: number }>
): TreasuryAccount {
  const subtype = row.bank_account_subtype;
  return {
    id: row.id,
    clubId: row.club_id,
    name: row.name,
    accountType: row.account_type,
    visibleForSecretaria: row.visible_for_secretaria ?? true,
    visibleForTesoreria: row.visible_for_tesoreria ?? true,
    emoji: row.emoji,
    currencies: currencyDetails.map((entry) => entry.currencyCode),
    currencyDetails,
    bankEntity: row.bank_entity ?? null,
    bankAccountSubtype:
      subtype === "cuenta_corriente" || subtype === "caja_ahorro" ? subtype : null,
    accountNumber: row.account_number ?? null,
    cbuCvu: row.cbu_cvu ?? null
  };
}

function resolveLegacyAccountScope(input: {
  visibleForSecretaria: boolean;
  visibleForTesoreria: boolean;
}) {
  return input.visibleForSecretaria ? "secretaria" : "tesoreria";
}

function mapTreasuryCategoryRow(row: {
  id: string;
  club_id: string;
  name: string;
  sub_category_name?: string | null;
  description?: string | null;
  parent_category?: string | null;
  movement_type?: TreasuryCategoryMovementType | null;
  visible_for_secretaria: boolean | null;
  visible_for_tesoreria: boolean | null;
  emoji: string | null;
  is_system?: boolean | null;
  is_legacy?: boolean | null;
}): TreasuryCategory {
  const subCategoryName = row.sub_category_name ?? row.name;

  return {
    id: row.id,
    clubId: row.club_id,
    name: subCategoryName,
    subCategoryName,
    description: row.description ?? subCategoryName,
    parentCategory: row.parent_category ?? "Migradas",
    movementType: row.movement_type ?? "egreso",
    visibleForSecretaria: row.visible_for_secretaria ?? true,
    visibleForTesoreria: row.visible_for_tesoreria ?? true,
    emoji: row.emoji,
    isSystem: row.is_system ?? false,
    isLegacy: row.is_legacy ?? false
  };
}

async function reconcileRealSystemTreasuryCategories(
  clubId: string,
  categories: TreasuryCategory[]
) {
  const categoriesByName = new Map(
    categories.map((category) => [category.subCategoryName.trim().toLowerCase(), category])
  );
  const resolvedCategories = [...categories];

  for (const definition of SYSTEM_TREASURY_CATEGORY_DEFINITIONS) {
    const existingCategory = categoriesByName.get(definition.subCategoryName.trim().toLowerCase());

    if (!existingCategory) {
      const createdCategory = await createRealTreasuryCategory({
        clubId,
        subCategoryName: definition.subCategoryName,
        description: definition.description,
        parentCategory: definition.parentCategory,
        movementType: definition.movementType,
        visibleForSecretaria: definition.visibleForSecretaria,
        visibleForTesoreria: definition.visibleForTesoreria,
        emoji: definition.emoji,
        isSystem: true,
        isLegacy: false
      });

      resolvedCategories.push(createdCategory);
      categoriesByName.set(definition.subCategoryName.trim().toLowerCase(), createdCategory);
      continue;
    }

    if (
      existingCategory.emoji === definition.emoji &&
      existingCategory.description === definition.description &&
      existingCategory.parentCategory === definition.parentCategory &&
      existingCategory.movementType === definition.movementType &&
      existingCategory.isSystem &&
      !existingCategory.isLegacy
    ) {
      continue;
    }

    const updatedCategory = await updateRealTreasuryCategory({
      categoryId: existingCategory.id,
      clubId,
      subCategoryName: definition.subCategoryName,
      description: definition.description,
      parentCategory: definition.parentCategory,
      movementType: definition.movementType,
      visibleForSecretaria: existingCategory.visibleForSecretaria,
      visibleForTesoreria: existingCategory.visibleForTesoreria,
      emoji: definition.emoji,
      isSystem: true,
      isLegacy: false
    });

    const categoryIndex = resolvedCategories.findIndex((category) => category.id === existingCategory.id);

    if (categoryIndex >= 0) {
      resolvedCategories[categoryIndex] = updatedCategory;
    }

    categoriesByName.set(definition.subCategoryName.trim().toLowerCase(), updatedCategory);
  }

  return sortTreasuryCategories(resolvedCategories);
}

function mapClubActivityRow(row: {
  id: string;
  club_id: string;
  name: string;
  visible_for_secretaria: boolean | null;
  visible_for_tesoreria: boolean | null;
  emoji: string | null;
}): ClubActivity {
  return {
    id: row.id,
    clubId: row.club_id,
    name: row.name,
    visibleForSecretaria: row.visible_for_secretaria ?? true,
    visibleForTesoreria: row.visible_for_tesoreria ?? true,
    emoji: row.emoji
  };
}

function mapClubCalendarEventRow(row: {
  id: string;
  club_id: string;
  title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_enabled_for_treasury: boolean | null;
}): ClubCalendarEvent {
  return {
    id: row.id,
    clubId: row.club_id,
    title: row.title ?? "",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isEnabledForTreasury: row.is_enabled_for_treasury ?? false
  };
}

function mapReceiptFormatRow(row: {
  id: string;
  club_id: string;
  name: string;
  validation_type: ReceiptFormat["validationType"];
  pattern: string | null;
  min_numeric_value: number | null;
  example: string | null;
  status: ReceiptFormat["status"];
  visible_for_secretaria?: boolean | null;
  visible_for_tesoreria?: boolean | null;
}): ReceiptFormat {
  return {
    id: row.id,
    clubId: row.club_id,
    name: row.name,
    validationType: row.validation_type,
    pattern: row.pattern,
    minNumericValue: row.min_numeric_value,
    example: row.example,
    status: row.status,
    visibleForSecretaria: row.visible_for_secretaria ?? true,
    visibleForTesoreria: row.visible_for_tesoreria ?? false
  };
}

function ensureMockReceiptFormatsForClub(clubId: string) {
  const existingFormats = getStore().receiptFormats.filter((format) => format.clubId === clubId);

  if (existingFormats.length > 0) {
    return existingFormats;
  }

  const defaultReceiptFormat = getDefaultReceiptFormatSeed();
  const receiptFormat: ReceiptFormat = {
    id: `receipt-format-${clubId}-default`,
    clubId,
    ...defaultReceiptFormat
  };

  getStore().receiptFormats.push(receiptFormat);
  return [receiptFormat];
}

function reconcileMockSystemTreasuryCategories(clubId: string) {
  const store = getStore();
  const clubCategories = store.treasuryCategories.filter((category) => category.clubId === clubId);
  const categoriesByName = new Map(
    clubCategories.map((category) => [category.subCategoryName.trim().toLowerCase(), category])
  );

  for (const definition of SYSTEM_TREASURY_CATEGORY_DEFINITIONS) {
    const existingCategory = categoriesByName.get(definition.subCategoryName.trim().toLowerCase());

    if (!existingCategory) {
      store.treasuryCategories.push({
        id: `category-system-${clubId}-${definition.subCategoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        clubId,
        name: definition.subCategoryName,
        subCategoryName: definition.subCategoryName,
        description: definition.description,
        parentCategory: definition.parentCategory,
        movementType: definition.movementType,
        visibleForSecretaria: definition.visibleForSecretaria,
        visibleForTesoreria: definition.visibleForTesoreria,
        emoji: definition.emoji,
        isSystem: true,
        isLegacy: false
      });
      continue;
    }

    existingCategory.name = definition.subCategoryName;
    existingCategory.subCategoryName = definition.subCategoryName;
    existingCategory.description = definition.description;
    existingCategory.parentCategory = definition.parentCategory;
    existingCategory.movementType = definition.movementType;
    existingCategory.emoji = definition.emoji;
    existingCategory.isSystem = true;
    existingCategory.isLegacy = false;
  }

  return sortTreasuryCategories(
    store.treasuryCategories.filter((category) => category.clubId === clubId)
  );
}

function mapTreasuryCurrencyRow(row: {
  club_id: string;
  currency_code: TreasuryCurrencyCode;
  is_primary: boolean | null;
}): TreasuryCurrencyConfig {
  return {
    clubId: row.club_id,
    currencyCode: row.currency_code,
    isPrimary: row.is_primary ?? false
  };
}

function mapMovementTypeConfigRow(row: {
  club_id: string;
  movement_type: TreasuryMovementType;
  is_enabled: boolean | null;
}): MovementTypeConfig {
  return {
    clubId: row.club_id,
    movementType: row.movement_type,
    isEnabled: row.is_enabled ?? false
  };
}

function mapDailyCashSessionRow(row: {
  id: string;
  club_id: string;
  session_date: string;
  status: DailyCashSession["status"] | null;
  opened_at: string;
  closed_at: string | null;
  opened_by_user_id: string;
  closed_by_user_id: string | null;
}): DailyCashSession {
  return {
    id: row.id,
    clubId: row.club_id,
    sessionDate: row.session_date,
    status: row.status ?? "open",
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? null,
    openedByUserId: row.opened_by_user_id,
    closedByUserId: row.closed_by_user_id ?? null
  };
}

type TreasuryMovementRow = {
  id: string;
  display_id: string;
  club_id: string;
  daily_cash_session_id: string | null;
  account_id: string;
  movement_type: TreasuryMovementType;
  category_id: string | null;
  concept: string;
  currency_code: string;
  amount: number | string;
  activity_id: string | null;
  receipt_number: string | null;
  calendar_event_id: string | null;
  transfer_group_id: string | null;
  fx_operation_group_id: string | null;
  consolidation_batch_id: string | null;
  movement_date: string;
  created_by_user_id: string;
  status: TreasuryMovementStatus | null;
  created_at: string | null;
};

type DailyConsolidationBatchRow = {
  id: string;
  club_id: string;
  consolidation_date: string;
  status: DailyConsolidationBatch["status"] | null;
  executed_at: string | null;
  executed_by_user_id: string | null;
  error_message: string | null;
};

type MovementAuditLogRow = {
  id: string;
  movement_id: string;
  action_type: MovementAuditLog["actionType"];
  payload_before: Record<string, unknown> | null;
  payload_after: Record<string, unknown> | null;
  performed_by_user_id: string;
  performed_at: string | null;
};

function mapTreasuryMovementRow(row: TreasuryMovementRow): TreasuryMovement {
  return {
    id: row.id,
    displayId: row.display_id,
    clubId: row.club_id,
    dailyCashSessionId: row.daily_cash_session_id,
    accountId: row.account_id,
    movementType: row.movement_type,
    categoryId: row.category_id ?? "",
    concept: row.concept,
    currencyCode: row.currency_code as TreasuryMovement["currencyCode"],
    amount: Number(row.amount),
    activityId: row.activity_id,
    receiptNumber: row.receipt_number,
    calendarEventId: row.calendar_event_id,
    transferGroupId: row.transfer_group_id,
    fxOperationGroupId: row.fx_operation_group_id,
    consolidationBatchId: row.consolidation_batch_id,
    movementDate: row.movement_date,
    createdByUserId: row.created_by_user_id,
    status: row.status ?? "pending_consolidation",
    createdAt: row.created_at ?? now()
  };
}

function mapDailyConsolidationBatchRow(row: DailyConsolidationBatchRow): DailyConsolidationBatch {
  return {
    id: row.id,
    clubId: row.club_id,
    consolidationDate: row.consolidation_date,
    status: row.status ?? "pending",
    executedAt: row.executed_at,
    executedByUserId: row.executed_by_user_id,
    errorMessage: row.error_message
  };
}

function mapMovementAuditLogRow(row: MovementAuditLogRow): MovementAuditLog {
  return {
    id: row.id,
    movementId: row.movement_id,
    actionType: row.action_type,
    payloadBefore: row.payload_before,
    payloadAfter: row.payload_after,
    performedByUserId: row.performed_by_user_id,
    performedAt: row.performed_at ?? now()
  };
}

function normalizeNullableUuidParam(value?: string | null) {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

type AccountTransferMutationRow = {
  transfer_id: string;
  club_id: string;
  source_account_id: string;
  target_account_id: string;
  currency_code: string;
  amount: number | string;
  concept: string;
  created_at: string | null;
  source_movement_display_id: string;
  target_movement_display_id: string;
};

function mapAccountTransferMutationRow(row: AccountTransferMutationRow): AccountTransferMutationResult {
  return {
    transfer: {
      id: row.transfer_id,
      clubId: row.club_id,
      sourceAccountId: row.source_account_id,
      targetAccountId: row.target_account_id,
      currencyCode: row.currency_code,
      amount: Number(row.amount),
      concept: row.concept,
      createdAt: row.created_at ?? now()
    },
    sourceMovementDisplayId: row.source_movement_display_id,
    targetMovementDisplayId: row.target_movement_display_id
  };
}

function mapFxOperationInsertRow(
  row: FxOperationInsertRow,
  input: {
    sourceCurrencyCode: string;
    targetCurrencyCode: string;
    concept: string;
  }
): FxOperation {
  return {
    id: row.id,
    clubId: row.club_id,
    sourceAccountId: row.source_account_id,
    targetAccountId: row.target_account_id,
    sourceCurrencyCode: input.sourceCurrencyCode,
    targetCurrencyCode: input.targetCurrencyCode,
    sourceAmount: Number(row.source_amount),
    targetAmount: Number(row.target_amount),
    concept: input.concept,
    createdAt: row.created_at ?? now()
  };
}

function alignAccountCurrenciesWithClubSelection(
  currentCurrencies: string[],
  allowedCurrencies: TreasuryCurrencyCode[],
  fallbackCurrencyCode: TreasuryCurrencyCode
) {
  const nextCurrencies = currentCurrencies.filter((currency): currency is TreasuryCurrencyCode =>
    allowedCurrencies.includes(currency as TreasuryCurrencyCode)
  );

  if (nextCurrencies.length > 0) {
    return nextCurrencies;
  }

  return [fallbackCurrencyCode];
}

function shouldUseSupabaseDatabase() {
  return appConfig.authProviderMode !== "mock" && hasSupabaseBrowserConfig();
}

function logTreasurySettingsWriteFailure(
  operation: string,
  details: Record<string, unknown>,
  error?: unknown
) {
  console.error("[treasury-settings-write-failure]", {
    operation,
    ...details,
    error
  });
}

function logTreasurySettingsReadFailure(
  operation: string,
  details: Record<string, unknown>,
  error?: unknown
) {
  console.error("[treasury-settings-read-failure]", {
    operation,
    ...details,
    error
  });
}

function createAccessSupabaseClient(client?: AccessRepositoryClient) {
  if (!shouldUseSupabaseDatabase()) {
    return null;
  }

  return client ?? createServerSupabaseClient();
}

function createRequiredTreasurySettingsAdminClient(
  operation: string,
  details: Record<string, unknown>
) {
  try {
    return createRequiredAdminSupabaseClient();
  } catch (error) {
    logTreasurySettingsWriteFailure(operation, { codePath: "admin", ...details }, error);

    if (error instanceof MissingSupabaseAdminConfigError) {
      throw new AccessRepositoryInfraError("treasury_admin_config_missing", operation, {
        cause: error
      });
    }

    throw error;
  }
}

function throwTreasurySettingsWriteFailure(
  operation: string,
  details: Record<string, unknown>,
  error?: unknown
): never {
  logTreasurySettingsWriteFailure(operation, { codePath: "admin", ...details }, error);
  throw new AccessRepositoryInfraError("treasury_settings_write_failed", operation, {
    cause: error
  });
}

async function findRealUserByEmail(email: string, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("id,email,full_name,avatar_url,created_at,updated_at")
    .eq("email", email)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapUserRow(data);
}

async function findRealUserById(userId: string, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("id,email,full_name,avatar_url,created_at,updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapUserRow(data);
}

async function findRealUsersByIds(userIds: string[], client?: AccessRepositoryClient) {
  if (userIds.length === 0) {
    return [];
  }

  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("users")
    .select("id,email,full_name,avatar_url,created_at,updated_at")
    .in("id", userIds);

  if (error || !data) {
    return [];
  }

  const usersById = new Map(data.map((row) => [row.id, mapUserRow(row)]));

  return userIds.flatMap((userId) => {
    const user = usersById.get(userId);
    return user ? [user] : [];
  });
}

async function listRealMembershipsForUser(userId: string, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("memberships")
    .select("id,user_id,club_id,status,joined_at")
    .eq("user_id", userId);

  if (error || !data) {
    return [];
  }

  const rolesByMembershipId = await listRealMembershipRolesByMembershipIds(
    data.map((membership) => membership.id),
    supabase
  );

  return data.map((membership) =>
    mapMembershipRow(membership, rolesByMembershipId.get(membership.id) ?? [])
  );
}

async function findRealClubById(clubId: string, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("clubs")
    .select("id,name,slug,status,cuit,tipo,logo_url,color_primary,color_secondary")
    .eq("id", clubId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapClubRow(data);
}

type UpdateClubIdentityFields = {
  name?: string;
  cuit?: string | null;
  tipo?: ClubType | null;
  logoUrl?: string | null;
  colorPrimary?: string | null;
  colorSecondary?: string | null;
};

async function updateRealClubIdentity(
  clubId: string,
  fields: UpdateClubIdentityFields,
  client?: AccessRepositoryClient
) {
  const supabase = client ?? createAdminSupabaseClient() ?? createAccessSupabaseClient();

  if (!supabase) {
    return null;
  }

  const payload: Record<string, unknown> = {};
  if (fields.name !== undefined) payload.name = fields.name;
  if (fields.cuit !== undefined) payload.cuit = fields.cuit;
  if (fields.tipo !== undefined) payload.tipo = fields.tipo;
  if (fields.logoUrl !== undefined) payload.logo_url = fields.logoUrl;
  if (fields.colorPrimary !== undefined) payload.color_primary = fields.colorPrimary;
  if (fields.colorSecondary !== undefined) payload.color_secondary = fields.colorSecondary;

  if (Object.keys(payload).length === 0) {
    return findRealClubById(clubId, client);
  }

  const { data, error } = await supabase
    .from("clubs")
    .update(payload)
    .eq("id", clubId)
    .select("id,name,slug,status,cuit,tipo,logo_url,color_primary,color_secondary")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapClubRow(data);
}

async function getRealLastActiveClubId(userId: string, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_club_preferences")
    .select("last_active_club_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.last_active_club_id ?? null;
}

async function listRealClubMembers(clubId: string, client?: AccessRepositoryClient) {
  const adminSupabase = createAdminSupabaseClient();

  if (adminSupabase) {
    const { data, error } = await adminSupabase
      .from("memberships")
      .select("id,user_id,club_id,status,joined_at")
      .eq("club_id", clubId);

    if (error || !data) {
      return [];
    }

    const rolesByMembershipId = await listRealMembershipRolesByMembershipIds(
      data.map((membership) => membership.id),
      adminSupabase
    );
    const memberships = data.map((membership) =>
      mapMembershipRow(membership, rolesByMembershipId.get(membership.id) ?? [])
    );
    const users = await Promise.all(
      memberships.map(async (membership) => ({
        membership,
        user: await findRealUserById(membership.userId, adminSupabase)
      }))
    );

    return users
      .filter((entry): entry is { membership: Membership; user: User } => Boolean(entry.user))
      .map((entry) => mapClubMemberFromMembership(entry.membership, entry.user));
  }

  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .rpc("get_club_members_for_current_admin", {
      p_club_id: clubId
    });

  if (error || !data) {
    return [];
  }

  return data.map((row: {
    membership_id: string;
    user_id: string;
    club_id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    roles: MembershipRole[];
    status: Membership["status"];
    joined_at: string | null;
  }) => ({
    membershipId: row.membership_id,
    userId: row.user_id,
    clubId: row.club_id,
    fullName: row.full_name ?? row.email,
    email: row.email,
    avatarUrl: row.avatar_url,
    roles: sortMembershipRoles(row.roles ?? []),
    status: row.status,
    joinedAt: row.joined_at ?? now()
  }));
}

async function listRealPendingInvitationsByEmail(email: string, client?: AccessRepositoryClient) {
  const supabase = createAdminSupabaseClient() ?? createAccessSupabaseClient(client);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("club_invitations")
    .select("id,club_id,email,role,status,expires_at,used_at,created_at")
    .eq("email", email.toLowerCase())
    .eq("status", "pending")
    .is("used_at", null);

  if (error || !data) {
    return [];
  }

  return data.map(mapInvitationRow).filter((invitation) => {
    if (!invitation.expiresAt) {
      return true;
    }

    return new Date(invitation.expiresAt).getTime() > Date.now();
  });
}

async function listRealPendingInvitationsForClub(clubId: string, client?: AccessRepositoryClient) {
  const adminSupabase = createAdminSupabaseClient();

  if (adminSupabase) {
    const { data, error } = await adminSupabase
      .from("club_invitations")
      .select("id,club_id,email,role,status,expires_at,used_at,created_at")
      .eq("club_id", clubId)
      .eq("status", "pending")
      .is("used_at", null);

    if (error || !data) {
      return [];
    }

    return data
      .map(mapInvitationRow)
      .filter((invitation) => {
        if (!invitation.expiresAt) {
          return true;
        }

        return new Date(invitation.expiresAt).getTime() > Date.now();
      })
      .map((invitation) => ({
        invitationId: invitation.id,
        clubId: invitation.clubId,
        email: invitation.email,
        role: invitation.role,
        status: "pendiente_aprobacion" as const,
        createdAt: invitation.createdAt
      }));
  }

  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .rpc("get_pending_club_invitations_for_current_admin", {
      p_club_id: clubId
    });

  if (error || !data) {
    return [];
  }

  return data.map((row: {
    invitation_id: string;
    club_id: string;
    email: string;
    role: MembershipRole;
    created_at: string | null;
  }) => ({
    invitationId: row.invitation_id,
    clubId: row.club_id,
    email: row.email,
    role: row.role,
    status: "pendiente_aprobacion" as const,
    createdAt: row.created_at ?? now()
  }));
}

async function listRealTreasuryAccountsForClub(clubId: string, client?: AccessRepositoryClient) {
  const rows = await runClubScopedReadRpc<
    Array<{
      id: string;
      club_id: string;
      name: string;
      account_type: TreasuryAccount["accountType"];
      account_scope: string;
      visible_for_secretaria: boolean | null;
      visible_for_tesoreria: boolean | null;
      emoji: string | null;
      bank_entity: string | null;
      bank_account_subtype: string | null;
      account_number: string | null;
      cbu_cvu: string | null;
      currencies: Array<{ currency_code: string; initial_balance: number | string }> | null;
    }>
  >("get_treasury_accounts_for_current_club", clubId, client);

  return rows.map((row) => {
    const currencyDetails = (row.currencies ?? [])
      .map((entry) => {
        const code = entry.currency_code?.toUpperCase();
        if (code !== "ARS" && code !== "USD") return null;
        const raw = entry.initial_balance;
        const numeric = typeof raw === "number" ? raw : Number(raw ?? 0);
        return {
          currencyCode: code as TreasuryCurrencyCode,
          initialBalance: Number.isFinite(numeric) ? numeric : 0
        };
      })
      .filter((entry): entry is { currencyCode: TreasuryCurrencyCode; initialBalance: number } => entry !== null);
    return mapTreasuryAccountRow(row, currencyDetails);
  });
}

async function listRealTreasuryCategoriesForClub(clubId: string, client?: AccessRepositoryClient) {
  const rows = await runClubScopedReadRpc<
    Array<{
      id: string;
      club_id: string;
      name: string;
      sub_category_name: string | null;
      description: string | null;
      parent_category: string | null;
      movement_type: TreasuryCategoryMovementType | null;
      visible_for_secretaria: boolean | null;
      visible_for_tesoreria: boolean | null;
      emoji: string | null;
      is_system: boolean | null;
      is_legacy: boolean | null;
    }>
  >("get_treasury_categories_for_current_club", clubId, client);

  return reconcileRealSystemTreasuryCategories(
    clubId,
    rows.map(mapTreasuryCategoryRow)
  );
}

async function listRealClubActivitiesForClub(clubId: string, client?: AccessRepositoryClient) {
  const rows = await runClubScopedReadRpc<
    Array<{
      id: string;
      club_id: string;
      name: string;
      visible_for_secretaria: boolean | null;
      visible_for_tesoreria: boolean | null;
      emoji: string | null;
    }>
  >("get_club_activities_for_current_club", clubId, client);

  return rows.map(mapClubActivityRow);
}

async function listRealClubCalendarEventsForClub(clubId: string, client?: AccessRepositoryClient) {
  const rows = await runClubScopedReadRpc<
    Array<{
      id: string;
      club_id: string;
      title: string | null;
      starts_at: string | null;
      ends_at: string | null;
      is_enabled_for_treasury: boolean | null;
    }>
  >("get_club_calendar_events_for_current_club", clubId, client, {
    operation: "get_club_calendar_events_for_current_club",
    details: { dependency: "optional_dashboard_calendar_events" },
    suppressLog: true
  });

  return rows.map(mapClubCalendarEventRow);
}

async function updateRealClubCalendarEventTreasuryAvailability(
  input: {
    clubId: string;
    eventId: string;
    isEnabledForTreasury: boolean;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createRequiredTreasurySettingsAdminClient("update_club_calendar_event_treasury_availability", {
    clubId: input.clubId,
    eventId: input.eventId
  });

  const { data, error } = await supabase
    .from("club_calendar_events")
    .update({
      is_enabled_for_treasury: input.isEnabledForTreasury
    })
    .eq("id", input.eventId)
    .eq("club_id", input.clubId)
    .select("id,club_id,title,starts_at,ends_at,is_enabled_for_treasury")
    .maybeSingle();

  if (error || !data) {
    throwTreasurySettingsWriteFailure(
      "update_club_calendar_event_treasury_availability",
      { clubId: input.clubId, eventId: input.eventId },
      error
    );
  }

  return mapClubCalendarEventRow(data);
}

async function listRealReceiptFormatsForClub(clubId: string, client?: AccessRepositoryClient) {
  const rows = await runClubScopedReadRpc<
    Array<{
      id: string;
      club_id: string;
      name: string;
      validation_type: ReceiptFormat["validationType"];
      pattern: string | null;
      min_numeric_value: number | null;
      example: string | null;
      status: ReceiptFormat["status"];
      visible_for_secretaria: boolean | null;
      visible_for_tesoreria: boolean | null;
    }>
  >("get_receipt_formats_for_current_club", clubId, client);

  const receiptFormats = rows.map(mapReceiptFormatRow);

  if (receiptFormats.length > 0) {
    return receiptFormats;
  }

  try {
    const bootstrappedReceiptFormat = await bootstrapRealReceiptFormatForClub(clubId, client);

    if (bootstrappedReceiptFormat) {
      return [bootstrappedReceiptFormat];
    }
  } catch (error) {
    logTreasurySettingsReadFailure("bootstrap_receipt_format_for_club", { clubId }, error);
  }

  return [buildDefaultReceiptFormat(clubId)];
}

async function bootstrapRealReceiptFormatForClub(clubId: string, client?: AccessRepositoryClient) {
  const defaultReceiptFormat = getDefaultReceiptFormatSeed();

  try {
    return await createRealReceiptFormat(
      {
        clubId,
        name: defaultReceiptFormat.name,
        validationType: defaultReceiptFormat.validationType,
        pattern: defaultReceiptFormat.pattern,
        minNumericValue: defaultReceiptFormat.minNumericValue,
        example: defaultReceiptFormat.example,
        status: defaultReceiptFormat.status,
        visibleForSecretaria: defaultReceiptFormat.visibleForSecretaria,
        visibleForTesoreria: defaultReceiptFormat.visibleForTesoreria
      },
      client
    );
  } catch (error) {
    const errorCode = getSupabaseErrorCode(error);
    const errorMessage = getSupabaseErrorMessage(error).toLowerCase();
    const isConcurrentBootstrap =
      errorCode === "23505" ||
      errorMessage.includes("duplicate key") ||
      errorMessage.includes("already exists");

    if (!isConcurrentBootstrap) {
      throw error;
    }
  }

  const rows = await runClubScopedReadRpc<
    Array<{
      id: string;
      club_id: string;
      name: string;
      validation_type: ReceiptFormat["validationType"];
      pattern: string | null;
      min_numeric_value: number | null;
      example: string | null;
      status: ReceiptFormat["status"];
      visible_for_secretaria: boolean | null;
      visible_for_tesoreria: boolean | null;
    }>
  >("get_receipt_formats_for_current_club", clubId, client);

  return rows.map(mapReceiptFormatRow)[0] ?? null;
}

async function listRealTreasuryCurrenciesForClub(clubId: string, client?: AccessRepositoryClient) {
  const rows = await runClubScopedReadRpc<
    Array<{
      club_id: string;
      currency_code: TreasuryCurrencyCode;
      is_primary: boolean | null;
    }>
  >("get_treasury_currencies_for_current_club", clubId, client);

  return rows.map(mapTreasuryCurrencyRow);
}

async function findRealDailyCashSessionByDate(clubId: string, sessionDate: string, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", "get_daily_cash_session_by_date");
  }

  const { data, error } = await supabase.rpc("get_daily_cash_session_for_current_club", {
    p_club_id: clubId,
    p_session_date: sessionDate
  });

  if (error) {
    console.error("[club-scoped-rpc-failure]", {
      operation: "get_daily_cash_session_by_date",
      clubId,
      sessionDate,
      error
    });
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", "get_daily_cash_session_by_date", {
      cause: error
    });
  }

  const rows = (data ?? []) as Array<{
    id: string;
    club_id: string;
    session_date: string;
    status: DailyCashSession["status"] | null;
    opened_at: string;
    closed_at: string | null;
    opened_by_user_id: string;
    closed_by_user_id: string | null;
  }>;

  if (rows.length === 0) {
    return null;
  }

  return mapDailyCashSessionRow(rows[0]);
}

async function findRealLastOpenDailyCashSessionBeforeDate(
  clubId: string,
  beforeDate: string,
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", "get_last_open_daily_cash_session_before_date");
  }

  const { data, error } = await supabase.rpc("get_last_open_daily_cash_session_before_date_for_current_club", {
    p_club_id: clubId,
    p_before_date: beforeDate
  });

  if (error) {
    logClubScopedRpcFailure(
      "get_last_open_daily_cash_session_before_date",
      {
        clubId,
        beforeDate
      },
      error,
      { suppressKnownMissingStaleSessionRpc: true }
    );
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", "get_last_open_daily_cash_session_before_date", {
      cause: error
    });
  }

  const rows = (data ?? []) as Array<{
    id: string;
    club_id: string;
    session_date: string;
    status: DailyCashSession["status"] | null;
    opened_at: string;
    closed_at: string | null;
    opened_by_user_id: string;
    closed_by_user_id: string | null;
  }>;

  if (rows.length === 0) {
    return null;
  }

  return mapDailyCashSessionRow(rows[0]);
}

async function createRealDailyCashSession(
  clubId: string,
  sessionDate: string,
  openedByUserId: string,
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", "create_daily_cash_session");
  }

  const { data, error } = await supabase.rpc("create_daily_cash_session_for_current_club", {
    p_club_id: clubId,
    p_session_date: sessionDate,
    p_opened_by_user_id: openedByUserId
  });

  if (error) {
    console.error("[club-scoped-rpc-failure]", {
      operation: "create_daily_cash_session",
      clubId,
      sessionDate,
      openedByUserId,
      error
    });
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", "create_daily_cash_session", {
      cause: error
    });
  }

  const row = (((data ?? []) as Array<{
    id: string;
    club_id: string;
    session_date: string;
    status: DailyCashSession["status"] | null;
    opened_at: string;
    closed_at: string | null;
    opened_by_user_id: string;
    closed_by_user_id: string | null;
  }>)[0] ?? null);

  if (!row) {
    return null;
  }

  return mapDailyCashSessionRow(row);
}

async function closeRealDailyCashSession(
  clubId: string,
  sessionId: string,
  closedByUserId: string,
  client?: AccessRepositoryClient
) {
  const row = await runClubScopedMutationRpc<{
    id: string;
    club_id: string;
    session_date: string;
    status: DailyCashSession["status"] | null;
    opened_at: string;
    closed_at: string | null;
    opened_by_user_id: string;
    closed_by_user_id: string | null;
  }>("close_daily_cash_session_for_current_club", clubId, client, {
    operation: "close_daily_cash_session",
    details: { sessionId, closedByUserId },
    params: {
      p_session_id: sessionId,
      p_closed_by_user_id: closedByUserId
    }
  });

  if (!row) {
    return null;
  }

  return mapDailyCashSessionRow(row);
}

async function openRealDailyCashSessionWithBalances(input: {
  clubId: string;
  sessionDate: string;
  openedByUserId: string;
  balances: Array<{
    accountId: string;
    currencyCode: string;
    balanceMoment: "opening" | "closing";
    expectedBalance: number;
    declaredBalance: number;
    differenceAmount: number;
  }>;
  adjustments: Array<{
    accountId: string;
    movementType: TreasuryMovementType;
    categoryId: string;
    concept: string;
    currencyCode: string;
    amount: number;
    movementDate: string;
    createdByUserId: string;
    displayId: string;
    status: TreasuryMovementStatus;
    differenceAmount: number;
    adjustmentMoment: "opening" | "closing";
  }>;
}, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", "open_daily_cash_session_with_balances");
  }

  const { data, error } = await supabase.rpc("open_daily_cash_session_with_balances_for_current_club", {
    p_club_id: input.clubId,
    p_session_date: input.sessionDate,
    p_opened_by_user_id: input.openedByUserId,
    p_balance_entries: input.balances.map((entry) => ({
      account_id: entry.accountId,
      currency_code: entry.currencyCode,
      balance_moment: entry.balanceMoment,
      expected_balance: entry.expectedBalance,
      declared_balance: entry.declaredBalance,
      difference_amount: entry.differenceAmount
    })),
    p_adjustment_entries: input.adjustments.map((entry) => ({
      account_id: entry.accountId,
      movement_type: entry.movementType,
      category_id: entry.categoryId,
      concept: entry.concept,
      currency_code: entry.currencyCode,
      amount: entry.amount,
      movement_date: entry.movementDate,
      created_by_user_id: entry.createdByUserId,
      display_id: entry.displayId,
      status: entry.status,
      difference_amount: entry.differenceAmount,
      adjustment_moment: entry.adjustmentMoment
    }))
  });

  if (error) {
    console.error("[club-scoped-rpc-failure]", {
      operation: "open_daily_cash_session_with_balances",
      clubId: input.clubId,
      sessionDate: input.sessionDate,
      openedByUserId: input.openedByUserId,
      error
    });
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", "open_daily_cash_session_with_balances", {
      cause: error
    });
  }

  const row = (((data ?? []) as Array<{
    id: string;
    club_id: string;
    session_date: string;
    status: DailyCashSession["status"] | null;
    opened_at: string;
    closed_at: string | null;
    opened_by_user_id: string;
    closed_by_user_id: string | null;
  }>)[0] ?? null);

  return row ? mapDailyCashSessionRow(row) : null;
}

async function closeRealDailyCashSessionWithBalances(input: {
  clubId: string;
  sessionId: string;
  closedByUserId: string;
  notes?: string;
  balances: Array<{
    accountId: string;
    currencyCode: string;
    balanceMoment: "opening" | "closing";
    expectedBalance: number;
    declaredBalance: number;
    differenceAmount: number;
  }>;
  adjustments: Array<{
    accountId: string;
    movementType: TreasuryMovementType;
    categoryId: string;
    concept: string;
    currencyCode: string;
    amount: number;
    movementDate: string;
    createdByUserId: string;
    displayId: string;
    status: TreasuryMovementStatus;
    differenceAmount: number;
    adjustmentMoment: "opening" | "closing";
  }>;
}, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", "close_daily_cash_session_with_balances");
  }

  const { data, error } = await supabase.rpc("close_daily_cash_session_with_balances_for_current_club", {
    p_club_id: input.clubId,
    p_session_id: input.sessionId,
    p_closed_by_user_id: input.closedByUserId,
    p_notes: input.notes ?? null,
    p_balance_entries: input.balances.map((entry) => ({
      account_id: entry.accountId,
      currency_code: entry.currencyCode,
      balance_moment: entry.balanceMoment,
      expected_balance: entry.expectedBalance,
      declared_balance: entry.declaredBalance,
      difference_amount: entry.differenceAmount
    })),
    p_adjustment_entries: input.adjustments.map((entry) => ({
      account_id: entry.accountId,
      movement_type: entry.movementType,
      category_id: entry.categoryId,
      concept: entry.concept,
      currency_code: entry.currencyCode,
      amount: entry.amount,
      movement_date: entry.movementDate,
      created_by_user_id: entry.createdByUserId,
      display_id: entry.displayId,
      status: entry.status,
      difference_amount: entry.differenceAmount,
      adjustment_moment: entry.adjustmentMoment
    }))
  });

  if (error) {
    console.error("[club-scoped-rpc-failure]", {
      operation: "close_daily_cash_session_with_balances",
      clubId: input.clubId,
      sessionId: input.sessionId,
      closedByUserId: input.closedByUserId,
      error
    });
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", "close_daily_cash_session_with_balances", {
      cause: error
    });
  }

  const row = (((data ?? []) as Array<{
    id: string;
    club_id: string;
    session_date: string;
    status: DailyCashSession["status"] | null;
    opened_at: string;
    closed_at: string | null;
    opened_by_user_id: string;
    closed_by_user_id: string | null;
  }>)[0] ?? null);

  return row ? mapDailyCashSessionRow(row) : null;
}

async function autoCloseRealStaleDailyCashSessionWithBalances(input: {
  clubId: string;
  beforeDate: string;
  expectedSessionId: string | null;
  closedByUserId: string;
  balances: Array<{
    accountId: string;
    currencyCode: string;
    balanceMoment: "opening" | "closing";
    expectedBalance: number;
    declaredBalance: number;
    differenceAmount: number;
  }>;
}, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    throw new AccessRepositoryInfraError(
      "club_scoped_rpc_failed",
      "auto_close_stale_daily_cash_session_with_balances"
    );
  }

  const { data, error } = await supabase.rpc(
    "auto_close_stale_daily_cash_session_with_balances_for_current_club",
    {
      p_club_id: input.clubId,
      p_before_date: input.beforeDate,
      p_expected_session_id: input.expectedSessionId,
      p_closed_by_user_id: input.closedByUserId,
      p_balance_entries: input.balances.map((entry) => ({
        account_id: entry.accountId,
        currency_code: entry.currencyCode,
        balance_moment: entry.balanceMoment,
        expected_balance: entry.expectedBalance,
        declared_balance: entry.declaredBalance,
        difference_amount: entry.differenceAmount
      }))
    }
  );

  if (error) {
    logClubScopedRpcFailure(
      "auto_close_stale_daily_cash_session_with_balances",
      {
        clubId: input.clubId,
        beforeDate: input.beforeDate,
        expectedSessionId: input.expectedSessionId,
        closedByUserId: input.closedByUserId
      },
      error,
      { suppressKnownMissingStaleSessionRpc: true }
    );
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", "auto_close_stale_daily_cash_session_with_balances", {
      cause: error
    });
  }

  const row = (((data ?? []) as Array<{
    id: string;
    club_id: string;
    session_date: string;
    status: DailyCashSession["status"] | null;
    opened_at: string;
    closed_at: string | null;
    opened_by_user_id: string;
    closed_by_user_id: string | null;
  }>)[0] ?? null);

  return row ? mapDailyCashSessionRow(row) : null;
}

async function recordRealDailyCashSessionBalances(
  clubId: string,
  input: Array<{
    sessionId: string;
    accountId: string;
    currencyCode: string;
    balanceMoment: "opening" | "closing";
    expectedBalance: number;
    declaredBalance: number;
    differenceAmount: number;
  }>,
  client?: AccessRepositoryClient
) {
  if (input.length === 0) {
    return;
  }

  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", "record_daily_cash_session_balances");
  }

  const { error } = await supabase.rpc("record_daily_cash_session_balances_for_current_club", {
    p_club_id: clubId,
    p_entries: input.map((entry) => ({
      session_id: entry.sessionId,
      account_id: entry.accountId,
      currency_code: entry.currencyCode,
      balance_moment: entry.balanceMoment,
      expected_balance: entry.expectedBalance,
      declared_balance: entry.declaredBalance,
      difference_amount: entry.differenceAmount
    }))
  });

  if (error) {
    console.error("[club-scoped-rpc-failure]", {
      operation: "record_daily_cash_session_balances",
      clubId,
      sessionIds: [...new Set(input.map((entry) => entry.sessionId))],
      error
    });
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", "record_daily_cash_session_balances", {
      cause: error
    });
  }
}

async function recordRealBalanceAdjustment(
  input: {
    clubId: string;
    sessionId: string;
    movementId: string;
    accountId: string;
    differenceAmount: number;
    adjustmentMoment: "opening" | "closing";
  },
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", "record_balance_adjustment");
  }

  const { error } = await supabase.rpc("record_balance_adjustment_for_current_club", {
    p_club_id: input.clubId,
    p_session_id: input.sessionId,
    p_movement_id: input.movementId,
    p_account_id: input.accountId,
    p_difference_amount: input.differenceAmount,
    p_adjustment_moment: input.adjustmentMoment
  });

  if (error) {
    console.error("[club-scoped-rpc-failure]", {
      operation: "record_balance_adjustment",
      clubId: input.clubId,
      sessionId: input.sessionId,
      movementId: input.movementId,
      error
    });
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", "record_balance_adjustment", {
      cause: error
    });
  }
}

async function listRealMovementTypeConfigForClub(clubId: string, client?: AccessRepositoryClient) {
  const rows = await runClubScopedReadRpc<
    Array<{
      club_id: string;
      movement_type: TreasuryMovementType;
      is_enabled: boolean | null;
    }>
  >("get_movement_type_config_for_current_club", clubId, client);

  return rows.map(mapMovementTypeConfigRow);
}

async function listRealTreasuryMovementsByAccount(
  clubId: string,
  accountId: string,
  movementDate: string,
  client?: AccessRepositoryClient
) {
  return listRealTreasuryMovementsByAccountInternal(clubId, accountId, movementDate, client, false);
}

async function listRealTreasuryMovementsByAccountStrict(
  clubId: string,
  accountId: string,
  movementDate: string,
  client?: AccessRepositoryClient
) {
  return listRealTreasuryMovementsByAccountInternal(clubId, accountId, movementDate, client, true);
}

async function listRealTreasuryMovementsByAccountInternal(
  clubId: string,
  accountId: string,
  movementDate: string,
  client: AccessRepositoryClient | undefined,
  strict: boolean
) {
  const rows = await runClubScopedReadRpc<TreasuryMovementRow[]>(
    "get_treasury_movements_by_account_and_date_for_current_club",
    clubId,
    client,
    {
      operation: "list_treasury_movements_by_account",
      details: { accountId, movementDate },
      strict,
      params: {
        p_account_id: accountId,
        p_movement_date: movementDate
      }
    }
  );

  return rows.map(mapTreasuryMovementRow);
}

async function listRealTreasuryMovementsHistoryByAccount(
  clubId: string,
  accountId: string,
  client?: AccessRepositoryClient
) {
  const rows = await runClubScopedReadRpc<TreasuryMovementRow[]>(
    "get_treasury_movements_history_by_account_for_current_club",
    clubId,
    client,
    {
      operation: "list_treasury_movements_history_by_account",
      details: { accountId },
      params: {
        p_account_id: accountId
      }
    }
  );

  return rows.map(mapTreasuryMovementRow);
}

async function listRealTreasuryMovementsHistoryByAccounts(
  clubId: string,
  accountIds: string[],
  client?: AccessRepositoryClient
) {
  if (accountIds.length === 0) {
    return [];
  }

  const rows = await runClubScopedReadRpc<TreasuryMovementRow[]>(
    "get_treasury_movements_history_by_accounts_for_current_club",
    clubId,
    client,
    {
      operation: "list_treasury_movements_history_by_accounts",
      details: { accountIdsCount: accountIds.length },
      strict: true,
      params: {
        p_account_ids: accountIds
      }
    }
  );

  return rows.map(mapTreasuryMovementRow);
}

async function listRealTreasuryMovementsByDate(
  clubId: string,
  movementDate: string,
  client?: AccessRepositoryClient
) {
  return listRealTreasuryMovementsByDateInternal(clubId, movementDate, client, false);
}

async function listRealTreasuryMovementsByDateStrict(
  clubId: string,
  movementDate: string,
  client?: AccessRepositoryClient
) {
  return listRealTreasuryMovementsByDateInternal(clubId, movementDate, client, true);
}

async function listRealTreasuryMovementsByDateInternal(
  clubId: string,
  movementDate: string,
  client: AccessRepositoryClient | undefined,
  strict: boolean
) {
  const rows = await runClubScopedReadRpc<TreasuryMovementRow[]>(
    "get_treasury_movements_by_date_for_current_club",
    clubId,
    client,
    {
      operation: "list_treasury_movements_by_date",
      details: { movementDate },
      strict,
      params: {
        p_movement_date: movementDate
      }
    }
  );

  return rows.map(mapTreasuryMovementRow);
}

async function findRealTreasuryMovementById(
  clubId: string,
  movementId: string,
  client?: AccessRepositoryClient
) {
  const row = await runClubScopedMutationRpc<TreasuryMovementRow>(
    "get_treasury_movement_by_id_for_current_club",
    clubId,
    client,
    {
      operation: "find_treasury_movement_by_id",
      details: { movementId },
      params: {
        p_movement_id: movementId
      }
    }
  );

  return row ? mapTreasuryMovementRow(row) : null;
}

async function updateRealTreasuryMovement(
  input: {
    movementId: string;
    clubId: string;
    movementDate?: string;
    accountId: string;
    movementType: TreasuryMovementType;
    categoryId?: string | null;
    concept: string;
    currencyCode: string;
    amount: number;
    activityId?: string | null;
    receiptNumber?: string | null;
    calendarEventId?: string | null;
    status?: TreasuryMovementStatus;
    consolidationBatchId?: string | null;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const operation = "update_treasury_movement";
  const details = { movementId: input.movementId, accountId: input.accountId };
  const baseParams = {
    p_club_id: input.clubId,
    p_movement_id: input.movementId,
    p_account_id: input.accountId,
    p_movement_type: input.movementType,
    p_category_id: normalizeNullableUuidParam(input.categoryId),
    p_concept: input.concept,
    p_currency_code: input.currencyCode,
    p_amount: input.amount,
    p_activity_id: normalizeNullableUuidParam(input.activityId),
    p_receipt_number: input.receiptNumber ?? null,
    p_calendar_event_id: normalizeNullableUuidParam(input.calendarEventId),
    p_status: input.status ?? null,
    p_consolidation_batch_id: normalizeNullableUuidParam(input.consolidationBatchId)
  };

  const { data, error } = await supabase.rpc("update_treasury_movement_for_current_club", {
    ...baseParams,
    p_movement_date: input.movementDate ?? null
  });

  if (error && isLegacyUpdateTreasuryMovementRpcCause(error)) {
    console.warn("[club-scoped-rpc-fallback]", {
      operation,
      clubId: input.clubId,
      ...details,
      fallback: "retry_without_movement_date",
      error
    });

    const { data: legacyData, error: legacyError } = await supabase.rpc(
      "update_treasury_movement_for_current_club",
      baseParams
    );

    if (legacyError) {
      logClubScopedRpcFailure(operation, { clubId: input.clubId, ...details, fallback: "legacy_signature" }, legacyError);
      throw new AccessRepositoryInfraError("club_scoped_rpc_failed", operation, {
        cause: legacyError
      });
    }

    const legacyRow = Array.isArray(legacyData)
      ? ((legacyData[0] as TreasuryMovementRow | undefined) ?? null)
      : ((legacyData as TreasuryMovementRow | null) ?? null);

    return legacyRow ? mapTreasuryMovementRow(legacyRow) : null;
  }

  if (error) {
    logClubScopedRpcFailure(operation, { clubId: input.clubId, ...details }, error);
    throw new AccessRepositoryInfraError("club_scoped_rpc_failed", operation, {
      cause: error
    });
  }

  const row = Array.isArray(data)
    ? ((data[0] as TreasuryMovementRow | undefined) ?? null)
    : ((data as TreasuryMovementRow | null) ?? null);

  return row ? mapTreasuryMovementRow(row) : null;
}

async function getRealDailyConsolidationBatchByDate(
  clubId: string,
  consolidationDate: string,
  client?: AccessRepositoryClient
) {
  const rows = await runClubScopedReadRpc<DailyConsolidationBatchRow[]>(
    "get_daily_consolidation_batch_by_date_for_current_club",
    clubId,
    client,
    {
      operation: "get_daily_consolidation_batch_by_date",
      details: { consolidationDate },
      strict: true,
      params: {
        p_consolidation_date: consolidationDate
      }
    }
  );

  return rows[0] ? mapDailyConsolidationBatchRow(rows[0]) : null;
}

async function createRealDailyConsolidationBatch(
  input: {
    clubId: string;
    consolidationDate: string;
    status: DailyConsolidationBatch["status"];
    executedByUserId: string;
  },
  client?: AccessRepositoryClient
) {
  const row = await runClubScopedMutationRpc<DailyConsolidationBatchRow>(
    "create_daily_consolidation_batch_for_current_club",
    input.clubId,
    client,
    {
      operation: "create_daily_consolidation_batch",
      details: { consolidationDate: input.consolidationDate },
      strict: true,
      params: {
        p_consolidation_date: input.consolidationDate,
        p_status: input.status,
        p_executed_by_user_id: input.executedByUserId
      }
    }
  );

  return row ? mapDailyConsolidationBatchRow(row) : null;
}

async function updateRealDailyConsolidationBatch(
  input: {
    clubId?: string;
    batchId: string;
    status: DailyConsolidationBatch["status"];
    errorMessage?: string | null;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const clubId = input.clubId?.trim();

  if (!clubId) {
    console.error("[daily-consolidation-batch-write-failure]", {
      operation: "update_daily_consolidation_batch",
      batchId: input.batchId,
      status: input.status,
      error: "missing_club_id"
    });
    return null;
  }

  const row = await runClubScopedMutationRpc<DailyConsolidationBatchRow>(
    "update_daily_consolidation_batch_for_current_club",
    clubId,
    client,
    {
      operation: "update_daily_consolidation_batch",
      details: { batchId: input.batchId, status: input.status },
      strict: true,
      params: {
        p_batch_id: input.batchId,
        p_status: input.status,
        p_error_message: input.errorMessage ?? null
      }
    }
  );

  return row ? mapDailyConsolidationBatchRow(row) : null;
}

async function listRealMovementAuditLogsByMovementId(
  input: {
    clubId: string;
    movementId: string;
  },
  client?: AccessRepositoryClient
) {
  const rows = await runClubScopedReadRpc<MovementAuditLogRow[]>(
    "get_movement_audit_logs_by_movement_id_for_current_club",
    input.clubId,
    client,
    {
      operation: "list_movement_audit_logs_by_movement_id",
      details: { movementId: input.movementId },
      strict: true,
      params: {
        p_movement_id: input.movementId
      }
    }
  );

  return rows.map((row) => mapMovementAuditLogRow(row));
}

async function createRealMovementAuditLog(
  input: {
    clubId: string;
    movementId: string;
    actionType: MovementAuditLog["actionType"];
    payloadBefore: Record<string, unknown> | null;
    payloadAfter: Record<string, unknown> | null;
    performedByUserId: string;
  },
  client?: AccessRepositoryClient
) {
  const row = await runClubScopedMutationRpc<MovementAuditLogRow>(
    "create_movement_audit_log_for_current_club",
    input.clubId,
    client,
    {
      operation: "create_movement_audit_log",
      details: { movementId: input.movementId, actionType: input.actionType },
      strict: true,
      params: {
        p_movement_id: input.movementId,
        p_action_type: input.actionType,
        p_payload_before: input.payloadBefore,
        p_payload_after: input.payloadAfter,
        p_performed_by_user_id: input.performedByUserId
      }
    }
  );

  return row ? mapMovementAuditLogRow(row) : null;
}

async function createRealTreasuryMovement(
  input: {
    clubId: string;
    dailyCashSessionId: string | null;
    displayId: string;
    originRole: TreasuryMovementOriginRole;
    originSource: TreasuryMovementOriginSource;
    accountId: string;
    movementType: TreasuryMovementType;
    categoryId: string | null;
    concept: string;
    currencyCode: string;
    amount: number;
    activityId?: string | null;
    receiptNumber?: string | null;
    calendarEventId?: string | null;
    transferGroupId?: string | null;
    fxOperationGroupId?: string | null;
    consolidationBatchId?: string | null;
    movementDate: string;
    createdByUserId: string;
    status?: TreasuryMovementStatus;
  },
  client?: AccessRepositoryClient
) {
  const row = await runClubScopedMutationRpc<TreasuryMovementRow>(
    "create_treasury_movement_for_current_club",
    input.clubId,
    client,
    {
      operation: "create_treasury_movement",
      details: { accountId: input.accountId, movementDate: input.movementDate },
      params: {
        p_daily_cash_session_id: normalizeNullableUuidParam(input.dailyCashSessionId),
        p_display_id: input.displayId,
        p_origin_role: input.originRole,
        p_origin_source: input.originSource,
        p_account_id: input.accountId,
        p_movement_type: input.movementType,
        p_category_id: normalizeNullableUuidParam(input.categoryId),
        p_concept: input.concept,
        p_currency_code: input.currencyCode,
        p_amount: input.amount,
        p_activity_id: normalizeNullableUuidParam(input.activityId),
        p_receipt_number: input.receiptNumber ?? null,
        p_calendar_event_id: normalizeNullableUuidParam(input.calendarEventId),
        p_transfer_group_id: normalizeNullableUuidParam(input.transferGroupId),
        p_fx_operation_group_id: normalizeNullableUuidParam(input.fxOperationGroupId),
        p_consolidation_batch_id: normalizeNullableUuidParam(input.consolidationBatchId),
        p_movement_date: input.movementDate,
        p_created_by_user_id: input.createdByUserId,
        p_status: input.status ?? "pending_consolidation"
      }
    }
  );

  return row ? mapTreasuryMovementRow(row) : null;
}

async function createRealAccountTransfer(
  input: {
    clubId: string;
    dailyCashSessionId: string | null;
    sourceAccountId: string;
    targetAccountId: string;
    currencyCode: string;
    amount: number;
    concept: string;
    sourceMovementDisplayId: string;
    targetMovementDisplayId: string;
    movementDate: string;
    createdByUserId: string;
    originRole: TreasuryMovementOriginRole;
  },
  client?: AccessRepositoryClient
) {
  const row = await runClubScopedMutationRpc<AccountTransferMutationRow>(
    "create_account_transfer_for_current_club",
    input.clubId,
    client,
    {
      operation: "create_account_transfer",
      details: {
        sourceAccountId: input.sourceAccountId,
        targetAccountId: input.targetAccountId,
        movementDate: input.movementDate,
        originRole: input.originRole
      },
      params: {
        p_daily_cash_session_id: input.dailyCashSessionId,
        p_source_account_id: input.sourceAccountId,
        p_target_account_id: input.targetAccountId,
        p_currency_code: input.currencyCode,
        p_amount: input.amount,
        p_concept: input.concept,
        p_source_movement_display_id: input.sourceMovementDisplayId,
        p_target_movement_display_id: input.targetMovementDisplayId,
        p_movement_date: input.movementDate,
        p_created_by_user_id: input.createdByUserId,
        p_origin_role: input.originRole
      }
    }
  );

  return row ? mapAccountTransferMutationRow(row) : null;
}

async function createRealFxOperation(
  input: {
    clubId: string;
    sourceAccountId: string;
    targetAccountId: string;
    sourceCurrencyCode: string;
    targetCurrencyCode: string;
    sourceAmount: number;
    targetAmount: number;
    concept: string;
  },
  client?: AccessRepositoryClient
) {
  const row = await runClubScopedMutationRpc<FxOperationInsertRow>(
    "create_fx_operation_for_current_club",
    input.clubId,
    client,
    {
      operation: "create_fx_operation",
      details: {
        sourceAccountId: input.sourceAccountId,
        targetAccountId: input.targetAccountId
      },
      params: {
        p_source_account_id: input.sourceAccountId,
        p_target_account_id: input.targetAccountId,
        p_source_amount: input.sourceAmount,
        p_target_amount: input.targetAmount
      }
    }
  );

  if (!row) {
    return null;
  }

  return mapFxOperationInsertRow(row, {
    sourceCurrencyCode: input.sourceCurrencyCode,
    targetCurrencyCode: input.targetCurrencyCode,
    concept: input.concept
  });
}

async function countRealTreasuryMovementsByClubAndYear(
  clubId: string,
  year: string,
  client?: AccessRepositoryClient
) {
  const row = await runClubScopedMutationRpc<{ total: number | string }>(
    "count_treasury_movements_by_year_for_current_club",
    clubId,
    client,
    {
      operation: "count_treasury_movements_by_year",
      details: { year },
      params: {
        p_year: year
      }
    }
  );

  return Number(row?.total ?? 0);
}

async function runClubScopedReadRpc<T>(
  rpcName: string,
  clubId: string,
  client?: AccessRepositoryClient,
  options?: {
    operation?: string;
    details?: Record<string, unknown>;
    strict?: boolean;
    params?: Record<string, unknown>;
    suppressLog?: boolean;
  }
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    if (options?.strict) {
      throw new AccessRepositoryInfraError("club_scoped_rpc_failed", options?.operation ?? rpcName);
    }

    return [] as unknown as T;
  }

  const { data, error } = await supabase.rpc(rpcName, {
    p_club_id: clubId,
    ...(options?.params ?? {})
  });

  if (error || !data) {
    if (!options?.suppressLog) {
      console.error("[club-scoped-rpc-read-failure]", {
        operation: options?.operation ?? rpcName,
        rpcName,
        clubId,
        ...(options?.details ?? {}),
        errorCode: getSupabaseErrorCode(error),
        missingRpcName: getMissingClubScopedRpcName(error, rpcName),
        error
      });
    }

    if (options?.strict) {
      throw new AccessRepositoryInfraError("club_scoped_rpc_failed", options?.operation ?? rpcName, {
        cause: error
      });
    }

    return [] as unknown as T;
  }

  return data as T;
}

async function runClubScopedMutationRpc<T>(
  rpcName: string,
  clubId: string,
  client?: AccessRepositoryClient,
  options?: {
    operation?: string;
    details?: Record<string, unknown>;
    params?: Record<string, unknown>;
    expectResult?: boolean;
    strict?: boolean;
  }
): Promise<T | null> {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    if (options?.strict) {
      throw new AccessRepositoryInfraError("club_scoped_rpc_failed", options?.operation ?? rpcName);
    }

    return null;
  }

  const { data, error } = await supabase.rpc(rpcName, {
    p_club_id: clubId,
    ...(options?.params ?? {})
  });

  if (error) {
    logClubScopedRpcFailure(options?.operation ?? rpcName, { clubId, rpcName, ...(options?.details ?? {}) }, error);

    if (options?.strict) {
      throw new AccessRepositoryInfraError("club_scoped_rpc_failed", options?.operation ?? rpcName, {
        cause: error
      });
    }

    return null;
  }

  if (options?.expectResult === false) {
    return null;
  }

  if (Array.isArray(data)) {
    return ((data[0] as T | undefined) ?? null);
  }

  return (data as T | null) ?? null;
}

async function syncRealTreasuryCurrenciesToAccounts(
  clubId: string,
  currencies: Array<{
    currencyCode: TreasuryCurrencyCode;
    isPrimary: boolean;
  }>,
  client?: AccessRepositoryClient
) {
  const supabase = createRequiredTreasurySettingsAdminClient("sync_treasury_currencies_to_accounts", {
    clubId
  });

  const { data: accounts, error: accountsError } = await supabase
    .from("treasury_accounts")
    .select("id,treasury_account_currencies(currency_code)")
    .eq("club_id", clubId);

  if (accountsError || !accounts) {
    throwTreasurySettingsWriteFailure(
      "sync_treasury_currencies_to_accounts",
      { clubId },
      accountsError
    );
  }

  if (accounts.length === 0) {
    return;
  }
  const allowedCurrencies = currencies.map((currency) => currency.currencyCode);
  const fallbackCurrencyCode =
    currencies.find((currency) => currency.isPrimary)?.currencyCode ?? allowedCurrencies[0];

  for (const account of accounts as Array<{
    id: string;
    treasury_account_currencies?: Array<{ currency_code: TreasuryCurrencyCode }>;
  }>) {
    const { error: deleteError } = await supabase
      .from("treasury_account_currencies")
      .delete()
      .eq("account_id", account.id);

    if (deleteError) {
      throwTreasurySettingsWriteFailure(
        "sync_treasury_currencies_to_accounts",
        { clubId, accountId: account.id },
        deleteError
      );
    }

    if (!fallbackCurrencyCode) {
      continue;
    }

    const nextCurrencies = alignAccountCurrenciesWithClubSelection(
      (account.treasury_account_currencies ?? []).map((currency) => currency.currency_code),
      allowedCurrencies,
      fallbackCurrencyCode
    );

    const { error: insertError } = await supabase.from("treasury_account_currencies").insert(
      nextCurrencies.map((currencyCode) => ({
        account_id: account.id,
        currency_code: currencyCode
      }))
    );

    if (insertError) {
      throwTreasurySettingsWriteFailure(
        "sync_treasury_currencies_to_accounts",
        { clubId, accountId: account.id },
        insertError
      );
    }
  }
}

async function setRealTreasuryCurrenciesForClub(
  input: {
    clubId: string;
    currencies: Array<{
      currencyCode: TreasuryCurrencyCode;
      isPrimary: boolean;
    }>;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createRequiredTreasurySettingsAdminClient("set_treasury_currencies_for_club", {
    clubId: input.clubId
  });

  const { error: deleteError } = await supabase
    .from("club_treasury_currencies")
    .delete()
    .eq("club_id", input.clubId);

  if (deleteError) {
    throwTreasurySettingsWriteFailure(
      "set_treasury_currencies_for_club",
      { clubId: input.clubId },
      deleteError
    );
  }

  const { error } = await supabase.from("club_treasury_currencies").insert(
    input.currencies.map((currency) => ({
      club_id: input.clubId,
      currency_code: currency.currencyCode,
      is_primary: currency.isPrimary
    }))
  );

  if (error) {
    throwTreasurySettingsWriteFailure(
      "set_treasury_currencies_for_club",
      { clubId: input.clubId },
      error
    );
  }

  await syncRealTreasuryCurrenciesToAccounts(
    input.clubId,
    input.currencies,
    client
  );

  return listRealTreasuryCurrenciesForClub(input.clubId, client);
}

async function setRealMovementTypeConfigForClub(
  input: {
    clubId: string;
    movementTypes: Array<{
      movementType: TreasuryMovementType;
      isEnabled: boolean;
    }>;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createRequiredTreasurySettingsAdminClient("set_movement_type_config_for_club", {
    clubId: input.clubId
  });

  const { error: deleteError } = await supabase
    .from("club_movement_type_config")
    .delete()
    .eq("club_id", input.clubId);

  if (deleteError) {
    throwTreasurySettingsWriteFailure(
      "set_movement_type_config_for_club",
      { clubId: input.clubId },
      deleteError
    );
  }

  const { error } = await supabase.from("club_movement_type_config").insert(
    input.movementTypes.map((movementType) => ({
      club_id: input.clubId,
      movement_type: movementType.movementType,
      is_enabled: movementType.isEnabled
    }))
  );

  if (error) {
    throwTreasurySettingsWriteFailure(
      "set_movement_type_config_for_club",
      { clubId: input.clubId },
      error
    );
  }

  return listRealMovementTypeConfigForClub(input.clubId, client);
}

async function createRealTreasuryAccount(
  input: {
    clubId: string;
    name: string;
    accountType: TreasuryAccount["accountType"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
    currencies: Array<{ currencyCode: TreasuryCurrencyCode; initialBalance: number }>;
    bankEntity: string | null;
    bankAccountSubtype: TreasuryAccount["bankAccountSubtype"];
    accountNumber: string | null;
    cbuCvu: string | null;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createRequiredTreasurySettingsAdminClient("create_treasury_account", {
    clubId: input.clubId
  });

  const { data, error } = await supabase
    .from("treasury_accounts")
    .insert({
      club_id: input.clubId,
      name: input.name,
      account_type: input.accountType,
      account_scope: resolveLegacyAccountScope(input),
      status: "active",
      visible_for_secretaria: input.visibleForSecretaria,
      visible_for_tesoreria: input.visibleForTesoreria,
      emoji: input.emoji,
      bank_entity: input.bankEntity,
      bank_account_subtype: input.bankAccountSubtype,
      account_number: input.accountNumber,
      cbu_cvu: input.cbuCvu
    })
    .select(
      "id,club_id,name,account_type,account_scope,status,visible_for_secretaria,visible_for_tesoreria,emoji,bank_entity,bank_account_subtype,account_number,cbu_cvu"
    )
    .single();

  if (error || !data) {
    throwTreasurySettingsWriteFailure("create_treasury_account", { clubId: input.clubId }, error);
  }

  if (input.currencies.length > 0) {
    const { error: currenciesError } = await supabase.from("treasury_account_currencies").insert(
      input.currencies.map((currency) => ({
        account_id: data.id,
        currency_code: currency.currencyCode,
        initial_balance: currency.initialBalance
      }))
    );

    if (currenciesError) {
      throwTreasurySettingsWriteFailure(
        "create_treasury_account",
        { clubId: input.clubId, accountId: data.id },
        currenciesError
      );
    }
  }

  return mapTreasuryAccountRow(data, input.currencies);
}

async function updateRealTreasuryAccount(
  input: {
    accountId: string;
    clubId: string;
    name: string;
    accountType: TreasuryAccount["accountType"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
    currencies: Array<{ currencyCode: TreasuryCurrencyCode; initialBalance: number }>;
    bankEntity: string | null;
    bankAccountSubtype: TreasuryAccount["bankAccountSubtype"];
    accountNumber: string | null;
    cbuCvu: string | null;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createRequiredTreasurySettingsAdminClient("update_treasury_account", {
    clubId: input.clubId,
    accountId: input.accountId
  });

  const { data, error } = await supabase
    .from("treasury_accounts")
    .update({
      name: input.name,
      account_type: input.accountType,
      account_scope: resolveLegacyAccountScope(input),
      status: "active",
      visible_for_secretaria: input.visibleForSecretaria,
      visible_for_tesoreria: input.visibleForTesoreria,
      emoji: input.emoji,
      bank_entity: input.bankEntity,
      bank_account_subtype: input.bankAccountSubtype,
      account_number: input.accountNumber,
      cbu_cvu: input.cbuCvu
    })
    .eq("id", input.accountId)
    .eq("club_id", input.clubId)
    .select(
      "id,club_id,name,account_type,account_scope,status,visible_for_secretaria,visible_for_tesoreria,emoji,bank_entity,bank_account_subtype,account_number,cbu_cvu"
    )
    .maybeSingle();

  if (error || !data) {
    throwTreasurySettingsWriteFailure(
      "update_treasury_account",
      { clubId: input.clubId, accountId: input.accountId },
      error
    );
  }

  const { error: deleteCurrenciesError } = await supabase
    .from("treasury_account_currencies")
    .delete()
    .eq("account_id", input.accountId);

  if (deleteCurrenciesError) {
    throwTreasurySettingsWriteFailure(
      "update_treasury_account",
      { clubId: input.clubId, accountId: input.accountId },
      deleteCurrenciesError
    );
  }

  if (input.currencies.length > 0) {
    const { error: currenciesError } = await supabase.from("treasury_account_currencies").insert(
      input.currencies.map((currency) => ({
        account_id: input.accountId,
        currency_code: currency.currencyCode,
        initial_balance: currency.initialBalance
      }))
    );

    if (currenciesError) {
      throwTreasurySettingsWriteFailure(
        "update_treasury_account",
        { clubId: input.clubId, accountId: input.accountId },
        currenciesError
      );
    }
  }

  return mapTreasuryAccountRow(data, input.currencies);
}

async function createRealTreasuryCategory(
  input: {
    clubId: string;
    subCategoryName: string;
    description: string;
    parentCategory: string;
    movementType: TreasuryCategoryMovementType;
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
    isSystem?: boolean;
    isLegacy?: boolean;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createRequiredTreasurySettingsAdminClient("create_treasury_category", {
    clubId: input.clubId
  });

  const { data, error } = await supabase
    .from("treasury_categories")
    .insert({
      club_id: input.clubId,
      name: input.subCategoryName,
      sub_category_name: input.subCategoryName,
      description: input.description,
      parent_category: input.parentCategory,
      movement_type: input.movementType,
      status: "active",
      visible_for_secretaria: input.visibleForSecretaria,
      visible_for_tesoreria: input.visibleForTesoreria,
      emoji: input.emoji,
      is_system: input.isSystem ?? false,
      is_legacy: input.isLegacy ?? false
    })
    .select("id,club_id,name,sub_category_name,description,parent_category,movement_type,status,visible_for_secretaria,visible_for_tesoreria,emoji,is_system,is_legacy")
    .single();

  if (error || !data) {
    throwTreasurySettingsWriteFailure("create_treasury_category", { clubId: input.clubId }, error);
  }

  return mapTreasuryCategoryRow(data);
}

async function updateRealTreasuryCategory(
  input: {
    categoryId: string;
    clubId: string;
    subCategoryName: string;
    description: string;
    parentCategory: string;
    movementType: TreasuryCategoryMovementType;
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
    isSystem?: boolean;
    isLegacy?: boolean;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createRequiredTreasurySettingsAdminClient("update_treasury_category", {
    clubId: input.clubId,
    categoryId: input.categoryId
  });

  const { data, error } = await supabase
    .from("treasury_categories")
    .update({
      name: input.subCategoryName,
      sub_category_name: input.subCategoryName,
      description: input.description,
      parent_category: input.parentCategory,
      movement_type: input.movementType,
      status: "active",
      visible_for_secretaria: input.visibleForSecretaria,
      visible_for_tesoreria: input.visibleForTesoreria,
      emoji: input.emoji,
      is_system: input.isSystem ?? false,
      is_legacy: input.isLegacy ?? false
    })
    .eq("id", input.categoryId)
    .eq("club_id", input.clubId)
    .select("id,club_id,name,sub_category_name,description,parent_category,movement_type,status,visible_for_secretaria,visible_for_tesoreria,emoji,is_system,is_legacy")
    .maybeSingle();

  if (error || !data) {
    throwTreasurySettingsWriteFailure(
      "update_treasury_category",
      { clubId: input.clubId, categoryId: input.categoryId },
      error
    );
  }

  return mapTreasuryCategoryRow(data);
}

async function createRealClubActivity(
  input: {
    clubId: string;
    name: string;
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createRequiredTreasurySettingsAdminClient("create_club_activity", {
    clubId: input.clubId
  });

  const { data, error } = await supabase
    .from("club_activities")
    .insert({
      club_id: input.clubId,
      name: input.name,
      status: "active",
      visible_for_secretaria: input.visibleForSecretaria,
      visible_for_tesoreria: input.visibleForTesoreria,
      emoji: input.emoji
    })
    .select("id,club_id,name,visible_for_secretaria,visible_for_tesoreria,emoji")
    .single();

  if (error || !data) {
    throwTreasurySettingsWriteFailure("create_club_activity", { clubId: input.clubId }, error);
  }

  return mapClubActivityRow(data);
}

async function updateRealClubActivity(
  input: {
    activityId: string;
    clubId: string;
    name: string;
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createRequiredTreasurySettingsAdminClient("update_club_activity", {
    clubId: input.clubId,
    activityId: input.activityId
  });

  const { data, error } = await supabase
    .from("club_activities")
    .update({
      name: input.name,
      status: "active",
      visible_for_secretaria: input.visibleForSecretaria,
      visible_for_tesoreria: input.visibleForTesoreria,
      emoji: input.emoji
    })
    .eq("id", input.activityId)
    .eq("club_id", input.clubId)
    .select("id,club_id,name,visible_for_secretaria,visible_for_tesoreria,emoji")
    .maybeSingle();

  if (error || !data) {
    throwTreasurySettingsWriteFailure(
      "update_club_activity",
      { clubId: input.clubId, activityId: input.activityId },
      error
    );
  }

  return mapClubActivityRow(data);
}

async function createRealReceiptFormat(
  input: {
    clubId: string;
    name: string;
    validationType: ReceiptFormat["validationType"];
    pattern: string | null;
    minNumericValue: number | null;
    example: string | null;
    status: ReceiptFormat["status"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createRequiredTreasurySettingsAdminClient("create_receipt_format", {
    clubId: input.clubId
  });

  const { data, error } = await supabase
    .from("receipt_formats")
    .insert({
      club_id: input.clubId,
      name: input.name,
      validation_type: input.validationType,
      pattern: input.pattern,
      min_numeric_value: input.minNumericValue,
      example: input.example,
      status: input.status,
      visible_for_secretaria: input.visibleForSecretaria,
      visible_for_tesoreria: input.visibleForTesoreria
    })
    .select("id,club_id,name,validation_type,pattern,min_numeric_value,example,status,visible_for_secretaria,visible_for_tesoreria")
    .single();

  if (error || !data) {
    throwTreasurySettingsWriteFailure("create_receipt_format", { clubId: input.clubId }, error);
  }

  return mapReceiptFormatRow(data);
}

async function updateRealReceiptFormat(
  input: {
    receiptFormatId: string;
    clubId: string;
    name: string;
    validationType: ReceiptFormat["validationType"];
    pattern: string | null;
    minNumericValue: number | null;
    example: string | null;
    status: ReceiptFormat["status"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createRequiredTreasurySettingsAdminClient("update_receipt_format", {
    clubId: input.clubId,
    receiptFormatId: input.receiptFormatId
  });

  const { data, error } = await supabase
    .from("receipt_formats")
    .update({
      name: input.name,
      validation_type: input.validationType,
      pattern: input.pattern,
      min_numeric_value: input.minNumericValue,
      example: input.example,
      status: input.status,
      visible_for_secretaria: input.visibleForSecretaria,
      visible_for_tesoreria: input.visibleForTesoreria
    })
    .eq("id", input.receiptFormatId)
    .eq("club_id", input.clubId)
    .select("id,club_id,name,validation_type,pattern,min_numeric_value,example,status,visible_for_secretaria,visible_for_tesoreria")
    .maybeSingle();

  if (error || !data) {
    throwTreasurySettingsWriteFailure(
      "update_receipt_format",
      { clubId: input.clubId, receiptFormatId: input.receiptFormatId },
      error
    );
  }

  return mapReceiptFormatRow(data);
}

async function setRealLastActiveClubId(userId: string, clubId: string, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return;
  }

  await supabase.from("user_club_preferences").upsert(
    {
      user_id: userId,
      last_active_club_id: clubId
    },
    {
      onConflict: "user_id"
    }
  );
}

async function createRealClubInvitation(
  clubId: string,
  email: string,
  role: MembershipRole,
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("club_invitations")
    .insert({
      club_id: clubId,
      email: normalizedEmail,
      role,
      status: "pending"
    })
    .select("id,club_id,email,role,status,expires_at,used_at,created_at")
    .single();

  if (error || !data) {
    return null;
  }

  return mapInvitationRow(data);
}

async function createRealMembership(
  userId: string,
  clubId: string,
  role: MembershipRole,
  status: Membership["status"],
  approvedByUserId?: string | null,
  client?: AccessRepositoryClient
) {
  const supabase = createAdminSupabaseClient() ?? createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const timestamp = now();

  const { data, error } = await supabase
    .from("memberships")
    .insert({
      user_id: userId,
      club_id: clubId,
      role,
      status,
      joined_at: status === "activo" ? timestamp : null,
      approved_at: status === "activo" ? timestamp : null,
      approved_by_user_id: approvedByUserId ?? null,
      updated_at: timestamp
    })
    .select("id,user_id,club_id,status,joined_at")
    .single();

  if (error || !data) {
    return null;
  }

  const roleInsert = await supabase.from("membership_roles").insert({
    membership_id: data.id,
    role
  });

  if (roleInsert.error) {
    return null;
  }

  return mapMembershipRow(data, [role]);
}

async function markRealInvitationAsUsed(invitationId: string, client?: AccessRepositoryClient) {
  const supabase = createAdminSupabaseClient() ?? createAccessSupabaseClient(client);

  if (!supabase) {
    return false;
  }

  const timestamp = now();
  const { error } = await supabase
    .from("club_invitations")
    .update({
      status: "used",
      used_at: timestamp
    })
    .eq("id", invitationId);

  return !error;
}

async function approveRealMembership(
  membershipId: string,
  role: MembershipRole,
  approvedByUserId: string,
  client?: AccessRepositoryClient
) {
  const adminSupabase = createAdminSupabaseClient();

  if (adminSupabase) {
    const timestamp = now();
    const { data, error } = await adminSupabase
      .from("memberships")
      .update({
        role,
        status: "activo",
        approved_at: timestamp,
        approved_by_user_id: approvedByUserId,
        joined_at: timestamp,
        updated_at: timestamp
      })
      .eq("id", membershipId)
      .select("id,user_id,club_id,status,joined_at")
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const deleteRolesResult = await adminSupabase
      .from("membership_roles")
      .delete()
      .eq("membership_id", membershipId);

    if (deleteRolesResult.error) {
      return null;
    }

    const roleInsert = await adminSupabase.from("membership_roles").insert({
      membership_id: membershipId,
      role
    });

    if (roleInsert.error) {
      return null;
    }

    return mapMembershipRow(data, [role]);
  }

  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("approve_membership_for_current_admin", {
    p_membership_id: membershipId,
    p_role: role
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  return mapMembershipRow(data[0], sortMembershipRoles(data[0].roles ?? [role]));
}

async function updateRealMembershipRoles(
  membershipId: string,
  roles: MembershipRole[],
  client?: AccessRepositoryClient
) {
  const adminSupabase = createAdminSupabaseClient();

  if (adminSupabase) {
    const sortedRoles = sortMembershipRoles(roles);

    const { data, error } = await adminSupabase
      .from("memberships")
      .update({
        role: sortedRoles[0],
        updated_at: now()
      })
      .eq("id", membershipId)
      .select("id,user_id,club_id,status,joined_at")
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const deleteRolesResult = await adminSupabase
      .from("membership_roles")
      .delete()
      .eq("membership_id", membershipId);

    if (deleteRolesResult.error) {
      return null;
    }

    const roleInsert = await adminSupabase.from("membership_roles").insert(
      sortedRoles.map((currentRole) => ({
        membership_id: membershipId,
        role: currentRole
      }))
    );

    if (roleInsert.error) {
      return null;
    }

    return mapMembershipRow(data, sortedRoles);
  }

  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const sortedRoles = sortMembershipRoles(roles);
  const { data, error } = await supabase.rpc("update_membership_roles_for_current_admin", {
    p_membership_id: membershipId,
    p_roles: sortedRoles
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  return mapMembershipRow(data[0], sortMembershipRoles(data[0].roles ?? sortedRoles));
}

async function removeRealMembership(membershipId: string, client?: AccessRepositoryClient) {
  const adminSupabase = createAdminSupabaseClient();

  if (adminSupabase) {
    const { error } = await adminSupabase.from("memberships").delete().eq("id", membershipId);
    return !error;
  }

  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.rpc("remove_membership_for_current_actor", {
    p_membership_id: membershipId
  });

  if (error) {
    return false;
  }

  return Boolean(data);
}

async function syncRealUserProfileFromAuthIdentity(identity: AuthIdentity, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return {
      id: identity.id,
      email: identity.email,
      fullName: identity.fullName,
      avatarUrl: identity.avatarUrl,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt
    };
  }

  const existingUser = await findRealUserById(identity.id, supabase);

  if (existingUser) {
    const { data, error } = await supabase
      .from("users")
      .update({
        email: identity.email,
        full_name: identity.fullName,
        avatar_url: identity.avatarUrl,
        updated_at: identity.updatedAt
      })
      .eq("id", identity.id)
      .select("id,email,full_name,avatar_url,created_at,updated_at")
      .single();

    if (error || !data) {
      return existingUser;
    }

    return mapUserRow(data);
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      id: identity.id,
      email: identity.email,
      full_name: identity.fullName,
      avatar_url: identity.avatarUrl,
      created_at: identity.createdAt,
      updated_at: identity.updatedAt
    })
    .select("id,email,full_name,avatar_url,created_at,updated_at")
    .single();

  if (error || !data) {
    return {
      id: identity.id,
      email: identity.email,
      fullName: identity.fullName,
      avatarUrl: identity.avatarUrl,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt
    };
  }

  return mapUserRow(data);
}

export const accessRepository: AccessRepository = {
  getGoogleProfile(profileKey) {
    return GOOGLE_PROFILES[profileKey];
  },
  async findUserByEmail(email, client) {
    if (shouldUseSupabaseDatabase()) {
      return findRealUserByEmail(email, client);
    }

    const users = Array.from(getStore().users.values());
    return users.find((user) => user.email === email) ?? null;
  },
  async createUserFromGoogleProfile(profile) {
    const store = getStore();
    const user = buildUser(profile);
    store.users.set(user.id, user);
    return user;
  },
  async updateUserFromGoogleProfile(userId, profile) {
    const store = getStore();
    const current = store.users.get(userId);

    if (!current) {
      throw new Error("User not found in mock repository");
    }

    const nextUser: User = {
      ...current,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      updatedAt: now()
    };

    store.users.set(userId, nextUser);
    return nextUser;
  },
  async findUserById(userId, client) {
    if (shouldUseSupabaseDatabase()) {
      return findRealUserById(userId, client);
    }

    return getStore().users.get(userId) ?? null;
  },
  async findUsersByIds(userIds, client) {
    if (shouldUseSupabaseDatabase()) {
      return findRealUsersByIds(userIds, client);
    }

    return userIds.flatMap((userId) => {
      const user = getStore().users.get(userId);
      return user ? [user] : [];
    });
  },
  async listMembershipsForUser(userId, client) {
    if (shouldUseSupabaseDatabase()) {
      return listRealMembershipsForUser(userId, client);
    }

    return getStore().memberships.filter((membership) => membership.userId === userId);
  },
  async listActiveMembershipsForUser(userId, client) {
    const memberships = shouldUseSupabaseDatabase()
      ? await listRealMembershipsForUser(userId, client)
      : getStore().memberships.filter((membership) => membership.userId === userId);

    return memberships.filter((membership) => membership.status === "activo");
  },
  async findClubById(clubId, client) {
    if (shouldUseSupabaseDatabase()) {
      return findRealClubById(clubId, client);
    }

    return getStore().clubs.find((club) => club.id === clubId) ?? null;
  },
  async updateClubIdentity(clubId, fields, client) {
    if (shouldUseSupabaseDatabase()) {
      return updateRealClubIdentity(clubId, fields, client);
    }

    const store = getStore();
    const index = store.clubs.findIndex((club) => club.id === clubId);

    if (index === -1) {
      return null;
    }

    const current = store.clubs[index];
    const updated: Club = {
      ...current,
      name: fields.name ?? current.name,
      cuit: fields.cuit !== undefined ? fields.cuit : current.cuit,
      tipo: fields.tipo !== undefined ? fields.tipo : current.tipo,
      logoUrl: fields.logoUrl !== undefined ? fields.logoUrl : current.logoUrl,
      colorPrimary: fields.colorPrimary !== undefined ? fields.colorPrimary : current.colorPrimary,
      colorSecondary:
        fields.colorSecondary !== undefined ? fields.colorSecondary : current.colorSecondary
    };

    store.clubs[index] = updated;
    return updated;
  },
  async listClubMembers(clubId, client) {
    if (shouldUseSupabaseDatabase()) {
      return listRealClubMembers(clubId, client);
    }

    const store = getStore();

    return store.memberships
      .filter((membership) => membership.clubId === clubId)
      .map((membership) => {
        const user = store.users.get(membership.userId);

        if (!user) {
          return null;
        }

        return mapClubMemberFromMembership(membership, user);
      })
      .filter((member): member is ClubMember => Boolean(member));
  },
  async listPendingInvitationsForClub(clubId, client) {
    if (shouldUseSupabaseDatabase()) {
      return listRealPendingInvitationsForClub(clubId, client);
    }

    return getStore().invitations
      .filter((invitation) => {
        if (invitation.clubId !== clubId || invitation.status !== "pending" || invitation.usedAt) {
          return false;
        }

        if (!invitation.expiresAt) {
          return true;
        }

        return new Date(invitation.expiresAt).getTime() > Date.now();
      })
      .map((invitation) => ({
        invitationId: invitation.id,
        clubId: invitation.clubId,
        email: invitation.email,
        role: invitation.role,
        status: "pendiente_aprobacion" as const,
        createdAt: invitation.createdAt
      }));
  },
  async listPendingInvitationsByEmail(email, client) {
    if (shouldUseSupabaseDatabase()) {
      return listRealPendingInvitationsByEmail(email, client);
    }

    const normalizedEmail = email.trim().toLowerCase();

    return getStore().invitations.filter((invitation) => {
      if (invitation.email !== normalizedEmail || invitation.status !== "pending" || invitation.usedAt) {
        return false;
      }

      if (!invitation.expiresAt) {
        return true;
      }

      return new Date(invitation.expiresAt).getTime() > Date.now();
    });
  },
  async listTreasuryAccountsForClub(clubId) {
    if (shouldUseSupabaseDatabase()) {
      return listRealTreasuryAccountsForClub(clubId);
    }

    return getStore().treasuryAccounts.filter((account) => account.clubId === clubId);
  },
  async listTreasuryCategoriesForClub(clubId) {
    if (shouldUseSupabaseDatabase()) {
      return listRealTreasuryCategoriesForClub(clubId);
    }

    return reconcileMockSystemTreasuryCategories(clubId);
  },
  async listClubActivitiesForClub(clubId) {
    if (shouldUseSupabaseDatabase()) {
      return listRealClubActivitiesForClub(clubId);
    }

    return getStore().clubActivities.filter((activity) => activity.clubId === clubId);
  },
  async listClubCalendarEventsForClub(clubId) {
    if (shouldUseSupabaseDatabase()) {
      return listRealClubCalendarEventsForClub(clubId);
    }

    return getStore().clubCalendarEvents.filter((event) => event.clubId === clubId);
  },
  async updateClubCalendarEventTreasuryAvailability(input) {
    if (shouldUseSupabaseDatabase()) {
      return updateRealClubCalendarEventTreasuryAvailability(input);
    }

    const event = getStore().clubCalendarEvents.find(
      (entry) => entry.id === input.eventId && entry.clubId === input.clubId
    );

    if (!event) {
      return null;
    }

    event.isEnabledForTreasury = input.isEnabledForTreasury;
    return event;
  },
  async listReceiptFormatsForClub(clubId) {
    if (shouldUseSupabaseDatabase()) {
      return listRealReceiptFormatsForClub(clubId);
    }

    return ensureMockReceiptFormatsForClub(clubId);
  },
  async listTreasuryCurrenciesForClub(clubId) {
    if (shouldUseSupabaseDatabase()) {
      return listRealTreasuryCurrenciesForClub(clubId);
    }

    return getStore().clubTreasuryCurrencies.filter((currency) => currency.clubId === clubId);
  },
  async listMovementTypeConfigForClub(clubId) {
    if (shouldUseSupabaseDatabase()) {
      return listRealMovementTypeConfigForClub(clubId);
    }

    return getStore().movementTypeConfig.filter((config) => config.clubId === clubId);
  },
  async setTreasuryCurrenciesForClub(input) {
    if (shouldUseSupabaseDatabase()) {
      return setRealTreasuryCurrenciesForClub(input);
    }

    const store = getStore();
    store.clubTreasuryCurrencies = store.clubTreasuryCurrencies.filter(
      (currency) => currency.clubId !== input.clubId
    );

    const nextCurrencies = input.currencies.map((currency) => ({
      clubId: input.clubId,
      currencyCode: currency.currencyCode,
      isPrimary: currency.isPrimary
    }));

    store.clubTreasuryCurrencies.push(...nextCurrencies);

    const fallbackCurrencyCode =
      input.currencies.find((currency) => currency.isPrimary)?.currencyCode ??
      input.currencies[0]?.currencyCode;

    store.treasuryAccounts.forEach((account) => {
      if (account.clubId === input.clubId && fallbackCurrencyCode) {
        account.currencies = alignAccountCurrenciesWithClubSelection(
          account.currencies,
          input.currencies.map((currency) => currency.currencyCode),
          fallbackCurrencyCode
        );
      }
    });

    return nextCurrencies;
  },
  async setMovementTypeConfigForClub(input) {
    if (shouldUseSupabaseDatabase()) {
      return setRealMovementTypeConfigForClub(input);
    }

    const store = getStore();
    store.movementTypeConfig = store.movementTypeConfig.filter(
      (movementType) => movementType.clubId !== input.clubId
    );

    const nextMovementTypes = input.movementTypes.map((movementType) => ({
      clubId: input.clubId,
      movementType: movementType.movementType,
      isEnabled: movementType.isEnabled
    }));

    store.movementTypeConfig.push(...nextMovementTypes);

    return nextMovementTypes;
  },
  async createTreasuryAccount(input) {
    if (shouldUseSupabaseDatabase()) {
      return createRealTreasuryAccount(input);
    }

    const account: TreasuryAccount = {
      id: `account-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      clubId: input.clubId,
      name: input.name,
      accountType: input.accountType,
      visibleForSecretaria: input.visibleForSecretaria,
      visibleForTesoreria: input.visibleForTesoreria,
      emoji: input.emoji,
      currencies: input.currencies.map((c) => c.currencyCode),
      currencyDetails: input.currencies,
      bankEntity: input.bankEntity,
      bankAccountSubtype: input.bankAccountSubtype,
      accountNumber: input.accountNumber,
      cbuCvu: input.cbuCvu
    };

    getStore().treasuryAccounts.push(account);
    return account;
  },
  async updateTreasuryAccount(input) {
    if (shouldUseSupabaseDatabase()) {
      return updateRealTreasuryAccount(input);
    }

    const store = getStore();
    const account = store.treasuryAccounts.find(
      (entry) => entry.id === input.accountId && entry.clubId === input.clubId
    );

    if (!account) {
      return null;
    }

    account.name = input.name;
    account.accountType = input.accountType;
    account.visibleForSecretaria = input.visibleForSecretaria;
    account.visibleForTesoreria = input.visibleForTesoreria;
    account.emoji = input.emoji;
    account.currencies = input.currencies.map((c) => c.currencyCode);
    account.currencyDetails = input.currencies;
    account.bankEntity = input.bankEntity;
    account.bankAccountSubtype = input.bankAccountSubtype;
    account.accountNumber = input.accountNumber;
    account.cbuCvu = input.cbuCvu;

    return account;
  },
  async createTreasuryCategory(input) {
    if (shouldUseSupabaseDatabase()) {
      return createRealTreasuryCategory(input);
    }

    const category: TreasuryCategory = {
      id: `category-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      clubId: input.clubId,
      name: input.subCategoryName,
      subCategoryName: input.subCategoryName,
      description: input.description,
      parentCategory: input.parentCategory,
      movementType: input.movementType,
      visibleForSecretaria: input.visibleForSecretaria,
      visibleForTesoreria: input.visibleForTesoreria,
      emoji: input.emoji,
      isSystem: input.isSystem ?? false,
      isLegacy: input.isLegacy ?? false
    };

    getStore().treasuryCategories.push(category);
    return category;
  },
  async updateTreasuryCategory(input) {
    if (shouldUseSupabaseDatabase()) {
      return updateRealTreasuryCategory(input);
    }

    const store = getStore();
    const category = store.treasuryCategories.find(
      (entry) => entry.id === input.categoryId && entry.clubId === input.clubId
    );

    if (!category) {
      return null;
    }

    category.name = input.subCategoryName;
    category.subCategoryName = input.subCategoryName;
    category.description = input.description;
    category.parentCategory = input.parentCategory;
    category.movementType = input.movementType;
    category.visibleForSecretaria = input.visibleForSecretaria;
    category.visibleForTesoreria = input.visibleForTesoreria;
    category.emoji = input.emoji;
    category.isSystem = input.isSystem ?? category.isSystem;
    category.isLegacy = input.isLegacy ?? category.isLegacy;

    return category;
  },
  async createClubActivity(input) {
    if (shouldUseSupabaseDatabase()) {
      return createRealClubActivity(input);
    }

    const activity: ClubActivity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      clubId: input.clubId,
      name: input.name,
      visibleForSecretaria: input.visibleForSecretaria,
      visibleForTesoreria: input.visibleForTesoreria,
      emoji: input.emoji
    };

    getStore().clubActivities.push(activity);
    return activity;
  },
  async updateClubActivity(input) {
    if (shouldUseSupabaseDatabase()) {
      return updateRealClubActivity(input);
    }

    const activity = getStore().clubActivities.find(
      (entry) => entry.id === input.activityId && entry.clubId === input.clubId
    );

    if (!activity) {
      return null;
    }

    activity.name = input.name;
    activity.visibleForSecretaria = input.visibleForSecretaria;
    activity.visibleForTesoreria = input.visibleForTesoreria;
    activity.emoji = input.emoji;
    return activity;
  },
  async createReceiptFormat(input) {
    if (shouldUseSupabaseDatabase()) {
      return createRealReceiptFormat(input);
    }

    const receiptFormat: ReceiptFormat = {
      id: `receipt-format-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      clubId: input.clubId,
      name: input.name,
      validationType: input.validationType,
      pattern: input.pattern,
      minNumericValue: input.minNumericValue,
      example: input.example,
      status: input.status,
      visibleForSecretaria: input.visibleForSecretaria,
      visibleForTesoreria: input.visibleForTesoreria
    };

    getStore().receiptFormats.push(receiptFormat);
    return receiptFormat;
  },
  async updateReceiptFormat(input) {
    if (shouldUseSupabaseDatabase()) {
      return updateRealReceiptFormat(input);
    }

    const receiptFormat = getStore().receiptFormats.find(
      (entry) => entry.id === input.receiptFormatId && entry.clubId === input.clubId
    );

    if (!receiptFormat) {
      return null;
    }

    receiptFormat.name = input.name;
    receiptFormat.validationType = input.validationType;
    receiptFormat.pattern = input.pattern;
    receiptFormat.minNumericValue = input.minNumericValue;
    receiptFormat.example = input.example;
    receiptFormat.status = input.status;
    receiptFormat.visibleForSecretaria = input.visibleForSecretaria;
    receiptFormat.visibleForTesoreria = input.visibleForTesoreria;
    return receiptFormat;
  },
  async findTreasuryAdjustmentCategory(clubId) {
    const categories = shouldUseSupabaseDatabase()
      ? await listRealTreasuryCategoriesForClub(clubId)
      : reconcileMockSystemTreasuryCategories(clubId);

    return (
      categories.find((category) => category.subCategoryName === "Ajustes contables") ?? null
    );
  },
  async getDailyCashSessionByDate(clubId, sessionDate) {
    if (shouldUseSupabaseDatabase()) {
      return findRealDailyCashSessionByDate(clubId, sessionDate);
    }

    return (
      getStore().dailyCashSessions.find(
        (session) => session.clubId === clubId && session.sessionDate === sessionDate
      ) ?? null
    );
  },
  async getLastOpenDailyCashSessionBeforeDate(clubId, beforeDate) {
    if (shouldUseSupabaseDatabase()) {
      return findRealLastOpenDailyCashSessionBeforeDate(clubId, beforeDate);
    }

    return (
      [...getStore().dailyCashSessions]
        .filter(
          (session) =>
            session.clubId === clubId &&
            session.status === "open" &&
            session.sessionDate < beforeDate
        )
        .sort((left, right) => right.sessionDate.localeCompare(left.sessionDate))[0] ?? null
    );
  },
  async createDailyCashSession(clubId, sessionDate, openedByUserId) {
    if (shouldUseSupabaseDatabase()) {
      return createRealDailyCashSession(clubId, sessionDate, openedByUserId);
    }

    const session: DailyCashSession = {
      id: `session-${Date.now()}`,
      clubId,
      sessionDate,
      status: "open",
      openedAt: now(),
      closedAt: null,
      openedByUserId,
      closedByUserId: null
    };

    getStore().dailyCashSessions.push(session);
    return session;
  },
  async openDailyCashSessionWithBalances(input) {
    if (shouldUseSupabaseDatabase()) {
      return openRealDailyCashSessionWithBalances(input);
    }

    const session: DailyCashSession = {
      id: `session-${Date.now()}`,
      clubId: input.clubId,
      sessionDate: input.sessionDate,
      status: "open",
      openedAt: now(),
      closedAt: null,
      openedByUserId: input.openedByUserId,
      closedByUserId: null
    };

    const store = getStore();
    store.dailyCashSessions.push(session);

    input.balances.forEach((entry) => {
      store.dailyCashSessionBalances.push({
        id: `session-balance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sessionId: session.id,
        accountId: entry.accountId,
        currencyCode: entry.currencyCode,
        balanceMoment: entry.balanceMoment,
        expectedBalance: entry.expectedBalance,
        declaredBalance: entry.declaredBalance,
        differenceAmount: entry.differenceAmount
      });
    });

    input.adjustments.forEach((entry) => {
      const movementId = `movement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      store.treasuryMovements.push({
        id: movementId,
        displayId: entry.displayId,
        clubId: input.clubId,
        dailyCashSessionId: session.id,
        accountId: entry.accountId,
        movementType: entry.movementType,
        categoryId: entry.categoryId,
        concept: entry.concept,
        currencyCode: entry.currencyCode,
        amount: entry.amount,
        movementDate: entry.movementDate,
        createdByUserId: entry.createdByUserId,
        status: entry.status,
        createdAt: now()
      });

      store.balanceAdjustments.push({
        id: `balance-adjustment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sessionId: session.id,
        movementId,
        accountId: entry.accountId,
        differenceAmount: entry.differenceAmount,
        adjustmentMoment: entry.adjustmentMoment
      });
    });

    return session;
  },
  async closeDailyCashSession(clubId, sessionId, closedByUserId) {
    if (shouldUseSupabaseDatabase()) {
      return closeRealDailyCashSession(clubId, sessionId, closedByUserId);
    }

    const store = getStore();
    const session = store.dailyCashSessions.find((entry) => entry.id === sessionId);

    if (!session) {
      return null;
    }

    session.status = "closed";
    session.closedAt = now();
    session.closedByUserId = closedByUserId;
    return session;
  },
  async closeDailyCashSessionWithBalances(input) {
    if (shouldUseSupabaseDatabase()) {
      return closeRealDailyCashSessionWithBalances(input);
    }

    const store = getStore();
    const session = store.dailyCashSessions.find((entry) => entry.id === input.sessionId && entry.clubId === input.clubId);

    if (!session || session.status !== "open") {
      return null;
    }

    input.balances.forEach((entry) => {
      store.dailyCashSessionBalances.push({
        id: `session-balance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sessionId: session.id,
        accountId: entry.accountId,
        currencyCode: entry.currencyCode,
        balanceMoment: entry.balanceMoment,
        expectedBalance: entry.expectedBalance,
        declaredBalance: entry.declaredBalance,
        differenceAmount: entry.differenceAmount
      });
    });

    input.adjustments.forEach((entry) => {
      const movementId = `movement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      store.treasuryMovements.push({
        id: movementId,
        displayId: entry.displayId,
        clubId: input.clubId,
        dailyCashSessionId: session.id,
        accountId: entry.accountId,
        movementType: entry.movementType,
        categoryId: entry.categoryId,
        concept: entry.concept,
        currencyCode: entry.currencyCode,
        amount: entry.amount,
        movementDate: entry.movementDate,
        createdByUserId: entry.createdByUserId,
        status: entry.status,
        createdAt: now()
      });

      store.balanceAdjustments.push({
        id: `balance-adjustment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sessionId: session.id,
        movementId,
        accountId: entry.accountId,
        differenceAmount: entry.differenceAmount,
        adjustmentMoment: entry.adjustmentMoment
      });
    });

    session.status = "closed";
    session.closedAt = now();
    session.closedByUserId = input.closedByUserId;
    if (input.notes) session.notes = input.notes;

    return session;
  },
  async getSessionOpeningBalances(clubId, sessionId) {
    if (shouldUseSupabaseDatabase()) {
      const supabase = createAccessSupabaseClient();
      if (!supabase) return [];
      const { data } = await supabase
        .from("daily_cash_session_balances")
        .select("account_id, currency_code, declared_balance")
        .eq("session_id", sessionId)
        .eq("balance_moment", "opening");
      return (data ?? []).map((row) => ({
        accountId: row.account_id as string,
        currencyCode: row.currency_code as string,
        declaredBalance: Number(row.declared_balance)
      }));
    }

    const store = getStore();
    return store.dailyCashSessionBalances
      .filter((b) => b.sessionId === sessionId && b.balanceMoment === "opening")
      .map((b) => ({ accountId: b.accountId, currencyCode: b.currencyCode, declaredBalance: b.declaredBalance }));
  },
  async autoCloseStaleDailyCashSessionWithBalances(input) {
    if (shouldUseSupabaseDatabase()) {
      return autoCloseRealStaleDailyCashSessionWithBalances(input);
    }

    const store = getStore();
    const session =
      [...store.dailyCashSessions]
        .filter(
          (entry) =>
            entry.clubId === input.clubId &&
            entry.status === "open" &&
            entry.sessionDate < input.beforeDate
        )
        .sort((left, right) => right.sessionDate.localeCompare(left.sessionDate))[0] ?? null;

    if (!session) {
      return null;
    }

    if (input.expectedSessionId && session.id !== input.expectedSessionId) {
      return null;
    }

    input.balances.forEach((entry) => {
      store.dailyCashSessionBalances.push({
        id: `session-balance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sessionId: session.id,
        accountId: entry.accountId,
        currencyCode: entry.currencyCode,
        balanceMoment: entry.balanceMoment,
        expectedBalance: entry.expectedBalance,
        declaredBalance: entry.declaredBalance,
        differenceAmount: entry.differenceAmount
      });
    });

    session.status = "closed";
    session.closedAt = now();
    session.closedByUserId = input.closedByUserId;

    return session;
  },
  async listTreasuryMovementsBySession(sessionId) {
    return getStore().treasuryMovements.filter((movement) => movement.dailyCashSessionId === sessionId);
  },
  async listTreasuryMovementsByAccount(clubId, accountId, movementDate) {
    if (shouldUseSupabaseDatabase()) {
      return listRealTreasuryMovementsByAccount(clubId, accountId, movementDate);
    }

    return getStore().treasuryMovements.filter(
      (movement) =>
        movement.clubId === clubId &&
        movement.accountId === accountId &&
        movement.movementDate === movementDate
    );
  },
  async listTreasuryMovementsByAccountStrict(clubId, accountId, movementDate) {
    if (shouldUseSupabaseDatabase()) {
      return listRealTreasuryMovementsByAccountStrict(clubId, accountId, movementDate);
    }

    return getStore().treasuryMovements.filter(
      (movement) =>
        movement.clubId === clubId &&
        movement.accountId === accountId &&
        movement.movementDate === movementDate
    );
  },
  async listTreasuryMovementsHistoryByAccount(clubId, accountId) {
    if (shouldUseSupabaseDatabase()) {
      return listRealTreasuryMovementsHistoryByAccount(clubId, accountId);
    }

    return getStore().treasuryMovements.filter(
      (movement) => movement.clubId === clubId && movement.accountId === accountId
    );
  },
  async listTreasuryMovementsHistoryByAccounts(clubId, accountIds) {
    if (shouldUseSupabaseDatabase()) {
      return listRealTreasuryMovementsHistoryByAccounts(clubId, accountIds);
    }

    const allowedAccountIds = new Set(accountIds);

    return getStore().treasuryMovements.filter(
      (movement) => movement.clubId === clubId && allowedAccountIds.has(movement.accountId)
    );
  },
  async listTreasuryMovementsByDate(clubId, movementDate) {
    if (shouldUseSupabaseDatabase()) {
      return listRealTreasuryMovementsByDate(clubId, movementDate);
    }

    return getStore().treasuryMovements.filter(
      (movement) => movement.clubId === clubId && movement.movementDate === movementDate
    );
  },
  async listTreasuryMovementsByDateStrict(clubId, movementDate) {
    if (shouldUseSupabaseDatabase()) {
      return listRealTreasuryMovementsByDateStrict(clubId, movementDate);
    }

    return getStore().treasuryMovements.filter(
      (movement) => movement.clubId === clubId && movement.movementDate === movementDate
    );
  },
  async findTreasuryMovementById(clubId, movementId) {
    if (shouldUseSupabaseDatabase()) {
      return findRealTreasuryMovementById(clubId, movementId);
    }

    return getStore().treasuryMovements.find((movement) => movement.id === movementId) ?? null;
  },
  async updateTreasuryMovement(input) {
    if (shouldUseSupabaseDatabase()) {
      return updateRealTreasuryMovement(input);
    }

    const store = getStore();
    const movement = store.treasuryMovements.find(
      (entry) => entry.id === input.movementId && entry.clubId === input.clubId
    );

    if (!movement) {
      return null;
    }

    movement.movementDate = input.movementDate ?? movement.movementDate;
    movement.accountId = input.accountId;
    movement.movementType = input.movementType;
    movement.categoryId = input.categoryId ?? "";
    movement.concept = input.concept;
    movement.currencyCode = input.currencyCode;
    movement.amount = input.amount;
    movement.activityId = input.activityId === undefined ? movement.activityId ?? null : input.activityId;
    movement.receiptNumber = input.receiptNumber === undefined ? movement.receiptNumber ?? null : input.receiptNumber;
    movement.calendarEventId =
      input.calendarEventId === undefined ? movement.calendarEventId ?? null : input.calendarEventId;
    movement.status = input.status ?? movement.status;
    movement.consolidationBatchId =
      input.consolidationBatchId === undefined ? movement.consolidationBatchId ?? null : input.consolidationBatchId;

    return movement;
  },
  async getDailyConsolidationBatchByDate(clubId, consolidationDate) {
    if (shouldUseSupabaseDatabase()) {
      return getRealDailyConsolidationBatchByDate(clubId, consolidationDate);
    }

    return (
      getStore().dailyConsolidationBatches.find(
        (batch) => batch.clubId === clubId && batch.consolidationDate === consolidationDate
      ) ?? null
    );
  },
  async createDailyConsolidationBatch(input) {
    if (shouldUseSupabaseDatabase()) {
      return createRealDailyConsolidationBatch(input);
    }

    const batch: DailyConsolidationBatch = {
      id: `consolidation-batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      clubId: input.clubId,
      consolidationDate: input.consolidationDate,
      status: input.status,
      executedAt: now(),
      executedByUserId: input.executedByUserId,
      errorMessage: null
    };

    getStore().dailyConsolidationBatches.push(batch);
    return batch;
  },
  async updateDailyConsolidationBatch(input) {
    if (shouldUseSupabaseDatabase()) {
      return updateRealDailyConsolidationBatch(input);
    }

    const batch = getStore().dailyConsolidationBatches.find((entry) => entry.id === input.batchId);

    if (!batch) {
      return null;
    }

    batch.status = input.status;
    batch.errorMessage = input.errorMessage ?? null;

    if (input.status === "completed" || input.status === "failed") {
      batch.executedAt = now();
    }

    return batch;
  },
  async listMovementIntegrations() {
    return [...getStore().movementIntegrations];
  },
  async createMovementIntegration(input) {
    const integration: MovementIntegration = {
      id: `movement-integration-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      secretariaMovementId: input.secretariaMovementId,
      tesoreriaMovementId: input.tesoreriaMovementId,
      integratedAt: now()
    };

    getStore().movementIntegrations.push(integration);
    return integration;
  },
  async listMovementAuditLogsByMovementId(input) {
    if (shouldUseSupabaseDatabase()) {
      return listRealMovementAuditLogsByMovementId(input);
    }

    return getStore().movementAuditLogs.filter((entry) => entry.movementId === input.movementId);
  },
  async createMovementAuditLog(input) {
    if (shouldUseSupabaseDatabase()) {
      return createRealMovementAuditLog(input);
    }

    const log: MovementAuditLog = {
      id: `movement-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      movementId: input.movementId,
      actionType: input.actionType,
      payloadBefore: input.payloadBefore,
      payloadAfter: input.payloadAfter,
      performedAt: now(),
      performedByUserId: input.performedByUserId
    };

    getStore().movementAuditLogs.push(log);
    return log;
  },
  async createAccountTransfer(input) {
    if (shouldUseSupabaseDatabase()) {
      return createRealAccountTransfer(input);
    }

    const transfer: AccountTransfer = {
      id: `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      clubId: input.clubId,
      sourceAccountId: input.sourceAccountId,
      targetAccountId: input.targetAccountId,
      currencyCode: input.currencyCode,
      amount: input.amount,
      concept: input.concept,
      createdAt: now()
    };

    getStore().accountTransfers.push(transfer);

    const sourceMovement: TreasuryMovement = {
      id: `movement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      displayId: input.sourceMovementDisplayId,
      clubId: input.clubId,
      dailyCashSessionId: input.dailyCashSessionId,
      accountId: input.sourceAccountId,
      movementType: "egreso",
      categoryId: "",
      concept: input.concept,
      currencyCode: input.currencyCode,
      amount: input.amount,
      activityId: null,
      receiptNumber: null,
      calendarEventId: null,
      transferGroupId: transfer.id,
      fxOperationGroupId: null,
      consolidationBatchId: null,
      movementDate: input.movementDate,
      createdByUserId: input.createdByUserId,
      status: "pending_consolidation",
      createdAt: now()
    };

    const targetMovement: TreasuryMovement = {
      id: `movement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      displayId: input.targetMovementDisplayId,
      clubId: input.clubId,
      dailyCashSessionId: input.dailyCashSessionId,
      accountId: input.targetAccountId,
      movementType: "ingreso",
      categoryId: "",
      concept: input.concept,
      currencyCode: input.currencyCode,
      amount: input.amount,
      activityId: null,
      receiptNumber: null,
      calendarEventId: null,
      transferGroupId: transfer.id,
      fxOperationGroupId: null,
      consolidationBatchId: null,
      movementDate: input.movementDate,
      createdByUserId: input.createdByUserId,
      status: "pending_consolidation",
      createdAt: now()
    };

    getStore().treasuryMovements.push(sourceMovement, targetMovement);

    return {
      transfer,
      sourceMovementDisplayId: sourceMovement.displayId,
      targetMovementDisplayId: targetMovement.displayId
    };
  },
  async createFxOperation(input) {
    if (shouldUseSupabaseDatabase()) {
      return createRealFxOperation(input);
    }

    const operation: FxOperation = {
      id: `fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      clubId: input.clubId,
      sourceAccountId: input.sourceAccountId,
      targetAccountId: input.targetAccountId,
      sourceCurrencyCode: input.sourceCurrencyCode,
      targetCurrencyCode: input.targetCurrencyCode,
      sourceAmount: input.sourceAmount,
      targetAmount: input.targetAmount,
      concept: input.concept,
      createdAt: now()
    };

    getStore().fxOperations.push(operation);
    return operation;
  },
  async createTreasuryMovement(input) {
    if (shouldUseSupabaseDatabase()) {
      return createRealTreasuryMovement(input);
    }

    const movement: TreasuryMovement = {
      id: `movement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      displayId: input.displayId,
      clubId: input.clubId,
      dailyCashSessionId: input.dailyCashSessionId,
      accountId: input.accountId,
      movementType: input.movementType,
      categoryId: input.categoryId ?? "",
      concept: input.concept,
      currencyCode: input.currencyCode,
      amount: input.amount,
      activityId: input.activityId ?? null,
      receiptNumber: input.receiptNumber ?? null,
      calendarEventId: input.calendarEventId ?? null,
      transferGroupId: input.transferGroupId ?? null,
      fxOperationGroupId: input.fxOperationGroupId ?? null,
      consolidationBatchId: input.consolidationBatchId ?? null,
      movementDate: input.movementDate,
      createdByUserId: input.createdByUserId,
      status: input.status ?? "pending_consolidation",
      createdAt: now()
    };

    getStore().treasuryMovements.push(movement);
    return movement;
  },
  async countTreasuryMovementsByClubAndYear(clubId, year) {
    if (shouldUseSupabaseDatabase()) {
      return countRealTreasuryMovementsByClubAndYear(clubId, year);
    }

    return getStore().treasuryMovements.filter(
      (movement) => movement.clubId === clubId && movement.movementDate.startsWith(`${year}-`)
    ).length;
  },
  async recordDailyCashSessionBalances(clubId, input) {
    if (shouldUseSupabaseDatabase()) {
      return recordRealDailyCashSessionBalances(clubId, input);
    }

    const store = getStore();

    input.forEach((entry) => {
      store.dailyCashSessionBalances.push({
        id: `session-balance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sessionId: entry.sessionId,
        accountId: entry.accountId,
        currencyCode: entry.currencyCode,
        balanceMoment: entry.balanceMoment,
        expectedBalance: entry.expectedBalance,
        declaredBalance: entry.declaredBalance,
        differenceAmount: entry.differenceAmount
      });
    });
  },
  async recordBalanceAdjustment(input) {
    if (shouldUseSupabaseDatabase()) {
      return recordRealBalanceAdjustment(input);
    }

    getStore().balanceAdjustments.push({
      id: `balance-adjustment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId: input.sessionId,
      movementId: input.movementId,
      accountId: input.accountId,
      differenceAmount: input.differenceAmount,
      adjustmentMoment: input.adjustmentMoment
    });
  },
  async getLastActiveClubId(userId, client) {
    if (shouldUseSupabaseDatabase()) {
      return getRealLastActiveClubId(userId, client);
    }

    return getStore().preferences.get(userId) ?? null;
  },
  async setLastActiveClubId(userId, clubId, client) {
    if (shouldUseSupabaseDatabase()) {
      await setRealLastActiveClubId(userId, clubId, client);
      return;
    }

    getStore().preferences.set(userId, clubId);
  },
  async createClubInvitation(clubId, email, role, client) {
    if (shouldUseSupabaseDatabase()) {
      return createRealClubInvitation(clubId, email, role, client);
    }

    const invitation: ClubInvitation = {
      id: `invitation-${Date.now()}`,
      clubId,
      email: email.trim().toLowerCase(),
      role,
      status: "pending",
      expiresAt: null,
      usedAt: null,
      createdAt: now()
    };

    getStore().invitations.push(invitation);
    return invitation;
  },
  async createMembership(userId, clubId, role, status, approvedByUserId, client) {
    if (shouldUseSupabaseDatabase()) {
      return createRealMembership(userId, clubId, role, status, approvedByUserId, client);
    }

    const timestamp = now();
    const membership: Membership = {
      id: `membership-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      clubId,
      roles: [role],
      status,
      joinedAt: status === "activo" ? timestamp : timestamp
    };

    getStore().memberships.push(membership);
    return membership;
  },
  async markInvitationAsUsed(invitationId, client) {
    if (shouldUseSupabaseDatabase()) {
      return markRealInvitationAsUsed(invitationId, client);
    }

    const invitation = getStore().invitations.find((entry) => entry.id === invitationId);

    if (!invitation) {
      return false;
    }

    invitation.status = "used";
    invitation.usedAt = now();
    return true;
  },
  async approveMembership(membershipId, role, approvedByUserId, client) {
    if (shouldUseSupabaseDatabase()) {
      return approveRealMembership(membershipId, role, approvedByUserId, client);
    }

    const store = getStore();
    const membershipIndex = store.memberships.findIndex((membership) => membership.id === membershipId);

    if (membershipIndex === -1) {
      return null;
    }

    const timestamp = now();
    const updatedMembership: Membership = {
      ...store.memberships[membershipIndex],
      roles: [role],
      status: "activo",
      joinedAt: timestamp
    };

    store.memberships[membershipIndex] = updatedMembership;
    return updatedMembership;
  },
  async updateMembershipRoles(membershipId, roles, client) {
    if (shouldUseSupabaseDatabase()) {
      return updateRealMembershipRoles(membershipId, roles, client);
    }

    const store = getStore();
    const membershipIndex = store.memberships.findIndex((membership) => membership.id === membershipId);

    if (membershipIndex === -1) {
      return null;
    }

    const updatedMembership: Membership = {
      ...store.memberships[membershipIndex],
      roles: sortMembershipRoles(roles)
    };

    store.memberships[membershipIndex] = updatedMembership;
    return updatedMembership;
  },
  async removeMembership(membershipId, client) {
    if (shouldUseSupabaseDatabase()) {
      return removeRealMembership(membershipId, client);
    }

    const store = getStore();
    const membershipIndex = store.memberships.findIndex((membership) => membership.id === membershipId);

    if (membershipIndex === -1) {
      return false;
    }

    store.memberships.splice(membershipIndex, 1);
    return true;
  },
  async syncUserProfileFromAuthIdentity(identity, client) {
    if (shouldUseSupabaseDatabase()) {
      return syncRealUserProfileFromAuthIdentity(identity, client);
    }

    const user = {
      id: identity.id,
      email: identity.email,
      fullName: identity.fullName,
      avatarUrl: identity.avatarUrl,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt
    };

    getStore().users.set(identity.id, user);
    return user;
  }
};
