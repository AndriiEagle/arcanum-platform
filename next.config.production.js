// PRODUCTION NEXT.JS CONFIGURATION
// Шаг 21: Оптимизированная конфигурация для продакшена

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ===========================================
  // BASIC CONFIGURATION
  // ===========================================
  reactStrictMode: true,
  swcMinify: true, // Используем SWC для минификации (быстрее Terser)
  
  // ===========================================
  // PERFORMANCE OPTIMIZATION
  // ===========================================
  
  // Экспериментальные оптимизации
  experimental: {
    // Оптимизация изображений
    optimizeCss: true,
    // Уменьшение bundle size
    optimizePackageImports: ['@stripe/stripe-js', 'zustand'],
    // Турбо режим для быстрой сборки
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    }
  },

  // ===========================================
  // COMPRESSION & OPTIMIZATION
  // ===========================================
  
  // Сжатие ответов
  compress: true,
  
  // Оптимизация изображений
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 год кэширования
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // ===========================================
  // WEBPACK OPTIMIZATION
  // ===========================================
  
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Только для продакшена
    if (!dev) {
      // Bundle analyzer (раскомментировать при необходимости)
      // const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
      // config.plugins.push(new BundleAnalyzerPlugin());

      // Оптимизация bundle splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Отдельный chunk для vendor библиотек
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // Отдельный chunk для Stripe
          stripe: {
            test: /[\\/]node_modules[\\/]@stripe[\\/]/,
            name: 'stripe',
            chunks: 'all',
            priority: 20,
          },
          // Отдельный chunk для общих компонентов
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };

      // Tree shaking optimization
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }

    // Алиасы для удобства импорта
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
      '@lib': require('path').resolve(__dirname, 'lib'),
      '@components': require('path').resolve(__dirname, 'src/components'),
      '@hooks': require('path').resolve(__dirname, 'lib/hooks'),
      '@services': require('path').resolve(__dirname, 'lib/services'),
      '@stores': require('path').resolve(__dirname, 'lib/stores'),
    };

    return config;
  },

  // ===========================================
  // HEADERS & SECURITY
  // ===========================================
  
  async headers() {
    return [
      {
        // Применяется ко всем маршрутам
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://api.openai.com https://api.stripe.com",
              "frame-src 'self' https://js.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "block-all-mixed-content",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ]
      },
      {
        // Кэширование статических ресурсов
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        // Кэширование API ответов
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300'
          }
        ]
      }
    ];
  },

  // ===========================================
  // REDIRECTS & REWRITES
  // ===========================================
  
  async redirects() {
    return [
      // Принудительное HTTPS
      {
        source: '/(.*)',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        destination: 'https://:host/:path*',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      // Прокси для Stripe webhooks
      {
        source: '/webhooks/stripe',
        destination: '/api/webhooks/stripe'
      }
    ];
  },

  // ===========================================
  // OUTPUT CONFIGURATION
  // ===========================================
  
  // Для статического экспорта (если необходимо)
  // output: 'export',
  // trailingSlash: true,
  
  // Для standalone выходов
  output: 'standalone',
  
  // ===========================================
  // ENVIRONMENT VARIABLES
  // ===========================================
  
  env: {
    CUSTOM_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || 'local-build',
    BUILD_TIME: new Date().toISOString(),
  },

  // ===========================================
  // TYPESCRIPT CONFIGURATION
  // ===========================================
  
  typescript: {
    // Не останавливать сборку при ошибках TS в продакшене
    // (только если уверены что всё протестировано)
    ignoreBuildErrors: false,
  },

  // ===========================================
  // ESLint CONFIGURATION
  // ===========================================
  
  eslint: {
    // Не останавливать сборку при ESLint ошибках
    ignoreDuringBuilds: false,
  },

  // ===========================================
  // PRODUCTION MONITORING
  // ===========================================
  
  // Sentry configuration (если используется)
  sentry: {
    hideSourceMaps: true,
    widenClientFileUpload: true,
  },

  // ===========================================
  // PWA CONFIGURATION (опционально)
  // ===========================================
  
  // Если добавляете PWA функциональность
  // pwa: {
  //   dest: 'public',
  //   register: true,
  //   skipWaiting: true,
  // }
};

// ===========================================
// CONDITIONAL CONFIGURATION
// ===========================================

// Добавляем bundle analyzer только когда необходимо
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  });
  module.exports = withBundleAnalyzer(nextConfig);
} else {
  module.exports = nextConfig;
}

// ===========================================
// NOTES:
// ===========================================
// 1. Протестируйте все настройки в staging окружении
// 2. Мониторьте производительность после внедрения
// 3. Настройте соответствующие headers на CDN/прокси
// 4. Регулярно обновляйте зависимости для безопасности
// 5. Используйте environment-specific конфигурации
// ===========================================' 