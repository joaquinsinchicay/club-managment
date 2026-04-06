import { hasSupabaseBrowserConfig } from "@/lib/supabase/env";

function resolveAuthProviderMode() {
  const configuredMode = process.env.AUTH_PROVIDER_MODE;
  const hasSupabaseConfig = hasSupabaseBrowserConfig();
  const isVercelDeployment = process.env.VERCEL === "1";

  if (hasSupabaseConfig && (!configuredMode || isVercelDeployment)) {
    return "supabase";
  }

  return configuredMode ?? (hasSupabaseConfig ? "supabase" : "mock");
}

export const appConfig = {
  authProviderMode: resolveAuthProviderMode(),
  supabaseProjectRef: process.env.SUPABASE_PROJECT_REF ?? "qfiyxpaxbdhbeapksyjp"
} as const;
