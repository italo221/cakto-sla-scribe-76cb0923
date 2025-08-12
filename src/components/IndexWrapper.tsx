import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import LandingPage from "@/pages/LandingPage";
import IndexContent from "@/components/IndexContent";

export default function Index() {
  const { user } = useAuth();

  // Se não há usuário, mostra landing page SEM AppLayout
  if (!user) {
    return <LandingPage />;
  }

  // Para usuários logados, usa AppLayout
  return (
    <AppLayout>
      <div className="animate-fade-in">
        <IndexContent />
      </div>
    </AppLayout>
  );
}