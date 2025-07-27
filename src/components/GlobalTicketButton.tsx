import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function GlobalTicketButton() {
  const { user, canEdit, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  
  // Verificar se o usuário pode criar tickets
  const canCreateTickets = canEdit || isSuperAdmin;

  if (!user || !canCreateTickets) {
    return null;
  }

  const handleCreateTicket = () => {
    navigate('/');
  };

  return (
    <Button
      onClick={handleCreateTicket}
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90"
      size="icon"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}