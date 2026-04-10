import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import IndexContent from "@/components/IndexContent";

export default function Index() {
  const { user, loading } = useAuth();

  // Se não há usuário, redireciona para login
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
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
