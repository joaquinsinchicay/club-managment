import { NextRequest, NextResponse } from "next/server";

import { startGoogleSignIn } from "@/lib/auth/service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const result = searchParams.get("mockResult");
  const profile = searchParams.get("mockProfile");

  if (result === "cancelled") {
    return NextResponse.redirect(new URL("/login?error=oauth_cancelled", request.url));
  }

  const destination = await startGoogleSignIn({
    requestUrl: request.url,
    mockProfile: profile ?? undefined
  });

  return destination;
}
