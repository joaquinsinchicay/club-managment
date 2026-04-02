import { redirect } from "next/navigation";

import { resolveCurrentUserDestination } from "@/lib/auth/service";

export default async function RootPage() {
  const destination = await resolveCurrentUserDestination();
  redirect(destination);
}
