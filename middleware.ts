import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { appConfig } from "@/lib/config";
import { getSupabaseEnv, hasSupabaseBrowserConfig } from "@/lib/supabase/env";

type MiddlewareCookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

export async function middleware(request: NextRequest) {
  if (appConfig.devAuthBypassEnabled || !hasSupabaseBrowserConfig()) {
    return NextResponse.next({
      request
    });
  }

  let response = NextResponse.next({
    request
  });

  const env = getSupabaseEnv();
  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: MiddlewareCookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));

        response = NextResponse.next({
          request
        });

        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the following:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - common static asset extensions (img/font/css/js)
     *
     * Cada request que matchea ejecuta `supabase.auth.getUser()`, que
     * golpea el endpoint /auth/v1/user de Supabase = RTT real. Filtrar
     * los assets ahorra esos round-trips para recursos que no necesitan
     * sesión.
     *
     * Refs: audit perf top-7 · H2.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|eot|css|js|map)$).*)"
  ]
};
