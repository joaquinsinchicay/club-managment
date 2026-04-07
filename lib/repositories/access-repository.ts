import { appConfig } from "@/lib/config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/env";
import type {
  AuthIdentity,
  BalanceAdjustment,
  ClubActivity,
  Club,
  ClubInvitation,
  ClubMember,
  DailyCashSessionBalance,
  GoogleProfile,
  GoogleProfileKey,
  DailyCashSession,
  Membership,
  MembershipRole,
  MovementTypeConfig,
  PendingClubInvitation,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryCurrencyCode,
  TreasuryCurrencyConfig,
  TreasuryMovementType,
  TreasuryCategory,
  TreasuryMovement,
  User
} from "@/lib/domain/access";
import { MEMBERSHIP_ROLES, sortMembershipRoles } from "@/lib/domain/membership-roles";

type AccessRepositoryClient = ReturnType<typeof createServerSupabaseClient>;

type AccessRepository = {
  getGoogleProfile(profileKey: GoogleProfileKey): GoogleProfile;
  findUserByEmail(email: string, client?: AccessRepositoryClient): Promise<User | null>;
  createUserFromGoogleProfile(profile: GoogleProfile): Promise<User>;
  updateUserFromGoogleProfile(userId: string, profile: GoogleProfile): Promise<User>;
  findUserById(userId: string, client?: AccessRepositoryClient): Promise<User | null>;
  listMembershipsForUser(userId: string, client?: AccessRepositoryClient): Promise<Membership[]>;
  listActiveMembershipsForUser(userId: string, client?: AccessRepositoryClient): Promise<Membership[]>;
  findClubById(clubId: string, client?: AccessRepositoryClient): Promise<Club | null>;
  listClubMembers(clubId: string, client?: AccessRepositoryClient): Promise<ClubMember[]>;
  listPendingInvitationsForClub(clubId: string, client?: AccessRepositoryClient): Promise<PendingClubInvitation[]>;
  listPendingInvitationsByEmail(email: string, client?: AccessRepositoryClient): Promise<ClubInvitation[]>;
  listTreasuryAccountsForClub(clubId: string): Promise<TreasuryAccount[]>;
  listTreasuryCategoriesForClub(clubId: string): Promise<TreasuryCategory[]>;
  listClubActivitiesForClub(clubId: string): Promise<ClubActivity[]>;
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
    accountScope: TreasuryAccount["accountScope"];
    status: TreasuryAccount["status"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
    currencies: string[];
  }): Promise<TreasuryAccount | null>;
  updateTreasuryAccount(input: {
    accountId: string;
    clubId: string;
    name: string;
    accountType: TreasuryAccount["accountType"];
    accountScope: TreasuryAccount["accountScope"];
    status: TreasuryAccount["status"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
    currencies: string[];
  }): Promise<TreasuryAccount | null>;
  createTreasuryCategory(input: {
    clubId: string;
    name: string;
    status: TreasuryCategory["status"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
  }): Promise<TreasuryCategory | null>;
  updateTreasuryCategory(input: {
    categoryId: string;
    clubId: string;
    name: string;
    status: TreasuryCategory["status"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
  }): Promise<TreasuryCategory | null>;
  createClubActivity(input: {
    clubId: string;
    name: string;
    status: ClubActivity["status"];
    emoji: string | null;
  }): Promise<ClubActivity | null>;
  updateClubActivity(input: {
    activityId: string;
    clubId: string;
    name: string;
    status: ClubActivity["status"];
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
  }): Promise<ReceiptFormat | null>;
  findTreasuryAdjustmentCategory(clubId: string): Promise<TreasuryCategory | null>;
  getDailyCashSessionByDate(clubId: string, sessionDate: string): Promise<DailyCashSession | null>;
  createDailyCashSession(
    clubId: string,
    sessionDate: string,
    openedByUserId: string
  ): Promise<DailyCashSession | null>;
  closeDailyCashSession(sessionId: string, closedByUserId: string): Promise<DailyCashSession | null>;
  listTreasuryMovementsBySession(sessionId: string): Promise<TreasuryMovement[]>;
  listTreasuryMovementsByAccount(clubId: string, accountId: string, movementDate: string): Promise<TreasuryMovement[]>;
  createTreasuryMovement(input: {
    clubId: string;
    dailyCashSessionId: string;
    accountId: string;
    movementType: TreasuryMovementType;
    categoryId: string;
    concept: string;
    currencyCode: string;
    amount: number;
    activityId?: string | null;
    receiptNumber?: string | null;
    movementDate: string;
    createdByUserId: string;
  }): Promise<TreasuryMovement | null>;
  recordDailyCashSessionBalances(
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
  receiptFormats: ReceiptFormat[];
  clubTreasuryCurrencies: TreasuryCurrencyConfig[];
  movementTypeConfig: MovementTypeConfig[];
  dailyCashSessions: DailyCashSession[];
  dailyCashSessionBalances: DailyCashSessionBalance[];
  balanceAdjustments: BalanceAdjustment[];
  treasuryMovements: TreasuryMovement[];
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
      status: "active"
    },
    {
      id: CLUB_SUR_ID,
      name: "Club Social del Sur",
      slug: "club-social-del-sur",
      status: "active"
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

  const treasuryAccounts: TreasuryAccount[] = [
    {
      id: "account-secretaria-caja-001",
      clubId: CLUB_ID,
      name: "Caja principal",
      accountType: "efectivo",
      accountScope: "secretaria",
      status: "active",
      visibleForSecretaria: true,
      visibleForTesoreria: false,
      emoji: "💵",
      currencies: ["ARS"]
    },
    {
      id: "account-secretaria-banco-001",
      clubId: CLUB_ID,
      name: "Banco operativo",
      accountType: "bancaria",
      accountScope: "secretaria",
      status: "active",
      visibleForSecretaria: true,
      visibleForTesoreria: false,
      emoji: "🏦",
      currencies: ["ARS"]
    },
    {
      id: "account-secretaria-sur-001",
      clubId: CLUB_SUR_ID,
      name: "Caja Sur",
      accountType: "efectivo",
      accountScope: "secretaria",
      status: "active",
      visibleForSecretaria: true,
      visibleForTesoreria: false,
      emoji: "💼",
      currencies: ["ARS"]
    },
    {
      id: "account-tesoreria-inversion-001",
      clubId: CLUB_ID,
      name: "Caja de inversion",
      accountType: "bancaria",
      accountScope: "tesoreria",
      status: "active",
      visibleForSecretaria: false,
      visibleForTesoreria: true,
      emoji: "📈",
      currencies: ["USD", "EUR"]
    },
    {
      id: "account-tesoreria-reserva-001",
      clubId: CLUB_ID,
      name: "Reserva institucional",
      accountType: "bancaria",
      accountScope: "tesoreria",
      status: "inactive",
      visibleForSecretaria: false,
      visibleForTesoreria: true,
      emoji: "🏛️",
      currencies: ["USD"]
    }
  ];

  const treasuryCategories: TreasuryCategory[] = [
    {
      id: "category-cuotas-001",
      clubId: CLUB_ID,
      name: "Cuotas",
      status: "active",
      visibleForSecretaria: true,
      visibleForTesoreria: true,
      emoji: "📄"
    },
    {
      id: "category-gastos-001",
      clubId: CLUB_ID,
      name: "Gastos operativos",
      status: "active",
      visibleForSecretaria: true,
      visibleForTesoreria: true,
      emoji: "🧾"
    },
    {
      id: "category-ajuste-001",
      clubId: CLUB_ID,
      name: "Ajuste",
      status: "active",
      visibleForSecretaria: true,
      visibleForTesoreria: false,
      emoji: "⚖️"
    },
    {
      id: "category-sur-001",
      clubId: CLUB_SUR_ID,
      name: "Cuotas Sur",
      status: "active",
      visibleForSecretaria: true,
      visibleForTesoreria: true,
      emoji: "📄"
    },
    {
      id: "category-ajuste-sur-001",
      clubId: CLUB_SUR_ID,
      name: "Ajuste",
      status: "active",
      visibleForSecretaria: true,
      visibleForTesoreria: false,
      emoji: "⚖️"
    }
  ];

  const clubActivities: ClubActivity[] = [
    {
      id: "activity-boxeo-001",
      clubId: CLUB_ID,
      name: "Boxeo",
      status: "active",
      emoji: "🥊"
    },
    {
      id: "activity-futsal-001",
      clubId: CLUB_ID,
      name: "Futsal",
      status: "inactive",
      emoji: "⚽"
    },
    {
      id: "activity-sur-001",
      clubId: CLUB_SUR_ID,
      name: "Hockey",
      status: "active",
      emoji: "🏑"
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
      status: "active"
    },
    {
      id: "receipt-format-modern-001",
      clubId: CLUB_ID,
      name: "Recibo moderno",
      validationType: "pattern",
      pattern: "^RC-[0-9]{6}$",
      minNumericValue: null,
      example: "RC-000123",
      status: "active"
    },
    {
      id: "receipt-format-sur-001",
      clubId: CLUB_SUR_ID,
      name: "Recibo Sur",
      validationType: "pattern",
      pattern: "^SUR-[0-9]{4}$",
      minNumericValue: null,
      example: "SUR-0101",
      status: "active"
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

  const dailyCashSessions: DailyCashSession[] = [];
  const dailyCashSessionBalances: DailyCashSessionBalance[] = [];
  const balanceAdjustments: BalanceAdjustment[] = [];
  const treasuryMovements: TreasuryMovement[] = [];

  return {
    users,
    memberships,
    clubs,
    invitations,
    treasuryAccounts,
    treasuryCategories,
    clubActivities,
    receiptFormats,
    clubTreasuryCurrencies,
    movementTypeConfig,
    dailyCashSessions,
    dailyCashSessionBalances,
    balanceAdjustments,
    treasuryMovements,
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
}): Club {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: "active"
  };
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
    account_scope: TreasuryAccount["accountScope"];
    status: TreasuryAccount["status"];
    visible_for_secretaria: boolean | null;
    visible_for_tesoreria: boolean | null;
    emoji: string | null;
  },
  currencies: string[]
): TreasuryAccount {
  return {
    id: row.id,
    clubId: row.club_id,
    name: row.name,
    accountType: row.account_type,
    accountScope: row.account_scope,
    status: row.status,
    visibleForSecretaria: row.visible_for_secretaria ?? true,
    visibleForTesoreria: row.visible_for_tesoreria ?? true,
    emoji: row.emoji,
    currencies
  };
}

function mapTreasuryCategoryRow(row: {
  id: string;
  club_id: string;
  name: string;
  status: TreasuryCategory["status"];
  visible_for_secretaria: boolean | null;
  visible_for_tesoreria: boolean | null;
  emoji: string | null;
}): TreasuryCategory {
  return {
    id: row.id,
    clubId: row.club_id,
    name: row.name,
    status: row.status,
    visibleForSecretaria: row.visible_for_secretaria ?? true,
    visibleForTesoreria: row.visible_for_tesoreria ?? true,
    emoji: row.emoji
  };
}

function mapClubActivityRow(row: {
  id: string;
  club_id: string;
  name: string;
  status: ClubActivity["status"];
  emoji: string | null;
}): ClubActivity {
  return {
    id: row.id,
    clubId: row.club_id,
    name: row.name,
    status: row.status,
    emoji: row.emoji
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
}): ReceiptFormat {
  return {
    id: row.id,
    clubId: row.club_id,
    name: row.name,
    validationType: row.validation_type,
    pattern: row.pattern,
    minNumericValue: row.min_numeric_value,
    example: row.example,
    status: row.status
  };
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

function createAccessSupabaseClient(client?: AccessRepositoryClient) {
  if (!shouldUseSupabaseDatabase()) {
    return null;
  }

  return client ?? createServerSupabaseClient();
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
    .select("id,name,slug,status")
    .eq("id", clubId)
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
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("treasury_accounts")
    .select(
      "id,club_id,name,account_type,account_scope,status,visible_for_secretaria,visible_for_tesoreria,emoji,treasury_account_currencies(currency_code)"
    )
    .eq("club_id", clubId)
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row: {
    id: string;
    club_id: string;
    name: string;
    account_type: TreasuryAccount["accountType"];
    account_scope: TreasuryAccount["accountScope"];
    status: TreasuryAccount["status"];
    visible_for_secretaria: boolean | null;
    visible_for_tesoreria: boolean | null;
    emoji: string | null;
    treasury_account_currencies?: Array<{ currency_code: string }>;
  }) =>
    mapTreasuryAccountRow(
      row,
      (row.treasury_account_currencies ?? []).map((currency) => currency.currency_code)
    )
  );
}

async function listRealTreasuryCategoriesForClub(clubId: string, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("treasury_categories")
    .select("id,club_id,name,status,visible_for_secretaria,visible_for_tesoreria,emoji")
    .eq("club_id", clubId)
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map(mapTreasuryCategoryRow);
}

async function listRealClubActivitiesForClub(clubId: string, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("club_activities")
    .select("id,club_id,name,status,emoji")
    .eq("club_id", clubId)
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map(mapClubActivityRow);
}

async function listRealReceiptFormatsForClub(clubId: string, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("receipt_formats")
    .select("id,club_id,name,validation_type,pattern,min_numeric_value,example,status")
    .eq("club_id", clubId)
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map(mapReceiptFormatRow);
}

async function listRealTreasuryCurrenciesForClub(clubId: string, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("club_treasury_currencies")
    .select("club_id,currency_code,is_primary")
    .eq("club_id", clubId)
    .order("currency_code", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map(mapTreasuryCurrencyRow);
}

async function listRealMovementTypeConfigForClub(clubId: string, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("club_movement_type_config")
    .select("club_id,movement_type,is_enabled")
    .eq("club_id", clubId)
    .order("movement_type", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map(mapMovementTypeConfigRow);
}

async function syncRealTreasuryCurrenciesToAccounts(
  clubId: string,
  currencies: Array<{
    currencyCode: TreasuryCurrencyCode;
    isPrimary: boolean;
  }>,
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return;
  }

  const { data: accounts, error: accountsError } = await supabase
    .from("treasury_accounts")
    .select("id,treasury_account_currencies(currency_code)")
    .eq("club_id", clubId);

  if (accountsError || !accounts) {
    return;
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
    await supabase.from("treasury_account_currencies").delete().eq("account_id", account.id);

    if (!fallbackCurrencyCode) {
      continue;
    }

    const nextCurrencies = alignAccountCurrenciesWithClubSelection(
      (account.treasury_account_currencies ?? []).map((currency) => currency.currency_code),
      allowedCurrencies,
      fallbackCurrencyCode
    );

    await supabase.from("treasury_account_currencies").insert(
      nextCurrencies.map((currencyCode) => ({
        account_id: account.id,
        currency_code: currencyCode
      }))
    );
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
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return [];
  }

  await supabase.from("club_treasury_currencies").delete().eq("club_id", input.clubId);

  const { error } = await supabase.from("club_treasury_currencies").insert(
    input.currencies.map((currency) => ({
      club_id: input.clubId,
      currency_code: currency.currencyCode,
      is_primary: currency.isPrimary
    }))
  );

  if (error) {
    return [];
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
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return [];
  }

  await supabase.from("club_movement_type_config").delete().eq("club_id", input.clubId);

  const { error } = await supabase.from("club_movement_type_config").insert(
    input.movementTypes.map((movementType) => ({
      club_id: input.clubId,
      movement_type: movementType.movementType,
      is_enabled: movementType.isEnabled
    }))
  );

  if (error) {
    return [];
  }

  return listRealMovementTypeConfigForClub(input.clubId, client);
}

async function createRealTreasuryAccount(
  input: {
    clubId: string;
    name: string;
    accountType: TreasuryAccount["accountType"];
    accountScope: TreasuryAccount["accountScope"];
    status: TreasuryAccount["status"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
    currencies: string[];
  },
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("treasury_accounts")
    .insert({
      club_id: input.clubId,
      name: input.name,
      account_type: input.accountType,
      account_scope: input.accountScope,
      status: input.status,
      visible_for_secretaria: input.visibleForSecretaria,
      visible_for_tesoreria: input.visibleForTesoreria,
      emoji: input.emoji
    })
    .select("id,club_id,name,account_type,account_scope,status,visible_for_secretaria,visible_for_tesoreria,emoji")
    .single();

  if (error || !data) {
    return null;
  }

  if (input.currencies.length > 0) {
    const { error: currenciesError } = await supabase.from("treasury_account_currencies").insert(
      input.currencies.map((currencyCode) => ({
        account_id: data.id,
        currency_code: currencyCode
      }))
    );

    if (currenciesError) {
      return null;
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
    accountScope: TreasuryAccount["accountScope"];
    status: TreasuryAccount["status"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
    currencies: string[];
  },
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("treasury_accounts")
    .update({
      name: input.name,
      account_type: input.accountType,
      account_scope: input.accountScope,
      status: input.status,
      visible_for_secretaria: input.visibleForSecretaria,
      visible_for_tesoreria: input.visibleForTesoreria,
      emoji: input.emoji
    })
    .eq("id", input.accountId)
    .eq("club_id", input.clubId)
    .select("id,club_id,name,account_type,account_scope,status,visible_for_secretaria,visible_for_tesoreria,emoji")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  await supabase.from("treasury_account_currencies").delete().eq("account_id", input.accountId);

  if (input.currencies.length > 0) {
    const { error: currenciesError } = await supabase.from("treasury_account_currencies").insert(
      input.currencies.map((currencyCode) => ({
        account_id: input.accountId,
        currency_code: currencyCode
      }))
    );

    if (currenciesError) {
      return null;
    }
  }

  return mapTreasuryAccountRow(data, input.currencies);
}

async function createRealTreasuryCategory(
  input: {
    clubId: string;
    name: string;
    status: TreasuryCategory["status"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("treasury_categories")
    .insert({
      club_id: input.clubId,
      name: input.name,
      status: input.status,
      visible_for_secretaria: input.visibleForSecretaria,
      visible_for_tesoreria: input.visibleForTesoreria,
      emoji: input.emoji
    })
    .select("id,club_id,name,status,visible_for_secretaria,visible_for_tesoreria,emoji")
    .single();

  if (error || !data) {
    return null;
  }

  return mapTreasuryCategoryRow(data);
}

async function updateRealTreasuryCategory(
  input: {
    categoryId: string;
    clubId: string;
    name: string;
    status: TreasuryCategory["status"];
    visibleForSecretaria: boolean;
    visibleForTesoreria: boolean;
    emoji: string | null;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("treasury_categories")
    .update({
      name: input.name,
      status: input.status,
      visible_for_secretaria: input.visibleForSecretaria,
      visible_for_tesoreria: input.visibleForTesoreria,
      emoji: input.emoji
    })
    .eq("id", input.categoryId)
    .eq("club_id", input.clubId)
    .select("id,club_id,name,status,visible_for_secretaria,visible_for_tesoreria,emoji")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapTreasuryCategoryRow(data);
}

async function createRealClubActivity(
  input: {
    clubId: string;
    name: string;
    status: ClubActivity["status"];
    emoji: string | null;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("club_activities")
    .insert({
      club_id: input.clubId,
      name: input.name,
      status: input.status,
      emoji: input.emoji
    })
    .select("id,club_id,name,status,emoji")
    .single();

  if (error || !data) {
    return null;
  }

  return mapClubActivityRow(data);
}

async function updateRealClubActivity(
  input: {
    activityId: string;
    clubId: string;
    name: string;
    status: ClubActivity["status"];
    emoji: string | null;
  },
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("club_activities")
    .update({
      name: input.name,
      status: input.status,
      emoji: input.emoji
    })
    .eq("id", input.activityId)
    .eq("club_id", input.clubId)
    .select("id,club_id,name,status,emoji")
    .maybeSingle();

  if (error || !data) {
    return null;
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
  },
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("receipt_formats")
    .insert({
      club_id: input.clubId,
      name: input.name,
      validation_type: input.validationType,
      pattern: input.pattern,
      min_numeric_value: input.minNumericValue,
      example: input.example,
      status: input.status
    })
    .select("id,club_id,name,validation_type,pattern,min_numeric_value,example,status")
    .single();

  if (error || !data) {
    return null;
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
  },
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("receipt_formats")
    .update({
      name: input.name,
      validation_type: input.validationType,
      pattern: input.pattern,
      min_numeric_value: input.minNumericValue,
      example: input.example,
      status: input.status
    })
    .eq("id", input.receiptFormatId)
    .eq("club_id", input.clubId)
    .select("id,club_id,name,validation_type,pattern,min_numeric_value,example,status")
    .maybeSingle();

  if (error || !data) {
    return null;
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

    return getStore().treasuryCategories.filter((category) => category.clubId === clubId);
  },
  async listClubActivitiesForClub(clubId) {
    if (shouldUseSupabaseDatabase()) {
      return listRealClubActivitiesForClub(clubId);
    }

    return getStore().clubActivities.filter((activity) => activity.clubId === clubId);
  },
  async listReceiptFormatsForClub(clubId) {
    if (shouldUseSupabaseDatabase()) {
      return listRealReceiptFormatsForClub(clubId);
    }

    return getStore().receiptFormats.filter((format) => format.clubId === clubId);
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
      accountScope: input.accountScope,
      status: input.status,
      visibleForSecretaria: input.visibleForSecretaria,
      visibleForTesoreria: input.visibleForTesoreria,
      emoji: input.emoji,
      currencies: input.currencies
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
    account.accountScope = input.accountScope;
    account.status = input.status;
    account.visibleForSecretaria = input.visibleForSecretaria;
    account.visibleForTesoreria = input.visibleForTesoreria;
    account.emoji = input.emoji;
    account.currencies = input.currencies;

    return account;
  },
  async createTreasuryCategory(input) {
    if (shouldUseSupabaseDatabase()) {
      return createRealTreasuryCategory(input);
    }

    const category: TreasuryCategory = {
      id: `category-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      clubId: input.clubId,
      name: input.name,
      status: input.status,
      visibleForSecretaria: input.visibleForSecretaria,
      visibleForTesoreria: input.visibleForTesoreria,
      emoji: input.emoji
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

    category.name = input.name;
    category.status = input.status;
    category.visibleForSecretaria = input.visibleForSecretaria;
    category.visibleForTesoreria = input.visibleForTesoreria;
    category.emoji = input.emoji;

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
      status: input.status,
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
    activity.status = input.status;
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
      status: input.status
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
    return receiptFormat;
  },
  async findTreasuryAdjustmentCategory(clubId) {
    if (shouldUseSupabaseDatabase()) {
      const categories = await listRealTreasuryCategoriesForClub(clubId);
      return (
        categories.find((category) => category.name.toLowerCase() === "ajuste") ?? null
      );
    }

    return (
      getStore().treasuryCategories.find(
        (category) => category.clubId === clubId && category.name.toLowerCase() === "ajuste"
      ) ?? null
    );
  },
  async getDailyCashSessionByDate(clubId, sessionDate) {
    return (
      getStore().dailyCashSessions.find(
        (session) => session.clubId === clubId && session.sessionDate === sessionDate
      ) ?? null
    );
  },
  async createDailyCashSession(clubId, sessionDate, openedByUserId) {
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
  async closeDailyCashSession(sessionId, closedByUserId) {
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
  async listTreasuryMovementsBySession(sessionId) {
    return getStore().treasuryMovements.filter((movement) => movement.dailyCashSessionId === sessionId);
  },
  async listTreasuryMovementsByAccount(clubId, accountId, movementDate) {
    return getStore().treasuryMovements.filter(
      (movement) =>
        movement.clubId === clubId &&
        movement.accountId === accountId &&
        movement.movementDate === movementDate
    );
  },
  async createTreasuryMovement(input) {
    const movement: TreasuryMovement = {
      id: `movement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      clubId: input.clubId,
      dailyCashSessionId: input.dailyCashSessionId,
      accountId: input.accountId,
      movementType: input.movementType,
      categoryId: input.categoryId,
      concept: input.concept,
      currencyCode: input.currencyCode,
      amount: input.amount,
      activityId: input.activityId ?? null,
      receiptNumber: input.receiptNumber ?? null,
      movementDate: input.movementDate,
      createdByUserId: input.createdByUserId,
      status: "pending_consolidation",
      createdAt: now()
    };

    getStore().treasuryMovements.push(movement);
    return movement;
  },
  async recordDailyCashSessionBalances(input) {
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
