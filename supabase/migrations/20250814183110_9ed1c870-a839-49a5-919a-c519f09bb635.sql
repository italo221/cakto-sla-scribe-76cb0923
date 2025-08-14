-- Criar enum para modo de SLA
CREATE TYPE sla_mode AS ENUM ('FIXO', 'PERSONALIZADO');

-- Criar enum para ações de SLA
CREATE TYPE sla_event_action AS ENUM ('SET_FIXED', 'SET_CUSTOM', 'OVERRIDE', 'UPDATE_POLICY');

-- Criar enum para níveis de criticidade
CREATE TYPE sla_level AS ENUM ('P0', 'P1', 'P2', 'P3');

-- Tabela de políticas de SLA por setor
CREATE TABLE public.sla_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  mode sla_mode NOT NULL DEFAULT 'FIXO',
  p0_hours INTEGER NOT NULL DEFAULT 4,
  p1_hours INTEGER NOT NULL DEFAULT 24,
  p2_hours INTEGER NOT NULL DEFAULT 72,
  p3_hours INTEGER NOT NULL DEFAULT 168,
  allow_superadmin_override BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(setor_id)
);

-- Tabela de eventos de SLA para auditoria
CREATE TABLE public.ticket_sla_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.sla_demandas(id) ON DELETE CASCADE,
  action sla_event_action NOT NULL,
  old_deadline TIMESTAMP WITH TIME ZONE NULL,
  new_deadline TIMESTAMP WITH TIME ZONE NULL,
  sector_id UUID REFERENCES public.setores(id),
  level sla_level NULL,
  note TEXT NULL,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_sla_events ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para sla_policies
CREATE POLICY "sla_policies_select_authenticated" 
ON public.sla_policies 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "sla_policies_insert_super_admin" 
ON public.sla_policies 
FOR INSERT 
WITH CHECK (is_super_admin());

CREATE POLICY "sla_policies_update_super_admin" 
ON public.sla_policies 
FOR UPDATE 
USING (is_super_admin());

CREATE POLICY "sla_policies_delete_super_admin" 
ON public.sla_policies 
FOR DELETE 
USING (is_super_admin());

-- Políticas RLS para ticket_sla_events
CREATE POLICY "ticket_sla_events_select_access" 
ON public.ticket_sla_events 
FOR SELECT 
USING (
  is_admin() OR 
  ticket_id IN (
    SELECT s.id 
    FROM sla_demandas s 
    WHERE user_has_setor_access(s.setor_id)
  )
);

CREATE POLICY "ticket_sla_events_insert_authenticated" 
ON public.ticket_sla_events 
FOR INSERT 
WITH CHECK (auth.uid() = actor_id);

-- Trigger para atualizar updated_at em sla_policies
CREATE TRIGGER update_sla_policies_updated_at
BEFORE UPDATE ON public.sla_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir políticas padrão para todos os setores existentes
INSERT INTO public.sla_policies (setor_id, mode, p0_hours, p1_hours, p2_hours, p3_hours, created_by)
SELECT 
  id,
  'FIXO'::sla_mode,
  4,
  24,
  72,
  168,
  (SELECT user_id FROM public.profiles WHERE role = 'super_admin' LIMIT 1)
FROM public.setores 
WHERE ativo = true
ON CONFLICT (setor_id) DO NOTHING;