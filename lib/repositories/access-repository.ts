import { appConfig } from "@/lib/config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/env";
import type {
  AuthIdentity,
  Club,
  ClubInvitation,
  ClubMember,
  GoogleProfile,
  GoogleProfileKey,
  DailyCashSession,
  Membership,
  MembershipRole,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryMovement,
  User
} from "@/lib/domain/access";

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
  listPendingInvitationsByEmail(email: string, client?: AccessRepositoryClient): Promise<ClubInvitation[]>;
  listTreasuryAccountsForClub(clubId: string): Promise<TreasuryAccount[]>;
  listTreasuryCategoriesForClub(clubId: string): Promise<TreasuryCategory[]>;
  getDailyCashSessionByDate(clubId: string, sessionDate: string): Promise<DailyCashSession | null>;
  createDailyCashSession(
    clubId: string,
    sessionDate: string,
    openedByUserId: string
  ): Promise<DailyCashSession | null>;
  closeDailyCashSession(sessionId: string, closedByUserId: string): Promise<DailyCashSession | null>;
  listTreasuryMovementsBySession(sessionId: string): Promise<TreasuryMovement[]>;
  createTreasuryMovement(input: {
    clubId: string;
    dailyCashSessionId: string;
    accountId: string;
    movementType: "ingreso" | "egreso";
    categoryId: string;
    concept: string;
    currencyCode: string;
    amount: number;
    movementDate: string;
    createdByUserId: string;
  }): Promise<TreasuryMovement | null>;
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
  updateMembershipRole(
    membershipId: string,
    role: MembershipRole,
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
  dailyCashSessions: DailyCashSession[];
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
      role: "admin",
      status: "activo",
      joinedAt: createdAt
    },
    {
      id: "membership-admin-002",
      userId: SECOND_ADMIN_USER_ID,
      clubId: CLUB_ID,
      role: "admin",
      status: "activo",
      joinedAt: createdAt
    },
    {
      id: "membership-active-002",
      userId: ACTIVE_USER_ID,
      clubId: CLUB_SUR_ID,
      role: "tesoreria",
      status: "activo",
      joinedAt: createdAt
    },
    {
      id: "membership-secretaria-001",
      userId: SECRETARIA_USER_ID,
      clubId: CLUB_ID,
      role: "secretaria",
      status: "activo",
      joinedAt: createdAt
    },
    {
      id: "membership-secretaria-002",
      userId: SECRETARIA_USER_ID,
      clubId: CLUB_SUR_ID,
      role: "tesoreria",
      status: "activo",
      joinedAt: createdAt
    },
    {
      id: "membership-tesoreria-001",
      userId: TESORERIA_USER_ID,
      clubId: CLUB_ID,
      role: "tesoreria",
      status: "activo",
      joinedAt: createdAt
    },
    {
      id: "membership-pending-001",
      userId: PENDING_USER_ID,
      clubId: CLUB_ID,
      role: "secretaria",
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
      accountScope: "secretaria",
      currencies: ["ARS"]
    },
    {
      id: "account-secretaria-banco-001",
      clubId: CLUB_ID,
      name: "Banco operativo",
      accountScope: "secretaria",
      currencies: ["ARS"]
    },
    {
      id: "account-secretaria-sur-001",
      clubId: CLUB_SUR_ID,
      name: "Caja Sur",
      accountScope: "secretaria",
      currencies: ["ARS"]
    }
  ];

  const treasuryCategories: TreasuryCategory[] = [
    {
      id: "category-cuotas-001",
      clubId: CLUB_ID,
      name: "Cuotas"
    },
    {
      id: "category-gastos-001",
      clubId: CLUB_ID,
      name: "Gastos operativos"
    },
    {
      id: "category-sur-001",
      clubId: CLUB_SUR_ID,
      name: "Cuotas Sur"
    }
  ];

  const dailyCashSessions: DailyCashSession[] = [];
  const treasuryMovements: TreasuryMovement[] = [];

  return {
    users,
    memberships,
    clubs,
    invitations,
    treasuryAccounts,
    treasuryCategories,
    dailyCashSessions,
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

function mapMembershipRow(row: {
  id: string;
  user_id: string;
  club_id: string;
  role: "admin" | "secretaria" | "tesoreria";
  status: "pendiente_aprobacion" | "activo" | "inactivo";
  joined_at: string | null;
}): Membership {
  return {
    id: row.id,
    userId: row.user_id,
    clubId: row.club_id,
    role: row.role,
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
    role: membership.role,
    status: membership.status,
    joinedAt: membership.joinedAt
  };
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
    .select("id,user_id,club_id,role,status,joined_at")
    .eq("user_id", userId);

  if (error || !data) {
    return [];
  }

  return data.map(mapMembershipRow);
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
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("memberships")
    .select("id,user_id,club_id,role,status,joined_at")
    .eq("club_id", clubId);

  if (error || !data) {
    return [];
  }

  const memberships = data.map(mapMembershipRow);
  const users = await Promise.all(
    memberships.map(async (membership) => ({
      membership,
      user: await findRealUserById(membership.userId, supabase)
    }))
  );

  return users
    .filter((entry): entry is { membership: Membership; user: User } => Boolean(entry.user))
    .map((entry) => mapClubMemberFromMembership(entry.membership, entry.user));
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
    .select("id,user_id,club_id,role,status,joined_at")
    .single();

  if (error || !data) {
    return null;
  }

  return mapMembershipRow(data);
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
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const timestamp = now();
  const { data, error } = await supabase
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
    .select("id,user_id,club_id,role,status,joined_at")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapMembershipRow(data);
}

async function updateRealMembershipRole(
  membershipId: string,
  role: MembershipRole,
  client?: AccessRepositoryClient
) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("memberships")
    .update({
      role,
      updated_at: now()
    })
    .eq("id", membershipId)
    .select("id,user_id,club_id,role,status,joined_at")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapMembershipRow(data);
}

async function removeRealMembership(membershipId: string, client?: AccessRepositoryClient) {
  const supabase = createAccessSupabaseClient(client);

  if (!supabase) {
    return false;
  }

  const { error } = await supabase.from("memberships").delete().eq("id", membershipId);
  return !error;
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
    return getStore().treasuryAccounts.filter((account) => account.clubId === clubId);
  },
  async listTreasuryCategoriesForClub(clubId) {
    return getStore().treasuryCategories.filter((category) => category.clubId === clubId);
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
      movementDate: input.movementDate,
      createdByUserId: input.createdByUserId,
      status: "pending_consolidation",
      createdAt: now()
    };

    getStore().treasuryMovements.push(movement);
    return movement;
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
      role,
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
      role,
      status: "activo",
      joinedAt: timestamp
    };

    store.memberships[membershipIndex] = updatedMembership;
    return updatedMembership;
  },
  async updateMembershipRole(membershipId, role, client) {
    if (shouldUseSupabaseDatabase()) {
      return updateRealMembershipRole(membershipId, role, client);
    }

    const store = getStore();
    const membershipIndex = store.memberships.findIndex((membership) => membership.id === membershipId);

    if (membershipIndex === -1) {
      return null;
    }

    const updatedMembership: Membership = {
      ...store.memberships[membershipIndex],
      role
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
