import { ReactNode } from 'react';
import { useNavbarSettings } from '@/hooks/useNavbarSettings';
import LateralSidebar from '@/components/LateralSidebar';
import { SLAPoliciesProvider } from '@/contexts/SLAPoliciesContext';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { settings, loading } = useNavbarSettings();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <div className="animate-pulse">
          <div className="h-20 bg-muted/50"></div>
          <div className="p-4">
            <div className="h-64 bg-muted/30 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Sempre usar sidebar lateral
  return (
    <SLAPoliciesProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5" data-app-layout>
        <LateralSidebar glassEffect={settings.navbar_glass} />
        <main className="ml-16 transition-all duration-300">
          <div className="p-4">
            {children}
          </div>
        </main>
      </div>
    </SLAPoliciesProvider>
  );
}