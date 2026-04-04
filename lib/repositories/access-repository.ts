import { appConfig } from "@/lib/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/env";
import type { AuthIdentity, Club, GoogleProfile, GoogleProfileKey, Membership, User } from "@/lib/domain/access";

type AccessRepository = {
  getGoogleProfile(profileKey: GoogleProfileKey): GoogleProfile;
  findUserByEmail(email: string): Promise<User | null>;
  createUserFromGoogleProfile(profile: GoogleProfile): Promise<User>;
  updateUserFromGoogleProfile(userId: string, profile: GoogleProfile): Promise<User>;
  findUserById(userId: string): Promise<User | null>;
  listMembershipsForUser(userId: string): Promise<Membership[]>;
  listActiveMembershipsForUser(userId: string): Promise<Membership[]>;
  findClubById(clubId: string): Promise<Club | null>;
  getLastActiveClubId(userId: string): Promise<string | null>;
  setLastActiveClubId(userId: string, clubId: string): Promise<void>;
  syncUserProfileFromAuthIdentity(identity: AuthIdentity): Promise<void>;
};

const now = () => new Date().toISOString();

const CLUB_ID = "club-atletico-ejemplo";
const ACTIVE_USER_ID = "user-active-001";
const PENDING_USER_ID = "user-pending-001";
const SECRETARIA_USER_ID = "user-secretaria-001";

type MockStore = {
  users: Map<string, User>;
  memberships: Membership[];
  clubs: Club[];
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
    ]
  ]);

  const clubs: Club[] = [
    {
      id: CLUB_ID,
      name: "Club Atletico Ejemplo",
      slug: "club-atletico-ejemplo",
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
      id: "membership-secretaria-001",
      userId: SECRETARIA_USER_ID,
      clubId: CLUB_ID,
      role: "secretaria",
      status: "activo",
      joinedAt: createdAt
    }
  ];

  const preferences = new Map<string, string>([
    [ACTIVE_USER_ID, CLUB_ID],
    [SECRETARIA_USER_ID, CLUB_ID]
  ]);

  return { users, memberships, clubs, preferences };
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

function shouldUseSupabaseDatabase() {
  return appConfig.authProviderMode !== "mock" && hasSupabaseBrowserConfig();
}

function createAccessSupabaseClient() {
  if (!shouldUseSupabaseDatabase()) {
    return null;
  }

  return createServerSupabaseClient();
}

async function findRealUserByEmail(email: string) {
  const supabase = createAccessSupabaseClient();

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

async function findRealUserById(userId: string) {
  const supabase = createAccessSupabaseClient();

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

async function listRealMembershipsForUser(userId: string) {
  const supabase = createAccessSupabaseClient();

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

async function findRealClubById(clubId: string) {
  const supabase = createAccessSupabaseClient();

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

async function getRealLastActiveClubId(userId: string) {
  const supabase = createAccessSupabaseClient();

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

async function setRealLastActiveClubId(userId: string, clubId: string) {
  const supabase = createAccessSupabaseClient();

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

async function syncRealUserProfileFromAuthIdentity(identity: AuthIdentity) {
  const supabase = createAccessSupabaseClient();

  if (!supabase) {
    return;
  }

  await supabase.from("users").upsert(
    {
      id: identity.id,
      email: identity.email,
      full_name: identity.fullName,
      avatar_url: identity.avatarUrl,
      updated_at: identity.updatedAt
    },
    {
      onConflict: "id"
    }
  );
}

export const accessRepository: AccessRepository = {
  getGoogleProfile(profileKey) {
    return GOOGLE_PROFILES[profileKey];
  },
  async findUserByEmail(email) {
    if (shouldUseSupabaseDatabase()) {
      return findRealUserByEmail(email);
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
  async findUserById(userId) {
    if (shouldUseSupabaseDatabase()) {
      return findRealUserById(userId);
    }

    return getStore().users.get(userId) ?? null;
  },
  async listMembershipsForUser(userId) {
    if (shouldUseSupabaseDatabase()) {
      return listRealMembershipsForUser(userId);
    }

    return getStore().memberships.filter((membership) => membership.userId === userId);
  },
  async listActiveMembershipsForUser(userId) {
    const memberships = shouldUseSupabaseDatabase()
      ? await listRealMembershipsForUser(userId)
      : getStore().memberships.filter((membership) => membership.userId === userId);

    return memberships.filter((membership) => membership.status === "activo");
  },
  async findClubById(clubId) {
    if (shouldUseSupabaseDatabase()) {
      return findRealClubById(clubId);
    }

    return getStore().clubs.find((club) => club.id === clubId) ?? null;
  },
  async getLastActiveClubId(userId) {
    if (shouldUseSupabaseDatabase()) {
      return getRealLastActiveClubId(userId);
    }

    return getStore().preferences.get(userId) ?? null;
  },
  async setLastActiveClubId(userId, clubId) {
    if (shouldUseSupabaseDatabase()) {
      await setRealLastActiveClubId(userId, clubId);
      return;
    }

    getStore().preferences.set(userId, clubId);
  },
  async syncUserProfileFromAuthIdentity(identity) {
    if (shouldUseSupabaseDatabase()) {
      await syncRealUserProfileFromAuthIdentity(identity);
      return;
    }

    getStore().users.set(identity.id, {
      id: identity.id,
      email: identity.email,
      fullName: identity.fullName,
      avatarUrl: identity.avatarUrl,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt
    });
  }
};
