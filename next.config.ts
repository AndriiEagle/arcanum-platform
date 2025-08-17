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
  // Включаем source maps для диагностики
  productionBrowserSourceMaps: true,
};

export default nextConfig;
