import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SLAPolicy {
  id: string;
  setor_id: string;
  mode: 'FIXO' | 'PERSONALIZADO';
  p0_hours: number;
  p1_hours: number;
  p2_hours: number;
  p3_hours: number;
  allow_superadmin_override: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface SLAEvent {
  id: string;
  ticket_id: string;
  action: 'SET_FIXED' | 'SET_CUSTOM' | 'OVERRIDE' | 'UPDATE_POLICY';
  old_deadline?: string;
  new_deadline?: string;
  sector_id?: string;
  level?: 'P0' | 'P1' | 'P2' | 'P3';
  note?: string;
  actor_id: string;
  created_at: string;
  actor?: {
    nome_completo: string;
    email: string;
  } | null;
  setor?: {
    nome: string;
  } | null;
}

export interface CreateSLAEventData {
  ticket_id: string;
  action: 'SET_FIXED' | 'SET_CUSTOM' | 'OVERRIDE' | 'UPDATE_POLICY';
  old_deadline?: string;
  new_deadline?: string;
  sector_id?: string;
  level?: 'P0' | 'P1' | 'P2' | 'P3';
  note?: string;
  actor_id: string;
}

interface SLAPoliciesContextType {
  policies: SLAPolicy[];
  loading: boolean;
  error: string | null;
  fetchPolicies: () => Promise<void>;
  updatePolicy: (policyId: string, updates: Partial<SLAPolicy>) => Promise<boolean>;
  createPolicy: (setorId: string, policy: Partial<SLAPolicy>) => Promise<boolean>;
  getPolicyBySetor: (setorId: string) => SLAPolicy | null;
  calculateSLADeadline: (criticidade: string, dataCriacao: string, setorId?: string) => Date;
}

const SLAPoliciesContext = createContext<SLAPoliciesContextType | undefined>(undefined);

export const SLAPoliciesProvider = ({ children }: { children: ReactNode }) => {
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  const fetchPolicies = async (retryCount = 0): Promise<void> => {
    try {
      setLoading(true);
      if (retryCount === 0) {
        setError(null);
        setIsRetrying(true);
      }
      
      console.log(`🔍 [Context] Fetching SLA policies... (attempt ${retryCount + 1})`);
      
      const { data, error } = await supabase
        .from('sla_policies')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📊 [Context] SLA policies query result:', { data, error, retryCount });
      
      if (error) throw error;
      
      setPolicies(data || []);
      setError(null);
      setIsRetrying(false);
    } catch (err: any) {
      console.error('[Context] Error fetching SLA policies:', err);
      
      // Retry automático para erros de rede (máximo 3 tentativas)
      if (retryCount < 2 && (
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('TypeError') ||
        err.code === 'PGRST116' // Timeout do PostgREST
      )) {
        console.log(`🔄 [Context] Retrying SLA policies fetch in ${(retryCount + 1) * 1000}ms...`);
        
        setTimeout(() => {
          fetchPolicies(retryCount + 1);
        }, (retryCount + 1) * 1000); // Delay progressivo: 1s, 2s, 3s
        
        return;
      }
      
      const errorMessage = err.message || 'Erro desconhecido ao carregar políticas';
      setError(errorMessage);
      setIsRetrying(false);
      
      // Só mostrar toast após esgotar todas as tentativas
      if (retryCount >= 2) {
        toast({
          title: "Erro ao carregar políticas",
          description: `${errorMessage} (após ${retryCount + 1} tentativas)`,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePolicy = async (policyId: string, updates: Partial<SLAPolicy>) => {
    try {
      console.log('🔄 [Context] Updating SLA policy:', { policyId, updates });
      const { error } = await supabase
        .from('sla_policies')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', policyId);

      console.log('📝 [Context] Update result:', { error });

      if (error) throw error;

      toast({
        title: "Política atualizada",
        description: "A política de SLA foi atualizada com sucesso.",
      });

      await fetchPolicies();
      return true;
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar política",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const createPolicy = async (setorId: string, policy: Partial<SLAPolicy>) => {
    try {
      const { error } = await supabase
        .from('sla_policies')
        .insert({
          setor_id: setorId,
          ...policy,
        });

      if (error) throw error;

      toast({
        title: "Política criada",
        description: "A política de SLA foi criada com sucesso.",
      });

      await fetchPolicies();
      return true;
    } catch (err: any) {
      toast({
        title: "Erro ao criar política",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const getPolicyBySetor = (setorId: string): SLAPolicy | null => {
    return policies.find(p => p.setor_id === setorId) || null;
  };

  const calculateSLADeadline = (
    criticidade: string,
    dataCriacao: string,
    setorId?: string
  ): Date => {
    const policy = setorId ? getPolicyBySetor(setorId) : null;
    
    let hours = 168; // Default P3
    
    if (policy) {
      switch (criticidade) {
        case 'P0':
          hours = policy.p0_hours;
          break;
        case 'P1':
          hours = policy.p1_hours;
          break;
        case 'P2':
          hours = policy.p2_hours;
          break;
        case 'P3':
          hours = policy.p3_hours;
          break;
      }
    } else {
      // Fallback para valores padrão
      switch (criticidade) {
        case 'P0':
          hours = 4;
          break;
        case 'P1':
          hours = 24;
          break;
        case 'P2':
          hours = 72;
          break;
        case 'P3':
          hours = 168;
          break;
      }
    }

    const deadline = new Date(dataCriacao);
    deadline.setHours(deadline.getHours() + hours);
    return deadline;
  };

  // Carregar políticas apenas uma vez na montagem do contexto
  useEffect(() => {
    let mounted = true;
    
    const loadPolicies = async () => {
      if (mounted) {
        await fetchPolicies();
      }
    };
    
    loadPolicies();
    
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SLAPoliciesContext.Provider
      value={{
        policies,
        loading,
        error,
        fetchPolicies: () => fetchPolicies(0),
        updatePolicy,
        createPolicy,
        getPolicyBySetor,
        calculateSLADeadline,
      }}
    >
      {children}
    </SLAPoliciesContext.Provider>
  );
};

export const useSLAPolicies = () => {
  const context = useContext(SLAPoliciesContext);
  if (!context) {
    throw new Error('useSLAPolicies must be used within a SLAPoliciesProvider');
  }
  return context;
};

// Hook para eventos SLA - mantido separado pois é específico por ticket
export const useSLAEvents = (ticketId?: string) => {
  const [events, setEvents] = useState<SLAEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchEvents = async (ticket_id?: string) => {
    if (!ticket_id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ticket_sla_events')
        .select(`
          *,
          actor:profiles!actor_id(nome_completo, email),
          setor:setores!sector_id(nome)
        `)
        .eq('ticket_id', ticket_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents((data as any[]) || []);
    } catch (err: any) {
      console.error('Error fetching SLA events:', err);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (event: CreateSLAEventData) => {
    try {
      const { error } = await supabase
        .from('ticket_sla_events')
        .insert(event);

      if (error) throw error;

      if (ticketId) {
        fetchEvents(ticketId);
      }
      return true;
    } catch (err: any) {
      toast({
        title: "Erro ao registrar evento",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (ticketId) {
      fetchEvents(ticketId);
    }
  }, [ticketId]);

  return {
    events,
    loading,
    fetchEvents,
    createEvent,
  };
};