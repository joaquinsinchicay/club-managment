import { hasSupabaseBrowserConfig } from "@/lib/supabase/env";

function resolveDevAuthBypassEnabled() {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  const flag = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS;
  return flag === "true" || flag === "1";
}

function resolveAuthProviderMode() {
  if (resolveDevAuthBypassEnabled()) {
    return "mock";
  }

  const configuredMode = process.env.AUTH_PROVIDER_MODE;
  const hasSupabaseConfig = hasSupabaseBrowserConfig();
  const isVercelDeployment = process.env.VERCEL === "1";

  if (hasSupabaseConfig && (!configuredMode || isVercelDeployment)) {
    return "supabase";
  }

  return configuredMode ?? (hasSupabaseConfig ? "supabase" : "mock");
}

function resolveCanonicalAppUrl() {
  const configuredUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    "";

  return configuredUrl.trim().replace(/\/+$/, "");
}

export const appConfig = {
  authProviderMode: resolveAuthProviderMode(),
  devAuthBypassEnabled: resolveDevAuthBypassEnabled(),
  supabaseProjectRef: process.env.SUPABASE_PROJECT_REF ?? "qfiyxpaxbdhbeapksyjp",
  canonicalAppUrl: resolveCanonicalAppUrl()
} as const;
