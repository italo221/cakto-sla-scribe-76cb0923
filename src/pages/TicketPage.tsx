import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import TicketDetailModal from '@/components/TicketDetailModal';
import { useToast } from '@/hooks/use-toast';

export const TicketPage: React.FC = () => {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [ticket, setTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const viewMode = searchParams.get('view');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (ticketNumber) {
      loadTicket();
    }
  }, [ticketNumber, user]);

  useEffect(() => {
    if (ticket && viewMode === 'modal') {
      setShowModal(true);
    }
  }, [ticket, viewMode]);

  const loadTicket = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Carregando ticket:', ticketNumber);

      const { data, error } = await supabase
        .from('sla_demandas')
        .select(`
          *,
          setor:setores(nome)
        `)
        .eq('ticket_number', ticketNumber)
        .maybeSingle();

      if (error) {
        console.error('Erro na consulta do ticket:', error);
        setError('Erro ao carregar o ticket. Tente novamente.');
        return;
      }

      if (!data) {
        setError('Ticket não encontrado.');
        return;
      }

      console.log('Ticket carregado:', data);
      setTicket(data);
    } catch (error) {
      console.error('Erro ao carregar ticket:', error);
      setError('Erro ao carregar o ticket. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    // Navegar de volta para a página anterior ou dashboard
    navigate('/dashboard');
  };

  const handleTicketUpdate = () => {
    // Recarregar dados do ticket
    loadTicket();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Carregando ticket...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Erro</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Ticket não encontrado</h1>
          <p className="text-muted-foreground mb-4">
            O ticket #{ticketNumber} não foi encontrado ou você não tem permissão para acessá-lo.
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {viewMode === 'modal' ? (
        // Se é modo modal, renderizar apenas o modal
        <TicketDetailModal
          sla={ticket}
          isOpen={showModal}
          onClose={handleCloseModal}
          onUpdate={handleTicketUpdate}
        />
      ) : (
        // Se não é modo modal, renderizar página completa
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                ← Voltar ao Dashboard
              </button>
              <h1 className="text-3xl font-bold">
                {ticket.ticket_number} - {ticket.titulo}
              </h1>
            </div>
            
            {/* Aqui você pode adicionar a visualização completa do ticket */}
            <div className="bg-card border rounded-lg p-6">
              <p className="text-muted-foreground mb-4">
                Para uma melhor experiência, 
                <button 
                  onClick={() => setShowModal(true)}
                  className="text-primary hover:underline ml-1"
                >
                  abrir em modal
                </button>
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                  <p className="mt-1">{ticket.descricao}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p className="mt-1">{ticket.status}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Prioridade</label>
                    <p className="mt-1">{ticket.nivel_criticidade}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Solicitante</label>
                    <p className="mt-1">{ticket.solicitante}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Time Responsável</label>
                    <p className="mt-1">{ticket.time_responsavel}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal sempre disponível se não for modo modal padrão */}
      {viewMode !== 'modal' && (
        <TicketDetailModal
          sla={ticket}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onUpdate={handleTicketUpdate}
        />
      )}
    </>
  );
};