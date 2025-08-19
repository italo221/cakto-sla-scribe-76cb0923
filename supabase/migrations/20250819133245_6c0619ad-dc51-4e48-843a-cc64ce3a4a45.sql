-- Adicionar campo assignee_user_id na tabela sla_demandas
ALTER TABLE public.sla_demandas 
ADD COLUMN assignee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice para otimizar consultas por responsável
CREATE INDEX idx_sla_demandas_assignee_user_id ON public.sla_demandas(assignee_user_id);

-- Função para limpar atribuição quando usuário não pertence ao novo setor
CREATE OR REPLACE FUNCTION public.clear_assignee_on_sector_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_belongs_to_new_sector BOOLEAN := FALSE;
  old_assignee_name TEXT;
  new_sector_name TEXT;
BEGIN
  -- Verificar se houve mudança de setor e se há responsável atribuído
  IF OLD.setor_id != NEW.setor_id AND NEW.assignee_user_id IS NOT NULL THEN
    -- Verificar se o responsável pertence ao novo setor
    SELECT EXISTS (
      SELECT 1 
      FROM public.user_setores us 
      WHERE us.user_id = NEW.assignee_user_id 
        AND us.setor_id = NEW.setor_id
    ) INTO user_belongs_to_new_sector;
    
    -- Se não pertence ao novo setor, limpar atribuição
    IF NOT user_belongs_to_new_sector THEN
      -- Buscar nome do responsável removido para o log
      SELECT nome_completo INTO old_assignee_name
      FROM public.profiles
      WHERE user_id = NEW.assignee_user_id;
      
      -- Buscar nome do novo setor
      SELECT nome INTO new_sector_name
      FROM public.setores
      WHERE id = NEW.setor_id;
      
      -- Limpar atribuição
      NEW.assignee_user_id := NULL;
      
      -- Registrar no histórico
      PERFORM public.log_sla_action(
        NEW.id,
        'responsavel_removido_por_mudanca_setor',
        OLD.setor_id,
        NEW.setor_id,
        'Responsável ' || COALESCE(old_assignee_name, 'removido') || ' foi removido automaticamente pois não pertence ao novo setor ' || COALESCE(new_sector_name, ''),
        jsonb_build_object('assignee_anterior', NEW.assignee_user_id, 'setor_anterior', OLD.setor_id),
        jsonb_build_object('assignee_novo', NULL, 'setor_novo', NEW.setor_id, 'motivo', 'usuario_nao_pertence_ao_setor')
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função
CREATE TRIGGER trigger_clear_assignee_on_sector_change
  BEFORE UPDATE ON public.sla_demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_assignee_on_sector_change();