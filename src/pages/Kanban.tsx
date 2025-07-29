import { useState } from "react";
import { useOptimizedTickets } from "@/hooks/useOptimizedTickets";
import Navigation from "@/components/Navigation";
import TicketKanban from "@/components/TicketKanban";
import TicketDetailModal from "@/components/TicketDetailModal";
import TicketEditModal from "@/components/TicketEditModal";
import SetorValidationAlert from "@/components/SetorValidationAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Kanban as KanbanIcon, TrendingUp, Clock, AlertTriangle } from "lucide-react";

interface Ticket {
  id: string;
  ticket_number: string;
  titulo: string;
  time_responsavel: string;
  solicitante: string;
  descricao: string;
  tipo_ticket: string;
  status: string;
  nivel_criticidade: string;
  pontuacao_total: number;
  pontuacao_financeiro: number;
  pontuacao_cliente: number;
  pontuacao_reputacao: number;
  pontuacao_urgencia: number;
  pontuacao_operacional: number;
  data_criacao: string;
  observacoes?: string;
  tags?: string[];
  setor_id?: string;
}

export default function KanbanPage() {
  // Usar hook otimizado
  const { 
    tickets, 
    loading, 
    reloadTickets 
  } = useOptimizedTickets({
    enableRealtime: true,
    batchSize: 100
  });

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTicketForEdit, setSelectedTicketForEdit] = useState<Ticket | null>(null);
  
  const { user, canEdit } = useAuth();
  const { toast } = useToast();

  const handleOpenTicketDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setModalOpen(true);
  };

  const handleEditTicket = (ticket: Ticket) => {
    setSelectedTicketForEdit(ticket);
    setEditModalOpen(true);
  };

  const handleTicketUpdate = () => {
    reloadTickets();
    toast({
      title: "Ticket atualizado", 
      description: "O status do ticket foi atualizado com sucesso."
    });
  };

  // Cálculo de estatísticas
  const stats = {
    total: tickets.length,
    abertos: tickets.filter(t => t.status === 'aberto').length,
    emAndamento: tickets.filter(t => t.status === 'em_andamento').length,
    resolvidos: tickets.filter(t => t.status === 'resolvido').length,
    fechados: tickets.filter(t => t.status === 'fechado').length,
    criticos: tickets.filter(t => t.nivel_criticidade === 'P0').length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Alerta de validação de setor */}
        <SetorValidationAlert />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <KanbanIcon className="h-8 w-8 text-primary" />
              Kanban Board
            </h1>
            <p className="text-muted-foreground">
              Visualize e gerencie o fluxo de trabalho dos tickets
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={reloadTickets} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Abertos</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.abertos}</p>
                </div>
                <Clock className="h-5 w-5 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Em Andamento</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.emAndamento}</p>
                </div>
                <RefreshCw className="h-5 w-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resolvidos</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.resolvidos}</p>
                </div>
                <div className="h-5 w-5 rounded-full bg-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fechados</p>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.fechados}</p>
                </div>
                <div className="h-5 w-5 rounded-full bg-gray-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Críticos</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.criticos}</p>
                </div>
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board */}
        <Card className="bg-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <TicketKanban 
                tickets={tickets} 
                onOpenDetail={handleOpenTicketDetail}
                onEditTicket={handleEditTicket}
                onTicketUpdate={handleTicketUpdate}
                userRole={canEdit ? 'operador' : 'viewer'}
              />
            )}
          </CardContent>
        </Card>

        {/* Ticket Detail Modal */}
        {selectedTicket && (
          <TicketDetailModal
            sla={selectedTicket}
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setSelectedTicket(null);
            }}
            onUpdate={reloadTickets}
          />
        )}

        {/* Ticket Edit Modal */}
        {selectedTicketForEdit && (
          <TicketEditModal
            ticket={selectedTicketForEdit}
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedTicketForEdit(null);
            }}
            onUpdate={handleTicketUpdate}
          />
        )}
      </div>
    </div>
  );
}