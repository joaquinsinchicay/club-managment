import { NextResponse } from "next/server";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { appConfig } from "@/lib/config";
import type {
  AuthIdentity,
  AvailableClub,
  Club,
  GoogleProfileKey,
  Membership,
  User
} from "@/lib/domain/access";
import { sortMembershipRoles } from "@/lib/domain/membership-roles";
import { accessRepository } from "@/lib/repositories/access-repository";
import { processPendingInvitationsForUser } from "@/lib/services/club-invitations-service";
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

const DEV_BYPASS_SEED_EMAIL = "active.user@example.com";

export type SessionContext = {
  user: User;
  memberships: Membership[];
  activeMemberships: Membership[];
  activeMembership: Membership | null;
  activeClub: Club | null;
  availableClubs: AvailableClub[];
};

type StartGoogleSignInInput = {
  requestUrl: string;
  mockProfile?: string;
};

function resolveAppUrl(requestUrl: string) {
  return appConfig.canonicalAppUrl || new URL(requestUrl).origin;
}

function shouldUseVercelProtectionBypass(appUrl: string) {
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const isPreviewDeployment = process.env.VERCEL_TARGET_ENV === "preview";
  const isVercelHostname = new URL(appUrl).hostname.endsWith(".vercel.app");

  return Boolean(bypassSecret && isPreviewDeployment && isVercelHostname);
}

function buildOAuthCallbackUrl(appUrl: string) {
  const callbackUrl = new URL("/auth/callback", appUrl);

  if (!shouldUseVercelProtectionBypass(appUrl)) {
    return callbackUrl.toString();
  }

  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET!;
  callbackUrl.searchParams.set("x-vercel-protection-bypass", bypassSecret);
  callbackUrl.searchParams.set("x-vercel-set-bypass-cookie", "samesitenone");

  return callbackUrl.toString();
}

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

async function buildAvailableClubs(activeMemberships: Membership[], client?: AuthServiceClient) {
  const clubs = await Promise.all(
    activeMemberships.map(async (membership) => {
      const club = await accessRepository.findClubById(membership.clubId, client);

      if (!club) {
        return null;
      }

      return {
        id: club.id,
        name: club.name,
        slug: club.slug,
        roles: sortMembershipRoles(membership.roles),
        status: membership.status
      } satisfies AvailableClub;
    })
  );

  return clubs.filter((club): club is AvailableClub => Boolean(club));
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
  if (appConfig.devAuthBypassEnabled) {
    const user = await accessRepository.findUserByEmail(DEV_BYPASS_SEED_EMAIL);

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
  const availableClubs = await buildAvailableClubs(activeMemberships);

  return {
    user,
    memberships,
    activeMemberships,
    activeMembership,
    activeClub,
    availableClubs
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
  const availableClubs = await buildAvailableClubs(activeMemberships);

  return {
    user,
    memberships,
    activeMemberships,
    activeMembership,
    activeClub,
    availableClubs
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
    const appUrl = resolveAppUrl(requestUrl);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildOAuthCallbackUrl(appUrl)
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
  await processPendingInvitationsForUser(user.id, user.email);

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
  await processPendingInvitationsForUser(syncedUser.id, syncedUser.email);
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
