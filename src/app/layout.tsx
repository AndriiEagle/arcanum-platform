import type { Metadata } from "next";
import "./globals.css";
import SidePanel from "@/components/layout/SidePanel";
import MainContentArea from "@/components/layout/MainContentArea";
import { EffectsProvider } from "@/components/providers/EffectsProvider";

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
