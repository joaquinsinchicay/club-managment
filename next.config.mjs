/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Anti-clickjacking: la app no debería embedirse en otros sitios.
  { key: "X-Frame-Options", value: "DENY" },
  // Evita que el browser sniffee el content-type cuando el server lo declara.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No leakear el path del referrer cross-origin (preserva hostname).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Limita features potentes del browser que la app no usa.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS: forzar HTTPS por 2 años. Solo aplica una vez deployed en HTTPS;
  // en localhost dev mode es inocuo (Chrome lo ignora en localhost).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Tree-shaking más agresivo de barrel files. Las utilidades (clsx,
    // tailwind-merge, cva) son livianas pero gratis de optimizar.
    // @supabase/* no se incluye porque la lib es parcialmente CJS y la
    // optimización experimental puede romper imports — evaluar más
    // adelante con bundle-analyzer si justifica el riesgo.
    optimizePackageImports: ["clsx", "tailwind-merge", "class-variance-authority"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
