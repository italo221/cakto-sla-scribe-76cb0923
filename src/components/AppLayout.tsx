import { useLocation } from "react-router-dom";
import { useNavbarSettings } from "@/hooks/useNavbarSettings";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import LateralSidebar from "@/components/LateralSidebar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { settings, loading } = useNavbarSettings();

  // Pages that don't need navigation
  const hideNavPages = ['/auth'];
  const shouldHideNav = hideNavPages.includes(location.pathname);

  // Show loading while settings are being fetched
  if (loading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is not logged in or on auth page, just show children
  if (!user || shouldHideNav) {
    return <>{children}</>;
  }

  // If user prefers lateral sidebar
  if (settings.position === 'left') {
    return (
      <div className="min-h-screen bg-background">
        <LateralSidebar glassEffect={settings.glassEffect} />
        <main className={cn(
          "transition-all duration-300",
          "ml-16" // Always account for collapsed sidebar width
        )}>
          {children}
        </main>
      </div>
    );
  }

  // Default top navigation
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        {children}
      </main>
    </div>
  );
}