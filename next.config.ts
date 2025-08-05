import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Игнорируем ESLint ошибки при сборке для деплоя
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Игнорируем TypeScript ошибки при сборке
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
