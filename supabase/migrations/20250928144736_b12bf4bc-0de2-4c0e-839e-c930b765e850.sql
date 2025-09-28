-- Atualizar sub-tickets existentes para mostrar o nome real do criador
-- Buscar sub-tickets que têm 'Sistema - Sub-ticket' como solicitante
-- e atualizar com o nome do usuário que realmente os criou

UPDATE public.sla_demandas 
SET solicitante = COALESCE(p.nome_completo, p.email, 'Usuário')
FROM public.subtickets s
JOIN public.profiles p ON s.created_by = p.user_id
WHERE sla_demandas.id = s.child_ticket_id 
  AND sla_demandas.solicitante = 'Sistema - Sub-ticket';