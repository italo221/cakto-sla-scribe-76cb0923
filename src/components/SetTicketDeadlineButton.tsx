import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';
import { SLADeadlineModal } from '@/components/SLADeadlineModal';
import { usePermissions } from '@/hooks/usePermissions';
import { useSLAPolicies } from '@/hooks/useSLAPolicies';
import { useAuth } from '@/hooks/useAuth';

interface SetTicketDeadlineButtonProps {
  ticket: {
    id: string;
    nivel_criticidade: string;
    data_criacao: string;
    prazo_interno?: string;
    setor_id?: string;
    status: string;
  };
  onUpdate?: () => void;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'default';
  showIcon?: boolean;
}

export const SetTicketDeadlineButton = ({ 
  ticket, 
  onUpdate,
  variant = 'ghost',
  size = 'sm',
  showIcon = true
}: SetTicketDeadlineButtonProps) => {
  const [showModal, setShowModal] = useState(false);
  const { userSetores } = usePermissions();
  const { getPolicyBySetor } = useSLAPolicies();
  const { isSuperAdmin } = useAuth();

  // Verificar se deve mostrar o botão
  const shouldShow = () => {
    // Super Admin pode definir prazo em qualquer ticket
    if (isSuperAdmin) return true;

    // Para usuários normais, verificar se o setor está em modo personalizado
    if (!ticket.setor_id) return false;
    
    const policy = getPolicyBySetor(ticket.setor_id);
    const isCustomMode = policy?.mode === 'PERSONALIZADO';
    
    // Verificar se o usuário tem acesso ao setor do ticket
    const hasSetorAccess = userSetores.some(us => us.setor_id === ticket.setor_id);
    
    return isCustomMode && hasSetorAccess;
  };

  // Não mostrar para tickets já resolvidos/fechados
  if (['resolvido', 'fechado'].includes(ticket.status)) {
    return null;
  }

  if (!shouldShow()) {
    return null;
  }

  const handleSetDeadline = () => {
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleModalUpdate = () => {
    setShowModal(false);
    if (onUpdate) {
      onUpdate();
    }
  };

  const policy = ticket.setor_id ? getPolicyBySetor(ticket.setor_id) : null;
  const isOverride = policy?.mode === 'FIXO' && isSuperAdmin;

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={handleSetDeadline}
        className="flex items-center gap-1"
      >
        {showIcon && <Clock className="h-3 w-3" />}
        {ticket.prazo_interno ? 'Alterar Prazo' : 'Definir Prazo'}
      </Button>

      <SLADeadlineModal
        isOpen={showModal}
        onClose={handleModalClose}
        ticketId={ticket.id}
        currentDeadline={ticket.prazo_interno}
        isOverride={isOverride}
        onUpdate={handleModalUpdate}
      />
    </>
  );
};