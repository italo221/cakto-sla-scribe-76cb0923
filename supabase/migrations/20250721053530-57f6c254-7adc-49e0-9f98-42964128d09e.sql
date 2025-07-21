-- Corrigir SLA sem setor - associar ao setor Compliance
UPDATE public.sla_demandas 
SET setor_id = '9d90b6fa-f3b0-4ed1-8604-545b15e5c659' -- Compliance
WHERE id = 'ba93c8eb-5c1d-41d0-9d24-5be2326ed3c0' AND setor_id IS NULL;

-- Reativar setor Financeiro que tem SLA ativo
UPDATE public.setores 
SET ativo = true, updated_at = now() 
WHERE id = '0293029c-d0a5-49a9-ae8d-b45d89fc52b3' AND nome = 'Financeiro';

-- Atualizar metadados do usuário teste@gmail.com no auth
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data, 
  '{user_type}', 
  '"administrador_master"'
)
WHERE email = 'teste@gmail.com';

-- Garantir que todos os SLAs tenham ticket_number
UPDATE public.sla_demandas 
SET ticket_number = 'TICKET-' || EXTRACT(YEAR FROM data_criacao) || '-' || 
    LPAD(ROW_NUMBER() OVER (ORDER BY data_criacao)::text, 4, '0'),
    updated_at = now()
WHERE ticket_number IS NULL OR ticket_number = '';

-- Verificar e corrigir pontuações que podem estar incorretas
UPDATE public.sla_demandas 
SET pontuacao_total = pontuacao_financeiro + pontuacao_cliente + pontuacao_reputacao + pontuacao_urgencia + pontuacao_operacional,
    updated_at = now()
WHERE pontuacao_total != (pontuacao_financeiro + pontuacao_cliente + pontuacao_reputacao + pontuacao_urgencia + pontuacao_operacional);

-- Garantir que todos os usuários ativos tenham pelo menos um setor (exceto administradores master)
INSERT INTO public.user_setores (user_id, setor_id)
SELECT p.user_id, '3a3b3e81-947f-4638-afa1-930c8d69e764' -- TI SUPORTE como padrão
FROM public.profiles p
WHERE p.ativo = true 
  AND p.user_type != 'administrador_master'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_setores us 
    WHERE us.user_id = p.user_id
  );

-- Log das correções
INSERT INTO public.sla_logs (tipo_acao, dados_criados, usuario_responsavel, origem) 
VALUES 
('correcao_dados_sistema', 
 jsonb_build_object(
   'correcoes', jsonb_build_array(
     'SLA sem setor corrigido',
     'Setor Financeiro reativado',
     'Metadados de usuário atualizados',
     'Ticket numbers verificados',
     'Pontuações corrigidas',
     'Usuários sem setor corrigidos'
   ),
   'timestamp', now()
 ),
 'Sistema Automático',
 'correcao_dados');