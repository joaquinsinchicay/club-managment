export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SECRET_KEY ?? ""
  };
}

export function hasSupabaseBrowserConfig() {
  const env = getSupabaseEnv();
  return Boolean(env.url && env.publishableKey);
}

export function hasSupabaseAdminConfig() {
  const env = getSupabaseEnv();
  return Boolean(env.url && env.serviceRoleKey);
}
