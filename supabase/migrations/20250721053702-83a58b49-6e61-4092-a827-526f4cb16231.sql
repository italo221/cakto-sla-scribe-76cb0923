-- Corrigir SLA órfão (sem setor)
UPDATE public.sla_demandas 
SET setor_id = '9d90b6fa-f3b0-4ed1-8604-545b15e5c659' -- Compliance
WHERE setor_id IS NULL;

-- Reativar setor Financeiro que tem SLA
UPDATE public.setores 
SET ativo = true, updated_at = now() 
WHERE nome = 'Financeiro' AND ativo = false;

-- Remover usuários fictícios/teste (manter apenas teste@gmail.com como admin real)
DELETE FROM public.user_setores 
WHERE user_id IN (
  SELECT user_id FROM public.profiles 
  WHERE email IN ('admin@admin.com', 'contato@cakto.com.br')
);

DELETE FROM public.profiles 
WHERE email IN ('admin@admin.com', 'contato@cakto.com.br');

-- Verificar se há dados de teste nas tabelas de leads
SELECT COUNT(*) as leads_teste FROM public.leads 
WHERE email LIKE '%test%' OR email LIKE '%exemplo%' OR nome LIKE '%Test%';

-- Log da limpeza
INSERT INTO public.sla_logs (tipo_acao, dados_criados, usuario_responsavel, origem) 
VALUES 
('limpeza_dados_ficticios', 
 jsonb_build_object(
   'acoes', jsonb_build_array(
     'SLA órfão corrigido',
     'Setor Financeiro reativado', 
     'Usuários fictícios removidos',
     'Sistema limpo para produção'
   ),
   'timestamp', now()
 ),
 'Sistema Automático',
 'limpeza_producao');