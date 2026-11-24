import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Gera um servidor enxuto em .next/standalone (para rodar fora da Vercel, ex.: VPS com Coolify)
  output: "standalone",
  // O service worker (notificações) precisa ser sempre a versão mais nova
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
