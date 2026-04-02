import { NextRequest, NextResponse } from "next/server";

import { finishGoogleSignIn } from "@/lib/auth/service";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth_generic_error", request.url));
  }

  return finishGoogleSignIn(request.url, code);
}
