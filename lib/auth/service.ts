import { NextResponse } from "next/server";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { appConfig } from "@/lib/config";
import type { AuthIdentity, Club, GoogleProfileKey, Membership, User } from "@/lib/domain/access";
import { accessRepository } from "@/lib/repositories/access-repository";
import {
  clearCurrentActiveClubId,
  getCurrentActiveClubId,
  setCurrentActiveClubId
} from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SessionContext = {
  user: User;
  memberships: Membership[];
  activeMemberships: Membership[];
  activeClub: Club | null;
};

type StartGoogleSignInInput = {
  requestUrl: string;
  mockProfile?: string;
};

function getRequestedProfile(mockProfile?: string): GoogleProfileKey {
  if (mockProfile === "existing_pending" || mockProfile === "existing_active") {
    return mockProfile;
  }

  return "new_pending";
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

async function resolveDestinationForUser(userId: string, currentActiveClubId?: string | null) {
  const activeMemberships = await accessRepository.listActiveMembershipsForUser(userId);

  if (activeMemberships.length === 0) {
    return {
      destination: "/pending-approval",
      activeClubId: null
    };
  }

  const preferredClubId =
    currentActiveClubId ??
    (await accessRepository.getLastActiveClubId(userId)) ??
    activeMemberships[0]?.clubId ??
    null;

  const resolvedClubId =
    preferredClubId && activeMemberships.some((membership) => membership.clubId === preferredClubId)
      ? preferredClubId
      : activeMemberships[0]?.clubId ?? null;

  if (resolvedClubId) {
    await accessRepository.setLastActiveClubId(userId, resolvedClubId);
  }

  return {
    destination: resolvedClubId ? "/dashboard" : "/pending-approval",
    activeClubId: resolvedClubId
  };
}

export async function getSessionContext(userId: string, activeClubId?: string | null): Promise<SessionContext> {
  const user = await accessRepository.findUserById(userId);

  if (!user) {
    throw new Error("Session user was not found");
  }

  const memberships = await accessRepository.listMembershipsForUser(userId);
  const activeMemberships = memberships.filter((membership) => membership.status === "activo");

  const resolvedClubId =
    activeClubId && activeMemberships.some((membership) => membership.clubId === activeClubId)
      ? activeClubId
      : activeMemberships[0]?.clubId ?? null;
  const activeClub = resolvedClubId ? await accessRepository.findClubById(resolvedClubId) : null;

  return {
    user,
    memberships,
    activeMemberships,
    activeClub
  };
}

export async function resolveCurrentUserDestination(): Promise<string> {
  if (appConfig.authProviderMode === "mock") {
    const activeClubId = await getCurrentActiveClubId();

    if (!activeClubId) {
      return "/login";
    }
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return "/login";
  }

  const resolution = await resolveDestinationForUser(user.id, await getCurrentActiveClubId());
  return resolution.destination;
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

  if (resolution.activeClubId) {
    setCurrentActiveClubId(response, resolution.activeClubId);
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
  await accessRepository.syncUserProfileFromAuthIdentity(identity);

  const resolution = await resolveDestinationForUser(user.id, await getCurrentActiveClubId());
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
  return response;
}
