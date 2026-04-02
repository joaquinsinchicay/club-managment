import { redirect } from "next/navigation";

import { GoogleLoginCard } from "@/components/auth/google-login-card";
import { resolveCurrentUserDestination } from "@/lib/auth/service";

type LoginPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const destination = await resolveCurrentUserDestination();

  if (destination !== "/login") {
    redirect(destination);
  }

  return <GoogleLoginCard searchParams={searchParams} />;
}
