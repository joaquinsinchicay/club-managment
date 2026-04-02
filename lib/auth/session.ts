import { NextResponse } from "next/server";

import { cookies } from "next/headers";

const ACTIVE_CLUB_COOKIE_NAME = "club_management_active_club_id";

export async function getCurrentActiveClubId(): Promise<string | null> {
  const cookieStore = cookies();
  return cookieStore.get(ACTIVE_CLUB_COOKIE_NAME)?.value ?? null;
}

export function setCurrentActiveClubId(response: NextResponse, clubId: string) {
  response.cookies.set(ACTIVE_CLUB_COOKIE_NAME, clubId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });
}

export function clearCurrentActiveClubId(response: NextResponse) {
  response.cookies.delete(ACTIVE_CLUB_COOKIE_NAME);
}
