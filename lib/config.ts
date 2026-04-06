import { hasSupabaseBrowserConfig } from "@/lib/supabase/env";

function resolveAuthProviderMode() {
  const configuredMode = process.env.AUTH_PROVIDER_MODE;
  const hasSupabaseConfig = hasSupabaseBrowserConfig();
  const isProductionDeployment =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

  if (hasSupabaseConfig && (!configuredMode || isProductionDeployment)) {
    return "supabase";
  }

  return configuredMode ?? (hasSupabaseConfig ? "supabase" : "mock");
}

export const appConfig = {
  authProviderMode: resolveAuthProviderMode(),
  supabaseProjectRef: process.env.SUPABASE_PROJECT_REF ?? "qfiyxpaxbdhbeapksyjp"
} as const;
