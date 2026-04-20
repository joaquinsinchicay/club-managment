export function getSupabaseEnv() {
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    publishableKey,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey,
    projectRef: process.env.SUPABASE_PROJECT_REF ?? ""
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
