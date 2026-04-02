import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv, hasSupabaseBrowserConfig } from "@/lib/supabase/env";

export function createBrowserSupabaseClient() {
  if (!hasSupabaseBrowserConfig()) {
    return null;
  }

  const env = getSupabaseEnv();

  return createClient(env.url, env.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });
}
