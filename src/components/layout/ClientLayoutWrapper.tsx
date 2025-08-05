'use client'

import dynamic from "next/dynamic";

// Динамические импорты компонентов для избежания SSR проблем
const SidePanel = dynamic(() => import("@/components/layout/SidePanel"), {
  ssr: false,
  loading: () => <div className="w-64 bg-gray-800 animate-pulse" />
});

const MainContentArea = dynamic(() => import("@/components/layout/MainContentArea"), {
  ssr: false,
  loading: () => <div className="flex-1 bg-gray-900 animate-pulse" />
});

const EffectsProvider = dynamic(() => import("@/components/providers/EffectsProvider").then(mod => ({ default: mod.EffectsProvider })), {
  ssr: false
});

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  return (
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
  );
} 