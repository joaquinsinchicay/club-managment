import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv, hasSupabaseAdminConfig } from "@/lib/supabase/env";

export function createAdminSupabaseClient() {
  if (!hasSupabaseAdminConfig()) {
    return null;
  }

  const env = getSupabaseEnv();

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
