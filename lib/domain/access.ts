export type MembershipRole = "admin" | "secretaria" | "tesoreria";
export type MembershipStatus = "pendiente_aprobacion" | "activo" | "inactivo";

export type User = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Club = {
  id: string;
  name: string;
  slug: string;
  status: "active";
};

export type AvailableClub = {
  id: string;
  name: string;
  slug: string;
  roles: MembershipRole[];
  status: MembershipStatus;
};

export type Membership = {
  id: string;
  userId: string;
  clubId: string;
  roles: MembershipRole[];
  status: MembershipStatus;
  joinedAt: string;
};

export type ClubMember = {
  membershipId: string;
  userId: string;
  clubId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  roles: MembershipRole[];
  status: MembershipStatus;
  joinedAt: string;
};

export type ClubInvitation = {
  id: string;
  clubId: string;
  email: string;
  role: MembershipRole;
  status: "pending" | "used";
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
};

export type PendingClubInvitation = {
  invitationId: string;
  clubId: string;
  email: string;
  role: MembershipRole;
  status: "pendiente_aprobacion";
  createdAt: string;
};

export type TreasuryAccountType = "efectivo" | "bancaria" | "billetera_virtual";
export type TreasuryConfigStatus = "active" | "inactive";
export type TreasuryCurrencyCode = "ARS" | "USD";
export type TreasuryMovementType = "ingreso" | "egreso";
export type TreasuryMovementOriginRole = "secretaria" | "tesoreria" | "system";
export type TreasuryMovementOriginSource =
  | "manual"
  | "transfer"
  | "fx"
  | "adjustment"
  | "consolidation";
export type TreasuryMovementStatus =
  | "pending_consolidation"
  | "integrated"
  | "consolidated"
  | "posted"
  | "cancelled";

export type TreasuryCurrencyConfig = {
  clubId: string;
  currencyCode: TreasuryCurrencyCode;
  isPrimary: boolean;
};

export type TreasuryAccount = {
  id: string;
  clubId: string;
  name: string;
  accountType: TreasuryAccountType;
  visibleForSecretaria: boolean;
  visibleForTesoreria: boolean;
  emoji: string | null;
  currencies: string[];
};

export type TreasuryCategory = {
  id: string;
  clubId: string;
  name: string;
  visibleForSecretaria: boolean;
  visibleForTesoreria: boolean;
  emoji: string | null;
};

export type ClubActivity = {
  id: string;
  clubId: string;
  name: string;
  visibleForSecretaria: boolean;
  visibleForTesoreria: boolean;
  emoji: string | null;
};

export type ReceiptValidationType = "numeric" | "pattern";

export type ReceiptFormat = {
  id: string;
  clubId: string;
  name: string;
  validationType: ReceiptValidationType;
  pattern: string | null;
  minNumericValue: number | null;
  example: string | null;
  status: TreasuryConfigStatus;
};

export type MovementTypeConfig = {
  clubId: string;
  movementType: TreasuryMovementType;
  isEnabled: boolean;
};

export type ClubCalendarEvent = {
  id: string;
  clubId: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  isEnabledForTreasury: boolean;
};

export type AccountTransfer = {
  id: string;
  clubId: string;
  sourceAccountId: string;
  targetAccountId: string;
  currencyCode: string;
  amount: number;
  concept: string;
  createdAt: string;
};

export type FxOperation = {
  id: string;
  clubId: string;
  sourceAccountId: string;
  targetAccountId: string;
  sourceCurrencyCode: string;
  targetCurrencyCode: string;
  sourceAmount: number;
  targetAmount: number;
  concept: string;
  createdAt: string;
};

export type TreasurySettings = {
  accounts: TreasuryAccount[];
  categories: TreasuryCategory[];
  activities: ClubActivity[];
  calendarEvents: ClubCalendarEvent[];
  receiptFormats: ReceiptFormat[];
  currencies: TreasuryCurrencyConfig[];
  movementTypes: MovementTypeConfig[];
};

export type TreasurySessionStatus = "open" | "closed";

export type DailyCashSession = {
  id: string;
  clubId: string;
  sessionDate: string;
  status: TreasurySessionStatus;
  openedAt: string;
  closedAt: string | null;
  openedByUserId: string | null;
  closedByUserId: string | null;
};

export type TreasuryMovement = {
  id: string;
  displayId: string;
  clubId: string;
  dailyCashSessionId: string | null;
  accountId: string;
  movementType: TreasuryMovementType;
  categoryId: string;
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
  status: TreasuryMovementStatus;
  createdAt: string;
};

export type DailyConsolidationBatch = {
  id: string;
  clubId: string;
  consolidationDate: string;
  status: "pending" | "completed" | "failed";
  executedAt: string | null;
  executedByUserId: string | null;
  errorMessage: string | null;
};

export type MovementIntegration = {
  id: string;
  secretariaMovementId: string;
  tesoreriaMovementId: string;
  integratedAt: string;
};

export type MovementAuditLog = {
  id: string;
  movementId: string;
  actionType: "edited" | "integrated" | "consolidated";
  payloadBefore: Record<string, unknown> | null;
  payloadAfter: Record<string, unknown> | null;
  performedAt: string;
  performedByUserId: string;
};

export type DailyCashSessionBalance = {
  id: string;
  sessionId: string;
  accountId: string;
  currencyCode: string;
  balanceMoment: "opening" | "closing";
  expectedBalance: number;
  declaredBalance: number;
  differenceAmount: number;
};

export type BalanceAdjustment = {
  id: string;
  sessionId: string;
  movementId: string;
  accountId: string;
  differenceAmount: number;
  adjustmentMoment: "opening" | "closing";
};

export type DashboardTreasuryCard = {
  sessionStatus: TreasurySessionStatus | "not_started" | "unresolved";
  movementDataStatus: "resolved" | "unresolved";
  sessionDate: string;
  sessionId: string | null;
  accounts: Array<{
    accountId: string;
    name: string;
    balances: Array<{
      currencyCode: string;
      amount: number;
    }>;
  }>;
  movements: Array<{
    movementId: string;
    movementDisplayId: string;
    movementDate: string;
    accountId: string;
    accountName: string;
    movementType: TreasuryMovementType;
    categoryId: string;
    categoryName: string;
    activityId: string | null;
    activityName: string | null;
    receiptNumber: string | null;
    calendarEventId: string | null;
    calendarEventTitle: string | null;
    transferReference: string | null;
    fxOperationReference: string | null;
    concept: string;
    currencyCode: string;
    amount: number;
    createdByUserName: string;
    createdAt: string;
    canEdit: boolean;
  }>;
  availableActions: Array<"open_session" | "close_session" | "create_movement">;
};

export type TreasuryRoleDashboard = {
  sessionDate: string;
  accounts: Array<{
    accountId: string;
    name: string;
    balances: Array<{
      currencyCode: string;
      amount: number;
    }>;
  }>;
  movements: Array<{
    movementId: string;
    movementDisplayId: string;
    movementDate: string;
    accountId: string;
    accountName: string;
    movementType: TreasuryMovementType;
    categoryName: string;
    concept: string;
    currencyCode: string;
    amount: number;
    createdByUserName: string;
    createdAt: string;
  }>;
  availableActions: Array<"create_movement" | "create_fx_operation">;
};

export type TreasuryAccountDetail = {
  account: {
    accountId: string;
    name: string;
  };
  sessionStatus: TreasurySessionStatus | "not_started";
  balances: Array<{
    currencyCode: string;
    amount: number;
  }>;
  movements: Array<{
    movementId: string;
    movementDisplayId: string;
    movementDate: string;
    movementType: TreasuryMovementType;
    categoryName: string;
    activityName: string | null;
    calendarEventTitle: string | null;
    transferReference: string | null;
    fxOperationReference: string | null;
    concept: string;
    receiptNumber: string | null;
    currencyCode: string;
    amount: number;
    createdByUserName: string;
    createdAt: string;
  }>;
};

export type ConsolidationMatch = {
  tesoreriaMovementId: string;
  movementDate: string;
  accountName: string;
  movementType: TreasuryMovementType;
  categoryName: string;
  concept: string;
  currencyCode: string;
  amount: number;
  createdByUserName: string;
  createdAt: string;
};

export type ConsolidationMovement = {
  movementId: string;
  movementDisplayId: string;
  status: "pending_consolidation" | "integrated";
  movementDate: string;
  accountId: string;
  accountName: string;
  movementType: TreasuryMovementType;
  categoryId: string;
  categoryName: string;
  concept: string;
  currencyCode: string;
  amount: number;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  isValid: boolean;
  validationIssues: string[];
  possibleMatch: ConsolidationMatch | null;
};

export type ConsolidationAuditEntry = {
  id: string;
  actionType: "original" | "edited" | "integrated" | "consolidated";
  performedAt: string;
  performedByUserName: string;
  payloadBefore: Record<string, unknown> | null;
  payloadAfter: Record<string, unknown> | null;
};

export type TreasuryConsolidationDashboard = {
  consolidationDate: string;
  defaultDate: string;
  hasLoadedDate: boolean;
  batch: DailyConsolidationBatch | null;
  pendingMovements: ConsolidationMovement[];
  integratedMovements: ConsolidationMovement[];
};

export type SessionBalanceDraft = {
  accountId: string;
  accountName: string;
  currencyCode: string;
  expectedBalance: number;
  declaredBalance: number;
  differenceAmount: number;
  adjustmentType: TreasuryMovementType | null;
};

export type DailyCashSessionValidation = {
  mode: "open" | "close";
  sessionDate: string;
  sessionStatus: TreasurySessionStatus | "not_started";
  accounts: SessionBalanceDraft[];
  hasDifferences: boolean;
};

export type Session = {
  userId: string;
  activeClubId: string | null;
};

export type AuthIdentity = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GoogleProfileKey =
  | "new_pending"
  | "existing_pending"
  | "existing_active"
  | "existing_secretaria";

export type GoogleProfile = {
  profileKey: GoogleProfileKey;
  email: string;
  fullName: string;
  avatarUrl: string | null;
};
