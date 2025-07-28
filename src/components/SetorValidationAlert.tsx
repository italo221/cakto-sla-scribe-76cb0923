import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

export default function SetorValidationAlert() {
  const { getSetorValidationMessage, loading } = usePermissions();
  
  // Não mostrar o aviso enquanto estiver carregando para evitar "piscar"
  if (loading) return null;
  
  const validationMessage = getSetorValidationMessage();
  if (!validationMessage) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Acesso Restrito</AlertTitle>
      <AlertDescription>{validationMessage}</AlertDescription>
    </Alert>
  );
}