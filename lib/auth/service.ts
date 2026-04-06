import { NextResponse } from "next/server";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { appConfig } from "@/lib/config";
import type { AuthIdentity, Club, GoogleProfileKey, Membership, User } from "@/lib/domain/access";
import { accessRepository } from "@/lib/repositories/access-repository";
import {
  clearCurrentAuthUserId,
  clearCurrentActiveClubId,
  getCurrentAuthUserId,
  getCurrentActiveClubId,
  setCurrentAuthUserId,
  setCurrentActiveClubId
} from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AuthServiceClient = ReturnType<typeof createServerSupabaseClient>;

export type SessionContext = {
  user: User;
  memberships: Membership[];
  activeMemberships: Membership[];
  activeMembership: Membership | null;
  activeClub: Club | null;
};

type StartGoogleSignInInput = {
  requestUrl: string;
  mockProfile?: string;
};

function getRequestedProfile(mockProfile?: string): GoogleProfileKey {
  if (
    mockProfile === "existing_pending" ||
    mockProfile === "existing_active" ||
    mockProfile === "existing_secretaria"
  ) {
    return mockProfile;
  }

  return "new_pending";
}

function mapAuthIdentityToUser(identity: AuthIdentity): User {
  return {
    id: identity.id,
    email: identity.email,
    fullName: identity.fullName,
    avatarUrl: identity.avatarUrl,
    createdAt: identity.createdAt,
    updatedAt: identity.updatedAt
  };
}

function buildAuthIdentityFromSupabaseUser(user: SupabaseUser): AuthIdentity {
  const userMetadata = user.user_metadata;
  const fullName =
    userMetadata.full_name ??
    userMetadata.name ??
    user.email ??
    user.id;
  const avatarUrl = userMetadata.avatar_url ?? userMetadata.picture ?? null;

  return {
    id: user.id,
    email: user.email ?? "",
    fullName,
    avatarUrl,
    createdAt: user.created_at ?? new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function resolveDestinationForUser(
  userId: string,
  currentActiveClubId?: string | null,
  client?: AuthServiceClient
) {
  const activeMemberships = await accessRepository.listActiveMembershipsForUser(userId, client);

  if (activeMemberships.length === 0) {
    return {
      destination: "/pending-approval",
      activeClubId: null
    };
  }

  const preferredClubId =
    currentActiveClubId ??
    (await accessRepository.getLastActiveClubId(userId, client)) ??
    activeMemberships[0]?.clubId ??
    null;

  const resolvedClubId =
    preferredClubId && activeMemberships.some((membership) => membership.clubId === preferredClubId)
      ? preferredClubId
      : activeMemberships[0]?.clubId ?? null;

  if (resolvedClubId) {
    await accessRepository.setLastActiveClubId(userId, resolvedClubId, client);
  }

  return {
    destination: resolvedClubId ? "/dashboard" : "/pending-approval",
    activeClubId: resolvedClubId
  };
}

async function getAuthenticatedIdentity(): Promise<AuthIdentity | null> {
  if (appConfig.authProviderMode === "mock") {
    const userId = await getCurrentAuthUserId();

    if (!userId) {
      return null;
    }

    const user = await accessRepository.findUserById(userId);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user ? buildAuthIdentityFromSupabaseUser(user) : null;
}

export async function getSessionContext(
  userId: string,
  activeClubId?: string | null,
  fallbackUser?: User
): Promise<SessionContext> {
  const user = (await accessRepository.findUserById(userId)) ?? fallbackUser;

  if (!user) {
    throw new Error("Session user was not found");
  }

  const memberships = await accessRepository.listMembershipsForUser(userId);
  const activeMemberships = memberships.filter((membership) => membership.status === "activo");
  const preferredClubId = activeClubId ?? (await accessRepository.getLastActiveClubId(userId));

  const resolvedClubId =
    preferredClubId && activeMemberships.some((membership) => membership.clubId === preferredClubId)
      ? preferredClubId
      : activeMemberships[0]?.clubId ?? null;
  const activeMembership =
    activeMemberships.find((membership) => membership.clubId === resolvedClubId) ?? null;
  const activeClub = resolvedClubId ? await accessRepository.findClubById(resolvedClubId) : null;

  return {
    user,
    memberships,
    activeMemberships,
    activeMembership,
    activeClub
  };
}

export async function getAuthenticatedSessionContext(): Promise<SessionContext | null> {
  const identity = await getAuthenticatedIdentity();

  if (!identity) {
    return null;
  }

  const fallbackUser = mapAuthIdentityToUser(identity);
  const persistedUser = identity.email
    ? await accessRepository.findUserByEmail(identity.email)
    : await accessRepository.findUserById(identity.id);
  const user = persistedUser ?? fallbackUser;
  const userId = persistedUser?.id ?? identity.id;
  const memberships = await accessRepository.listMembershipsForUser(userId);
  const activeMemberships = memberships.filter((membership) => membership.status === "activo");
  const preferredClubId = await getCurrentActiveClubId();
  const storedClubId = await accessRepository.getLastActiveClubId(userId);
  const resolvedClubId =
    preferredClubId && activeMemberships.some((membership) => membership.clubId === preferredClubId)
      ? preferredClubId
      : storedClubId && activeMemberships.some((membership) => membership.clubId === storedClubId)
        ? storedClubId
        : activeMemberships[0]?.clubId ?? null;
  const activeMembership =
    activeMemberships.find((membership) => membership.clubId === resolvedClubId) ?? null;
  const activeClub = resolvedClubId ? await accessRepository.findClubById(resolvedClubId) : null;

  return {
    user,
    memberships,
    activeMemberships,
    activeMembership,
    activeClub
  };
}

export async function resolveCurrentUserDestination(): Promise<string> {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    return "/login";
  }

  if (context.activeMemberships.length === 0 || !context.activeClub) {
    return "/pending-approval";
  }

  return "/dashboard";
}

export async function startGoogleSignIn({
  requestUrl,
  mockProfile
}: StartGoogleSignInInput): Promise<NextResponse> {
  if (appConfig.authProviderMode !== "mock") {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: new URL("/auth/callback", requestUrl).toString()
      }
    });

    if (error || !data.url) {
      return NextResponse.redirect(new URL("/login?error=oauth_generic_error", requestUrl));
    }

    return NextResponse.redirect(data.url);
  }

  const profile = accessRepository.getGoogleProfile(getRequestedProfile(mockProfile));
  const existingUser = await accessRepository.findUserByEmail(profile.email);
  const user = existingUser
    ? await accessRepository.updateUserFromGoogleProfile(existingUser.id, profile)
    : await accessRepository.createUserFromGoogleProfile(profile);

  const resolution = await resolveDestinationForUser(user.id);
  const response = NextResponse.redirect(new URL(resolution.destination, requestUrl));

  setCurrentAuthUserId(response, user.id);

  if (resolution.activeClubId) {
    setCurrentActiveClubId(response, resolution.activeClubId);
  } else {
    clearCurrentActiveClubId(response);
  }

  return response;
}

export async function finishGoogleSignIn(requestUrl: string, code: string): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth_generic_error", requestUrl));
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=oauth_generic_error", requestUrl));
  }

  const identity = buildAuthIdentityFromSupabaseUser(user);
  const syncedUser = await accessRepository.syncUserProfileFromAuthIdentity(identity, supabase);
  const resolution = await resolveDestinationForUser(
    syncedUser.id,
    await getCurrentActiveClubId(),
    supabase
  );
  const response = NextResponse.redirect(new URL(resolution.destination, requestUrl));

  if (resolution.activeClubId) {
    setCurrentActiveClubId(response, resolution.activeClubId);
  } else {
    clearCurrentActiveClubId(response);
  }

  return response;
}

export async function signOut(requestUrl: string): Promise<NextResponse> {
  if (appConfig.authProviderMode !== "mock") {
    const supabase = createServerSupabaseClient();
    await supabase.auth.signOut();
  }

  const response = NextResponse.redirect(new URL("/login", requestUrl));
  clearCurrentActiveClubId(response);
  clearCurrentAuthUserId(response);
  return response;
}
