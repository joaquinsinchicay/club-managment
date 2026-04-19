import { Suspense } from "react";
import { redirect } from "next/navigation";

import { GoogleLoginCard } from "@/components/auth/google-login-card";
import { resolveCurrentUserDestination } from "@/lib/auth/service";

import { OAuthErrorBridge } from "./oauth-error-bridge";

export default async function LoginPage() {
  const destination = await resolveCurrentUserDestination();

  if (destination !== "/login") {
    redirect(destination);
  }

  return (
    <>
      <Suspense fallback={null}>
        <OAuthErrorBridge />
      </Suspense>
      <GoogleLoginCard />
    </>
  );
}
