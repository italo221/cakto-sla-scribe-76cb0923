import { ReactNode } from 'react';
import { useNavbarSettings } from '@/hooks/useNavbarSettings';
import { useAuth } from '@/hooks/useAuth';
import LateralSidebar from '@/components/LateralSidebar';
import RevokedAccessScreen from '@/components/RevokedAccessScreen';
import { SLAPoliciesProvider } from '@/contexts/SLAPoliciesContext';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { settings, loading: navLoading } = useNavbarSettings();
  const { isRevoked, loading: authLoading } = useAuth();

  if (navLoading || authLoading) {
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

  // Bloquear usuários com acesso revogado
  if (isRevoked) {
    return <RevokedAccessScreen />;
  }

  // Sempre usar sidebar lateral
  return (
    <SLAPoliciesProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5" data-app-layout>
        <LateralSidebar glassEffect={settings.navbar_glass} />
        <main className="ml-14 transition-all duration-300">
          <div className="p-4">
            {children}
          </div>
        </main>
      </div>
    </SLAPoliciesProvider>
  );
}