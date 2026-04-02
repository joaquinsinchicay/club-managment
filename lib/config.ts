import { hasSupabaseBrowserConfig } from "@/lib/supabase/env";

export const appConfig = {
  authProviderMode: process.env.AUTH_PROVIDER_MODE ?? (hasSupabaseBrowserConfig() ? "supabase" : "mock"),
  supabaseProjectRef: process.env.SUPABASE_PROJECT_REF ?? "qfiyxpaxbdhbeapksyjp"
} as const;
