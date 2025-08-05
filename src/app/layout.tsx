import type { Metadata } from "next";
import "./globals.css";
import dynamic from "next/dynamic";

// Динамические импорты компонентов для избежания SSR проблем
const SidePanel = dynamic(() => import("@/components/layout/SidePanel"), {
  ssr: false
});

const MainContentArea = dynamic(() => import("@/components/layout/MainContentArea"), {
  ssr: false
});

const EffectsProvider = dynamic(() => import("@/components/providers/EffectsProvider").then(mod => ({ default: mod.EffectsProvider })), {
  ssr: false
});

export const metadata: Metadata = {
  title: "Arcanum Platform",
  description: "Гипер-кастомизируемая, AI-центричная платформа для личного развития",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        {/* Глобальные CSS переменные для тем */}
        <style>{`
          :root {
            --theme-primary: #8B5CF6;
            --theme-secondary: #7C3AED;
            --theme-accent: #A78BFA;
          }
          
          .theme-transition {
            transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .theme-transition * {
            transition: background-color 1s cubic-bezier(0.4, 0, 0.2, 1),
                       border-color 1s cubic-bezier(0.4, 0, 0.2, 1),
                       color 1s cubic-bezier(0.4, 0, 0.2, 1);
          }
        `}</style>
      </head>
      <body className="antialiased bg-gray-900 text-white min-h-screen">
        <EffectsProvider>
          <div className="flex h-screen w-full">
            {/* Левая боковая панель */}
            <SidePanel position="left" />
            
            {/* Центральная область контента */}
            <MainContentArea>
              {children}
            </MainContentArea>
            
            {/* Правая боковая панель */}
            <SidePanel position="right" />
          </div>
        </EffectsProvider>
      </body>
    </html>
  );
}
