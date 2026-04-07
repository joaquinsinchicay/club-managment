import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv, hasSupabaseAdminConfig } from "@/lib/supabase/env";

export class MissingSupabaseAdminConfigError extends Error {
  constructor() {
    super("Missing Supabase admin configuration.");
    this.name = "MissingSupabaseAdminConfigError";
  }
}

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

export function createRequiredAdminSupabaseClient() {
  const client = createAdminSupabaseClient();

  if (!client) {
    throw new MissingSupabaseAdminConfigError();
  }

  return client;
}
