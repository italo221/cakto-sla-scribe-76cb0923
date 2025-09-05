import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InboxIcon, Activity, CheckCircle, XCircle, Clock, AlertTriangle, HelpCircle } from "lucide-react";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import SupabaseStatus from "@/components/SupabaseStatus";
import { useOptimizedTickets } from "@/hooks/useOptimizedTickets";
import { useGlobalTicketStats } from "@/hooks/useGlobalTicketStats";
import { useAuth } from "@/hooks/useAuth";
import VirtualizedTicketList from "@/components/VirtualizedTicketList";

export default function InboxDarkMode() {
  // Check Supabase configuration first
  if (!isSupabaseConfigured) {
    return (
      <div className="p-6">
        <SupabaseStatus />
      </div>
    );
  }
  
  const { user, canEdit, isSuperAdmin } = useAuth();
  
  // Filter states
  const [activeFilter, setActiveFilter] = useState<'all' | 'aberto' | 'em_andamento' | 'resolvido' | 'fechado' | 'atrasado' | 'critico' | 'info-incompleta'>('all');

  // Hooks
  const {
    ticketsWithStatus: optimizedTicketsWithStatus,
    loading,
    reloadTickets
  } = useOptimizedTickets({
    enableRealtime: false,
    batchSize: 25
  });

  const { stats } = useGlobalTicketStats();

  // Filter tickets
  const filteredTickets = useMemo(() => {
    if (activeFilter === 'all') return optimizedTicketsWithStatus;
    
    return optimizedTicketsWithStatus.filter(ticket => {
      const ticketStatus = ticket.status?.toString()?.trim()?.toLowerCase();
      switch (activeFilter) {
        case 'atrasado':
          return ticket.isExpired;
        case 'critico':
          return ticket.nivel_criticidade === 'P0' && 
                 ['aberto', 'em_andamento'].includes(ticketStatus);
        case 'info-incompleta':
          return ticket.tags?.includes("info-incompleta");
        default:
          return ticketStatus === activeFilter;
      }
    });
  }, [optimizedTicketsWithStatus, activeFilter]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Caixa de Entrada</h1>
          <p className="text-muted-foreground mt-2">Gerencie e monitore todos os tickets</p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <Card className="cursor-pointer" onClick={() => setActiveFilter('aberto')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abertos</CardTitle>
              <InboxIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.abertos || 0}</div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer" onClick={() => setActiveFilter('em_andamento')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.em_andamento || 0}</div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer" onClick={() => setActiveFilter('resolvido')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolvidos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.resolvidos || 0}</div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer" onClick={() => setActiveFilter('fechado')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fechados</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.fechados || 0}</div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer" onClick={() => setActiveFilter('atrasado')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.atrasados || 0}</div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer" onClick={() => setActiveFilter('critico')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Críticos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.criticos || 0}</div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer" onClick={() => setActiveFilter('info-incompleta')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Info Incompleta</CardTitle>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.criticos || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Tickets */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Tickets ({filteredTickets.length})</h2>

          {loading ? (
            <div className="text-center p-8">
              <div className="text-muted-foreground">Carregando tickets...</div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center p-8">
              <div className="text-muted-foreground">Nenhum ticket encontrado</div>
            </div>
          ) : (
            <VirtualizedTicketList
              tickets={filteredTickets}
              onOpenDetail={() => {}}
              userCanEdit={canEdit}
              userCanDelete={isSuperAdmin}
            />
          )}
        </div>
      </div>
    </div>
  );
}