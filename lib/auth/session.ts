import { NextResponse } from "next/server";

import { cookies } from "next/headers";

const ACTIVE_CLUB_COOKIE_NAME = "club_management_active_club_id";
const AUTH_USER_COOKIE_NAME = "club_management_auth_user_id";

function setSessionCookie(response: NextResponse, name: string, value: string) {
  response.cookies.set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });
}

export async function getCurrentActiveClubId(): Promise<string | null> {
  const cookieStore = cookies();
  return cookieStore.get(ACTIVE_CLUB_COOKIE_NAME)?.value ?? null;
}

export function setCurrentActiveClubId(response: NextResponse, clubId: string) {
  setSessionCookie(response, ACTIVE_CLUB_COOKIE_NAME, clubId);
}

export function clearCurrentActiveClubId(response: NextResponse) {
  response.cookies.delete(ACTIVE_CLUB_COOKIE_NAME);
}

export async function getCurrentAuthUserId(): Promise<string | null> {
  const cookieStore = cookies();
  return cookieStore.get(AUTH_USER_COOKIE_NAME)?.value ?? null;
}

export function setCurrentAuthUserId(response: NextResponse, userId: string) {
  setSessionCookie(response, AUTH_USER_COOKIE_NAME, userId);
}

export function clearCurrentAuthUserId(response: NextResponse) {
  response.cookies.delete(AUTH_USER_COOKIE_NAME);
}
